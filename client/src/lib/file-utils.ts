export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileIcon(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'fas fa-file-pdf';
    case 'doc':
    case 'docx':
      return 'fas fa-file-word';
    case 'xls':
    case 'xlsx':
      return 'fas fa-file-excel';
    case 'ppt':
    case 'pptx':
      return 'fas fa-file-powerpoint';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
      return 'fas fa-file-image';
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'flv':
      return 'fas fa-file-video';
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'm4a':
      return 'fas fa-file-audio';
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return 'fas fa-file-archive';
    case 'txt':
      return 'fas fa-file-alt';
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'html':
    case 'css':
    case 'json':
    case 'xml':
      return 'fas fa-file-code';
    default:
      return 'fas fa-file';
  }
}

export function getFileIconColor(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'text-material-red';
    case 'doc':
    case 'docx':
      return 'text-blue-600';
    case 'xls':
    case 'xlsx':
      return 'text-green-600';
    case 'ppt':
    case 'pptx':
      return 'text-orange-600';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
      return 'text-material-green';
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'flv':
      return 'text-material-blue';
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'm4a':
      return 'text-purple-600';
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return 'text-material-amber';
    case 'txt':
      return 'text-gray-600';
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'html':
    case 'css':
    case 'json':
    case 'xml':
      return 'text-indigo-600';
    default:
      return 'text-gray-500';
  }
}

export async function createFileChunks(file: File): Promise<string[]> {
  const chunkSize = 16 * 1024; // 16KB chunks
  const chunks: string[] = [];
  
  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const chunk = file.slice(offset, offset + chunkSize);
    const arrayBuffer = await chunk.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    chunks.push(base64);
  }
  
  return chunks;
}

export function reconstructFileFromChunks(
  chunks: Map<number, string>,
  fileName: string,
  totalChunks: number
): void {
  // Convert chunks back to binary data
  const binaryChunks: Uint8Array[] = [];
  
  for (let i = 0; i < totalChunks; i++) {
    const base64Chunk = chunks.get(i);
    if (!base64Chunk) {
      console.error(`Missing chunk ${i} for file ${fileName}`);
      return;
    }
    
    const binaryString = atob(base64Chunk);
    const bytes = new Uint8Array(binaryString.length);
    for (let j = 0; j < binaryString.length; j++) {
      bytes[j] = binaryString.charCodeAt(j);
    }
    binaryChunks.push(bytes);
  }
  
  // Combine all chunks
  const totalLength = binaryChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combinedArray = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const chunk of binaryChunks) {
    combinedArray.set(chunk, offset);
    offset += chunk.length;
  }
  
  // Create blob and download
  const blob = new Blob([combinedArray]);
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateConnectionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 9; i++) {
    if (i === 3 || i === 6) {
      result += '-';
    } else {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return result;
}
