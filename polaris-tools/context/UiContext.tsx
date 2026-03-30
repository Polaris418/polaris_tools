import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ToastType } from '../components/Toast';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions;
  resolve: ((value: boolean) => void) | null;
}

interface LoginPromptState {
  isOpen: boolean;
  message?: string;
}

interface GuestLimitState {
  isOpen: boolean;
  isBlocked: boolean;
}

export interface UiContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  confirmState: ConfirmState;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
  loginPromptState: LoginPromptState;
  promptLogin: (message?: string) => void;
  closeLoginPrompt: () => void;
  guestLimitState: GuestLimitState;
  openGuestLimit: (isBlocked?: boolean) => void;
  closeGuestLimit: () => void;
}

const emptyConfirmOptions: ConfirmOptions = {
  title: '',
  message: '',
};

const UiContext = createContext<UiContextType | undefined>(undefined);

export const UiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    options: emptyConfirmOptions,
    resolve: null,
  });
  const [loginPromptState, setLoginPromptState] = useState<LoginPromptState>({
    isOpen: false,
    message: undefined,
  });
  const [guestLimitState, setGuestLimitState] = useState<GuestLimitState>({
    isOpen: false,
    isBlocked: false,
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const closeConfirm = useCallback((result: boolean) => {
    setConfirmState((prev) => {
      prev.resolve?.(result);
      return {
        isOpen: false,
        options: emptyConfirmOptions,
        resolve: null,
      };
    });
  }, []);

  const handleConfirm = useCallback(() => {
    closeConfirm(true);
  }, [closeConfirm]);

  const handleCancel = useCallback(() => {
    closeConfirm(false);
  }, [closeConfirm]);

  const promptLogin = useCallback((message?: string) => {
    setLoginPromptState({
      isOpen: true,
      message,
    });
  }, []);

  const closeLoginPrompt = useCallback(() => {
    setLoginPromptState({
      isOpen: false,
      message: undefined,
    });
  }, []);

  const openGuestLimit = useCallback((isBlocked: boolean = false) => {
    setGuestLimitState((prev) => ({
      isOpen: true,
      isBlocked: prev.isBlocked || isBlocked,
    }));
  }, []);

  const closeGuestLimit = useCallback(() => {
    setGuestLimitState({
      isOpen: false,
      isBlocked: false,
    });
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      removeToast,
      confirmState,
      showConfirm,
      handleConfirm,
      handleCancel,
      loginPromptState,
      promptLogin,
      closeLoginPrompt,
      guestLimitState,
      openGuestLimit,
      closeGuestLimit,
    }),
    [
      toasts,
      showToast,
      removeToast,
      confirmState,
      showConfirm,
      handleConfirm,
      handleCancel,
      loginPromptState,
      promptLogin,
      closeLoginPrompt,
      guestLimitState,
      openGuestLimit,
      closeGuestLimit,
    ]
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
};

export const useUi = (): UiContextType => {
  const context = useContext(UiContext);
  if (!context) {
    throw new Error('useUi 必须在 UiProvider 内使用');
  }
  return context;
};
