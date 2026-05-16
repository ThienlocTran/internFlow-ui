import type { ApiResponse } from "@/types/api";
import { useAuthStore } from "@/store/auth-store";
import { useServerStatusStore } from "@/store/server-status-store";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

// Sau bao nhiêu ms không có phản hồi thì coi là server đang cold start
const WAKE_UP_THRESHOLD_MS = 3000;

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const token = useAuthStore.getState().token;
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !options.skipAuth) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const { incrementPending, decrementPending, setWakingUp, setElapsed } =
    useServerStatusStore.getState();

  const startTime = Date.now();
  let wakeUpTimer: ReturnType<typeof setTimeout> | null = null;
  let elapsedTimer: ReturnType<typeof setInterval> | null = null;

  // Sau WAKE_UP_THRESHOLD_MS → kích hoạt banner
  wakeUpTimer = setTimeout(() => {
    incrementPending();
    setWakingUp(true);
    setElapsed(Math.floor((Date.now() - startTime) / 1000));

    // Cập nhật số giây đã chờ mỗi giây
    elapsedTimer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  }, WAKE_UP_THRESHOLD_MS);

  const cleanup = () => {
    if (wakeUpTimer) clearTimeout(wakeUpTimer);
    if (elapsedTimer) clearInterval(elapsedTimer);
    // Nếu banner đã hiện thì ẩn đi
    if (Date.now() - startTime > WAKE_UP_THRESHOLD_MS) {
      decrementPending();
    }
  };

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    cleanup();

    if (response.status === 401) {
      useAuthStore.getState().logout();
      throw new Error("Phiên đăng nhập đã hết hạn");
    }

    const payload = (await response.json()) as ApiResponse<T>;
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Có lỗi xảy ra");
    }

    return payload.data;
  } catch (error) {
    cleanup();
    throw error;
  }
}
