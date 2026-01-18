# Video File Transfer Issues - Root Cause Analysis

## Problem Statement
"File not found" errors occur sometimes when transferring video files, even though the same code works for other file types.

## Root Causes Identified

### Issue #1: Base64 Encoding Size Explosion (CRITICAL for Large Videos)
**Problem**: Video files are encoded as base64 before being sent via WebSocket
- Base64 adds **33% size overhead** to the original file size
- A 100MB video becomes 133MB when base64 encoded
- The WebSocket payload limit is 100MB, which was already increased

**Example**:
```
Original file: video.mp4 = 100MB
After base64: base64Data = 133MB
WebSocket maxPayload = 100MB
Result: ❌ PAYLOAD TOO LARGE - Message rejected silently
```

**Why Video Files Are Affected**:
- Video files are typically large (10MB - 500MB+ common)
- Videos hit the payload size limit more often than text/images
- The error is silently swallowed, showing "file not found" instead of "payload too large"

### Issue #2: Data String Length Check Missing
**Problem**: No validation that the base64 data string isn't too long before sending
- Client encodes file to base64 without checking if it exceeds limits
- Server receives incomplete message or message is dropped by WebSocket layer
- Results in "file not found" because file metadata was registered but data never arrived

### Issue #3: Silent WebSocket Payload Failure
**Problem**: WebSocket silently rejects oversized payloads without proper error reporting
- When a message exceeds `maxPayload`, the connection may close without clear error
- Client doesn't know why the message failed
- Server log shows nothing (message never arrives)
- Results in file appearing registered but data missing

**Code Location**: `server/routes.ts` line 10
```typescript
const wss = new WebSocketServer({ 
  server: httpServer, 
  path: '/ws',
  maxPayload: 100 * 1024 * 1024,  // ← This limit may still be too small for large videos
  perMessageDeflate: false
});
```

### Issue #4: No Chunked Upload for Large Video Files
**Problem**: All files are sent as single monolithic messages
- Large video files (>50MB) are sent in one WebSocket message
- If the encoding pushes it past the limit, it fails
- No fallback mechanism to split large files into chunks

**Impact**:
- Video.mp4 (50MB) → base64 (66.5MB) = Too close to limit, may fail
- Video.mp4 (100MB) → base64 (133MB) = Exceeds 100MB limit, fails

### Issue #5: File Matching by Index and Name (Potential Race Condition)
**Problem**: Files are matched using BOTH fileIndex AND fileName
```typescript
const fileToUpdate = registry.files.find(f => 
  f.fileIndex === (fileIndex || 0) && f.fileName === fileName
);
```

**Issue**: If multiple files have similar names or indexing is off, file matching fails silently

---

## Why Videos Specifically?

1. **Size**: Videos are 10-500MB typical, push against limits
2. **Base64 Overhead**: 33% overhead makes them exceed limits
3. **Single-Message Transfer**: No fallback for large files
4. **Error Silence**: Oversized messages fail silently

**Example Scenario**:
```
User selects: video.mp4 (87MB)
Client base64 encodes: 87MB * 1.33 = 115.7MB
WebSocket maxPayload: 100MB
Result: Message silently dropped → File not found ❌

User selects: document.pdf (5MB)
Client base64 encodes: 5MB * 1.33 = 6.65MB
WebSocket maxPayload: 100MB
Result: Message delivered ✅
```

---

## Solutions Needed

### Solution 1: Increase WebSocket Payload Limit (Quick Fix)
**Current**: 100MB
**Problem**: Still too small for base64-encoded large videos
**Recommendation**: 500MB

```typescript
const wss = new WebSocketServer({ 
  server: httpServer, 
  path: '/ws',
  maxPayload: 500 * 1024 * 1024,  // Increase to 500MB for larger videos
  perMessageDeflate: false
});
```

**Limitations**:
- Uses more memory per connection
- Still doesn't solve videos >375MB (500MB / 1.33 ≈ 375MB uncompressed)
- Not a sustainable long-term solution

### Solution 2: Implement Chunked Uploads (Better)
**Approach**: Split large files into 5-10MB chunks, send sequentially
```typescript
// Client Side
if (file.size > 50 * 1024 * 1024) {  // > 50MB
  // Use chunked upload
  const chunkSize = 5 * 1024 * 1024;  // 5MB per chunk
  for (let i = 0; i < file.size; i += chunkSize) {
    const chunk = file.slice(i, i + chunkSize);
    await sendChunk(chunk);
  }
} else {
  // Use normal single-message transfer
  await sendFile(file);
}
```

**Benefits**:
- Supports unlimited file sizes
- More reliable (single chunk failure doesn't lose entire file)
- Can show progress per chunk
- Matches REST API chunked upload endpoints already in code

### Solution 3: Replace Base64 with Binary (Best)
**Problem**: Base64 adds 33% overhead
**Solution**: Use binary WebSocket frames

```typescript
// Client Side - Send binary instead of base64
const reader = new FileReader();
reader.onload = () => {
  const arrayBuffer = reader.result as ArrayBuffer;
  // Send binary directly, no base64 encoding
  ws.send(arrayBuffer);  // Binary, no encoding overhead
};
reader.readAsArrayBuffer(file);
```

**Benefits**:
- Zero encoding overhead
- Significantly faster transfer
- Can handle very large files
- Already supported by WebSocket spec

### Solution 4: Add Better Error Reporting
**Current**: Silent failures
**Solution**: Report when messages exceed payload size

```typescript
ws.on('message', (data, isBinary) => {
  if (data.byteLength > maxPayload) {
    console.error(`[FileData] ⚠️  Message size (${data.byteLength}B) exceeds max payload (${maxPayload}B)`);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'File too large - please use chunked upload',
      maxPayloadSize: maxPayload,
      fileSize: data.byteLength,
    }));
  }
});
```

### Solution 5: Validate File Size Before Transfer
**Current**: No pre-transfer validation
**Solution**: Check file size before attempting transfer

```typescript
// Client Side - Check before sending
const MAX_SINGLE_FILE = 75 * 1024 * 1024;  // 75MB max for single transfer (accounting for 33% base64 overhead)

if (file.size > MAX_SINGLE_FILE) {
  toast({
    title: "⚠️ File Too Large",
    description: `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum single file size is ${MAX_SINGLE_FILE / 1024 / 1024}MB. Use local network transfer for larger files.`,
    variant: "destructive",
  });
  return;
}
```

---

## Current Code Issues in Detail

### Client-Side (home.tsx)
```typescript
// Lines 130-160: Encoding without size check
reader.onload = () => {
  const base64 = reader.result as string;
  const base64Data = base64.split(',')[1];
  
  // ❌ NO CHECK if base64Data is too large
  // ❌ NO FALLBACK if WebSocket rejects it
  // ❌ NO CHUNKING for large files
  
  sendMessage({
    type: 'file-data',
    code: code,
    fileName: file.name,
    data: base64Data,  // Could be 133MB for 100MB video
    fileIndex: index,
  });
};
```

### Server-Side (routes.ts)
```typescript
// Lines 328-340: Receiving without payload validation
function handleFileData(message: any, ws: WebSocket) {
  const { code, data, fileName, fileIndex } = message;
  
  if (!code || !data) {
    console.error('[FileData] Invalid file-data message: missing code or data');
    // ❌ Doesn't distinguish between "missing" and "too large"
    // ❌ Oversized messages never reach here (rejected by WebSocket)
    return;
  }
  // ... rest of function
}
```

---

## Recommended Implementation Priority

### Phase 1 (Immediate - Quick Fix)
- [ ] Increase `maxPayload` to 500MB in server/routes.ts line 10
- [ ] Add file size validation in client before transfer
- [ ] Add client-side error handling for payload errors

### Phase 2 (Short-term - Better Solution)
- [ ] Implement chunked upload for files >50MB
- [ ] Use REST endpoints for local network chunked transfers
- [ ] Add progress reporting per chunk

### Phase 3 (Long-term - Best Solution)
- [ ] Replace base64 with binary WebSocket frames
- [ ] Implement streaming for very large files
- [ ] Add compression for text-heavy videos

---

## Testing Video File Scenarios

### Test Case 1: Small Video (Works Currently)
- File: video.mp4 (5MB)
- Base64 size: 6.65MB
- Limit: 100MB
- Result: ✅ Should work

### Test Case 2: Medium Video (Marginal)
- File: video.mp4 (50MB)
- Base64 size: 66.5MB
- Limit: 100MB
- Result: ⚠️ Works but close to limit

### Test Case 3: Large Video (Fails)
- File: video.mp4 (100MB)
- Base64 size: 133MB
- Limit: 100MB
- Result: ❌ Fails - exceeds limit

### Test Case 4: Very Large Video (Fails)
- File: video.mp4 (500MB)
- Base64 size: 665MB
- Limit: 100MB
- Result: ❌ Fails - far exceeds limit

---

## Summary

**Root Cause**: Video files + Base64 encoding + WebSocket payload limits = "file not found" errors

**Why It Happens**: 
1. Large video files are common (10MB - 500MB)
2. Base64 encoding adds 33% overhead
3. WebSocket payload limit (100MB) is exceeded
4. WebSocket silently drops oversized messages
5. Server never receives file data, shows "file not found"

**Immediate Fix**: Increase payload limit to 500MB and add validation

**Best Fix**: Implement chunked uploads + binary frames (removes base64 overhead entirely)
