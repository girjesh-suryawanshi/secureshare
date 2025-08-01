import { Card, CardContent } from "@/components/ui/card";
import { Upload, Download, FileText, TrendingUp } from "lucide-react";

interface TransferStatsProps {
  stats: {
    filesSentToday: number;
    filesReceivedToday: number;
    totalSizeTransferred: string;
    successRate: number;
  };
}

export function TransferStats({ stats }: TransferStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mx-auto mb-2">
            <Upload className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.filesSentToday}</p>
          <p className="text-xs text-blue-700">Files Sent Today</p>
        </CardContent>
      </Card>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mx-auto mb-2">
            <Download className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.filesReceivedToday}</p>
          <p className="text-xs text-green-700">Files Received Today</p>
        </CardContent>
      </Card>

      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full mx-auto mb-2">
            <FileText className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats.totalSizeTransferred}</p>
          <p className="text-xs text-purple-700">Data Transferred</p>
        </CardContent>
      </Card>

      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full mx-auto mb-2">
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.successRate}%</p>
          <p className="text-xs text-orange-700">Success Rate</p>
        </CardContent>
      </Card>
    </div>
  );
}