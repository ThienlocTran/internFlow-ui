import { create } from "zustand";

interface ServerStatusState {
  isWakingUp: boolean;
  elapsedSeconds: number;
  pendingRequests: number;
  setWakingUp: (waking: boolean) => void;
  setElapsed: (seconds: number) => void;
  incrementPending: () => void;
  decrementPending: () => void;
}

export const useServerStatusStore = create<ServerStatusState>((set, get) => ({
  isWakingUp: false,
  elapsedSeconds: 0,
  pendingRequests: 0,

  setWakingUp: (waking) => set({ isWakingUp: waking }),
  setElapsed: (seconds) => set({ elapsedSeconds: seconds }),

  incrementPending: () => {
    set({ pendingRequests: get().pendingRequests + 1 });
  },

  decrementPending: () => {
    const next = Math.max(0, get().pendingRequests - 1);
    set({ pendingRequests: next });
    // Khi không còn request nào đang chờ → server đã thức
    if (next === 0) {
      set({ isWakingUp: false, elapsedSeconds: 0 });
    }
  },
}));
