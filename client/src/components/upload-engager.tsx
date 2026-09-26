/**
 * UploadEngager — purely decorative/informational component shown during file upload.
 * Does NOT touch any upload logic, state setters, or WebSocket connections.
 * Safe to add / remove without affecting transfer functionality.
 */
import { useEffect, useState, useRef } from "react";

interface UploadEngagerProps {
  progress: number;           // 0-100, passed from parent (read-only)
  fileIndex: number;          // current file index (0-based)
  totalFiles: number;         // total number of files
  fileName: string;           // current file being uploaded
  transferSpeed?: string;     // e.g. "2.3 MB/s"
  estimatedTime?: string;     // e.g. "~12s remaining"
}

const FACTS = [
  { emoji: "🔒", text: "AES-256 encryption would take longer than the age of the universe to brute-force with today's fastest computers." },
  { emoji: "🌐", text: "Global internet traffic now exceeds 5 exabytes per day — that's 5 billion gigabytes every 24 hours!" },
  { emoji: "📡", text: "WebRTC (used for peer-to-peer transfers) was first released by Google in 2011 and is now supported by all major browsers." },
  { emoji: "⚡", text: "The world's fastest internet connection is in Japan — over 319 terabits per second, enough to download 80,000 movies in one second." },
  { emoji: "📱", text: "There are more mobile devices than people on Earth. Over 8.5 billion active mobile connections exist today." },
  { emoji: "🛡️", text: "End-to-end encryption means even the server cannot see the content of your files — only you and your recipient can." },
  { emoji: "☁️", text: "Cloud storage providers store over 100 zettabytes of data globally — more than all the stars visible from Earth." },
  { emoji: "🤖", text: "AI-generated data is projected to represent 10% of all internet traffic by 2027, up from less than 1% in 2023." },
  { emoji: "🔑", text: "A strong password with 12 random characters takes an average of 34,000 years to crack via brute force." },
  { emoji: "📁", text: "The first computer file system was created in 1956 for the IBM 350 hard disk — it stored just 3.75 MB of data." },
  { emoji: "🚀", text: "SpaceX Starlink now provides internet at over 250 Mbps to more than 2 million users across 70+ countries." },
  { emoji: "🌍", text: "Every minute, users upload 500 hours of video to YouTube, send 65 billion WhatsApp messages, and share 1.8M images on Instagram." },
  { emoji: "🔐", text: "Zero-knowledge proof systems let you prove you know something without revealing what it is — the math behind true privacy." },
  { emoji: "📊", text: "The average person generates 1.7 MB of data every second — that's 146 GB per day, every day of your life." },
  { emoji: "💾", text: "The first hard disk drive, launched in 1956, was the size of two refrigerators and stored just 5 MB of data." },
  { emoji: "🌱", text: "Data centers worldwide consume about 200 terawatt-hours of electricity per year — roughly 1% of global electricity usage." },
  { emoji: "🧠", text: "The human brain has a storage capacity estimated at 2.5 petabytes — equivalent to 3 million hours of HD video." },
  { emoji: "🔗", text: "Blockchain technology achieves tamper-proof records without any central authority by chaining cryptographic hashes." },
  { emoji: "📶", text: "Wi-Fi 7 (802.11be) can theoretically reach speeds of 46 Gbps — fast enough to transfer a 4K movie in under 1 second." },
  { emoji: "✨", text: "Your file is being prepared with military-grade security. No account needed, no data retained after 1 hour." },
];

// Individual file packet dot for the animated track
function PacketDot({ delay, color }: { delay: number; color: string }) {
  return (
    <div
      className="absolute rounded-full shadow-md"
      style={{
        width: 10,
        height: 10,
        backgroundColor: color,
        top: "50%",
        left: 0,
        transform: "translateY(-50%)",
        animation: `packetMove 1.6s ease-in-out ${delay}ms infinite`,
        boxShadow: `0 0 6px ${color}99`,
      }}
    />
  );
}

export function UploadEngager({
  progress,
  fileIndex,
  totalFiles,
  fileName,
  transferSpeed,
  estimatedTime,
}: UploadEngagerProps) {
  const [factIndex, setFactIndex] = useState(() => Math.floor(Math.random() * FACTS.length));
  const [factVisible, setFactVisible] = useState(true);
  const [countdown, setCountdown] = useState(6);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rotate facts every 6 seconds with fade transition
  useEffect(() => {
    const rotateFact = () => {
      setFactVisible(false);
      setTimeout(() => {
        setFactIndex((prev) => (prev + 1) % FACTS.length);
        setFactVisible(true);
        setCountdown(6);
      }, 400);
    };

    intervalRef.current = setInterval(rotateFact, 6000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Countdown timer display
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 6 : prev - 1));
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const fact = FACTS[factIndex];
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <>
      {/* ── Keyframes (injected once) ── */}
      <style>{`
        @keyframes waveMove {
          0%   { transform: translateX(-100%) scaleY(1); }
          50%  { transform: translateX(-10%)  scaleY(1.04); }
          100% { transform: translateX(100%)  scaleY(1); }
        }
        @keyframes packetMove {
          0%   { left: 0%;   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes factFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes factFadeOut {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-8px); }
        }
        @keyframes pulseDot {
          0%,100% { transform: scale(1);   opacity: 0.7; }
          50%      { transform: scale(1.5); opacity: 1; }
        }
        @keyframes shimmerBar {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
      `}</style>

      <div className="mt-4 rounded-2xl overflow-hidden border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 shadow-lg">

        {/* ── Section 1: Rich animated progress bar ── */}
        <div className="p-5 pb-4">

          {/* File counter header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full bg-indigo-500"
                style={{ animation: "pulseDot 1.2s ease-in-out infinite" }}
              />
              <span className="text-sm font-semibold text-slate-700">
                {totalFiles > 1
                  ? `Uploading file ${fileIndex + 1} of ${totalFiles}`
                  : "Uploading your file"}
              </span>
            </div>
            <span className="text-sm font-bold text-indigo-600 tabular-nums">
              {Math.round(clampedProgress)}%
            </span>
          </div>

          {/* File name */}
          {fileName && (
            <p className="text-xs text-slate-500 mb-3 truncate max-w-full font-mono">
              📄 {fileName}
            </p>
          )}

          {/* ── Animated wave progress bar ── */}
          <div
            className="relative h-7 rounded-full overflow-hidden bg-slate-100 border border-indigo-100"
            role="progressbar"
            aria-valuenow={Math.round(clampedProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {/* Base fill */}
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${clampedProgress}%`,
                background: "linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)",
              }}
            />

            {/* Shimmer overlay on the fill */}
            <div
              className="absolute inset-y-0 left-0 rounded-full pointer-events-none"
              style={{
                width: `${clampedProgress}%`,
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.30) 50%, transparent 100%)",
                backgroundSize: "400px 100%",
                animation: "shimmerBar 1.8s ease-in-out infinite",
              }}
            />

            {/* Wave ripple at the leading edge */}
            {clampedProgress > 2 && clampedProgress < 99 && (
              <div
                className="absolute inset-y-0 rounded-full pointer-events-none"
                style={{
                  left: `${Math.max(0, clampedProgress - 8)}%`,
                  width: "16%",
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
                  animation: "waveMove 1.1s ease-in-out infinite",
                }}
              />
            )}

            {/* Percentage text inside bar */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black text-white drop-shadow-sm tracking-wide">
                {Math.round(clampedProgress)}%
              </span>
            </div>
          </div>

          {/* ── Animated packet track (file icons flying across) ── */}
          <div className="relative h-5 mt-2 mx-1">
            {/* Track dashes */}
            <div className="absolute inset-y-1/2 left-0 right-0 border-t border-dashed border-indigo-200/60" />
            {/* Packet dots with staggered delays */}
            <PacketDot delay={0}    color="#6366f1" />
            <PacketDot delay={530}  color="#8b5cf6" />
            <PacketDot delay={1060} color="#a855f7" />
          </div>

          {/* Speed & ETA row */}
          <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
            <span>
              {totalFiles > 1
                ? `${totalFiles - fileIndex - 1} file${totalFiles - fileIndex - 1 !== 1 ? "s" : ""} remaining after this`
                : "Almost there…"}
            </span>
            <div className="flex items-center gap-3">
              {transferSpeed && (
                <span className="font-semibold text-indigo-600">⚡ {transferSpeed}</span>
              )}
              {estimatedTime && (
                <span className="text-slate-500">⏱ {estimatedTime}</span>
              )}
            </div>
          </div>

          {/* Per-file progress pills (multi-file) */}
          {totalFiles > 1 && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {Array.from({ length: totalFiles }).map((_, i) => (
                <div
                  key={i}
                  title={`File ${i + 1}`}
                  className={`h-2 rounded-full flex-1 min-w-[12px] transition-all duration-500 ${
                    i < fileIndex
                      ? "bg-green-400"
                      : i === fileIndex
                      ? "bg-indigo-500"
                      : "bg-slate-200"
                  }`}
                  style={i === fileIndex ? { animation: "pulseDot 1.2s ease-in-out infinite" } : {}}
                />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent mx-4" />

        {/* ── Section 2: Rotating Did You Know? facts ── */}
        <div className="p-5 pt-4">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-xs font-black uppercase tracking-widest text-indigo-400">
              💡 Did You Know?
            </span>
            <div className="flex-1 h-px bg-indigo-100" />
            <span className="text-xs text-slate-400 tabular-nums">next in {countdown}s</span>
          </div>

          <div
            className="min-h-[56px] flex items-start gap-3"
            style={{
              animation: factVisible ? "factFadeIn 0.4s ease both" : "factFadeOut 0.35s ease both",
            }}
          >
            <span className="text-2xl flex-shrink-0 mt-0.5">{fact.emoji}</span>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">{fact.text}</p>
          </div>

          {/* Dot indicators for fact position */}
          <div className="flex gap-1.5 mt-3 justify-center">
            {FACTS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === factIndex
                    ? "w-4 h-1.5 bg-indigo-500"
                    : "w-1.5 h-1.5 bg-indigo-200"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
