import React, { useState } from 'react';

interface EmailVerificationBannerProps {
  email: string;
  onResendVerification: () => Promise<void>;
  cooldownSeconds?: number;
}

/**
 * EmailVerificationBanner 组件
 * 在页面顶部显示邮箱未验证提示，带重新发送验证邮件按钮和可关闭功能
 * 
 * 需求: 18.8 - 邮箱验证状态显示
 */
export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  email,
  onResendVerification,
  cooldownSeconds = 60,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState('');

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setMessage('');

    try {
      await onResendVerification();
      setMessage('验证邮件已发送，请查收！');
      
      // Start cooldown
      setCooldown(cooldownSeconds);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      setMessage('发送失败，请稍后重试');
    } finally {
      setIsResending(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-xl">
              warning
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                您的邮箱 <span className="font-semibold">{email}</span> 尚未验证
              </p>
              {message && (
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  {message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResend}
              disabled={cooldown > 0 || isResending}
              className="px-4 py-1.5 text-sm font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-800/30 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm animate-spin">
                    refresh
                  </span>
                  发送中...
                </span>
              ) : cooldown > 0 ? (
                `重新发送 (${cooldown}s)`
              ) : (
                '重新发送验证邮件'
              )}
            </button>

            <button
              onClick={() => setIsVisible(false)}
              className="p-1.5 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-800/30 rounded-lg transition-colors"
              aria-label="关闭"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
