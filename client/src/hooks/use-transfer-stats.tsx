import { useState, useEffect } from "react";

interface TransferStats {
  filesSentToday: number;
  filesReceivedToday: number;
  totalSizeTransferred: string;
  successRate: number;
  recentTransfers: Array<{
    type: 'sent' | 'received';
    fileName: string;
    size: number;
    timestamp: Date;
    code?: string;
  }>;
}

export function useTransferStats() {
  const [stats, setStats] = useState<TransferStats>(() => {
    const saved = localStorage.getItem('transfer-stats');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        recentTransfers: parsed.recentTransfers.map((t: any) => ({
          ...t,
          timestamp: new Date(t.timestamp)
        }))
      };
    }
    return {
      filesSentToday: 0,
      filesReceivedToday: 0,
      totalSizeTransferred: '0 MB',
      successRate: 100,
      recentTransfers: []
    };
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const updateStats = (newStats: Partial<TransferStats>) => {
    setStats(prev => {
      const updated = { ...prev, ...newStats };
      localStorage.setItem('transfer-stats', JSON.stringify(updated));
      return updated;
    });
  };

  const addTransfer = (transfer: Omit<TransferStats['recentTransfers'][0], 'timestamp'>) => {
    const newTransfer = { ...transfer, timestamp: new Date() };
    const today = new Date().toDateString();
    
    setStats(prev => {
      // Add to recent transfers (keep last 10)
      const recentTransfers = [newTransfer, ...prev.recentTransfers].slice(0, 10);
      
      // Update daily counts
      const todayTransfers = recentTransfers.filter(t => 
        t.timestamp.toDateString() === today
      );
      
      const filesSentToday = todayTransfers.filter(t => t.type === 'sent').length;
      const filesReceivedToday = todayTransfers.filter(t => t.type === 'received').length;
      
      // Calculate total size transferred today
      const totalBytesToday = todayTransfers.reduce((sum, t) => sum + t.size, 0);
      const totalSizeTransferred = formatFileSize(totalBytesToday);
      
      const updated = {
        ...prev,
        filesSentToday,
        filesReceivedToday,
        totalSizeTransferred,
        recentTransfers
      };
      
      localStorage.setItem('transfer-stats', JSON.stringify(updated));
      return updated;
    });
  };

  const clearTodayStats = () => {
    const today = new Date().toDateString();
    setStats(prev => {
      const recentTransfers = prev.recentTransfers.filter(t => 
        t.timestamp.toDateString() !== today
      );
      
      const updated = {
        ...prev,
        filesSentToday: 0,
        filesReceivedToday: 0,
        totalSizeTransferred: '0 MB',
        recentTransfers
      };
      
      localStorage.setItem('transfer-stats', JSON.stringify(updated));
      return updated;
    });
  };

  // Reset daily stats at midnight
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const timeout = setTimeout(() => {
      clearTodayStats();
      // Set up daily interval
      const interval = setInterval(clearTodayStats, 24 * 60 * 60 * 1000);
      return () => clearInterval(interval);
    }, msUntilMidnight);
    
    return () => clearTimeout(timeout);
  }, []);

  return {
    stats,
    addTransfer,
    updateStats,
    clearTodayStats
  };
}