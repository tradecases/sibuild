import { create } from 'zustand';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface UiState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  toasts: Toast[];
  activeModal: string | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
  };
}

let toastIdCounter = 0;

export const useUiStore = create<UiState>((set, get) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  toasts: [],
  activeModal: null,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),

  addToast: (toast) => {
    const id = String(++toastIdCounter);
    const duration = toast.duration ?? 4000;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration);
    }
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  toast: {
    success: (title, description) => get().addToast({ type: 'success', title, description }),
    error: (title, description) => get().addToast({ type: 'error', title, description, duration: 6000 }),
    warning: (title, description) => get().addToast({ type: 'warning', title, description }),
    info: (title, description) => get().addToast({ type: 'info', title, description }),
  },
}));
