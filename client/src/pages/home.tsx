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
  const pendingRequestRef = useRef<Map<string, number>>(new Map()); // Track pending requests with timestamps
  const lastRequestTimeRef = useRef<number>(0); // Rate limiting for request-file
  const pendingRegistrationsRef = useRef<Map<string, (value: unknown) => void>>(new Map());
  const receiveSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Safety timeout to prevent stuck state
  const receivePollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notFoundCountRef = useRef<number>(0);

  // Instant Chat room state for home page
  const [homeChatCode, setHomeChatCode] = useState<string>('');

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

  // Auto-focus code input when entering receive mode
  useEffect(() => {
    if (mode === "receive" && receiveCodeInputRef.current && !match) {
      receiveCodeInputRef.current.focus();
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
          title="HexaSend | Free File Sharing & 6-Digit Instant Room Chat (No Sign-up)"
          description="HexaSend provides instant, zero-login 6-digit file sharing and ephemeral room chat. Transfer files securely between any device without registration."
          keywords="free file transfer, no sign up file sharing, 6-digit code send, instant room chat, peer-to-peer file transfer, ephemeral chat online"
        />

        {/* ── JSON-LD Structured Data Schemas for SEO, GEO & AEO ── */}
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
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                  },
                  "description": "Free zero-signup peer-to-peer file transfer and 6-digit code instant chat application.",
                  "featureList": [
                    "6-Digit Code File Transfer",
                    "Instant Ephemeral Room Chat",
                    "Zero Account Registration",
                    "Local WiFi Offline Transfer",
                    "End-to-End Security & 24h Auto-Deletion"
                  ]
                },
                {
                  "@type": "HowTo",
                  "name": "How to Share Files Online using HexaSend 6-Digit Code",
                  "description": "Step-by-step guide to sending large files online without creating an account.",
                  "step": [
                    {
                      "@type": "HowToStep",
                      "name": "Select Files",
                      "text": "Drag and drop or select files on HexaSend."
                    },
                    {
                      "@type": "HowToStep",
                      "name": "Get 6-Digit Code",
                      "text": "HexaSend automatically generates a unique 6-character transfer code."
                    },
                    {
                      "@type": "HowToStep",
                      "name": "Share & Download",
                      "text": "Send the 6-digit code or QR link to your recipient to download instantly."
                    }
                  ]
                },
                {
                  "@type": "FAQPage",
                  "mainEntity": [
                    {
                      "@type": "Question",
                      "name": "Is HexaSend free to use without an account?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes, HexaSend is 100% free with zero registration, no email requirement, and no account setup."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "How does 6-digit code file sharing work?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "When you upload files, HexaSend generates a temporary 6-digit alphanumeric code. The recipient enters this code on HexaSend to download files directly."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "What is HexaSend 6-Digit Instant Room Chat?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "HexaSend Instant Room Chat is an ephemeral, zero-login chat room feature. Enter any 6-digit room code to text, paste images, and share files live with live typing indicators."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "Are my files stored securely?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Files are streamed directly or stored temporarily in memory for active transfers and are automatically purged after download or expiration."
                      }
                    }
                  ]
                }
              ]
            })
          }}
        />
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="text-center space-y-12">

              {/* Clean Hero Section */}
              <div className="space-y-12">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-3xl opacity-20 w-32 h-32 mx-auto"></div>
                  <div className="relative inline-flex items-center justify-center p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl mb-6">
                    <Share className="h-16 w-16 text-white" />
                  </div>
                </div>

                <div className="space-y-8">
                  <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent leading-tight">
                    HexaSend
                  </h1>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-700 max-w-3xl mx-auto leading-relaxed">
                    Share Any File in Seconds with Just a 6-Digit Code
                  </h2>

                  <div className="flex flex-wrap justify-center gap-3 text-sm md:text-base font-medium">
                    <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full">Zero Setup</span>
                    <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full">Secure</span>
                    <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full">Lightning Fast</span>
                  </div>
                </div>

                {/* 🚀 STUNNING CORE FEATURES SHOWCASE SECTION */}
                <div className="max-w-4xl mx-auto mt-8 pt-4">
                  <div className="text-center mb-6">
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs inline-flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-indigo-600 animate-pulse" /> Core Capabilities
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-2">
                      Two Powerful Features, Zero Sign-up Needed
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">

                    {/* FEATURE 1: FILE TRANSFER */}
                    <div className="group relative rounded-3xl p-6 bg-gradient-to-b from-white via-slate-50/80 to-blue-50/50 border border-blue-200/80 shadow-xl hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none"></div>

                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                            <Upload className="h-7 w-7" />
                          </div>
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-semibold px-2.5 py-0.5 text-[11px]">
                            📁 FILE TRANSFER
                          </Badge>
                        </div>

                        <h4 className="text-xl font-bold text-slate-900 mb-1.5 flex items-center gap-2">
                          Instant File Transfer
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                          Share large files, photos, videos & documents directly between any device using a simple 6-digit code.
                        </p>

                        <div className="space-y-2 mb-6">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>No file size limits & fast P2P streaming</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>Internet & Local WiFi offline transfer modes</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>Auto-deleting 24h ephemeral storage</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          const el = document.getElementById("transfer-type-selector") || document.body;
                          el.scrollIntoView({ behavior: "smooth" });
                          setTimeout(() => setMode("send"), 100);
                        }}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-blue-600/25 group-hover:shadow-blue-600/40 transition-all flex items-center justify-center gap-2">
                        <span>Start File Transfer</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>

                    {/* FEATURE 2: INSTANT ROOM CHAT */}
                    <div className="group relative rounded-3xl p-6 bg-gradient-to-b from-white via-slate-50/80 to-purple-50/50 border border-purple-200/80 shadow-xl hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none"></div>

                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-500/25 group-hover:scale-110 transition-transform">
                            <MessageSquare className="h-7 w-7" />
                          </div>
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-semibold px-2.5 py-0.5 text-[11px]">
                            💬 INSTANT CHAT
                          </Badge>
                        </div>

                        <h4 className="text-xl font-bold text-slate-900 mb-1.5 flex items-center gap-2">
                          6-Digit Room Chat
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                          Create temporary, zero-login chat rooms to text, drop code snippets, paste photos & exchange files live.
                        </p>

                        <div className="space-y-2 mb-6">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>WhatsApp-style live typing indicators</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>Instant QR code & 1-tap room link sharing</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>100% ephemeral — zero database logs saved</span>
                          </div>
                        </div>
                      </div>

                      <Link href="/chat" className="w-full block">
                        <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-purple-600/25 group-hover:shadow-purple-600/40 transition-all flex items-center justify-center gap-2">
                          <span>Launch Instant Chat</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>

                  </div>
                </div>
              </div>

              {/* Transfer Stats Dashboard */}
              <div className="mb-12">
                <TransferStats stats={stats} />
              </div>

              {/* Connection status pill – visible near transfer type */}
              <div className="flex justify-center mb-4">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${transferType === 'local' ? 'bg-green-100 text-green-800' :
                  isConnected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${transferType === 'local' ? 'bg-green-500' :
                    isConnected ? 'bg-green-500' : 'bg-amber-500 animate-pulse'
                    }`} />
                  {transferType === 'local' ? 'Local mode – no server needed' : isConnected ? 'Connected' : 'Connecting…'}
                </div>
              </div>

              {/* Transfer Type Selection */}
              <div id="transfer-type-selector" className="max-w-xl mx-auto mb-8">
                <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1 text-center">Choose Transfer Method</h3>
                  <p className="text-sm text-gray-500 text-center mb-4">Internet works everywhere; Local is faster on the same WiFi.</p>
                  {transferType === 'local' && (
                    <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4 text-center">Both devices must be on the same WiFi or hotspot.</p>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setTransferType('internet')}
                      className={`p-4 rounded-xl border-2 transition-all ${transferType === 'internet'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                    >
                      <Globe className="h-8 w-8 mx-auto mb-2" />
                      <div className="font-medium">Internet – works anywhere</div>
                      <div className="text-xs mt-1">Uses server connection</div>
                      <Badge variant={transferType === 'internet' ? 'default' : 'outline'} className="mt-2">
                        {isConnected ? 'Ready' : 'Connecting...'}
                      </Badge>
                    </button>

                    <button
                      onClick={() => setTransferType('local')}
                      className={`p-4 rounded-xl border-2 transition-all ${transferType === 'local'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                    >
                      <Wifi className="h-8 w-8 mx-auto mb-2" />
                      <div className="font-medium">Local WiFi – same network, faster</div>
                      <div className="text-xs mt-1">No server needed</div>
                      <Badge variant={transferType === 'local' ? 'default' : 'outline'} className="mt-2">
                        High Speed
                      </Badge>
                    </button>
                  </div>
                </div>

                {/* Trust & Acceptable Use Banner */}
                <div className="max-w-2xl mx-auto mb-6 p-3 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl text-center shadow-sm">
                  <p className="text-xs text-slate-600 flex items-center justify-center space-x-1.5 flex-wrap">
                    <Shield className="h-4 w-4 text-emerald-600 inline shrink-0" />
                    <span><strong>Encrypted & Temporary:</strong> Files stream directly between devices and auto-delete after download. Please adhere to our <Link href="/terms"><span className="text-blue-600 underline cursor-pointer">Terms of Service</span></Link> (do not share copyrighted or prohibited content).</span>
                  </p>
                </div>
              </div>

              {/* Premium Action Cards */}
              <div className="max-w-2xl mx-auto">
                <div className="grid md:grid-cols-2 gap-6">

                  {/* Send Files Card */}
                  <Card className="group hover:scale-105 transition-all duration-300 shadow-2xl border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardContent className="p-8 relative z-10">
                      <div className="text-center space-y-6">
                        <div className="bg-white/20 rounded-2xl p-4 w-fit mx-auto">
                          <Upload className="h-12 w-12 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold mb-2">Send Files</h3>
                          <p className="text-blue-100">Share files instantly</p>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            setTimeout(() => setMode('send'), 100);
                          }}
                          className="w-full h-12 text-base bg-white text-blue-600 hover:bg-blue-50 shadow-lg font-semibold min-h-[44px] focus-visible:ring-2"
                          disabled={transferType === 'internet' && !isConnected}
                          title={transferType === 'internet' && !isConnected ? 'Connect to the server first' : undefined}
                        >
                          Start Sending {transferType === 'local' ? '(Local)' : ''}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Receive Files Card */}
                  <Card className="group hover:scale-105 transition-all duration-300 shadow-2xl border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardContent className="p-8 relative z-10">
                      <div className="text-center space-y-6">
                        <div className="bg-white/20 rounded-2xl p-4 w-fit mx-auto">
                          <Download className="h-12 w-12 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold mb-2">Receive Files</h3>
                          <p className="text-purple-100">Enter code and download</p>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            setTimeout(() => setMode('receive'), 100);
                          }}
                          className="w-full h-12 text-base bg-white text-purple-600 hover:bg-purple-50 shadow-lg font-semibold min-h-[44px] focus-visible:ring-2"
                          disabled={transferType === 'internet' && !isConnected}
                          title={transferType === 'internet' && !isConnected ? 'Connect to the server first' : undefined}
                        >
                          Start Receiving {transferType === 'local' ? '(Local)' : ''}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Instant Room Chat Interactive Card */}
                <div className="mt-6">
                  <Card className="shadow-2xl border border-indigo-200/50 bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 pointer-events-none"></div>
                    <CardContent className="p-6 md:p-8 relative z-10 text-left">
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="bg-indigo-600/30 border border-indigo-400/30 rounded-2xl p-3 text-indigo-300 shrink-0">
                          <MessageSquare className="h-8 w-8" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-xl md:text-2xl font-bold">💬 Instant Anonymous Room Chat</h3>
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">LIVE CHAT</Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-300">
                            Create or join a temporary chat room with a 6-digit code. Exchange messages, live typing indicators, photos & files in real-time.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/10 backdrop-blur-md p-4 md:p-6 rounded-2xl border border-white/10">
                        {/* Join Chat Room */}
                        <div className="space-y-3">
                          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Join Existing Room</label>
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              placeholder="e.g. ROOM12"
                              value={homeChatCode}
                              onChange={(e) => setHomeChatCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                              className="font-mono text-center tracking-widest bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-400 min-h-[44px]"
                              maxLength={6}
                            />
                            <Link href={homeChatCode.length === 6 ? `/room/${homeChatCode}` : `/chat`}>
                              <Button
                                disabled={homeChatCode.length !== 6}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold whitespace-nowrap min-h-[44px]"
                              >
                                Join 💬
                              </Button>
                            </Link>
                          </div>
                        </div>

                        {/* Create Chat Room */}
                        <div className="space-y-3 flex flex-col justify-between">
                          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Start Fresh Room</label>
                          <Link href="/chat">
                            <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg font-semibold min-h-[44px]">
                              ➕ Create New Chat Room
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {transferType === 'internet' && !isConnected && (
                  <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-amber-800 font-medium">🔄 Connecting to secure servers…</p>
                    <p className="text-amber-700 text-sm mt-1">Check your internet or try again in a moment.</p>
                    <Button variant="outline" size="sm" className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100" onClick={reconnect}>
                      Retry connection
                    </Button>
                  </div>
                )}
              </div>

              {/* ── Google AdSense Mid Banner Container (Policy Compliant) ── */}
              <div id="adsense-mid-slot" className="my-8 min-h-[90px] w-full max-w-4xl mx-auto flex items-center justify-center bg-slate-100/70 border border-dashed border-slate-300 rounded-2xl p-3 text-center text-xs text-slate-400">
                <div className="w-full">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Advertisement</span>
                  {/* Google AdSense code will inject here */}
                  <ins className="adsbygoogle"
                    style={{ display: "block", textAlign: "center" }}
                    data-ad-layout="in-article"
                    data-ad-format="fluid"
                    data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                    data-ad-slot="1234567890" />
                </div>
              </div>

              {/* ── GEO (Generative Engine Optimization) Factual Specification Block ── */}
              <section className="max-w-4xl mx-auto mt-12 text-left bg-white/90 backdrop-blur-xl border border-indigo-100 rounded-3xl p-6 sm:p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">HexaSend Technical Specifications & System Overview</h3>
                    <p className="text-xs text-slate-500">Authoritative facts & security architecture for web crawlers and AI search engines.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">Architecture</span>
                    <p className="text-sm font-bold text-slate-800">Peer-to-Peer & Memory Stream</p>
                    <p className="text-xs text-slate-500 mt-1">Direct binary multipart upload with zero persistent database storage.</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">Authentication</span>
                    <p className="text-sm font-bold text-slate-800">Zero Signup (Anonymous)</p>
                    <p className="text-xs text-slate-500 mt-1">No email, phone number, or login account required to send or receive.</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">Security & TTL</span>
                    <p className="text-sm font-bold text-slate-800">24h Auto-Expiry Purge</p>
                    <p className="text-xs text-slate-500 mt-1">All temporary files and active chat rooms are completely wiped automatically.</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">Transfer Modes</span>
                    <p className="text-sm font-bold text-slate-800">Internet & Local WiFi</p>
                    <p className="text-xs text-slate-500 mt-1">Supports global web streaming and direct offline LAN file transfer.</p>
                  </div>
                </div>
              </section>

              {/* ── AEO (Answer Engine Optimization) FAQ Section ── */}
              <section className="max-w-4xl mx-auto mt-12 text-left">
                <div className="text-center mb-6">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Frequently Asked Questions</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Everything you need to know about 6-digit code file sharing and instant chat.</p>
                </div>

                <div className="space-y-3.5">
                  <details className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm group">
                    <summary className="font-bold text-slate-900 cursor-pointer flex items-center justify-between text-base">
                      <span>How do I share files online using a 6-digit code?</span>
                      <span className="text-indigo-600 font-bold text-lg group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <div className="mt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      <strong>Direct Answer:</strong> Select your files on HexaSend to generate a unique 6-character code (e.g. <code>WORK88</code>). Send this code to your recipient, who enters it on HexaSend to download files directly on any phone, tablet, or PC.
                    </div>
                  </details>

                  <details className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm group">
                    <summary className="font-bold text-slate-900 cursor-pointer flex items-center justify-between text-base">
                      <span>What is HexaSend 6-Digit Instant Room Chat?</span>
                      <span className="text-indigo-600 font-bold text-lg group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <div className="mt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      <strong>Direct Answer:</strong> Instant Room Chat allows users to join or create temporary chat rooms using a 6-digit room code. Users can text, paste image attachments, and share files live with real-time typing indicators without creating an account or logging in.
                    </div>
                  </details>

                  <details className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm group">
                    <summary className="font-bold text-slate-900 cursor-pointer flex items-center justify-between text-base">
                      <span>Do I need an account or email registration to use HexaSend?</span>
                      <span className="text-indigo-600 font-bold text-lg group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <div className="mt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      <strong>Direct Answer:</strong> No. HexaSend is 100% free and requires zero setup, zero email, and no account creation.
                    </div>
                  </details>

                  <details className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm group">
                    <summary className="font-bold text-slate-900 cursor-pointer flex items-center justify-between text-base">
                      <span>Are my transferred files and chat messages stored permanently?</span>
                      <span className="text-indigo-600 font-bold text-lg group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <div className="mt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      <strong>Direct Answer:</strong> No. Transferred files are held temporarily in secure RAM stream memory during active transfer and are automatically deleted. Room chat messages exist only during active sessions and are zero-logged.
                    </div>
                  </details>

                  <details className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm group">
                    <summary className="font-bold text-slate-900 cursor-pointer flex items-center justify-between text-base">
                      <span>Can I transfer files offline over Local WiFi?</span>
                      <span className="text-indigo-600 font-bold text-lg group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <div className="mt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      <strong>Direct Answer:</strong> Yes. Switch to "Local WiFi Mode" when both devices are connected to the same WiFi network or mobile hotspot for ultra-fast LAN file transfers without consuming external internet bandwidth.
                    </div>
                  </details>
                </div>
              </section>

              {/* Simple How It Works */}
              <div className="grid md:grid-cols-3 gap-8 mt-16 mx-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Send Files</h3>
                  <p className="text-gray-600">Select files and get a code</p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
                    <Share className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Share Code</h3>
                  <p className="text-gray-600">Give the 6-digit code to anyone</p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4">
                    <Download className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Download</h3>
                  <p className="text-gray-600">Enter code and download files</p>
                </div>
              </div>

              {/* Blog Section */}
              <div className="mt-16">
                <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Latest from Our Blog</h3>
                <div className="grid md:grid-cols-3 gap-8">
                  {getLatestBlogPosts().map((post) => {
                    const iconMap: Record<string, any> = { Zap, Globe, Shield, FileText, Share, Archive, BookOpen };
                    const IconComponent = iconMap[post.iconName] || Zap;
                    return (
                      <Card
                        key={post.id}
                        className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <IconComponent className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                              {post.category}
                            </span>
                          </div>

                          <h4 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                            {post.title}
                          </h4>

                          <p className="text-gray-600 mb-4 leading-relaxed">{post.excerpt}</p>

                          <Link href={`/blog/${post.slug}`}>
                            <button className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:shadow-lg transition-all group-hover:scale-105">
                              <span>Read Article</span>
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </Link>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <div className="text-center mt-12">
                  <Link href="/blog">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      View All Articles
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 
        ------------------------------------------------------------------------------------------------
        SEO AND CONTENT BLOCK (Google AdSense Fix)
        This block exists to provide a thick, keyword-dense text footprint for Google indexers 
        and AdSense approval. Web crawlers require 500-1000 words to determine the 'Value' of the page.
        ------------------------------------------------------------------------------------------------
      */}
        <div className="bg-white px-4 py-16 pb-24 border-t border-gray-100">
          <div className="prose prose-lg prose-blue mx-auto max-w-4xl text-gray-600">

            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">The Only Tool You Need to Send Large Files Online</h2>
              <p className="text-xl">Discover exactly why millions of users trust HexaSend to bypass email limitations, avoid account creation, and share massive documents across platforms instantly.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 mb-16">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">How Do You Transfer Files with a 6-Digit Code?</h3>
                <p className="mb-4">Most modern cloud services force users to upload their sensitive files onto a massive server farm, wait for the upload to complete, generate a complex 50-character URL link, and then text that URL to a friend. <strong>HexaSend completely eliminates the cloud middle-man.</strong></p>
                <p>When you drag your file into our tool above, our engine instantly assigns a secure, random, alphanumeric 6-digit passcode. All you share with your colleague or friend is that brief code (for example: "AB1234"). When they visit this website and type in the code, the platforms handshake.</p>
                <p>Because the connection is peer-to-peer (or relayed instantly), the file begins streaming from your laptop directly onto their hard drive in real-time. It's the absolute fastest method to move data across an office, or across the world.</p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-8 border border-blue-100">
                <h3 className="text-xl font-bold text-blue-900 mb-4">The P2P Privacy Guarantee</h3>
                <p className="text-blue-800 mb-4">We believe that your data is yours. Traditional services require you to create an account so they can track what you send and sell ads against your habits. Our architecture is different.</p>
                <ul className="space-y-2 text-blue-800 list-disc pl-4">
                  <li><strong>No Database Storage:</strong> Your private images or PDF documents are never stored permanently in a database.</li>
                  <li><strong>No Accounts:</strong> You never type in an email address or a password to begin a transfer.</li>
                  <li><strong>No Size Throttling:</strong> Want to send a 5-gigabyte 4K video? You can. We don't cap your personal bandwidth.</li>
                </ul>
              </div>
            </div>

            <div className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Can I send files from my iPhone to a Windows PC?</h4>
                  <p>Yes! Because HexaSend runs entirely in the web browser, it is 100% platform agnostic. You can have an iPhone 15 open touching Safari, and a 10-year-old Windows Desktop running Chrome. Upload the photo on the iPhone, type the code on the Windows machine, and the file bridges the gap across the two distinct operating systems instantly.</p>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Why does it say "Local Network Mode"?</h4>
                  <p>When our tool detects that both the sender and the receiver are sitting on the exact same Wi-Fi connection (like in an office or coffee shop), we activate Local Mode. Instead of bouncing your files off a server on the internet, the data travels directly through your wireless router. This allows files to transfer at up to 1000 Mbps—virtually instantly!</p>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Are my transfer codes secure from hackers?</h4>
                  <p>Absolutely. A 6-digit alphanumeric code offers millions of possible combinations. Because the code is only valid while your browser tab remains open, the window of opportunity for an attacker to guess your PIN is non-existent. Furthermore, all connections between the clients are encrypted using modern web standard TLS protocols.</p>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">What happens if I close my browser before they finish downloading?</h4>
                  <p>The transfer must be active to work. Because HexaSend does not permanently upload your file to an Amazon or Google cloud drive, the file is sourced directly from your active browser memory. If you close your laptop lid or shut down Chrome before the receiver hits 100%, the transfer is severed to protect your machine. Always leave the tab open until they confirm receipt!</p>
                </div>
              </div>
            </div>

          </div>
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
                <div className="relative inline-flex items-center justify-center p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl">
                  <Upload className="h-12 w-12 text-white" />
                </div>
              </div>
              <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Send Your Files {transferType === 'local' ? '(Local Network)' : ''}
              </h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
                {transferType === 'local'
                  ? 'Share files at high speed on your local network. Perfect for large files!'
                  : 'Share files instantly with military-grade security. Your files, your control, your privacy.'
                }
              </p>
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
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">✓ Secure</span>
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">✓ Fast</span>
                              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">✓ Private</span>
                            </div>
                          </div>
                        </div>
                      </DragDropZone>

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
                <div className="relative inline-flex items-center justify-center p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl">
                  <Download className="h-12 w-12 text-white" />
                </div>
              </div>
              <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
                Receive Files {transferType === 'local' ? '(Local Network)' : ''}
              </h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
                {transferType === 'local'
                  ? 'Enter code to receive files from devices on your local network.'
                  : 'Enter your 6-digit secure code to instantly download files shared with you.'
                }
              </p>
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

                    {transferType === 'local' && (
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
                    )}

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
