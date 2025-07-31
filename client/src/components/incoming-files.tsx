import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatFileSize, getFileIcon, getFileIconColor } from "@/lib/file-utils";
import { Download, Smartphone, X, Check } from "lucide-react";

interface IncomingFileRequest {
  id: string;
  fromPeer: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
}

interface IncomingFilesProps {
  incomingRequests: IncomingFileRequest[];
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
}

export function IncomingFiles({ incomingRequests, onAccept, onDecline }: IncomingFilesProps) {
  if (incomingRequests.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
            <Download className="text-material-blue mr-2" />
            Incoming Files
          </h2>

          {incomingRequests.map((request) => (
            <div key={request.id} className="mb-6 last:mb-0">
              {/* Incoming Transfer Request */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Smartphone className="text-material-blue text-xl mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {request.fromPeer} wants to send files
                      </p>
                      <p className="text-sm text-gray-600">
                        1 file • {formatFileSize(request.fileSize)} total
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => onDecline(request.id)}
                      className="hover:bg-gray-100"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Decline
                    </Button>
                    <Button
                      onClick={() => onAccept(request.id)}
                      className="bg-material-green hover:bg-green-600"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Accept
                    </Button>
                  </div>
                </div>
              </div>

              {/* File Preview */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">File to receive:</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="flex items-center p-3 border border-gray-200 rounded-lg">
                    <i className={`${getFileIcon(request.fileName)} ${getFileIconColor(request.fileName)} text-lg mr-3`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{request.fileName}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(request.fileSize)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
