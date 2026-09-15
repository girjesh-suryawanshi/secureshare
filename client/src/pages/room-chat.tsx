import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/seo-head";
import { isAllowedFile } from "@shared/file-validation";
import { QRCodeSVG } from "qrcode.react";
import {
  MessageSquare,
  Send,
  Paperclip,
  Copy,
  CheckCircle,
  Shield,
  Trash2,
  Share2,
  ArrowLeft,
  Sparkles,
  Download,
  FileText,
  Lock,
  WifiOff,
  X,
  ImageIcon,
  QrCode,
  Check,
  User,
  Zap,
} from "lucide-react";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  mediaUrl?: string;
  isImage?: boolean;
  timestamp: string;
  isSystem?: boolean;
}

interface PendingAttachment {
  file: File;
  mediaUrl: string;
  isImage: boolean;
}

function validateFile(file: File): string | null {
  const val = isAllowedFile(file.name, file.type);
  if (!val.allowed) return val.reason || "File extension not allowed.";
  if (file.size > 20 * 1024 * 1024) return "File too large. Maximum size is 20 MB.";
  return null;
}

function genUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "msg-" + Math.random().toString(36).slice(2, 11) + "-" + Date.now().toString(36);
}

function genRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function buildWsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

export default function RoomChat() {
  const [matchRoom, paramsRoom] = useRoute("/room/:code");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Stable user identity for this session
  const [senderId] = useState(() => "u-" + Math.random().toString(36).slice(2, 9));
  const [senderName, setSenderName] = useState(
    () => localStorage.getItem("hexasend_nick") || `User${Math.floor(100 + Math.random() * 900)}`
  );

  // Derive initial state from URL params
  const urlCode = matchRoom && paramsRoom?.code
    ? paramsRoom.code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
    : "";

  const [roomCode, setRoomCode] = useState(urlCode);
  const [entryCode, setEntryCode] = useState(urlCode);
  const [inRoom, setInRoom] = useState(urlCode.length === 6);

  const [activeUsers, setActiveUsers] = useState(1);
  const [wsReady, setWsReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [attachedFile, setAttachedFile] = useState<PendingAttachment | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [linkCopied, setLinkCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const roomCodeRef = useRef(roomCode);
  const senderNameRef = useRef(senderName);
  const senderIdRef = useRef(senderId);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMsgRef = useRef<object[]>([]);
  const destroyedRef = useRef(false);
  const lastTypingSentRef = useRef<number>(0);

  // Keep refs in sync
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);
  useEffect(() => { senderNameRef.current = senderName; }, [senderName]);

  // Sync paramsRoom code with roomCode state if URL changes
  useEffect(() => {
    if (matchRoom && paramsRoom?.code) {
      const code = paramsRoom.code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
      if (code.length === 6 && code !== roomCode) {
        setRoomCode(code);
        setEntryCode(code);
        setInRoom(true);
      }
    }
  }, [matchRoom, paramsRoom?.code, roomCode]);

  // ─── CRITICAL FIX: Scroll ONLY the inner message list container ──────────────
  // Never scroll the page window (window.scrollTo) to prevent the screen jumping up!
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, typingUsers, attachedFile]);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      if (msg.id && prev.some(m => m.id === msg.id)) {
        return prev; // Ignore duplicate message with same ID
      }
      return [...prev, msg];
    });
  }, []);

  // ─── WebSocket lifecycle ─────────────────────────────────────────────
  const sendRaw = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    } else {
      pendingMsgRef.current.push(payload);
    }
  }, []);

  useEffect(() => {
    if (!inRoom || !roomCode) return;

    destroyedRef.current = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
      if (destroyedRef.current) return;
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
      const ws = new WebSocket(buildWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (destroyedRef.current) { ws.close(); return; }
        setWsReady(true);
        ws.send(JSON.stringify({
          type: "join-room-chat",
          code: roomCodeRef.current,
          senderId: senderIdRef.current,
          senderName: senderNameRef.current,
        }));

        // Flush queued messages
        const pending = pendingMsgRef.current.splice(0);
        for (const msg of pending) {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
        }

        // Heartbeat ping every 15 seconds
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 15000);
      };

      ws.onmessage = (evt) => {
        if (destroyedRef.current) return;
        try {
          const data = JSON.parse(evt.data as string);
          if (data.type === "pong") return;

          switch (data.type as string) {
            case "room-user-joined":
            case "room-user-left":
              setActiveUsers(data.activeUsers ?? 1);
              addMessage({
                id: data.type + "-" + (data.senderId || "sys") + "-" + (data.activeUsers || 0),
                senderId: "system",
                senderName: "System",
                text: data.message || (data.type === "room-user-joined" ? "A user joined." : "A user left."),
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                isSystem: true,
              });
              break;

            case "room-chat-message":
              if (data.senderId === senderIdRef.current) {
                // Ignore reflected copy of own message since sender already rendered it optimistically
                return;
              }
              addMessage({
                id: data.chatId || genUUID(),
                senderId: data.senderId ?? "unknown",
                senderName: data.senderName ?? "Unknown",
                text: data.text,
                fileName: data.fileName,
                fileSize: data.fileSize,
                fileType: data.fileType,
                mediaUrl: data.mediaUrl,
                isImage: data.isImage,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              });
              break;


            case "room-typing":
              if (data.senderId !== senderIdRef.current) {
                const sId = data.senderId;
                const sName = data.senderName || "Someone";
                if (data.isTyping) {
                  setTypingUsers(prev => {
                    const next = new Map(prev);
                    next.set(sId, sName);
                    return next;
                  });
                  // Expire typing after 3s if no continuation packet received
                  setTimeout(() => {
                    setTypingUsers(prev => {
                      if (!prev.has(sId)) return prev;
                      const next = new Map(prev);
                      next.delete(sId);
                      return next;
                    });
                  }, 3000);
                } else {
                  setTypingUsers(prev => {
                    if (!prev.has(sId)) return prev;
                    const next = new Map(prev);
                    next.delete(sId);
                    return next;
                  });
                }
              }
              break;
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        if (!destroyedRef.current) {
          setWsReady(false);
          reconnectTimer = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        if (pingTimer) clearInterval(pingTimer);
        if (!destroyedRef.current) {
          setWsReady(false);
        }
      };
    };

    connect();

    return () => {
      destroyedRef.current = true;
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      setWsReady(false);
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "leave-room-chat",
            code: roomCodeRef.current,
            senderId: senderIdRef.current,
            senderName: senderNameRef.current,
          }));
        }
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [inRoom, roomCode, addMessage]);

  // ─── Room join / leave ────────────────────────────────────────────────
  const handleJoin = useCallback((target?: string) => {
    const code = (target ?? entryCode).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (code.length !== 6) {
      toast({ title: "Invalid Code", description: "Enter exactly 6 alphanumeric characters.", variant: "destructive" });
      return;
    }
    setRoomCode(code);
    setEntryCode(code);
    setInRoom(true);
    setMessages([]);
    setTypingUsers(new Map());
    setLocation(`/room/${code}`, { replace: true });
  }, [entryCode, setLocation, toast]);

  const handleCreateRoom = useCallback(() => {
    handleJoin(genRoomCode());
  }, [handleJoin]);

  const handleExitRoom = useCallback(() => {
    sendRaw({ type: "leave-room-chat", code: roomCodeRef.current, senderId: senderIdRef.current, senderName: senderNameRef.current });
    setInRoom(false);
    setMessages([]);
    setRoomCode("");
    setEntryCode("");
    setAttachedFile(null);
    setTypingUsers(new Map());
    setWsReady(false);
    setLocation("/chat");
  }, [sendRaw, setLocation]);

  const handleNameChange = (name: string) => {
    setSenderName(name);
    localStorage.setItem("hexasend_nick", name);
  };

  // ─── File Attachment Processing ─────────────────────────────────────
  const processFile = useCallback((file: File) => {
    const err = validateFile(file);
    if (err) {
      toast({ title: "File Blocked", description: err, variant: "destructive" });
      return;
    }
    const isImg = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        file,
        mediaUrl: reader.result as string,
        isImage: isImg,
      });
    };
    reader.onerror = () => {
      toast({ title: "Read Error", description: "Could not read the file.", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleFileUpload = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    evt.target.value = "";
    processFile(file);
  }, [processFile]);

  const handlePaste = useCallback((evt: React.ClipboardEvent) => {
    const items = evt.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) {
          evt.preventDefault();
          processFile(file);
          break;
        }
      }
    }
  }, [processFile]);

  const handleDragOver = (evt: React.DragEvent) => {
    evt.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (evt: React.DragEvent) => {
    evt.preventDefault();
    setIsDragging(false);
    const file = evt.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ─── Messaging ────────────────────────────────────────────────────────
  const handleInputChange = (text: string) => {
    setInputText(text);

    const now = Date.now();
    // Send typing status once every 1.5s max while typing
    if (now - lastTypingSentRef.current > 1500) {
      lastTypingSentRef.current = now;
      sendRaw({ type: "room-typing", code: roomCodeRef.current, senderId, senderName, isTyping: true });
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    if (!text.trim()) {
      // Input cleared - immediately clear typing indicator
      sendRaw({ type: "room-typing", code: roomCodeRef.current, senderId, senderName, isTyping: false });
    } else {
      // Inactivity timeout - clear typing after 2s of no keypresses
      typingTimerRef.current = setTimeout(() => {
        sendRaw({ type: "room-typing", code: roomCodeRef.current, senderId, senderName, isTyping: false });
      }, 2000);
    }
  };

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if ((!text && !attachedFile) || !inRoom) return;

    // Immediately stop typing indicator for peers
    sendRaw({ type: "room-typing", code: roomCodeRef.current, senderId, senderName, isTyping: false });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    const chatId = genUUID();
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const msgData: ChatMessage = {
      id: chatId,
      senderId,
      senderName,
      text: text || undefined,
      fileName: attachedFile?.file.name,
      fileSize: attachedFile?.file.size,
      fileType: attachedFile?.file.type,
      mediaUrl: attachedFile?.mediaUrl,
      isImage: attachedFile?.isImage,
      timestamp,
    };

    // Optimistic local render
    addMessage(msgData);

    // Clear inputs
    setInputText("");
    setAttachedFile(null);

    // Send to peers via WS
    sendRaw({
      type: "room-chat-message",
      code: roomCodeRef.current,
      senderId,
      senderName,
      chatId,
      text: text || undefined,
      fileName: attachedFile?.file.name,
      fileSize: attachedFile?.file.size,
      fileType: attachedFile?.file.type,
      mediaUrl: attachedFile?.mediaUrl,
      isImage: attachedFile?.isImage,
    });
  }, [inputText, attachedFile, inRoom, senderId, senderName, addMessage, sendRaw]);

  const handleCopyCode = async () => {
    if (!roomCode) return;
    const ok = await copyTextToClipboard(roomCode);
    if (ok) {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
      toast({ title: "Room Code Copied!", description: `Room Code: ${roomCode}` });
    } else {
      toast({ title: "Copy Failed", description: "Code: " + roomCode, variant: "destructive" });
    }
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/room/${roomCode}`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Join Room ${roomCode} on HexaSend`,
          text: `Join instant room chat ${roomCode}:`,
          url: link,
        });
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
        toast({ title: "Shared Successfully!", description: link });
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }

    const ok = await copyTextToClipboard(link);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast({ title: "Link Copied!", description: link });
    } else {
      toast({ title: "Copy Link Failed", description: link, variant: "destructive" });
    }
  };

  const handleCopyMsg = async (id: string, text: string) => {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    }
  };

  const handleDownloadMedia = (mediaUrl: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = mediaUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "Downloading Image", description: fileName });
  };

  const isSendDisabled = !inputText.trim() && !attachedFile;

  // Format active typing users list
  const typingArray = Array.from(typingUsers.values());
  const typingText = typingArray.length === 1
    ? `${typingArray[0]} is typing`
    : typingArray.length > 1
      ? `${typingArray.join(", ")} are typing`
      : null;

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-950 text-white flex flex-col py-2 sm:py-3 px-2 sm:px-4 select-none font-sans">
      <SEOHead
        title="6-Digit Instant Room Chat & File Share — HexaSend"
        description="Join an instant, zero-login 6-digit code room to chat, paste code snippets, share images, and transfer files securely."
        keywords="instant room chat, 6-digit chat, team chat, ephemeral chat, secure file share"
      />

      <div className="max-w-4xl mx-auto w-full flex flex-col flex-1 min-h-0 overflow-hidden my-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800/80 px-1">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setLocation("/")}
              className="border-slate-700/80 bg-slate-900/80 text-slate-200 hover:bg-slate-800 text-xs h-8 px-2.5">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold leading-tight flex items-center gap-2">
                  Instant Room Chat
                  <Badge variant="outline" className="hidden sm:inline-flex bg-indigo-950/50 text-indigo-300 border-indigo-800/60 text-[10px] px-1.5 py-0">
                    <Zap className="h-2.5 w-2.5 mr-1 text-amber-400" /> End-to-End Ephemeral
                  </Badge>
                </h1>
                <p className="text-[11px] text-slate-400">Zero-login · 6-digit room code</p>
              </div>
            </div>
          </div>

          {inRoom && (
            <div className="flex items-center gap-2">
              <Badge variant="outline"
                className={`text-xs px-2 py-1 ${wsReady
                  ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/80"
                  : "bg-amber-950/60 text-amber-400 border-amber-800/80"}`}>
                {wsReady
                  ? <><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />{activeUsers} online</>
                  : <><WifiOff className="h-3 w-3 mr-1 animate-pulse" />Connecting…</>}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setShowQrModal(true)}
                className="bg-indigo-950/60 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/80 text-xs h-8 px-2.5 flex items-center gap-1">
                <QrCode className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">QR Code</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyLink}
                className="bg-indigo-950/60 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/80 text-xs h-8 px-2.5 flex items-center gap-1">
                {linkCopied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Share</span>
              </Button>
            </div>
          )}
        </div>

        {/* ── Entry Screen ── */}
        {!inRoom ? (
          <div className="my-auto max-w-md mx-auto w-full px-2">
            <Card className="bg-slate-900/90 border-slate-800 shadow-2xl backdrop-blur-xl rounded-2xl">
              <CardContent className="p-6 space-y-5">
                <div className="text-center">
                  <div className="inline-flex p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 mb-3 shadow-inner">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Join or Create Room</h2>
                  <p className="text-xs text-slate-400 mt-1">Enter a 6-character code to join, or create a new room instantly.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Your Nickname</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      value={senderName}
                      onChange={e => handleNameChange(e.target.value)}
                      placeholder="e.g. Alex · Design Team"
                      className="bg-slate-950 border-slate-800 text-white pl-9 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Room Code (6 chars)</label>
                  <div className="flex gap-2">
                    <Input
                      id="room-code-input"
                      value={entryCode}
                      onChange={e => setEntryCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                      onKeyDown={e => e.key === "Enter" && handleJoin()}
                      maxLength={6}
                      placeholder="WORK88"
                      className="bg-slate-950 border-slate-800 text-white font-mono text-center tracking-widest text-lg focus:border-indigo-500"
                    />
                    <Button
                      id="join-room-btn"
                      onClick={() => handleJoin()}
                      disabled={entryCode.length !== 6}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-5 font-semibold shadow-lg shadow-indigo-600/20">
                      Join
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-600 text-xs">
                  <div className="flex-1 border-t border-slate-800" /><span>or</span><div className="flex-1 border-t border-slate-800" />
                </div>

                <Button
                  id="create-room-btn"
                  onClick={handleCreateRoom}
                  variant="outline"
                  className="w-full border-indigo-700/50 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 py-5 font-semibold">
                  ✨ Create New Room
                </Button>

                <div className="flex items-start gap-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400">
                  <Lock className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p><strong className="text-slate-200">Ephemeral:</strong> Messages exist only during active session. Nothing stored.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* ── Active Chat Room App ── */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex flex-col flex-1 min-h-0 bg-slate-900/90 border rounded-2xl overflow-hidden shadow-2xl transition-colors ${
              isDragging ? "border-indigo-500 bg-indigo-950/30" : "border-slate-800/80"
            }`}>

            {/* Drag drop overlay */}
            {isDragging && (
              <div className="absolute inset-0 bg-indigo-950/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-2 border-dashed border-indigo-400 m-3 rounded-xl pointer-events-none">
                <Paperclip className="h-12 w-12 text-indigo-400 animate-bounce mb-2" />
                <p className="text-base font-bold text-indigo-200">Drop file to attach to chat</p>
              </div>
            )}

            {/* Top Room bar */}
            <div className="bg-slate-950/90 px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between text-xs backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-slate-400 font-medium">Room:</span>
                <Badge className="bg-indigo-600 text-white font-mono tracking-widest text-xs px-2 py-0.5 shadow">
                  {roomCode}
                </Badge>
                <div className="flex items-center gap-1.5 text-slate-400 ml-1">
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400 font-medium">You:</span>
                  <Input
                    value={senderName}
                    onChange={e => handleNameChange(e.target.value)}
                    className="w-24 sm:w-32 h-6 bg-slate-900/90 border-slate-700/80 text-xs text-indigo-300 font-semibold px-2 focus:border-indigo-500 rounded-md"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center text-slate-400 gap-1 text-[11px]">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Ephemeral</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleExitRoom}
                  className="text-red-400 hover:text-red-300 hover:bg-red-950/30 text-xs h-7 px-2.5 rounded-lg">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Exit
                </Button>
              </div>
            </div>

            {/* Highlighted Room Code Banner with Instant Copy & Share Options */}
            <div className="bg-gradient-to-r from-indigo-950/90 via-purple-950/80 to-slate-950/90 border-b border-indigo-800/40 p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2 bg-slate-950/90 border border-indigo-500/50 rounded-xl px-3 py-1.5 shadow-md">
                  <span className="text-[10px] sm:text-[11px] font-bold text-indigo-300 uppercase tracking-wider">Room Code:</span>
                  <span className="font-mono text-base sm:text-lg font-extrabold tracking-widest text-amber-300 select-all">{roomCode}</span>
                </div>
                <p className="hidden md:inline text-xs text-slate-300 font-medium">
                  Share code or link with peers to chat and transfer files.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border-indigo-500/60 text-xs h-8 px-2.5 sm:px-3 rounded-lg flex items-center gap-1.5 shadow-sm font-semibold transition-all">
                  {codeCopied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-indigo-400" />}
                  <span>{codeCopied ? "Code Copied!" : "Copy Code"}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border-purple-500/60 text-xs h-8 px-2.5 sm:px-3 rounded-lg flex items-center gap-1.5 shadow-sm font-semibold transition-all">
                  {linkCopied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5 text-purple-400" />}
                  <span>{linkCopied ? "Link Copied!" : "Share Link"}</span>
                </Button>
              </div>
            </div>

            {/* ── Messages Scroll Container ───────────────────────────────────── */}
            {/* Using ref={scrollContainerRef} for inner scroll ONLY (never scrolls window) */}
            <div
              ref={scrollContainerRef}
              className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3.5 bg-slate-950/40">

              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="p-4 rounded-full bg-slate-800/60 border border-slate-700/50">
                    <MessageSquare className="h-8 w-8 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">Room is Ready!</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
                      Share code <span className="font-mono text-indigo-400 font-bold">{roomCode}</span> or scan QR code to chat and share files instantly across devices.
                    </p>
                  </div>
                </div>
              )}

              {messages.map(msg => {
                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <span className="bg-slate-800/60 text-slate-400 text-[11px] px-3 py-1 rounded-full border border-slate-700/40 backdrop-blur-sm shadow-sm">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                const isMe = msg.senderId === senderId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-semibold text-slate-400">{isMe ? "You" : msg.senderName}</span>
                      <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                    </div>

                    <div className={`relative group max-w-[88%] sm:max-w-[75%] rounded-2xl p-3 shadow-md ${
                      isMe
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-xs"
                        : "bg-slate-800/95 border border-slate-700/80 text-slate-100 rounded-tl-xs"
                    }`}>

                      {/* Text content */}
                      {msg.text && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words select-text">{msg.text}</p>
                      )}

                      {/* Image Message Rendering with Save/Download Button */}
                      {msg.isImage && msg.mediaUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-black/20 max-w-xs relative bg-slate-950 shadow-inner">
                          <img
                            src={msg.mediaUrl}
                            alt={msg.fileName || "image"}
                            className="w-full h-auto object-cover max-h-64 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => handleDownloadMedia(msg.mediaUrl!, msg.fileName || "image.png")}
                          />
                          <div className="flex items-center justify-between p-2 bg-slate-950/90 text-white border-t border-white/10">
                            <div className="flex items-center gap-1.5 min-w-0 pr-2">
                              <ImageIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                              <span className="text-[11px] font-medium truncate">{msg.fileName || "Image"}</span>
                              {msg.fileSize && (
                                <span className="text-[10px] text-slate-400 shrink-0">({(msg.fileSize / 1024).toFixed(1)} KB)</span>
                              )}
                            </div>
                            <a
                              href={msg.mediaUrl}
                              download={msg.fileName || "image.png"}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold rounded-lg shadow transition-colors shrink-0">
                              <Download className="h-3 w-3" />
                              <span>Save</span>
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Document File Message Rendering */}
                      {!msg.isImage && msg.mediaUrl && (
                        <div className="mt-2 flex items-center gap-2.5 p-2.5 bg-black/25 rounded-xl border border-white/10">
                          <div className="p-2 bg-indigo-600/30 rounded-lg text-indigo-300 shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{msg.fileName}</p>
                            <p className="text-[10px] opacity-70">{((msg.fileSize || 0) / 1024).toFixed(1)} KB</p>
                          </div>
                          <a
                            href={msg.mediaUrl}
                            download={msg.fileName}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors shrink-0"
                            title="Download file">
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      )}

                      {/* Status indicator / Copy action */}
                      <div className="flex items-center justify-end gap-1.5 mt-1">
                        {msg.text && (
                          <button
                            type="button"
                            onClick={() => handleCopyMsg(msg.id, msg.text!)}
                            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                            title="Copy text">
                            {copiedMsgId === msg.id
                              ? <CheckCircle className="h-3 w-3 text-emerald-400 inline" />
                              : <Copy className="h-3 w-3 inline opacity-60 hover:opacity-100" />}
                          </button>
                        )}
                        {isMe && <Check className="h-3 w-3 text-indigo-200 inline opacity-70" />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* WhatsApp-Style Animated Typing Indicator */}
              {typingText && (
                <div className="flex items-center gap-2 text-xs font-medium text-indigo-300 bg-slate-900/90 px-3.5 py-2 rounded-2xl border border-slate-800 w-fit shadow-md animate-fade-in my-1">
                  <span>{typingText}</span>
                  <span className="flex space-x-1 items-center ml-1">
                    <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              )}
            </div>

            {/* Attached file preview before sending */}
            {attachedFile && (
              <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-200">
                  {attachedFile.isImage ? (
                    <div className="h-9 w-9 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0">
                      <img src={attachedFile.mediaUrl} alt="preview" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="p-2 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-800">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}
                  <div className="truncate max-w-xs">
                    <p className="font-semibold truncate">{attachedFile.file.name}</p>
                    <p className="text-[10px] text-slate-400">{(attachedFile.file.size / 1024).toFixed(1)} KB · Ready to send</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setAttachedFile(null)}
                  className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Bottom Input bar */}
            <div className="bg-slate-950 border-t border-slate-800/80 p-2.5 sm:p-3 flex items-center gap-2">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.mp3,.mp4,.webm"
              />

              {/* Attach button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl h-10 w-10 flex-shrink-0"
                title="Attach file or image (max 20 MB)">
                <Paperclip className="h-4 w-4" />
              </Button>

              {/* Text input with paste listener */}
              <Input
                id="chat-message-input"
                value={inputText}
                onChange={e => handleInputChange(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={wsReady ? "Type a message or paste image… (Enter to send)" : "Connecting to room…"}
                className="flex-1 bg-slate-900 border-slate-800 text-white focus:border-indigo-500 rounded-xl text-sm h-10 px-4"
              />

              {/* Send button */}
              <Button
                id="chat-send-btn"
                type="button"
                onClick={handleSend}
                disabled={isSendDisabled}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl h-10 px-4 font-semibold shadow-lg shadow-indigo-600/30 flex-shrink-0 disabled:opacity-40 transition-transform active:scale-95">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Room QR Code Modal ── */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm text-center p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5 text-indigo-400" />
              Scan to Join Room
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              Scan this QR code with your phone camera to join room <strong className="text-indigo-400 font-mono">{roomCode}</strong> instantly.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center my-4 space-y-3">
            <div className="p-4 bg-white rounded-2xl shadow-2xl inline-block">
              <QRCodeSVG
                value={`${window.location.origin}/room/${roomCode}`}
                size={180}
                bgColor="#ffffff"
                fgColor="#000000"
                level="Q"
              />
            </div>
            <Badge className="bg-indigo-600 text-white font-mono tracking-widest text-base px-3 py-1">
              {roomCode}
            </Badge>
          </div>

          <Button
            onClick={handleCopyLink}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold min-h-[44px]">
            {linkCopied ? "Link Copied! ✅" : "Copy Room Link"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
