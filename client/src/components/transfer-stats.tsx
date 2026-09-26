import { Upload, Download, Database, ShieldCheck } from "lucide-react";

interface TransferStatsProps {
  stats: {
    filesSentToday: number;
    filesReceivedToday: number;
    totalSizeTransferred: string;
    successRate: number;
  };
}

export function TransferStats({ stats }: TransferStatsProps) {
  const items = [
    {
      icon: Upload,
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
      value: `${stats.filesSentToday.toLocaleString()}+`,
      label: "Files Sent",
      displayValue: stats.filesSentToday > 1000000 ? `${(stats.filesSentToday / 1000000).toFixed(1)}M+` : stats.filesSentToday > 1000 ? `${(stats.filesSentToday / 1000).toFixed(1)}K+` : `${stats.filesSentToday}`,
    },
    {
      icon: Download,
      iconColor: "text-green-600",
      iconBg: "bg-green-50",
      value: `${stats.filesReceivedToday.toLocaleString()}+`,
      label: "Files Received",
      displayValue: stats.filesReceivedToday > 1000000 ? `${(stats.filesReceivedToday / 1000000).toFixed(1)}M+` : stats.filesReceivedToday > 1000 ? `${(stats.filesReceivedToday / 1000).toFixed(1)}K+` : `${stats.filesReceivedToday}`,
    },
    {
      icon: Database,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
      value: stats.totalSizeTransferred,
      label: "Data Transferred",
      displayValue: stats.totalSizeTransferred,
    },
    {
      icon: ShieldCheck,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-50",
      value: `${stats.successRate}%`,
      label: "Success Rate",
      displayValue: `${stats.successRate}%`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm"
          >
            <div className={`p-2 ${item.iconBg} rounded-lg shrink-0`}>
              <Icon className={`h-5 w-5 ${item.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-slate-900 leading-tight">{item.displayValue}</p>
              <p className="text-xs text-slate-500 truncate">{item.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}