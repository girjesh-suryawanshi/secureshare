import { Settings, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StatusBarProps {
  webrtcStatus: string;
  activeTransfers: number;
  queuedTransfers: number;
  completedTransfers: number;
}

export function StatusBar({ 
  webrtcStatus, 
  activeTransfers, 
  queuedTransfers, 
  completedTransfers 
}: StatusBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-material-green rounded-full mr-2 animate-pulse-slow" />
            <span className="text-sm text-gray-600">{webrtcStatus}</span>
          </div>
          <div className="text-sm text-gray-500">
            Active: {activeTransfers} • Queue: {queuedTransfers} • Complete: {completedTransfers}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Help"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
