import { FileText, Image, Video, Music, Archive, File } from "lucide-react";

interface FilePreviewProps {
  file: File;
  showSize?: boolean;
}

export function FilePreview({ file, showSize = true }: FilePreviewProps) {
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
    if (fileType.startsWith('video/')) return <Video className="h-8 w-8 text-purple-500" />;
    if (fileType.startsWith('audio/')) return <Music className="h-8 w-8 text-green-500" />;
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) 
      return <Archive className="h-8 w-8 text-orange-500" />;
    if (fileType.includes('text') || fileType.includes('document')) 
      return <FileText className="h-8 w-8 text-gray-500" />;
    return <File className="h-8 w-8 text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getImagePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const imageUrl = getImagePreview(file);

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
      <div className="flex-shrink-0">
        {imageUrl ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden border">
            <img 
              src={imageUrl} 
              alt={file.name}
              className="w-full h-full object-cover"
              onLoad={() => URL.revokeObjectURL(imageUrl)}
            />
          </div>
        ) : (
          getFileIcon(file.type)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.name}
        </p>
        {showSize && (
          <p className="text-xs text-gray-500">
            {formatFileSize(file.size)}
          </p>
        )}
      </div>
    </div>
  );
}