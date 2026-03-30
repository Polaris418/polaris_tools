import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { useI18n } from '../context/I18nContext';

interface SessionTimeoutDialogProps {
  expiresAt: number;
  onContinue: () => void;
  onLogout: () => void;
  onClose?: () => void;
}

/**
 * SessionTimeoutDialog Component
 * 会话超时提醒对话框
 *
 * 功能：
 * - 显示会话即将过期的倒计时
 * - 提供"继续使用"按钮刷新 token
 * - 提供"退出登录"按钮安全退出
 * - 可选的关闭按钮（非模态）
 * - 滑入动画效果
 */
export const SessionTimeoutDialog: React.FC<SessionTimeoutDialogProps> = ({
  expiresAt,
  onContinue,
  onLogout,
  onClose,
}) => {
  const { t } = useI18n();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // 计算剩余时间
  useEffect(() => {
    const updateTimeRemaining = () => {
      const remaining = Math.max(0, expiresAt - Date.now());
      setTimeRemaining(remaining);
      
      // 如果时间到了，自动退出登录
      if (remaining === 0) {
        onLogout();
      }
    };

    // 立即更新一次
    updateTimeRemaining();

    // 每秒更新一次
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onLogout]);

  // 格式化时间显示（分:秒）
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 计算进度百分比（用于进度条）
  const getProgressPercentage = (): number => {
    const twoMinutes = 2 * 60 * 1000; // 2分钟
    return Math.max(0, Math.min(100, (timeRemaining / twoMinutes) * 100));
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-slate-200 dark:border-border-dark p-6 max-w-md w-full animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
        {/* 关闭按钮（可选） */}
        {onClose && (
          <div className="flex justify-end mb-2">
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={t('session.timeout.close')}
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
        )}

        {/* 图标和标题 */}
        <div className="flex flex-col items-center mb-6">
          <div className="size-16 rounded-2xl flex items-center justify-center mb-4 bg-amber-100 dark:bg-amber-900/20">
            <Icon 
              name="schedule" 
              className="text-[32px] text-amber-600 dark:text-amber-400"
            />
          </div>
          
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            会话即将过期
          </h3>
          
          <p className="text-slate-500 dark:text-text-secondary text-center text-sm">
            您的登录会话即将过期，请选择继续使用或退出登录
          </p>
        </div>

        {/* 倒计时显示 */}
        <div className="mb-6">
          <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-xl text-center border border-amber-200 dark:border-amber-800">
            <div className="text-5xl font-bold text-amber-600 dark:text-amber-400 mb-2 font-mono">
              {formatTime(timeRemaining)}
            </div>
            <div className="text-sm text-amber-700 dark:text-amber-300 mb-3">
              剩余时间
            </div>
            
            {/* 进度条 */}
            <div className="w-full h-2 bg-amber-200 dark:bg-amber-900/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000 ease-linear"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Icon name="info" className="text-blue-600 dark:text-blue-400 text-[20px] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-900 dark:text-blue-300">
              点击"继续使用"将自动刷新您的登录状态，无需重新输入密码
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3">
          <button
            onClick={onContinue}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="refresh" className="text-[20px]" />
            <span>继续使用</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="logout" className="text-[20px]" />
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </div>
  );
};
