/**
 * Allowed and blocked file extension validation for Google AdSense & platform safety.
 */

export const ALLOWED_EXTENSIONS = new Set([
  // Documents
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "csv", "odt", "ods", "odp",
  // Images
  "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff", "ico",
  // Archives
  "zip", "rar", "7z", "tar", "gz", "bz2", "xz",
  // Media / Audio / Video
  "mp3", "wav", "ogg", "m4a", "flac", "mp4", "webm", "mkv", "avi", "mov"
]);

export const PROHIBITED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "vbs", "ps1", "msi", "dll", "scr", "jar",
  "apk", "iso", "dmg", "com", "gadget", "pif", "vb", "vbe", "ws", "wsf"
]);

export interface FileValidationResult {
  allowed: boolean;
  reason?: string;
  category: "Document" | "Image" | "Archive" | "Media" | "Other";
}

export function isAllowedFile(fileName: string, _fileType?: string): FileValidationResult {
  if (!fileName || typeof fileName !== "string") {
    return { allowed: false, reason: "Invalid file name", category: "Other" };
  }

  const parts = fileName.trim().split(".");
  if (parts.length < 2) {
    return { allowed: true, category: "Other" };
  }

  const ext = parts.pop()!.toLowerCase();

  if (PROHIBITED_EXTENSIONS.has(ext)) {
    return {
      allowed: false,
      reason: `Executable or script format (.${ext}) is prohibited for safety reasons.`,
      category: "Other",
    };
  }

  let category: FileValidationResult["category"] = "Other";
  if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "csv", "odt"].includes(ext)) {
    category = "Document";
  } else if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) {
    category = "Image";
  } else if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    category = "Archive";
  } else if (["mp3", "wav", "ogg", "mp4", "webm", "mkv", "avi"].includes(ext)) {
    category = "Media";
  }

  return { allowed: true, category };
}

export function getFileCategory(fileName: string): string {
  const result = isAllowedFile(fileName);
  return result.category;
}
