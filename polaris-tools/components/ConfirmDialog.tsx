import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

/**
 * 确认对话框组件
 * Confirmation Dialog Component
 * 
 * 用于需要用户确认的操作，特别是危险操作（如永久删除）
 * Used for operations that require user confirmation, especially dangerous operations (like permanent delete)
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDangerous = false
}) => {
  if (!isOpen) return null;

  const colors = isDangerous
    ? {
        icon: 'error',
        iconColor: 'text-red-600 dark:text-red-400',
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white'
      }
    : {
        icon: 'warning',
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white'
      };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 ${colors.iconColor}`}>
              <span className="material-symbols-outlined text-3xl">{colors.icon}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${colors.confirmButton}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
