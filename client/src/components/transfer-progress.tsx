import { Progress } from "@/components/ui/progress";
import { Clock, Zap, CheckCircle2 } from "lucide-react";

interface TransferProgressProps {
  progress: number;
  transferSpeed?: string;
  estimatedTime?: string;
  isComplete?: boolean;
  fileName?: string;
}

export function TransferProgress({ 
  progress, 
  transferSpeed, 
  estimatedTime, 
  isComplete = false,
  fileName 
}: TransferProgressProps) {
  return (
    <div className="space-y-3">
      {fileName && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 truncate">{fileName}</p>
          {isComplete && <CheckCircle2 className="h-5 w-5 text-green-500" />}
        </div>
      )}
      
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{Math.round(progress)}% complete</span>
          <div className="flex items-center space-x-4">
            {transferSpeed && (
              <div className="flex items-center space-x-1">
                <Zap className="h-3 w-3" />
                <span>{transferSpeed}</span>
              </div>
            )}
            {estimatedTime && !isComplete && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{estimatedTime}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}