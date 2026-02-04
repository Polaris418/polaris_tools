import React from 'react';
import { Icon } from './Icon';
import { guestUsageManager } from '../utils/guestUsageManager';
import { useAppContext } from '../context/AppContext';

interface GuestLimitDialogProps {
  remainingCount: number;
  isBlocked: boolean;
  onLogin: () => void;
  onRegister: () => void;
  onClose?: () => void;
}

/**
 * GuestLimitDialog Component
 * 游客使用限制对话框
 *
 * 两种模式：
 * 1. 警告模式（isBlocked=false）：显示剩余次数提醒，可以关闭
 * 2. 阻止模式（isBlocked=true）：强制登录，不能关闭
 */
export const GuestLimitDialog: React.FC<GuestLimitDialogProps> = ({
  remainingCount,
  isBlocked,
  onLogin,
  onRegister,
  onClose,
}) => {
  const { t } = useAppContext();
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-slate-200 dark:border-border-dark p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
        {/* 图标和标题 */}
        <div className="flex flex-col items-center mb-6">
          <div className={`size-16 rounded-2xl flex items-center justify-center mb-4 ${
            isBlocked 
              ? 'bg-red-100 dark:bg-red-900/20' 
              : 'bg-amber-100 dark:bg-amber-900/20'
          }`}>
            <Icon 
              name={isBlocked ? 'block' : 'warning'} 
              className={`text-[32px] ${
                isBlocked 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            />
          </div>
          
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {isBlocked ? t('guest.limit.reached') : t('guest.limit.warning')}
          </h3>

          <p className="text-slate-500 dark:text-text-secondary text-center text-sm">
            {isBlocked
              ? t('guest.limit.reached.message')
              : t('guest.limit.warning.message', { count: remainingCount })
            }
          </p>
        </div>

        {/* 剩余次数显示（未阻止时） */}
        {!isBlocked && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg text-center border border-amber-200 dark:border-amber-800">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">
              {remainingCount}
            </div>
            <div className="text-sm text-amber-700 dark:text-amber-300">
              {t('guest.limit.remaining')}
            </div>
          </div>
        )}

        {/* 登录注册的好处列表 */}
        <div className="mb-6 space-y-2">
          <div className="flex items-start gap-3">
            <Icon name="check_circle" className="text-green-600 text-[20px] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {t('guest.limit.benefit.unlimited')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Icon name="check_circle" className="text-green-600 text-[20px] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {t('guest.limit.benefit.history')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Icon name="check_circle" className="text-green-600 text-[20px] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {t('guest.limit.benefit.preferences')}
              </p>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3">
          <button
            onClick={onLogin}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
          >
            {t('common.login_now')}
          </button>
          <button
            onClick={onRegister}
            className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold rounded-lg transition-colors"
          >
            {t('common.register_now')}
          </button>

          {/* 只有在未阻止时才显示关闭按钮 */}
          {!isBlocked && onClose && (
            <button
              onClick={() => {
                // 记录游客关闭登录提示
                guestUsageManager.trackLoginDismissal();
                onClose();
              }}
              className="w-full py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
            >
              {t('common.later')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
