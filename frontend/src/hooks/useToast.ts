'use client';

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (type: ToastType, message: string) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (type, message) => {
    const id = `${Date.now()}-${Math.random()}`;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, type, message, createdAt: Date.now() }] }));
    // Auto-dismiss after 4 s
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience hook used in components */
export function useToast() {
  const { add } = useToastStore();
  return {
    success: (message: string) => add('success', message),
    error:   (message: string) => add('error',   message),
    info:    (message: string) => add('info',     message),
    warning: (message: string) => add('warning',  message),
  };
}
