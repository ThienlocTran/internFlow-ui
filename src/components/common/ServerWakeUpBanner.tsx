import { useEffect, useState } from "react";
import { useServerStatusStore } from "@/store/server-status-store";

const MESSAGES = [
  "Server đang ngủ đông... đang đánh thức ☕",
  "Render free tier đang khởi động lại...",
  "Vui lòng chờ, thường mất 30–60 giây lần đầu...",
  "Sắp xong rồi, cảm ơn bạn đã kiên nhẫn! 🙏",
];

export function ServerWakeUpBanner() {
  const { isWakingUp, elapsedSeconds } = useServerStatusStore();
  const [visible, setVisible] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  // Delay hiển thị 0.3s để tránh flash ngắn
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isWakingUp) {
      timeout = setTimeout(() => setVisible(true), 300);
    } else {
      setVisible(false);
      setMsgIndex(0);
    }
    return () => clearTimeout(timeout);
  }, [isWakingUp]);

  // Đổi message mỗi 10 giây
  useEffect(() => {
    if (!visible) return;
    const idx = Math.min(
      Math.floor(elapsedSeconds / 10),
      MESSAGES.length - 1
    );
    setMsgIndex(idx);
  }, [elapsedSeconds, visible]);

  if (!visible) return null;

  // Progress: 0–100% trong 60 giây (tối đa)
  const progress = Math.min((elapsedSeconds / 60) * 100, 95);

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[9999] w-full max-w-sm -translate-x-1/2 px-4"
      style={{ animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-gray-900/95 p-4 shadow-2xl backdrop-blur-xl">
        {/* Shimmer nền */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)",
            animation: "shimmer 3s ease-in-out infinite",
          }}
        />

        {/* Nội dung */}
        <div className="relative z-10">
          <div className="mb-3 flex items-center gap-3">
            {/* Icon ngủ/thức */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
              <span
                className="text-xl"
                style={{ animation: "bounce 1.5s infinite" }}
              >
                {elapsedSeconds < 5 ? "😴" : elapsedSeconds < 30 ? "☕" : "⏳"}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                Server đang khởi động
              </p>
              <p className="truncate text-xs text-white/60">
                {MESSAGES[msgIndex]}
              </p>
            </div>

            {/* Đếm giây */}
            <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs font-mono text-white/80">
              {elapsedSeconds}s
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)",
                transition: "width 1s linear",
                boxShadow: "0 0 8px rgba(139,92,246,0.6)",
              }}
            />
          </div>

          <p className="mt-2 text-center text-[10px] text-white/40">
            Render Free Tier · Cold Start
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.15; }
          50%       { opacity: 0.30; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
