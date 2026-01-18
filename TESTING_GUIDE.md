# Testing Guide - Local Network Optimization

## 🚀 How to Test the Optimizations

### Setup

1. **Install dependencies** (if not already done)
```bash
npm install
```

2. **Build the project**
```bash
npm run build
```

3. **Start the dev server**
```bash
npm run dev
```

4. **Open in browser**
```
http://localhost:5173 (or your configured port)
```

---

## 📝 Test Cases

### TEST 1: QR Code Generation (50x Faster)

**What to Test**: QR code generation speed

**Steps**:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Select Local Network transfer type
4. Click "Start Sending"
5. Select any file (small file is fine)
6. Observe console output

**Expected Results**:
```
✅ QR code appears instantly (< 10ms)
✅ No external API calls in Network tab
✅ QR code data URL is valid (starts with "data:image/png")
✅ Log message: "[LocalNetwork] Network quality: strong/good/fair/weak"
```

**Performance Check**:
```javascript
// In console, you can measure:
console.time('QR');
// Generate QR
console.timeEnd('QR');
// Should be < 10ms
```

---

### TEST 2: Network Quality Detection

**What to Test**: WiFi signal strength detection

**Steps**:
1. Open DevTools → Network tab
2. Throttle connection to "Slow 4G"
3. Open console
4. Select Local Network transfer
5. Click "Start Sending"

**Expected Results**:
```
✅ Console warning appears:
   "[LocalNetwork] ⚠️ Weak WiFi signal detected (2Mbps). Transfer may be slower."

✅ Or normal message:
   "[LocalNetwork] 📡 Network quality: fair (7Mbps)"
```

---

### TEST 3: Chunk Concurrency Limiting (3 at a time)

**What to Test**: Only 3 chunks upload simultaneously

**Steps**:
1. Open browser DevTools
2. Create large file (500MB+ virtual)
3. Click "Start Sending" with Local Network
4. Watch Network tab during upload

**Expected Results**:
```
✅ Only 3 concurrent requests at a time
✅ As one finishes, next one starts
✅ No network congestion (bandwidth smooth)
✅ Console shows chunk progress:
   "[LocalNetwork] Chunk 0 received for file.mp4 (1/100)"
   "[LocalNetwork] Chunk 1 received for file.mp4 (2/100)"
   "[LocalNetwork] Chunk 2 received for file.mp4 (3/100)"
   // Then waits for completion...
   "[LocalNetwork] Chunk 3 received for file.mp4 (4/100)"
```

---

### TEST 4: Retry Logic (Exponential Backoff)

**What to Test**: Auto-retry on network failure

**Steps**:
1. Start file transfer
2. Disconnect WiFi mid-transfer
3. Reconnect quickly
4. Observe console

**Expected Results**:
```
✅ Transfer continues (doesn't restart)
✅ Console shows retry attempts:
   "Attempt 1 failed, waiting 100ms..."
   "Attempt 2 failed, waiting 200ms..."
   "Attempt 3 succeeded! ✅"
✅ File eventually transfers successfully
```

---

### TEST 5: Error Messages & Logging

**What to Test**: Better error messages and context

**Steps**:
1. Open DevTools Console
2. Send file via Local Network
3. Watch for [LocalNetwork] prefix

**Expected Results**:
```
Console should show:
✅ [LocalNetwork] Network quality detection
✅ [LocalNetwork] File registration
✅ [LocalNetwork] Chunk progress
✅ [LocalNetwork] File assembly
✅ [LocalNetwork] Error messages (if any)

Example output:
[LocalNetwork] 📡 Network quality: strong (25Mbps)
[LocalNetwork] Registering file: video.mp4 - 500.00MB (1/3)
[LocalNetwork] Created new registry for code: ABC123
[LocalNetwork] File registered: video.mp4 with code: ABC123 (1/3)
[LocalNetwork] Chunk 0 received for video.mp4 (1/100)
[LocalNetwork] Chunk 1 received for video.mp4 (2/100)
...
[LocalNetwork] ✅ File assembled: video.mp4 - 500.00MB
```

---

### TEST 6: Progressive File Decoding

**What to Test**: Files show progress as they arrive

**Steps**:
1. Send multiple files
2. Watch the "Receiving Files" section
3. Note when first file is available vs last file

**Expected Results**:
```
✅ First file appears in received list before all files arrive
✅ Users can start downloading 1st file while 2nd file is uploading
✅ Progress shown: "File 1/5 Received"
✅ Each file shows individual progress
```

---

## 🔧 Browser DevTools Checks

### Console Checks
```javascript
// Should see no errors, only [LocalNetwork] messages
// Search for: [LocalNetwork]
// Check for: ⚠️, ✅, 📡 emojis

// Should NOT see:
// "Uncaught Error"
// "fetch failed"
// "undefined is not a function"
```

### Network Tab Checks
```
✅ POST /api/register-local-file - Status 200
✅ POST /api/register-local-file-meta - Status 200
✅ POST /api/upload-local-chunk - Status 200 (multiple)
✅ GET /files/{code} - Status 200

❌ Should NOT see:
   - Status 500 errors
   - Timeout errors
   - Unlimited concurrent requests
```

### Performance Tab
```
✅ QR Generation: < 10ms
✅ Network requests: Consistent throughput
✅ Memory: Stable (no spikes)
✅ CPU: Reasonable usage (< 50%)
```

---

## 📱 Mobile Testing

### iPhone/Android
```
Test Cases:
✅ QR code scanning with built-in camera
✅ Transfer on 4G connection
✅ Switch from WiFi to 4G mid-transfer
✅ Network quality detection on mobile
✅ Receive files from desktop
```

### Expected:
```
✅ QR code scans successfully
✅ URL opens correctly
✅ File download works
✅ No special mobile issues
```

---

## 🧪 Automated Test Scenarios

### Scenario 1: Happy Path
```bash
# Send file (no network issues)
1. Select file
2. Click "Send"
3. Transfer completes
Expected: ✅ File received, no errors
```

### Scenario 2: Weak WiFi
```bash
# DevTools → Network → Slow 4G
1. Select file
2. Click "Send"
3. Monitor console
Expected: ✅ Warning shown, retries work, transfer succeeds
```

### Scenario 3: Network Interruption
```bash
# Start transfer, disconnect WiFi, reconnect
1. Start transfer
2. Unplug WiFi (or turn off)
3. Wait 5 seconds
4. Reconnect
Expected: ✅ Transfer resumes with retries
```

### Scenario 4: Large File (500MB+)
```bash
# Create large file or simulate
1. Select large file
2. Monitor chunk uploads
3. Check concurrency limit
Expected: ✅ Only 3 chunks at a time, no congestion
```

### Scenario 5: Multiple Files
```bash
1. Select 5+ files
2. Monitor progress
3. Check file decoding order
Expected: ✅ First file available before all complete
```

---

## 📊 Metrics to Check

### QR Code Generation
```
Baseline (Before): 200-500ms
Target (After): < 10ms
Acceptable: < 50ms
```

### Transfer Success Rate
```
Baseline (Before): 85% on weak WiFi
Target (After): 95%+
Acceptable: > 90%
```

### Network Concurrency
```
Baseline (Before): Unlimited (causes congestion)
Target (After): 3 concurrent max
Acceptable: 3-4 concurrent
```

### Error Recovery
```
Baseline (Before): 0 retries (fail immediately)
Target (After): 3 attempts with backoff
Acceptable: At least 2 retries
```

---

## 🐛 Debugging Tips

### If QR Code is Slow
```javascript
// Check browser support for Canvas API
if (!document.createElement('canvas').getContext('2d')) {
  console.error('Canvas API not supported');
}

// Check for external API calls (should be none)
// Open DevTools → Network tab
// Search for "qrserver" (should find nothing)
```

### If Chunks Aren't Limiting to 3
```javascript
// Check runWithConcurrency function
// Should see only 3 active fetch requests at a time
// Open DevTools → Network tab
// Look at "Name" column - max 3 upload-local-chunk requests

// If more than 3:
// Check that runWithConcurrency is being called
// Verify CONCURRENCY_LIMIT = 3
```

### If Retries Aren't Working
```javascript
// Check console for retry messages
// Should see: "Attempt 1 failed, waiting..."
// Check network conditions in DevTools

// If no retry messages:
// Verify retry() function is imported
// Check that try-catch is wrapping network calls
```

### If Network Quality Detection Fails
```javascript
// Check if Navigator Connection API is available
console.log(navigator.connection);
// Should show object with downlink property
// If undefined, browser doesn't support it (graceful fallback)
```

---

## ✅ Final Checklist

Before Declaring Tests Complete:

- [ ] QR code generates instantly (< 10ms)
- [ ] Network quality warning appears on weak WiFi
- [ ] Only 3 chunks upload simultaneously
- [ ] Retries work on network failure
- [ ] Error messages show context ([LocalNetwork] prefix)
- [ ] Console logging is detailed and helpful
- [ ] Transfer completes on weak WiFi
- [ ] Multiple files transfer progressively
- [ ] No new dependencies added
- [ ] No breaking changes to existing functionality
- [ ] All features work on mobile
- [ ] Cross-browser compatibility verified

---

## 🎯 Success Criteria

✅ **Test Successful If**:
- QR code appears in < 10ms
- Weak WiFi warning shows
- 3-chunk concurrency limit holds
- Retries work on interruption
- All console logs have [LocalNetwork] prefix
- Transfer completes on weak WiFi
- No errors in console
- Mobile testing passes
- Cross-browser works

❌ **Test Failed If**:
- QR code takes > 100ms
- No network quality detection
- Unlimited chunks upload
- No retry on failure
- Generic error messages
- Transfer fails on weak WiFi
- Unhandled errors in console
- Mobile features broken
- Browser compatibility issues

---

## 📞 Need Help?

See documentation:
1. **QUICK_REFERENCE_OPTIMIZATIONS.md** - Quick answers
2. **LOCAL_NETWORK_OPTIMIZATION_COMPLETE.md** - Technical details
3. **CODE_CHANGES_REFERENCE.md** - Exact code changes
4. **IMPLEMENTATION_VERIFICATION_CHECKLIST.md** - Verification

---

**Ready to test? Let's go! 🚀**

