import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
  actionLabel?: string;
  actionAriaLabel?: string;
  onAction?: () => void;
}

/**
 * Toast 提示组件
 */
export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  onClose,
  duration = 3000,
  actionLabel,
  actionAriaLabel,
  onAction,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
    }
  };

  const handleAction = () => {
    onAction?.();
    onClose();
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${getColors()} animate-in slide-in-from-top-5 fade-in duration-300`}>
      <span className="material-symbols-outlined text-xl">{getIcon()}</span>
      <span className="text-sm font-medium flex-1">{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={handleAction}
          aria-label={actionAriaLabel ?? actionLabel}
          className="shrink-0 rounded-md border border-current/20 px-2.5 py-1 text-xs font-semibold hover:bg-white/40 dark:hover:bg-slate-900/20 transition-colors"
        >
          {actionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="text-current opacity-60 hover:opacity-100 transition-opacity"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type: ToastType;
    actionLabel?: string;
    actionAriaLabel?: string;
    onAction?: () => void;
  }>;
  onRemove: (id: string) => void;
}

/**
 * Toast 容器组件
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          actionLabel={toast.actionLabel}
          actionAriaLabel={toast.actionAriaLabel}
          onAction={toast.onAction}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
};
