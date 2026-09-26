import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/use-websocket";
import { useLocalNetwork } from "@/hooks/use-local-network";
import { useToast } from "@/hooks/use-toast";
import { useTransferStats } from "@/hooks/use-transfer-stats";
import { FilePreview } from "@/components/file-preview";
import { DragDropZone } from "@/components/drag-drop-zone";
import { TransferProgress } from "@/components/transfer-progress";
import { TransferStats } from "@/components/transfer-stats";
import { Upload, Download, Copy, CheckCircle, Share, Archive, ArrowLeft, Clock, Users, FileText, Zap, Loader2, Wifi, Globe, QrCode, Search, Trash2, Shield, Type, ClipboardCopy, MessageSquare, RefreshCw, BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import JSZip from "jszip";
import { Link, useRoute } from "wouter";
import { ArrowRight } from "lucide-react";
import { blogPosts } from "./blog";
import type { TransferType } from "@shared/schema";
import { QRCodeSVG } from "qrcode.react";
import { SEOHead } from "@/components/seo-head";
import { isAllowedFile } from "@shared/file-validation";

const FILE_CHUNK_SIZE = 256 * 1024; // 256KB

const getLatestBlogPosts = () => {
  return blogPosts.slice(0, 3);
};

/** Format current date/time for ZIP filename: YYYY-MM-DD_HH-mm-ss */
const getZipFileName = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `HexaSend-${y}-${m}-${d}_${h}-${min}-${s}.zip`;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer]);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
};

type DownloadJob = {
  code: string;
  downloadUrl: string;
  fileName: string;
  fileType?: string;
  fileIndex: number;
  totalFiles?: number;
  isLocal?: boolean;
};

export default function Home() {
  const [match, params] = useRoute("/share/:code");
  const [mode, setMode] = useState<'select' | 'send' | 'receive'>(match ? 'receive' : 'select');
  const [transferType, setTransferType] = useState<TransferType>('internet');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [transferCode, setTransferCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>(match && params.code ? params.code.toUpperCase() : '');
  const [filesReady, setFilesReady] = useState<boolean>(false);
  const [receivedFiles, setReceivedFiles] = useState<{ name: string; size: number; blob: Blob }[]>([]);
  const [expectedFilesCount, setExpectedFilesCount] = useState<number>(0);
  const [receivedFilesCount, setReceivedFilesCount] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [transferSpeed, setTransferSpeed] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [receiveProgress, setReceiveProgress] = useState<number>(0);
  const [isReceiving, setIsReceiving] = useState<boolean>(false);
  const [acknowledgments, setAcknowledgments] = useState<Array<{ id: string, message: string, status: string, timestamp: Date }>>([]);
  const [copyJustDone, setCopyJustDone] = useState(false);
  const [uploadingFileIndex, setUploadingFileIndex] = useState<number>(0);
  const [uploadingFileName, setUploadingFileName] = useState<string>("");
  const [isPreparingLocal, setIsPreparingLocal] = useState(false);
  const [resolvedLocalIP, setResolvedLocalIP] = useState<string>("");
  const downloadedFileKeys = useRef<Set<string>>(new Set());
  const receiveRequestCodeRef = useRef<string | null>(null);
  const receiveRetryCountRef = useRef<number>(0);
  const receiveRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const receiveCodeInputRef = useRef<HTMLInputElement>(null);
  const termsCheckboxRef = useRef<HTMLDivElement>(null);
  const pendingRequestRef = useRef<Map<string, number>>(new Map()); // Track pending requests with timestamps
  const lastRequestTimeRef = useRef<number>(0); // Rate limiting for request-file
  const pendingRegistrationsRef = useRef<Map<string, (value: unknown) => void>>(new Map());
  const receiveSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Safety timeout to prevent stuck state
  const receivePollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notFoundCountRef = useRef<number>(0);

  // Instant Chat room state for home page
  const [homeChatCode, setHomeChatCode] = useState<string>('');
  const [termsShake, setTermsShake] = useState(false);

  // Hero animation state
  const [heroVisible, setHeroVisible] = useState(false);
  const [heroCode, setHeroCode] = useState(['4', '7', '3', '9', '2', '1']);
  const [codeFlipping, setCodeFlipping] = useState(false);

  // Entrance animation on mount
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Code shuffle every 5 seconds
  useEffect(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const interval = setInterval(() => {
      setCodeFlipping(true);
      setTimeout(() => {
        setHeroCode(Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]));
        setCodeFlipping(false);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const { isConnected, reconnect, sendMessage, onFileAvailable, onFileReady, onFileNotFound, onFileRegistered, onDownloadAck, onSenderDisconnected, onTextAvailable, onTextNotFound, onTextRegistered } = useWebSocket();
  const {
    isScanning,
    availableDevices,
    isLocalServerRunning,
    localServerInfo,
    startLocalServer,
    stopLocalServer,
    scanForDevices,
    connectToDevice,
    getLocalFiles,
    getLocalIP,
    uploadFileDirect,
    uploadFileInChunks
  } = useLocalNetwork();
  const { toast } = useToast();
  const { stats, addTransfer } = useTransferStats();
  const fileKey = (code: string, index: number) => `${code}-${index}`;

  // Resolve true local IP if running on localhost for QR generation
  useEffect(() => {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      getLocalIP().then((ip) => setResolvedLocalIP(ip));
    }
  }, [getLocalIP]);

  // Cleanup transfer state when all selected files are removed manually
  useEffect(() => {
    if (selectedFiles.length === 0 && (filesReady || transferCode)) {
      setFilesReady(false);
      setTransferCode('');
      setUploadProgress(0);
      setIsUploading(false);
    }
  }, [selectedFiles.length, filesReady, transferCode]);

  const normalizeCode = (code: string | undefined | null): string => {
    if (code == null || typeof code !== "string") return "";
    return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    console.log('Generated code:', code);
    return code;
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${Math.round(bytesPerSecond / 1024)} KB/s`;
    return `${Math.round(bytesPerSecond / (1024 * 1024))} MB/s`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const resetReceiveState = () => {
    setReceivedFiles([]);
    setExpectedFilesCount(0);
    setReceivedFilesCount(0);
    downloadedFileKeys.current.clear();
  };

  const downloadFileJob = useCallback(async (job: DownloadJob) => {
    if (!job.downloadUrl) return;
    const key = fileKey(job.code, job.fileIndex);
    if (downloadedFileKeys.current.has(key)) {
      return;
    }
    downloadedFileKeys.current.add(key);

    try {
      setIsReceiving(true);
      setReceiveProgress((prev) => (prev < 20 ? 20 : prev));

      const response = await fetch(job.downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }

      const chunks: Uint8Array[] = [];
      let downloadedBytes = 0;
      const contentLength = Number(response.headers.get("Content-Length")) || 0;

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            downloadedBytes += value.length;
            if (contentLength > 0) {
              const chunkProgress = (downloadedBytes / contentLength) * 40;
              setReceiveProgress((prev) => Math.min(95, 30 + chunkProgress));
            }
          }
        }
      } else {
        const blob = await response.blob();
        chunks.push(new Uint8Array(await blob.arrayBuffer()));
        downloadedBytes = blob.size;
      }

      const blob = new Blob(chunks as unknown as BlobPart[], { type: job.fileType || 'application/octet-stream' });
      const completedFile = {
        name: job.fileName,
        size: blob.size,
        blob,
      };

      setReceivedFiles((prev) => [...prev, completedFile]);
      setExpectedFilesCount((prev) => (job.totalFiles && job.totalFiles > prev ? job.totalFiles : prev));
      setReceivedFilesCount((prev) => {
        const nextCount = prev + 1;
        const totalExpected = (job.totalFiles && job.totalFiles > 0) ? job.totalFiles : (expectedFilesCount > 0 ? expectedFilesCount : nextCount);
        const progressBase = totalExpected > 0 ? 50 + (nextCount / totalExpected) * 40 : 90;
        setReceiveProgress(Math.min(95, progressBase));

        if (nextCount >= totalExpected) {
          setReceiveProgress(100);
          setTimeout(() => {
            setIsReceiving(false);
            setReceiveProgress(0);
          }, 800);
          if (receiveSafetyTimerRef.current) {
            clearTimeout(receiveSafetyTimerRef.current);
            receiveSafetyTimerRef.current = null;
          }

          if (!job.isLocal) {
            sendMessage({
              type: 'download-success',
              code: job.code,
              fileName: 'All files',
              totalFiles: totalExpected,
              completedFiles: totalExpected,
            });
          }
        }

        return nextCount;
      });

      addTransfer({
        type: 'received',
        fileName: job.fileName,
        size: blob.size,
      });
    } catch (error) {
      downloadedFileKeys.current.delete(key);
      console.error('Failed to download file', error);
      setIsReceiving(false);
      setReceiveProgress(0);
      if (receiveSafetyTimerRef.current) {
        clearTimeout(receiveSafetyTimerRef.current);
        receiveSafetyTimerRef.current = null;
      }
      toast({
        title: 'Download Failed',
        description: job.fileName,
        variant: 'destructive',
      });

      if (!job.isLocal) {
        sendMessage({
          type: 'download-error',
          code: job.code,
          fileName: job.fileName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }, [addTransfer, expectedFilesCount, sendMessage, toast, transferType]);

  const handleFilesSelected = async (files: File[]) => {
    if (!termsAgreed) {
      // Scroll user to checkbox and shake it to draw attention
      if (termsCheckboxRef.current) {
        termsCheckboxRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTermsShake(true);
      setTimeout(() => setTermsShake(false), 700);
      toast({
        title: "☝️ One quick step!",
        description: "Please check the Terms of Service box below before uploading.",
        variant: "destructive",
      });
      return;
    }

    if (files.length > 0) {
      const validFiles: File[] = [];
      for (const file of files) {
        const val = isAllowedFile(file.name, file.type);
        if (!val.allowed) {
          toast({
            title: "File Blocked",
            description: `"${file.name}": ${val.reason}`,
            variant: "destructive",
          });
        } else {
          validFiles.push(file);
        }
      }

      if (validFiles.length === 0) return;
      files = validFiles;

      setSelectedFiles(files);
      setIsUploading(true);
      setUploadProgress(0);

      // Preserve the active code if one is already displayed, otherwise generate a new one
      const code = transferCode || generateCode();
      setTransferCode(code);

      // Handle local network transfer
      if (transferType === 'local') {
        setIsPreparingLocal(true);
        try {
          const serverInfo = await startLocalServer(files, code, (progress, fileName) => {
            setUploadProgress(progress);
            if (fileName && files.length > 1) {
              toast({
                title: `📤 Uploading Files... ${Math.round(progress)}%`,
                description: `${fileName} uploaded - ${Math.round((files.length * progress) / 100)} of ${files.length} files`,
              });
            }
          });

          if (serverInfo) {
            setUploadProgress(100);
            setIsUploading(false);
            setFilesReady(true);
            toast({
              title: "✅ Local Server Ready",
              description: `${files.length} file(s) available on local network. Share code ${code}`,
            });
          }
        } finally {
          setIsPreparingLocal(false);
        }
        return;
      }

      try {
        // Bind the WebSocket so we can receive real-time notifications (e.g., when a receiver downloads the file)
        sendMessage({
          type: 'bind-ws',
          code,
          totalFiles: files.length,
        });

        // Upload files sequentially using binary multipart (fast — no base64, no timeout risk)
        let completedFiles = 0;

        for (const [index, file] of files.entries()) {
          console.log(`Uploading file ${index + 1}/${files.length} via binary upload (${transferType} mode)`);

          let attempts = 0;
          let uploaded = false;
          while (attempts < 3 && !uploaded) {
            try {
              attempts++;
              // Always use binary direct upload (FormData) — it's fast enough for any file size
              await uploadFileDirect(file, code, index, files.length, transferType);
              uploaded = true;
            } catch (err) {
              console.warn(`Upload attempt ${attempts} failed for ${file.name}:`, err);
              if (attempts >= 3) throw err;
              await new Promise(r => setTimeout(r, 1000 * attempts));
            }
          }

          completedFiles++;
          const progress = Math.round((completedFiles / files.length) * 100);

          // Only internet mode tracks progress in this precise block (local mode has its own toast flow)
          if (transferType === 'internet') {
            setUploadProgress(progress);
          }
        }

        toast({
          title: "Ready to Share",
          description: `Share code ${code} is ready. Waiting for receiver...`,
        });
      } catch (error: any) {
        console.error("Error during REST file upload:", error);
        toast({
          title: "Upload Failed",
          description: "Failed to upload files: " + error.message,
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        setFilesReady(true);
      }

      // Add to transfer stats
      files.forEach(file => {
        addTransfer({
          type: 'sent',
          fileName: file.name,
          size: file.size,
          code
        });
      });
      toast({
        title: "Files Ready",
        description: `${files.length} file(s) ready. Share code ${code}`,
      });
    }
  };

  const fetchAndReceiveFiles = useCallback(async (codeToFetch?: string): Promise<{ done: boolean; notFound?: boolean; waiting?: boolean; textFound?: boolean }> => {
    const code = (codeToFetch || inputCode || transferCode || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!code) return { done: false, notFound: true };

    try {
      const restRes = await fetch(`/files/${code}`, {
        headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
      });
      if (restRes.ok) {
        const payload = await restRes.json();
        const filesList = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.files)
            ? payload.files
            : [];
        const totalExpectedFiles = Math.max(payload.totalFiles || 0, filesList.length);
        const readyFiles = filesList.filter((f: any) => f.downloadUrl && (f.isReady ?? true));

        if (readyFiles.length > 0) {
          setExpectedFilesCount(totalExpectedFiles);
          for (const file of readyFiles) {
            await downloadFileJob({
              code: code,
              downloadUrl: file.downloadUrl,
              fileName: file.fileName,
              fileType: file.fileType,
              fileIndex: file.fileIndex ?? 0,
              totalFiles: totalExpectedFiles,
              isLocal: transferType === 'local',
            });
          }
          if (totalExpectedFiles > 0 && downloadedFileKeys.current.size >= totalExpectedFiles) {
            if (receiveSafetyTimerRef.current) {
              clearTimeout(receiveSafetyTimerRef.current);
              receiveSafetyTimerRef.current = null;
            }
            if (receivePollIntervalRef.current) {
              clearInterval(receivePollIntervalRef.current);
              receivePollIntervalRef.current = null;
            }
            setIsReceiving(false);
            setReceiveProgress(0);
            return { done: true };
          }
          return { done: false, waiting: true };
        } else {
          return { done: false, waiting: true };
        }
      } else if (restRes.status === 404) {
        return { done: false, notFound: true };
      }

    } catch (err) {
      console.error("Error checking files:", err);
    }
    return { done: false, notFound: true };
  }, [downloadFileJob, inputCode, transferCode, transferType, toast]);

  const handleReceiveFile = async () => {
    const normalized = inputCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!normalized || normalized.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-character code (letters and numbers only)",
        variant: "destructive",
      });
      return;
    }

    const upperCode = normalized;

    // Rate limiting: prevent rapid repeated requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    if (timeSinceLastRequest < 1000) { // Minimum 1 second between requests
      toast({
        title: "Please wait",
        description: "Requesting too quickly. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    // Check if we already have a pending request for this code
    const pendingTime = pendingRequestRef.current.get(upperCode);
    if (pendingTime && (now - pendingTime) < 5000) { // 5 second cooldown per code
      toast({
        title: "Request already pending",
        description: "Please wait for the current request to complete.",
        variant: "destructive",
      });
      return;
    }

    // Clear any existing timeouts or polling intervals
    if (receiveRetryTimeoutRef.current) {
      clearTimeout(receiveRetryTimeoutRef.current);
      receiveRetryTimeoutRef.current = null;
    }
    if (receivePollIntervalRef.current) {
      clearInterval(receivePollIntervalRef.current);
      receivePollIntervalRef.current = null;
    }

    // Reset counters and refs
    notFoundCountRef.current = 0;
    receiveRequestCodeRef.current = upperCode;
    receiveRetryCountRef.current = 0;

    setIsReceiving(true);
    setReceiveProgress(10);
    resetReceiveState();

    // Safety valve: 5 minutes max
    if (receiveSafetyTimerRef.current) clearTimeout(receiveSafetyTimerRef.current);
    receiveSafetyTimerRef.current = setTimeout(() => {
      if (receivePollIntervalRef.current) {
        clearInterval(receivePollIntervalRef.current);
        receivePollIntervalRef.current = null;
      }
      setIsReceiving(false);
      setReceiveProgress(0);
      receiveSafetyTimerRef.current = null;
      toast({
        title: "Transfer Timeout",
        description: "Transfer timed out after 5 minutes. Please try again.",
        variant: "destructive",
      });
    }, 5 * 60 * 1000);

    // Mark this request as pending
    pendingRequestRef.current.set(upperCode, now);
    lastRequestTimeRef.current = now;

    // Send WebSocket request if connected
    if (isConnected) {
      sendMessage({ type: 'request-file', code: upperCode });
    }

    // Check files immediately via REST
    const immediateRes = await fetchAndReceiveFiles(upperCode);
    if (immediateRes.done) {
      if (receiveSafetyTimerRef.current) {
        clearTimeout(receiveSafetyTimerRef.current);
        receiveSafetyTimerRef.current = null;
      }
      if (!immediateRes.textFound) {
        toast({
          title: "Files Received",
          description: `All files received successfully`,
        });
      }
      return;
    } else if (immediateRes.notFound) {
      notFoundCountRef.current = 1;
    }

    // Start polling interval
    let pollCount = 0;
    receivePollIntervalRef.current = setInterval(async () => {
      pollCount++;
      const res = await fetchAndReceiveFiles(upperCode);

      if (res.done) {
        if (receivePollIntervalRef.current) {
          clearInterval(receivePollIntervalRef.current);
          receivePollIntervalRef.current = null;
        }
        if (receiveSafetyTimerRef.current) {
          clearTimeout(receiveSafetyTimerRef.current);
          receiveSafetyTimerRef.current = null;
        }
        setIsReceiving(false);
        setReceiveProgress(0);
      } else if (res.notFound) {
        notFoundCountRef.current += 1;
        // If code is not found after 10 consecutive seconds, stop loading and notify user
        if (notFoundCountRef.current >= 10) {
          if (receivePollIntervalRef.current) {
            clearInterval(receivePollIntervalRef.current);
            receivePollIntervalRef.current = null;
          }
          if (receiveSafetyTimerRef.current) {
            clearTimeout(receiveSafetyTimerRef.current);
            receiveSafetyTimerRef.current = null;
          }
          receiveRequestCodeRef.current = null;
          pendingRequestRef.current.delete(upperCode);
          setIsReceiving(false);
          setReceiveProgress(0);
          toast({
            title: "File Not Found",
            description: `No file found with code ${upperCode}. Please check the code and ensure sender has shared files.`,
            variant: "destructive",
          });
        }
      } else if (res.waiting) {
        // Code exists on server (sender is uploading)
        notFoundCountRef.current = 0;
      }
    }, 1000);

    toast({
      title: "Requesting File",
      description: "Looking for file with code " + upperCode + "...",
    });
  };


  const copyCode = async () => {
    if (!transferCode) return;

    try {
      await navigator.clipboard.writeText(transferCode);
      setCopyJustDone(true);
      setTimeout(() => setCopyJustDone(false), 2000);
      toast({
        title: "Code Copied",
        description: "Share this code with the receiver",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadSingleFile = (file: any) => {
    setIsDownloading(true);
    setDownloadProgress(20);

    // Simulate progressive download for user feedback
    const progressInterval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      setIsDownloading(false);
      setDownloadProgress(0);
    }, 1500);

    toast({
      title: "Download Started",
      description: `Downloading ${file.name}`,
    });
  };

  const downloadFiles = async () => {
    if (receivedFiles.length === 0) return;

    if (receivedFiles.length === 1) {
      // Single file - download directly
      downloadSingleFile(receivedFiles[0]);
    } else {
      // Multiple files - create ZIP with progress
      setIsDownloading(true);
      setDownloadProgress(0);

      const zip = new JSZip();

      // Add all files to ZIP with progress updates
      receivedFiles.forEach((file, index) => {
        zip.file(file.name, file.blob);
        setDownloadProgress((index + 1) / receivedFiles.length * 30); // 30% for file processing
      });

      try {
        toast({
          title: "Creating ZIP",
          description: "Preparing download...",
        });

        setDownloadProgress(40);

        // Generate ZIP file with progress callback
        const zipBlob = await zip.generateAsync({
          type: "blob",
          streamFiles: true
        }, (metadata) => {
          const progress = 40 + (metadata.percent * 0.5); // 40-90% for ZIP creation
          setDownloadProgress(progress);
        });

        setDownloadProgress(95);

        // Download ZIP (filename = current date and time)
        const zipFileName = getZipFileName();
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setDownloadProgress(100);

        setTimeout(() => {
          setIsDownloading(false);
          setDownloadProgress(0);
        }, 1000);

        toast({
          title: "ZIP Download Started",
          description: `Downloading ${receivedFiles.length} files as ZIP`,
        });
      } catch (error) {
        setIsDownloading(false);
        setDownloadProgress(0);

        toast({
          title: "ZIP Creation Failed",
          description: "Could not create ZIP file",
          variant: "destructive",
        });
      }
    }
  };

  // Set up WebSocket event handlers
  useEffect(() => {
    const activeCode = inputCode.toUpperCase();

    onFileAvailable((file) => {
      const fileCode = normalizeCode(file.code || activeCode);
      receiveRequestCodeRef.current = null;
      receiveRetryCountRef.current = 0;

      // Clear pending request since we got a response
      pendingRequestRef.current.delete(fileCode);

      // Clear retry timeout
      if (receiveRetryTimeoutRef.current) {
        clearTimeout(receiveRetryTimeoutRef.current);
        receiveRetryTimeoutRef.current = null;
      }

      setReceiveProgress(30);
      if (file.totalFiles && expectedFilesCount === 0) {
        setExpectedFilesCount(file.totalFiles);
      }

      toast({
        title: "File Found",
        description: `Found ${file.fileName} (${Math.round(file.fileSize / 1024)} KB)`
          + (file.totalFiles ? ` - ${(file.fileIndex ?? 0) + 1}/${file.totalFiles}` : ''),
      });

      if (file.isReady && file.downloadUrl) {
        downloadFileJob({
          code: fileCode,
          downloadUrl: file.downloadUrl,
          fileName: file.fileName,
          fileType: file.fileType,
          fileIndex: file.fileIndex ?? 0,
          totalFiles: file.totalFiles,
        });
      }
    });

    onFileReady((data: any) => {
      const fileCode = normalizeCode(data.code || activeCode);
      receiveRequestCodeRef.current = null;
      receiveRetryCountRef.current = 0;

      // Clear pending request
      pendingRequestRef.current.delete(fileCode);

      // Clear retry timeout
      if (receiveRetryTimeoutRef.current) {
        clearTimeout(receiveRetryTimeoutRef.current);
        receiveRetryTimeoutRef.current = null;
      }

      if (data.downloadUrl) {
        downloadFileJob({
          code: fileCode,
          downloadUrl: data.downloadUrl,
          fileName: data.fileName,
          fileType: data.fileType,
          fileIndex: data.fileIndex || 0,
          totalFiles: data.totalFiles,
        });
      }
    });

    onFileNotFound((code) => {
      const requestedCode = receiveRequestCodeRef.current ?? normalizeCode(code);
      const normalizedCode = normalizeCode(requestedCode);
      const isOurRequest = receiveRequestCodeRef.current != null;

      // Clear retry timeout if exists
      if (receiveRetryTimeoutRef.current) {
        clearTimeout(receiveRetryTimeoutRef.current);
        receiveRetryTimeoutRef.current = null;
      }

      if (isOurRequest && receiveRetryCountRef.current < 2) { // Reduced to max 2 retries (3 total attempts)
        receiveRetryCountRef.current += 1;
        const attempt = receiveRetryCountRef.current;
        const delay = Math.min(2000 * attempt, 5000); // Exponential backoff: 2s, 4s, max 5s

        toast({
          title: "Still looking...",
          description: `File not ready yet. Retrying (${attempt}/2)... Ask sender to finish uploading.`,
        });

        receiveRetryTimeoutRef.current = setTimeout(() => {
          // Check if we're still in receive mode and code hasn't changed
          if (mode === 'receive' && receiveRequestCodeRef.current === normalizedCode) {
            lastRequestTimeRef.current = Date.now();
            sendMessage({ type: 'request-file', code: normalizedCode });
          }
        }, delay);
        return;
      }

      // Max retries reached or not our request - give up
      if (receivePollIntervalRef.current) {
        clearInterval(receivePollIntervalRef.current);
        receivePollIntervalRef.current = null;
      }
      receiveRequestCodeRef.current = null;
      receiveRetryCountRef.current = 0;
      pendingRequestRef.current.delete(normalizedCode);
      if (receiveSafetyTimerRef.current) { clearTimeout(receiveSafetyTimerRef.current); receiveSafetyTimerRef.current = null; }
      setIsReceiving(false);
      setReceiveProgress(0);
      toast({
        title: "File Not Found",
        description: code ? `No file found with code ${code}. Make sure the sender has shared the files first.` : "No file found. Check the code and try again.",
        variant: "destructive",
      });
    });

    onDownloadAck((data: any) => {
      const newAck = {
        id: Math.random().toString(36).substr(2, 9),
        message: data.message,
        status: data.status,
        timestamp: new Date()
      };

      setAcknowledgments(prev => [newAck, ...prev.slice(0, 4)]); // Keep last 5 acknowledgments

      toast({
        title: data.status === 'success' ? "✅ Files Downloaded!" : "❌ Download Failed",
        description: data.message,
        variant: data.status === 'success' ? "default" : "destructive",
      });
    });

    onSenderDisconnected((data: any) => {
      console.log('Sender disconnected:', data);
      receiveRequestCodeRef.current = null;
      receiveRetryCountRef.current = 0;
      if (receiveRetryTimeoutRef.current) {
        clearTimeout(receiveRetryTimeoutRef.current);
        receiveRetryTimeoutRef.current = null;
      }
      setIsReceiving(false);
      setReceiveProgress(0);
      setReceivedFiles([]);
      setExpectedFilesCount(0);
      setReceivedFilesCount(0);

      toast({
        title: "❌ Sender Disconnected",
        description: "The sender closed their browser. Files are no longer available. Please ask them to share again.",
        variant: "destructive",
      });
    });

    onFileRegistered((data: any) => {
      const registryKey = `${data.code}-${data.fileIndex}`;
      const resolver = pendingRegistrationsRef.current.get(registryKey);
      if (resolver) {
        resolver(true);
        pendingRegistrationsRef.current.delete(registryKey);
      }
    });

    return () => {
      if (receiveRetryTimeoutRef.current) {
        clearTimeout(receiveRetryTimeoutRef.current);
        receiveRetryTimeoutRef.current = null;
      }
    };
  }, [downloadFileJob, expectedFilesCount, inputCode, mode, onDownloadAck, onFileAvailable, onFileNotFound, onFileReady, onFileRegistered, onSenderDisconnected, sendMessage, toast]);

  // Auto-focus AND scroll to code input when entering receive mode
  useEffect(() => {
    if (mode === "receive" && !match) {
      const timer = setTimeout(() => {
        if (receiveCodeInputRef.current) {
          receiveCodeInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          receiveCodeInputRef.current.focus();
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [mode, match]);

  // Handle incoming share links via QR code — auto-trigger receive on scan
  useEffect(() => {
    if (match && params?.code) {
      setMode('receive');
      const scannedCode = params.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      setInputCode(scannedCode);

      // Look for transfer type parameter (e.g., ?mode=local)
      const searchParams = new URLSearchParams(window.location.search);
      const modeParam = searchParams.get('mode') as TransferType;
      if (modeParam === 'local' || modeParam === 'internet') {
        setTransferType(modeParam);
      }

      // Auto-submit after a short delay to let WS connect and state settle
      const autoSubmitTimer = setTimeout(() => {
        if (receiveCodeInputRef.current) {
          receiveCodeInputRef.current.focus();
        }
        // Programmatically click the receive button if code is valid
        if (scannedCode.length === 6) {
          const receiveBtn = document.getElementById('receive-file-btn');
          if (receiveBtn && !(receiveBtn as HTMLButtonElement).disabled) {
            receiveBtn.click();
          }
        }
      }, 800);
      return () => clearTimeout(autoSubmitTimer);
    }
  }, [match, params]);

  // Cleanup state when switching modes to prevent stuck state
  useEffect(() => {
    // Cleanup when leaving receive mode
    if (mode !== 'receive') {
      if (receiveRetryTimeoutRef.current) {
        clearTimeout(receiveRetryTimeoutRef.current);
        receiveRetryTimeoutRef.current = null;
      }
      receiveRequestCodeRef.current = null;
      receiveRetryCountRef.current = 0;
      pendingRequestRef.current.clear();
      setIsReceiving(false);
      setReceiveProgress(0);
    }

    // Cleanup when leaving send mode
    if (mode !== 'send') {
      setIsUploading(false);
      setUploadProgress(0);
      setIsPreparingLocal(false);
      setFilesReady(false);
      setTransferSpeed('');
      setEstimatedTime('');
    }

    // Cleanup when switching to select mode
    if (mode === 'select') {
      setSelectedFiles([]);
      setReceivedFiles([]);
      setExpectedFilesCount(0);
      setReceivedFilesCount(0);
      setTransferCode('');
      setInputCode('');
      setAcknowledgments([]);
      downloadedFileKeys.current.clear();
      pendingRequestRef.current.clear();
    }
  }, [mode]);

  if (mode === 'select') {
    return (
      <>
        <SEOHead
          title="HexaSend | Secure File Sharing & 6-Digit Instant Room Chat (No Sign-up)"
          description="HexaSend provides instant, zero-login 6-digit file sharing and ephemeral room chat. Transfer files securely between any device without registration."
          keywords="secure file transfer, no sign up file sharing, 6-digit code send, instant room chat, peer-to-peer file transfer, ephemeral chat online"
        />

        {/* ── JSON-LD Structured Data ── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebApplication",
                  "@id": "https://hexasend.com/#webapp",
                  "name": "HexaSend",
                  "url": "https://hexasend.com",
                  "applicationCategory": "UtilitiesApplication",
                  "operatingSystem": "All (Web Browser, iOS, Android, Windows, macOS, Linux)",
                  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
                  "description": "Secure zero-signup peer-to-peer file transfer and 6-digit code instant chat application.",
                  "featureList": ["6-Digit Code File Transfer", "Instant Ephemeral Room Chat", "Zero Account Registration", "Local WiFi Offline Transfer", "End-to-End Security & 24h Auto-Deletion"]
                },
                {
                  "@type": "HowTo",
                  "name": "How to Share Files Online using HexaSend 6-Digit Code",
                  "description": "Step-by-step guide to sending large files online without creating an account.",
                  "step": [
                    { "@type": "HowToStep", "name": "Select Files", "text": "Drag and drop or select files on HexaSend." },
                    { "@type": "HowToStep", "name": "Get 6-Digit Code", "text": "HexaSend automatically generates a unique 6-character transfer code." },
                    { "@type": "HowToStep", "name": "Share & Download", "text": "Send the 6-digit code or QR link to your recipient to download instantly." }
                  ]
                },
                {
                  "@type": "FAQPage",
                  "mainEntity": [
                    { "@type": "Question", "name": "Do I need an account to use HexaSend?", "acceptedAnswer": { "@type": "Answer", "text": "No, HexaSend requires zero registration, no email requirement, and no account setup." } },
                    { "@type": "Question", "name": "How does 6-digit code file sharing work?", "acceptedAnswer": { "@type": "Answer", "text": "When you upload files, HexaSend generates a temporary 6-digit alphanumeric code. The recipient enters this code on HexaSend to download files directly." } }
                  ]
                }
              ]
            })
          }}
        />

        <div className="bg-white">

          {/* SECTION 1: HERO */}
          <section className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
              <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

                {/* Left: headline + transfer interface */}
                <div>
                  {/* Trust badges */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 shadow-sm">
                      <Zap className="h-3 w-3 text-indigo-500" /> Fast
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 shadow-sm">
                      <Shield className="h-3 w-3 text-indigo-500" /> Secure
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 shadow-sm">
                      <Users className="h-3 w-3 text-indigo-500" /> No Registration
                    </span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.08] mb-4">
                    Share files.<br />
                    <span className="text-indigo-600">Instantly.</span>
                  </h1>
                  <p className="text-sm sm:text-lg text-slate-500 mb-6 sm:mb-8 max-w-lg leading-relaxed">
                    Send large files securely using a simple 6-digit code. No account required.
                  </p>

                  {/* Transfer Mode Selector */}
                  <div id="transfer-type-selector" className="mb-5">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setTransferType('internet')}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 text-xs sm:text-sm font-semibold transition-all ${transferType === 'internet' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                      >
                        <Globe className={`h-4 w-4 shrink-0 ${transferType === 'internet' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <div className="text-left">
                          <div className="font-semibold">Internet</div>
                          <div className="text-[10px] sm:text-xs font-normal opacity-70">Works anywhere</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setTransferType('local')}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 text-xs sm:text-sm font-semibold transition-all ${transferType === 'local' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                      >
                        <Wifi className={`h-4 w-4 shrink-0 ${transferType === 'local' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <div className="text-left">
                          <div className="font-semibold">Local Wi-Fi</div>
                          <div className="text-[10px] sm:text-xs font-normal opacity-70">Faster on same network</div>
                        </div>
                      </button>
                    </div>
                    {transferType === 'local' && (
                      <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-2 border border-green-100">
                        Both devices must be on the same WiFi or hotspot.
                      </p>
                    )}
                  </div>

                  {/* Send / Receive Cards */}
                  <div id="receive-section" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-indigo-100 rounded-lg shrink-0">
                          <Upload className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <h2 className="font-bold text-slate-900 text-sm sm:text-base">Send Files</h2>
                          <p className="text-xs text-slate-500">Select files and get a 6-digit code</p>
                        </div>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          setTimeout(() => setMode('send'), 100);
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-10 rounded-xl text-sm"
                        disabled={transferType === 'internet' && !isConnected}
                        title={transferType === 'internet' && !isConnected ? 'Connect to the server first' : undefined}
                      >
                        Start Sending →
                      </Button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                          <Download className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h2 className="font-bold text-slate-900 text-sm sm:text-base">Receive Files</h2>
                          <p className="text-xs text-slate-500">Enter 6-digit code to download</p>
                        </div>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          setTimeout(() => setMode('receive'), 100);
                        }}
                        variant="outline"
                        className="w-full border-2 border-slate-200 hover:border-purple-400 hover:bg-purple-50 text-slate-700 font-semibold h-10 rounded-xl text-sm"
                        disabled={transferType === 'internet' && !isConnected}
                        title={transferType === 'internet' && !isConnected ? 'Connect to the server first' : undefined}
                      >
                        Enter Code →
                      </Button>
                    </div>
                  </div>

                  {/* Trust indicators */}
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" /> End-to-end secure
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-slate-400" /> Temporary storage
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users className="h-3.5 w-3.5 text-slate-400" /> No account required
                    </span>
                  </div>

                  {transferType === 'internet' && !isConnected && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                      <p className="text-sm text-amber-800">Connecting to servers…</p>
                      <Button variant="outline" size="sm" className="border-amber-300 text-amber-800 hover:bg-amber-100 h-7 text-xs" onClick={reconnect}>
                        Retry
                      </Button>
                    </div>
                  )}
                </div>

                {/* Right: Animated Hero Illustration — Hidden on mobile */}
                <div className="hidden lg:flex items-center justify-center">

                  {/* ── Animation keyframes injected once ── */}
                  <style>{`
                    @keyframes heroSlideIn {
                      from { opacity: 0; transform: translateX(40px); }
                      to   { opacity: 1; transform: translateX(0); }
                    }
                    @keyframes fileFloat0 {
                      0%,100% { transform: translateY(0px);   }
                      50%      { transform: translateY(-6px);  }
                    }
                    @keyframes fileFloat1 {
                      0%,100% { transform: translateY(0px);   }
                      50%      { transform: translateY(-9px);  }
                    }
                    @keyframes fileFloat2 {
                      0%,100% { transform: translateY(0px);   }
                      50%      { transform: translateY(-7px);  }
                    }
                    @keyframes fileFloat3 {
                      0%,100% { transform: translateY(0px);   }
                      50%      { transform: translateY(-10px); }
                    }
                    @keyframes fileFloat4 {
                      0%,100% { transform: translateY(0px);   }
                      50%      { transform: translateY(-5px);  }
                    }
                    @keyframes fileEnter {
                      from { opacity: 0; transform: translateY(-18px) scale(0.85); }
                      to   { opacity: 1; transform: translateY(0)      scale(1);    }
                    }
                    @keyframes uploadPulse {
                      0%   { box-shadow: 0 0 0 0px rgba(99,102,241,0.55); }
                      70%  { box-shadow: 0 0 0 14px rgba(99,102,241,0);   }
                      100% { box-shadow: 0 0 0 0px rgba(99,102,241,0);    }
                    }
                    @keyframes downloadBounce {
                      0%,100% { transform: translateY(0);   }
                      40%      { transform: translateY(-5px); }
                      60%      { transform: translateY(-2px); }
                    }
                    @keyframes dotTravel {
                      0%   { transform: translateX(-14px); opacity: 0; }
                      20%  { opacity: 1; }
                      80%  { opacity: 1; }
                      100% { transform: translateX(14px);  opacity: 0; }
                    }
                    @keyframes codeFlip {
                      0%   { transform: rotateX(0deg);   opacity: 1; }
                      40%  { transform: rotateX(90deg);  opacity: 0; }
                      60%  { transform: rotateX(-90deg); opacity: 0; }
                      100% { transform: rotateX(0deg);   opacity: 1; }
                    }
                    @keyframes codeGlow {
                      0%,100% { box-shadow: 0 0 0 0px rgba(99,102,241,0.18); }
                      50%      { box-shadow: 0 0 0 6px rgba(99,102,241,0.10); }
                    }
                    @keyframes arrowDraw {
                      from { opacity: 0; transform: translateX(-8px); }
                      to   { opacity: 1; transform: translateX(0); }
                    }
                    @keyframes blink {
                      0%,100% { opacity: 1; } 50% { opacity: 0; }
                    }
                  `}</style>

                  <div
                    className="relative w-full max-w-lg"
                    style={{
                      animation: heroVisible ? 'heroSlideIn 0.7s cubic-bezier(.22,1,.36,1) forwards' : 'none',
                      opacity: heroVisible ? 1 : 0,
                    }}
                  >
                    {/* Soft pulsing background glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-200/50 via-purple-100/40 to-blue-200/50 rounded-3xl blur-3xl opacity-70" />

                    <div className="relative bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-2xl">

                      {/* ── 1. File Type Icons — Staggered entrance + continuous float ── */}
                      <div className="flex justify-center items-end gap-2 sm:gap-3 mb-8 flex-wrap">
                        {([
                          { emoji: '🖼️', label: 'Image', border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-600', fi: 0 },
                          { emoji: '📄', label: 'PDF', border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-600', fi: 1 },
                          { emoji: '📝', label: 'Doc', border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-600', fi: 2 },
                          { emoji: '📦', label: 'ZIP', border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-600', fi: 3 },
                          { emoji: '▶️', label: 'Media', border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-600', fi: 4 },
                        ]).map((f, i) => (
                          <div
                            key={f.label}
                            className={`px-3 py-1.5 rounded-xl border ${f.border} ${f.bg} ${f.text} text-xs font-bold shadow-sm flex items-center gap-1`}
                            style={{
                              animation: heroVisible
                                ? `fileEnter 0.5s cubic-bezier(.22,1,.36,1) ${i * 120 + 200}ms both, fileFloat${f.fi} ${2.2 + i * 0.28}s ease-in-out ${i * 120 + 750}ms infinite`
                                : 'none',
                            }}
                          >
                            {f.emoji} <span>{f.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* ── 2. Laptops + Animated Transfer Dots + Code Badge ── */}
                      <div className="flex items-center justify-between gap-3 mb-6">

                        {/* Send Laptop with Upload Pulse Ring */}
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            className="w-20 sm:w-24 h-14 sm:h-16 bg-slate-900 rounded-xl p-1 border-2 border-slate-700 relative"
                            style={{ animation: 'uploadPulse 2s ease-out 1s infinite' }}
                          >
                            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 h-full rounded-lg flex items-center justify-center">
                              <Upload className="h-6 w-6 text-white" style={{ animation: 'fileFloat0 1.8s ease-in-out infinite' }} />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-slate-700">Send</span>
                        </div>

                        {/* Animated Transfer Dots Track */}
                        <div className="flex-1 flex items-center justify-center relative h-6">
                          <div className="w-full flex items-center justify-between px-1 relative">
                            {/* Dashed line background */}
                            <div className="absolute inset-y-1/2 left-0 right-0 border-t-2 border-dashed border-indigo-200" />
                            {/* Travelling dots */}
                            {[0, 1, 2].map((dot) => (
                              <div
                                key={dot}
                                className="absolute w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-md shadow-indigo-300"
                                style={{
                                  top: '50%',
                                  left: '10%',
                                  transform: 'translateY(-50%)',
                                  animation: `dotTravel 1.4s ease-in-out ${dot * 470}ms infinite`,
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* 6-Digit Code Badge with shuffle & glow */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <div
                            className="bg-white border-2 border-indigo-200 shadow-xl rounded-2xl p-2.5 sm:p-3 text-center"
                            style={{ animation: 'codeGlow 2.5s ease-in-out infinite' }}
                          >
                            <div className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-1.5 flex items-center justify-center gap-1">
                              6-DIGIT CODE
                              <span style={{ animation: 'blink 1s step-end infinite', color: '#6366f1', fontWeight: 900 }}>|</span>
                            </div>
                            <div className="flex gap-1 sm:gap-1.5">
                              {heroCode.map((digit, idx) => (
                                <span
                                  key={idx}
                                  className="w-5 sm:w-6 h-6 sm:h-7 bg-indigo-50 border border-indigo-200 rounded font-mono font-black text-slate-800 flex items-center justify-center text-xs sm:text-sm shadow-inner"
                                  style={{
                                    animation: codeFlipping
                                      ? `codeFlip 0.6s ease-in-out ${idx * 60}ms both`
                                      : `fileEnter 0.4s ease ${idx * 80 + 400}ms both`,
                                    perspective: '400px',
                                  }}
                                >
                                  {digit}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Animated Transfer Dots Track (right side) */}
                        <div className="flex-1 flex items-center justify-center relative h-6">
                          <div className="w-full flex items-center justify-between px-1 relative">
                            <div className="absolute inset-y-1/2 left-0 right-0 border-t-2 border-dashed border-indigo-200" />
                            {[0, 1, 2].map((dot) => (
                              <div
                                key={dot}
                                className="absolute w-2.5 h-2.5 rounded-full bg-purple-500 shadow-md shadow-purple-300"
                                style={{
                                  top: '50%',
                                  left: '10%',
                                  transform: 'translateY(-50%)',
                                  animation: `dotTravel 1.4s ease-in-out ${dot * 470 + 200}ms infinite`,
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Receive Laptop with Download Bounce */}
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-20 sm:w-24 h-14 sm:h-16 bg-slate-900 rounded-xl p-1 border-2 border-slate-700 shadow-lg">
                            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 h-full rounded-lg flex items-center justify-center">
                              <Download
                                className="h-6 w-6 text-white"
                                style={{ animation: 'downloadBounce 1.5s ease-in-out 0.8s infinite' }}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-slate-700">Receive</span>
                        </div>
                      </div>

                      {/* ── 3. Annotated "Share this code" line with draw-on animation ── */}
                      <p
                        className="text-center text-xs sm:text-sm text-indigo-600 font-semibold italic flex items-center justify-center gap-1"
                        style={{
                          animation: heroVisible ? 'arrowDraw 0.8s cubic-bezier(.22,1,.36,1) 1.2s both' : 'none',
                        }}
                      >
                        <span style={{ fontSize: '1rem' }}>↗</span>
                        Share this code with anyone
                      </p>

                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* SECTION 2: STATS */}
          <section className="py-8 border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <TransferStats stats={stats} />
            </div>
          </section>

          {/* SECTION 3: WHY HEXASEND */}
          <section className="py-14 border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Why Choose HexaSend?</h2>
                <p className="text-slate-500 text-sm sm:text-base">Simple, secure and powerful file sharing for everyone.</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: Zap, iconBg: "bg-indigo-100", iconColor: "text-indigo-600", title: "Instant P2P Transfer", desc: "Send large files with a 6-digit code. No registration needed." },
                  { icon: MessageSquare, iconBg: "bg-purple-100", iconColor: "text-purple-600", title: "6-Digit Room Chat", desc: "Create temporary chat rooms to share messages, photos and files." },
                  { icon: Wifi, iconBg: "bg-green-100", iconColor: "text-green-600", title: "Local Wi-Fi Transfer", desc: "Super fast transfer on the same network. No internet needed." },
                  { icon: Shield, iconBg: "bg-orange-100", iconColor: "text-orange-600", title: "Secure & Private", desc: "Files are temporary and automatically deleted after expiry." },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-center">
                      <div className={`inline-flex items-center justify-center p-3 ${item.iconBg} rounded-xl mb-4`}>
                        <Icon className={`h-6 w-6 ${item.iconColor}`} />
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mb-2">{item.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 4: INSTANT CHAT ROOM */}
          <section className="py-14 border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/70">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-2 gap-10 items-center">
                {/* Chat UI Graphic Mockup matching reference image */}
                <div className="hidden md:flex items-center justify-center">
                  <div className="relative w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                      </div>
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">💬 Live Chat: HX-8492</span>
                    </div>

                    <div className="space-y-3">
                      {/* Received Message */}
                      <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">A</div>
                        <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none text-xs text-slate-700 max-w-[80%]">
                          Hey! Can you send over the presentation file?
                        </div>
                      </div>
                      {/* Sent Message */}
                      <div className="flex gap-2 justify-end">
                        <div className="bg-indigo-600 p-3 rounded-2xl rounded-tr-none text-xs text-white max-w-[80%]">
                          Sure! Use code <span className="font-mono font-bold bg-white/20 px-1 rounded">HX-8492</span> or download here 🚀
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    REAL-TIME MESSAGING
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Instant Chat Room</h2>
                  <p className="text-slate-500 mb-6 leading-relaxed text-sm sm:text-base">
                    Create a temporary chat room with a 6-digit code. Share text, images and files in real-time. No login required — rooms vanish automatically.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link href="/chat" className="flex-1">
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11 rounded-xl text-sm flex items-center justify-center gap-2">
                        <MessageSquare className="h-4 w-4" /> Create New Chat Room
                      </Button>
                    </Link>
                    <div className="flex gap-2 flex-1">
                      <Input
                        type="text"
                        placeholder="Room Code"
                        value={homeChatCode}
                        onChange={(e) => setHomeChatCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                        className="font-mono text-center tracking-widest border-slate-200 focus:border-indigo-400 h-11 text-sm"
                        maxLength={6}
                      />
                      <Link href={homeChatCode.length === 6 ? `/room/${homeChatCode}` : `/chat`}>
                        <Button
                          disabled={homeChatCode.length !== 6}
                          variant="outline"
                          className="border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold h-11 px-4 whitespace-nowrap text-sm"
                        >
                          Join with Code
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 5: HOW IT WORKS */}
          <section className="py-14 border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">How It Works?</h2>
                <p className="text-slate-500 text-sm">Share files in just a few simple steps.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative">
                {[
                  { icon: Upload, color: "bg-indigo-600", title: "1. Select Files", desc: "Choose the files you want to share." },
                  { icon: Zap, color: "bg-purple-600", title: "2. Get 6-Digit Code", desc: "We generate a unique 6-digit code for your files." },
                  { icon: Share, color: "bg-green-600", title: "3. Share the Code", desc: "Share the code with anyone you want." },
                  { icon: Download, color: "bg-orange-500", title: "4. Download Files", desc: "They enter the code and download." },
                ].map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="flex flex-col items-center text-center">
                      <div className={`${step.color} w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-md`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mb-1">{step.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 6: ADVERTISEMENT */}
          <div className="py-6 border-b border-slate-100 bg-slate-50/50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="min-h-[100px] w-full flex flex-col items-center justify-center bg-slate-100/80 border border-slate-200 rounded-2xl p-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">ADVERTISEMENT</span>
                <p className="text-xs text-slate-500 font-medium">Ad will appear here (Responsive size)</p>
              </div>
            </div>
          </div>

          {/* SECTION 7: FAQ & LATEST FROM OUR BLOG (2 Columns on Desktop) */}
          <section className="py-14 border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">

                {/* Frequently Asked Questions */}
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">Frequently Asked Questions</h2>
                    <p className="text-xs sm:text-sm text-slate-500">Find answers to common questions about HexaSend.</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { q: "How do I share files online using a 6-digit code?", a: "Select your files on HexaSend to generate a unique 6-character code (e.g. WORK88). Send this code to your recipient, who enters it on HexaSend to download files directly on any phone, tablet, or PC." },
                      { q: "What is HexaSend 6-Digit Instant Room Chat?", a: "Instant Room Chat allows users to join or create temporary chat rooms using a 6-digit room code. Users can text, paste image attachments, and share files live with real-time typing indicators without creating an account." },
                      { q: "Do I need an account or email registration?", a: "No. HexaSend requires zero registration, no email requirement, and no account setup." },
                      { q: "Are my transferred files and chat messages stored permanently?", a: "No. Transferred files are held temporarily and automatically deleted after 24 hours. Room chat messages exist only during active sessions and are zero-logged." },
                      { q: "Can I transfer files offline over Local WiFi?", a: "Yes. Switch to 'Local WiFi Mode' when both devices are connected to the same WiFi network or mobile hotspot for ultra-fast LAN file transfers without consuming external internet bandwidth." },
                      { q: "What happens if I close my browser before the recipient downloads?", a: "For active peer-to-peer transfers, the sender browser tab must remain open until the receiver reaches 100%. Closing your browser tab severs the stream connection to protect your privacy." },
                    ].map((faq, i) => (
                      <details key={i} className="bg-white border border-slate-200 rounded-xl px-4 py-3 group shadow-sm">
                        <summary className="font-semibold text-slate-900 cursor-pointer flex items-center justify-between text-sm">
                          <span>{faq.q}</span>
                          <span className="text-indigo-600 font-bold text-lg ml-3 shrink-0 group-open:rotate-45 transition-transform">+</span>
                        </summary>
                        <div className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-2.5">{faq.a}</div>
                      </details>
                    ))}
                  </div>
                </div>

                {/* Latest from Our Blog (Cards with Images) */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">Latest from Our Blog</h2>
                      <p className="text-xs sm:text-sm text-slate-500">Tips, guides and updates on secure file sharing.</p>
                    </div>
                    <Link href="/blog" className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 shrink-0">
                      View All Articles →
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
                    {getLatestBlogPosts().map((post) => (
                      <Link key={post.id} href={`/blog/${post.slug}`}>
                        <div className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col h-full">
                          {/* Feature Image Banner */}
                          <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-slate-100">
                            <img
                              src={post.featureImage || 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop'}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <span className="absolute bottom-2 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow">
                              {post.category}
                            </span>
                          </div>
                          {/* Content */}
                          <div className="p-3 sm:p-4 flex flex-col justify-between flex-1">
                            <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                              {post.title}
                            </h3>
                            <div>
                              <p className="text-[10px] text-slate-400 mb-2">{post.date}</p>
                              <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                                Read Article →
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* SECTION 8: TECHNICAL SPECS */}
          <section className="py-10 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">HexaSend Technical Specifications</h3>
                  <p className="text-xs text-slate-500">Authoritative facts & security architecture for web crawlers and AI search engines.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Architecture", title: "Direct & Temporary Storage", desc: "Files are temporarily stored and auto-deleted within 24h." },
                  { label: "Authentication", title: "Zero Signup (Private)", desc: "No email, phone number, or login account required." },
                  { label: "Security & TTL", title: "24h Auto-Expiry Purge", desc: "All temporary files and active chat rooms are completely wiped automatically." },
                  { label: "Transfer Modes", title: "Internet & Local WiFi", desc: "Supports global web streaming and direct offline LAN file transfer." },
                ].map((spec) => (
                  <div key={spec.label} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">{spec.label}</span>
                    <p className="text-sm font-bold text-slate-800 mb-1">{spec.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{spec.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </>
    );
  }

  if (mode === 'send') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => {
                  setMode('select');
                  // Clear all files and state when going back from send mode
                  setSelectedFiles([]);
                  setUploadProgress(0);
                  setIsUploading(false);
                  setFilesReady(false);
                  setTransferCode('');
                  setAcknowledgments([]);
                  if (transferType === 'local' && isLocalServerRunning) {
                    stopLocalServer();
                  }
                }, 100);
              }}
              className="mb-6 text-lg hover:bg-white/80 transition-all duration-200"
            >
              ← Back to Home
            </Button>

            <div className="text-center mb-12">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-2xl opacity-30 w-24 h-24 mx-auto"></div>
                {/* <div className="relative inline-flex items-center justify-center p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl">
                  <Upload className="h-12 w-12 text-white" />
                </div> */}
              </div>
              <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Send Your Files {transferType === 'local' ? '(Local Network)' : ''}
              </h2>
              {/* <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
                {transferType === 'local'
                  ? 'Share files at high speed on your local network. Perfect for large files!'
                  : 'Share files instantly with military-grade security. Your files, your control, your privacy.'
                }
              </p> */}
              {transferType === 'local' && (
                <div className="mt-4">
                  <Badge variant="secondary" className="text-sm">
                    <Wifi className="w-4 h-4 mr-2" />
                    Local Network Mode - High Speed Transfer
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">

              {!filesReady ? (
                <div className="space-y-8">
                  {selectedFiles.length === 0 ? (
                    <div className="text-center">

                      <DragDropZone onFilesSelected={handleFilesSelected} ariaLabel="Choose files to send. All file types supported.">
                        <div className="p-12 space-y-6">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-20 w-20 h-20 mx-auto"></div>
                            <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-6 w-fit mx-auto">
                              <Upload className="h-16 w-16 text-white" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <p className="text-lg md:text-2xl font-bold text-gray-900">
                              Drop Files Here or Click to Browse
                            </p>
                            <p className="text-sm md:text-lg text-gray-600">
                              All file types (images, documents, videos, HEIC, etc.) • Internet & local network • Multiple files auto ZIP
                            </p>
                            <div className="flex justify-center space-x-4 text-sm font-medium">
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">⚡ Fast</span>
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">🛡️ Secure</span>
                              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">🔒 Private</span>
                            </div>
                          </div>
                        </div>
                      </DragDropZone>

                      {/* Terms checkbox — ref used to scroll here when user forgets to check */}
                      <style>{`
                        @keyframes termsShake {
                          0%,100% { transform: translateX(0); }
                          15%     { transform: translateX(-7px); }
                          30%     { transform: translateX(7px); }
                          45%     { transform: translateX(-5px); }
                          60%     { transform: translateX(5px); }
                          75%     { transform: translateX(-3px); }
                          90%     { transform: translateX(3px); }
                        }
                        .terms-shake { animation: termsShake 0.6s ease both; }
                        .terms-shake-wrap { border-color: #ef4444 !important; background: #fef2f2 !important; }
                      `}</style>
                      <div
                        ref={termsCheckboxRef}
                        className={`flex items-start space-x-3 mt-4 p-4 rounded-xl border-2 mx-auto max-w-lg shadow-sm transition-all duration-300 ${termsShake
                          ? 'terms-shake terms-shake-wrap border-red-400 bg-red-50'
                          : termsAgreed
                            ? 'border-green-300 bg-green-50'
                            : 'border-blue-100 bg-white/50'
                          }`}
                      >
                        <Checkbox
                          id="terms"
                          checked={termsAgreed}
                          onCheckedChange={(checked) => setTermsAgreed(checked as boolean)}
                          className="mt-0.5 flex-shrink-0"
                        />
                        <Label htmlFor="terms" className="text-sm font-medium leading-snug cursor-pointer text-gray-700">
                          {!termsAgreed && termsShake && (
                            <span className="block text-red-600 font-bold text-xs mb-1">⚠️ Please check this box to continue</span>
                          )}
                          I agree to the{' '}
                          <Link href="/terms"><span className="text-blue-600 underline cursor-pointer">Terms of Service</span></Link>
                          {' '}and confirm I have the legal right to share these files.
                          {termsAgreed && <span className="ml-2 text-green-600 font-bold">✓ Ready to upload!</span>}
                        </Label>
                      </div>

                      <div className="mt-8 p-4 md:p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
                        <h4 className="font-bold text-gray-900 mb-3 text-sm md:text-base">💡 Pro Tips</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm text-gray-700">
                          <div>• All file types allowed</div>
                          <div>• Multiple files = Auto ZIP</div>
                          <div>• No size limits • 1hr expiry</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h3 className="text-lg md:text-2xl font-bold text-gray-900">
                          Ready to Send ({selectedFiles.length} files)
                        </h3>
                        <div className="text-sm text-gray-500">
                          Total: {(selectedFiles.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(1)} MB
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {selectedFiles.length} file(s), {(selectedFiles.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(1)} MB total. Click the area below to add more or continue.
                      </p>

                      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-200">
                        <div className="grid gap-3 max-h-64 overflow-y-auto">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                              <FilePreview file={file} showSize={true} />
                              <Button
                                onClick={() => {
                                  setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                                }}
                                variant="outline"
                                size="sm"
                                className="ml-3 text-red-600 hover:bg-red-50 border-red-200 flex-shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {(isUploading || isPreparingLocal) && (
                        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                          {isPreparingLocal ? (
                            <div className="flex items-center gap-3">
                              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                              <p className="text-sm font-medium text-gray-700">Preparing local server…</p>
                            </div>
                          ) : (
                            <TransferProgress
                              progress={uploadProgress}
                              transferSpeed={transferSpeed}
                              estimatedTime={estimatedTime}
                              fileName={selectedFiles.length > 1 ? `File ${uploadingFileIndex + 1} of ${selectedFiles.length}: ${uploadingFileName}` : (selectedFiles[0]?.name ?? uploadingFileName)}
                            />
                          )}
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                        <DragDropZone onFilesSelected={(newFiles) => {
                          setSelectedFiles(prev => [...prev, ...newFiles]);
                        }} ariaLabel="Add more files to this transfer.">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" className="w-full sm:flex-1 h-12 text-sm md:text-lg border-2 hover:bg-blue-50 min-h-[44px] focus-visible:ring-2">
                                <Upload className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                                Add More Files
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add more files to this transfer.</TooltipContent>
                          </Tooltip>
                        </DragDropZone>
                        <Button
                          onClick={() => {
                            setSelectedFiles([]);
                            setUploadProgress(0);
                            setIsUploading(false);
                          }}
                          variant="outline"
                          className="w-full sm:flex-1 h-12 text-sm md:text-lg border-2 hover:bg-red-50 text-red-600 border-red-200"
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (

                <div className="text-center space-y-8">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-2xl p-8">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-20 w-16 h-16 mx-auto"></div>
                      <div className="relative bg-green-500 rounded-2xl p-4 w-fit mx-auto">
                        <CheckCircle className="h-12 w-12 text-white" />
                      </div>
                    </div>
                    <h3 className="text-lg md:text-2xl font-bold text-green-800 mb-4">
                      🎉 Files Ready to Share!
                    </h3>
                    <p className="text-sm md:text-lg text-green-700 mb-2">
                      {selectedFiles.length} file(s) uploaded and secured.
                    </p>
                    <p className="text-sm text-green-600 mb-6">Share the code below with the receiver.</p>

                    <div className="bg-white rounded-xl p-4 border border-green-300 mb-6">
                      <div className="grid gap-2 max-h-32 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                            <FilePreview file={file} showSize={true} />
                            <Button
                              onClick={() => {
                                setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                              }}
                              variant="outline"
                              size="sm"
                              className="ml-3 text-red-600 hover:bg-red-50 border-red-200 flex-shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-4 md:p-6 text-white text-center">
                      <p className="text-sm md:text-lg font-semibold mb-6">
                        {transferType === 'local' ? '🏠 Local Network Share Code' : '🔐 Your Secure Share Code'}
                      </p>

                      {transferCode && (
                        <div className="flex flex-col items-center justify-center mb-8">
                          <div className="bg-white p-3 rounded-2xl shadow-xl inline-block">
                            <QRCodeSVG
                              value={`${resolvedLocalIP ? `http://${resolvedLocalIP}:${window.location.port}` : window.location.origin}/share/${transferCode}?mode=${transferType}`}
                              size={180}
                              bgColor="#ffffff"
                              fgColor="#000000"
                              level="Q"
                              includeMargin={false}
                              className="rounded-lg"
                            />
                          </div>
                          <p className="text-white/80 text-sm mt-3 font-medium">Scan with camera to receive instantly</p>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
                        <div
                          className="bg-white/20 backdrop-blur px-4 md:px-6 py-3 md:py-4 rounded-xl font-mono text-xl md:text-3xl font-bold tracking-wider"
                          role="text"
                          aria-label={transferCode ? `Share code: ${transferCode}` : undefined}
                        >
                          {transferCode}
                        </div>
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={copyCode}
                          className="bg-white/20 hover:bg-white/30 text-white border-white/30 w-full sm:w-auto min-h-[44px] focus-visible:ring-2"
                        >
                          <Copy className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                          {copyJustDone ? "Copied!" : "Copy"}
                        </Button>
                      </div>

                      {transferType === 'local' && localServerInfo ? (
                        <div className="mt-6 p-4 bg-white/10 rounded-xl">
                          <p className="text-white/90 text-sm mb-1">
                            <Wifi className="w-4 h-4 inline mr-2" />
                            Server: {localServerInfo.ip}:{localServerInfo.port}
                          </p>
                          <p className="text-white/80 text-xs mt-2">
                            Devices on the same WiFi/hotspot: open HexaSend, choose Receive, and enter the code above.
                          </p>
                        </div>
                      ) : (
                        <p className="text-blue-100 text-sm md:text-base mt-2">
                          Share this code with the receiver. Files expire in 1 hour for maximum security.
                        </p>
                      )}
                    </div>
                  </div>

                  {acknowledgments.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                      <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        📱 Download Status
                        <span className="text-sm font-normal text-gray-600">({acknowledgments.length} update{acknowledgments.length > 1 ? 's' : ''})</span>
                      </h4>
                      <div className="space-y-3">
                        {acknowledgments.slice(0, 3).map((ack) => (
                          <div key={ack.id} className={`p-4 rounded-xl border-l-4 ${ack.status === 'success'
                            ? 'bg-green-50 border-l-green-500 text-green-800'
                            : 'bg-red-50 border-l-red-500 text-red-800'
                            }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{ack.status === 'success' ? '✅' : '❌'}</span>
                                <div>
                                  <p className="font-medium">{ack.message}</p>
                                  <p className="text-xs opacity-70 mt-1">
                                    {ack.timestamp.toLocaleTimeString()} • {ack.timestamp.toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {acknowledgments.length > 3 && (
                          <p className="text-center text-sm text-gray-500 pt-2">
                            ... and {acknowledgments.length - 3} more update{acknowledgments.length - 3 > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setTimeout(() => {
                          setMode('select');
                          setSelectedFiles([]);
                          setTransferCode('');
                          setFilesReady(false);
                          setAcknowledgments([]);
                          if (transferType === 'local' && isLocalServerRunning) {
                            stopLocalServer();
                          }
                        }, 100);
                      }}
                      className="w-full sm:flex-1 h-12 text-sm md:text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      Send More Files
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setTimeout(() => setMode('receive'), 100);
                      }}
                      variant="outline"
                      className="w-full sm:flex-1 h-12 text-sm md:text-lg border-2"
                    >
                      Receive Files
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (mode === 'receive') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => {
                  setMode('select');
                  // Clear state when going back from receive mode
                  setInputCode('');
                  setReceivedFiles([]);
                  setExpectedFilesCount(0);
                  setReceivedFilesCount(0);
                  setIsReceiving(false);
                  setReceiveProgress(0);
                }, 100);
              }}
              className="mb-6 text-lg hover:bg-white/80 transition-all duration-200"
            >
              ← Back to Home
            </Button>

            <div className="text-center mb-12">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-2xl opacity-30 w-24 h-24 mx-auto"></div>
                {/* <div className="relative inline-flex items-center justify-center p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl">
                  <Download className="h-12 w-12 text-white" />
                </div> */}
              </div>
              <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
                Receive Files {transferType === 'local' ? '(Local Network)' : ''}
              </h2>
              {/* <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
                {transferType === 'local'
                  ? 'Enter code to receive files from devices on your local network.'
                  : 'Enter your 6-digit secure code to instantly download files shared with you.'
                }
              </p> */}
              {transferType === 'local' && (
                <div className="mt-4">
                  <Badge variant="secondary" className="text-sm">
                    <Wifi className="w-4 h-4 mr-2" />
                    Local Network Mode - High Speed Transfer
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">

              {receivedFiles.length === 0 ? (
                <div className="text-center space-y-8">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8 border border-purple-200">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-20 w-16 h-16 mx-auto"></div>
                      <div className="relative bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl p-4 w-fit mx-auto">
                        <Download className="h-12 w-12 text-white" />
                      </div>
                    </div>

                    <h3 className="text-lg md:text-2xl font-bold text-gray-900 mb-4">
                      {transferType === 'local' ? 'Local Network Code' : 'Enter Your Code'}
                    </h3>
                    <p className="text-sm md:text-lg text-gray-600 mb-8">
                      {transferType === 'local'
                        ? 'Enter the code from a device on your local network'
                        : 'Type the 6-character code shared with you'
                      }
                    </p>

                    {/* {transferType === 'local' && (
                      <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-800">Available Devices</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={scanForDevices}
                            disabled={isScanning}
                            className="text-xs"
                          >
                            {isScanning ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Scanning...
                              </>
                            ) : (
                              <>
                                <Search className="w-3 h-3 mr-1" />
                                Scan Network
                              </>
                            )}
                          </Button>
                        </div>

                        {availableDevices.length > 0 ? (
                          <div className="space-y-2">
                            {availableDevices.map((device) => (
                              <div key={device.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                <div className="flex items-center gap-2">
                                  <Wifi className="w-4 h-4 text-green-500" />
                                  <span className="text-sm font-medium">{device.name}</span>
                                  <span className="text-xs text-gray-500">{device.ip}</span>
                                </div>
                                <Badge variant="outline" className="text-xs">Online</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 text-center py-2">
                            {isScanning ? 'Scanning for devices...' : `${availableDevices.length} devices found. Click scan to search for HexaSend devices.`}
                          </p>
                        )}
                      </div>
                    )} */}

                    <div className="max-w-md mx-auto space-y-6">
                      <Input
                        ref={receiveCodeInputRef}
                        type="text"
                        inputMode="text"
                        autoComplete="one-time-code"
                        placeholder="e.g. ABC123"
                        value={inputCode}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const normalized = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
                          setInputCode(normalized);
                        }}
                        className="text-center text-lg md:text-2xl font-mono tracking-widest h-12 md:h-16 border-2 border-purple-200 focus:border-purple-500 bg-white min-h-[44px] focus-visible:ring-2"
                        maxLength={8}
                        aria-label="Enter 6-digit share code"
                      />

                      <Button
                        onClick={() => handleReceiveFile()}
                        id="receive-file-btn"
                        className="w-full h-12 md:h-14 text-sm md:text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg font-semibold min-h-[44px] focus-visible:ring-2"
                        disabled={(transferType === 'internet' && !isConnected) || inputCode.length !== 6 || isReceiving}
                        title={inputCode.length !== 6 ? "Enter a 6-character code" : transferType === 'internet' && !isConnected ? "Connect to the server first" : undefined}
                      >
                        {isReceiving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Receiving files…
                          </>
                        ) : inputCode.length === 6 ? 'Get My Files 🚀' : `Enter ${6 - inputCode.length} more characters`}
                      </Button>

                      {inputCode.length === 6 && !isReceiving && (
                        <p className="text-xs text-gray-500 text-center">We&apos;ll look for files with this code.</p>
                      )}

                      {isReceiving && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm text-gray-600">
                            {receiveProgress < 20 ? "Looking for files…" : receiveProgress < 100 ? "Requesting files…" : "Receiving files…"}
                            {expectedFilesCount > 1 && receivedFilesCount > 0 && ` Received ${receivedFilesCount} of ${expectedFilesCount} files.`}
                          </p>
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>{receiveProgress < 20 ? "Requesting…" : "Receiving…"}</span>
                            <span>{Math.round(receiveProgress)}%</span>
                          </div>
                          <Progress value={receiveProgress} className="h-2" />
                          <p className="text-xs text-gray-500">If the sender just started, we&apos;ll retry automatically.</p>
                        </div>
                      )}

                      {transferType === 'internet' && !isConnected && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                          <p className="text-red-600 font-medium">🔄 Connecting to secure servers…</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 md:p-6 border border-blue-200">
                    <h4 className="font-bold text-gray-900 mb-3 text-sm md:text-base">💡 Quick Tips</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm text-gray-700">
                      <div>• Codes are case-insensitive</div>
                      <div>• Files download instantly</div>
                      <div>• Multiple files come as ZIP</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-8">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-2xl p-8">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-20 w-16 h-16 mx-auto"></div>
                      <div className="relative bg-green-500 rounded-2xl p-4 w-fit mx-auto">
                        <CheckCircle className="h-12 w-12 text-white" />
                      </div>
                    </div>

                    <h3 className="text-lg md:text-2xl font-bold text-green-800 mb-4">
                      {expectedFilesCount > 0 && receivedFilesCount < expectedFilesCount
                        ? `📥 Receiving Files... (${receivedFilesCount}/${expectedFilesCount})`
                        : `🎉 Files Ready to Download!`
                      }
                    </h3>
                    <p className="text-sm md:text-lg text-green-700 mb-6">
                      {expectedFilesCount > 0 && receivedFilesCount < expectedFilesCount
                        ? `${receivedFilesCount} of ${expectedFilesCount} files received. Please wait for all files to complete.`
                        : `${receivedFiles.length} file(s) successfully received and verified.`
                      }
                    </p>

                    <div className="bg-white rounded-xl p-4 md:p-6 border border-green-300 mb-6">
                      <div className="grid gap-2 md:gap-3 max-h-48 overflow-y-auto">
                        {receivedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                              <FileText className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                              <div className="text-left min-w-0 flex-1">
                                <p className="font-medium text-gray-900 truncate text-sm md:text-base">{file.name}</p>
                                <p className="text-xs md:text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>
                            {receivedFiles.length > 1 && (
                              <Button
                                onClick={() => downloadSingleFile(file)}
                                size="sm"
                                variant="outline"
                                className="ml-2 text-xs px-2 py-1 h-7 min-h-[44px] min-w-[44px] focus-visible:ring-2"
                                disabled={isDownloading}
                                aria-label={`Download ${file.name}`}
                              >
                                {isDownloading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Download className="h-3 w-3 mr-1" />
                                    Download
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 p-2 md:p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs md:text-sm text-blue-700 font-medium">
                          Total: {(receivedFiles.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>

                    {receivedFiles.length > 1 ? (
                      <div className="space-y-3 mb-4">
                        <Button
                          onClick={downloadFiles}
                          className="w-full h-12 md:h-14 text-sm md:text-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg font-semibold min-h-[44px] focus-visible:ring-2"
                          disabled={isDownloading}
                          aria-label={`Download all ${receivedFiles.length} files as ZIP`}
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating ZIP…
                            </>
                          ) : (
                            <>
                              <Archive className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                              Download All as ZIP ({receivedFiles.length} {receivedFiles.length === 1 ? 'file' : 'files'})
                            </>
                          )}
                        </Button>
                        <p className="text-center text-xs text-gray-500">ZIP will be named with current date and time (e.g. HexaSend-2026-02-01_14-30-00.zip).</p>
                        {isDownloading && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Preparing download…</span>
                              <span>{Math.round(downloadProgress)}%</span>
                            </div>
                            <Progress value={downloadProgress} className="h-2" />
                          </div>
                        )}
                        {expectedFilesCount > 0 && receivedFiles.length < expectedFilesCount && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-3 mt-4">
                            <p className="text-xs md:text-sm text-amber-800 font-medium">
                              ⏳ {receivedFiles.length} of {expectedFilesCount} files received. {expectedFilesCount - receivedFiles.length} file(s) still pending from sender.
                            </p>
                            <Button
                              onClick={() => fetchAndReceiveFiles()}
                              size="sm"
                              variant="outline"
                              className="text-xs h-9 border-amber-300 text-amber-900 hover:bg-amber-100 font-semibold"
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                              Check for Remaining Files
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 mb-4">
                        <Button
                          onClick={downloadFiles}
                          className="w-full h-12 md:h-14 text-sm md:text-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg font-semibold min-h-[44px] focus-visible:ring-2"
                          disabled={isDownloading}
                          aria-label={receivedFiles[0] ? `Download ${receivedFiles[0].name}` : "Download file"}
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Downloading…
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                              {receivedFiles[0] ? (receivedFiles[0].name.length > 25 ? "Download File" : `Download ${receivedFiles[0].name}`) : "Download File"}
                            </>
                          )}
                        </Button>
                        {isDownloading && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Download in progress…</span>
                              <span>{Math.round(downloadProgress)}%</span>
                            </div>
                            <Progress value={downloadProgress} className="h-2" />
                          </div>
                        )}
                        {expectedFilesCount > 1 && receivedFiles.length < expectedFilesCount && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-3 mt-4">
                            <p className="text-xs md:text-sm text-amber-800 font-medium">
                              ⏳ 1 of {expectedFilesCount} files received. {expectedFilesCount - 1} file(s) still pending from sender.
                            </p>
                            <Button
                              onClick={() => fetchAndReceiveFiles()}
                              size="sm"
                              variant="outline"
                              className="text-xs h-9 border-amber-300 text-amber-900 hover:bg-amber-100 font-semibold"
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                              Check for Remaining Files
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setTimeout(() => {
                          setReceivedFiles([]);
                          setInputCode('');
                          setExpectedFilesCount(0);
                          setReceivedFilesCount(0);
                        }, 100);
                      }}
                      className="w-full sm:flex-1 h-12 text-sm md:text-lg border-2"
                    >
                      Receive More Files
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setTimeout(() => setMode('send'), 100);
                      }}
                      className="w-full sm:flex-1 h-12 text-sm md:text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      Send Files
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
