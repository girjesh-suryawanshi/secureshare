# File Type Support - Updated

## Overview
SecureShare now explicitly supports all file types including **ZIP and JAR files**, along with a comprehensive range of other formats.

## Supported File Types

### Archives & Compressed Files
- ✅ `.zip` - Standard ZIP archives
- ✅ `.rar` - WinRAR archives  
- ✅ `.7z` - 7-Zip archives
- ✅ `.tar` - TAR archives
- ✅ `.gz` / `.tar.gz` - GZIP archives
- ✅ `.bz2` - BZIP2 archives
- ✅ `.xz` - XZ archives

### Code & Executables
- ✅ `.jar` - Java Archive (newly added)
- ✅ `.exe` - Windows Executable
- ✅ `.dll` - Dynamic Library
- ✅ `.so` - Shared Object (Linux)
- ✅ `.sh` - Shell Script
- ✅ `.bat` / `.cmd` - Batch Script
- ✅ `.app` - macOS Application
- ✅ `.bin` - Binary files
- ✅ `.py` - Python Script
- ✅ `.js` / `.ts` - JavaScript/TypeScript

### Documents
- ✅ `.pdf` - PDF Document
- ✅ `.doc` / `.docx` - Microsoft Word
- ✅ `.xls` / `.xlsx` - Microsoft Excel
- ✅ `.ppt` / `.pptx` - Microsoft PowerPoint
- ✅ `.txt` - Text files
- ✅ `.md` - Markdown files
- ✅ `.csv` - Comma-Separated Values

### Media Files
- ✅ `image/*` - All image formats (JPEG, PNG, GIF, BMP, SVG, WebP, etc.)
- ✅ `video/*` - All video formats (MP4, MKV, AVI, WebM, MOV, etc.)
- ✅ `audio/*` - All audio formats (MP3, WAV, AAC, FLAC, OGG, etc.)

### Other Files
- ✅ All other file types are supported
- ✅ No file type restrictions
- ✅ Works with any custom or proprietary formats

---

## Features

### File Type Detection
- **Smart Icon Display**: Different icons for different file categories
  - 🖼️ Images (Blue)
  - 🎬 Videos (Purple)
  - 🎵 Audio (Green)
  - 📦 Archives (Orange)
  - 💻 Code/Executables (Red)
  - 📄 Documents (Gray)
  - 📋 Generic Files (Light Gray)

### Multi-File Support
- ✅ Select multiple files of any type
- ✅ Automatic ZIP packaging for multiple files
- ✅ Mixed file types in single transfer

### Size Support
- ✅ Small files (<50MB): Fast transfer
- ✅ Medium files (50-375MB): Supported via internet
- ✅ Large files (>375MB): Use Local Network transfer
- ✅ No practical size limits with Local Network

---

## UI Updates

### Main Upload Interface
Updated message: *"Support for all file types • Documents, Videos, ZIP, JAR, Archives & More"*

### Supported Files Section
Shows the following categories:
- ✓ Archives (.zip, .rar, .7z, .tar)
- ✓ Code (.jar, .exe, .dll, .sh)
- ✓ Documents (PDF, Word, Excel)
- ✓ Media (Video, Audio, Images)

---

## Technical Implementation

### File Recognition
Files are recognized by:
1. **File extension** (primary method)
   - More reliable than MIME type
   - Works for all file types
   - Case-insensitive matching

2. **MIME type** (fallback method)
   - Used as secondary validation
   - Browser-dependent
   - Not reliable for .jar, .zip, etc.

### Example: JAR File
```
File: application.jar
Extension detected: "jar"
Icon displayed: Code2 (Red)
Transfer method: Supported (full support)
```

### Example: ZIP File
```
File: archive.zip
Extension detected: "zip"
Icon displayed: Archive (Orange)
Transfer method: Supported (full support)
```

---

## File Size Considerations

### Internet Transfer (WebSocket)
- **Recommended**: Up to 375MB per file
- **Max**: ~500MB per file (100MB with base64 overhead)
- **Speed**: Depends on internet connection
- **Reliability**: Good for files <375MB

### Local Network Transfer (HTTP)
- **Recommended**: Unlimited file size
- **Speed**: LAN bandwidth (typically 1-10 Gbps)
- **Reliability**: Very high
- **Best for**: Large files >375MB

---

## Example Workflows

### Upload JAR File
1. Click "Drop Files Here or Click to Browse"
2. Select `myapp.jar` (shows Code icon in Red)
3. Click "Send Files"
4. Share 6-digit code with recipient
5. Recipient enters code to download

### Upload Multiple Archives
1. Select `backup.zip`, `docs.rar`, `media.7z`
2. App shows all 3 files with Archive icon (Orange)
3. Click "Send Files"
4. Multiple files automatically organized
5. Recipient receives all 3 files

### Upload Large JAR File (>375MB)
1. Select large JAR file
2. **Option A (Recommended)**: Use Local Network transfer
   - Click "Local Network" tab
   - Share link instead of code
   - Faster and more reliable
3. **Option B**: Use internet if necessary
   - System shows warning if >375MB
   - Not recommended, may fail

---

## Browser Compatibility

- ✅ Chrome/Edge: All file types
- ✅ Firefox: All file types
- ✅ Safari: All file types
- ✅ Mobile browsers: All file types

**Note**: Some browsers may restrict certain executable types for security reasons. Use Local Network transfer if needed.

---

## Security Considerations

### No Restrictions
- ✅ JAR files are transmitted as-is (no modification)
- ✅ ZIP files maintain integrity
- ✅ Executables are not scanned or quarantined
- ✅ User responsible for file safety

### Recommendations
- Only share files from trusted sources
- Verify file integrity with checksums if needed
- Use for authorized software distribution only
- Consider company policies for executable files

---

## FAQ

### Q: Can I upload .jar files?
**A**: Yes! JAR files are fully supported. They show with a Code icon (Red) and transfer just like any other file.

### Q: What's the difference between .zip and .jar?
**A**: JAR is a Java-specific archive format (basically a ZIP file with Java metadata). SecureShare treats both as archives and transfers them as-is.

### Q: Can I send multiple JAR files?
**A**: Yes! You can select multiple JAR files along with any other file types. They'll all transfer together.

### Q: Why do some files show different icons?
**A**: Icons help you quickly identify file types. JAR and EXE files show a Code icon (Red) to indicate they're executable.

### Q: What if my file type isn't in the list?
**A**: All file types are supported! The list above is just common examples. Any file extension will work.

### Q: Are there any file type restrictions?
**A**: No! SecureShare supports unlimited file type variety. Upload anything you need.

---

## Recent Changes

### Version Update
- ✅ Added explicit JAR file support with Code icon
- ✅ Enhanced archive file detection (.rar, .7z, .tar, .gz, .bz2, .xz)
- ✅ Added executable file detection (.exe, .dll, .so, .sh, .bat)
- ✅ Improved file icon system with Code2 icon for executables
- ✅ Updated UI to show "ZIP, JAR, Archives & More"
- ✅ Updated supported files section in help text

---

## Testing JAR Files

### Test Case 1: Simple JAR
```
File: HelloWorld.jar (100KB)
Transfer type: Internet
Expected result: ✅ Success
Icon: Code (Red)
```

### Test Case 2: Large JAR
```
File: LargeApplication.jar (150MB)
Transfer type: Internet or Local Network
Expected result: ✅ Success
Icon: Code (Red)
Speed: LAN = Fast, Internet = Slower
```

### Test Case 3: Multiple JARs
```
Files: app1.jar, app2.jar, app3.jar
Total size: 300MB
Transfer type: Local Network (recommended)
Expected result: ✅ All files transferred
```

---

## Support & Documentation

For more information:
- See [VIDEO_FILE_TRANSFER_FIX_SUMMARY.md](VIDEO_FILE_TRANSFER_FIX_SUMMARY.md) for large file handling
- See [SESSION_BUG_FIX_SUMMARY.md](SESSION_BUG_FIX_SUMMARY.md) for all bug fixes
- Contact support for any file transfer issues
