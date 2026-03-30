import React from 'react';
import { Icon } from './Icon';
import { useI18n } from '../context/I18nContext';

interface LoginPromptProps {
  message?: string;
  onLogin: () => void;
  onCancel: () => void;
}

/**
 * LoginPrompt Component
 * 登录提示对话框组件
 * Requirements: 1.4
 *
 * 用于在游客尝试访问需要登录的功能时显示友好的提示
 */
export const LoginPrompt: React.FC<LoginPromptProps> = ({
  message,
  onLogin,
  onCancel,
}) => {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-slate-200 dark:border-border-dark max-w-md w-full animate-in zoom-in-95 duration-200">
        {/* Header with Icon */}
        <div className="flex flex-col items-center p-8 pb-6">
          <div className="size-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
            <Icon 
              name="lock" 
              className="text-[32px] text-indigo-600 dark:text-indigo-400"
            />
          </div>
          
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {t('login.prompt.required')}
          </h3>

          <p className="text-slate-500 dark:text-text-secondary text-center text-sm">
            {message || t('login.prompt.message')}
          </p>
        </div>

        {/* Benefits Section */}
        <div className="px-8 pb-6 space-y-3">
          <div className="flex items-start gap-3">
            <Icon name="check_circle" className="text-green-600 text-[20px] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {t('login.prompt.benefit.history')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Icon name="check_circle" className="text-green-600 text-[20px] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {t('login.prompt.benefit.preferences')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Icon name="check_circle" className="text-green-600 text-[20px] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {t('login.prompt.benefit.advanced')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 px-8 py-4 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl border-t border-slate-200 dark:border-border-dark">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {t('common.later')}
          </button>
          <button
            onClick={onLogin}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {t('common.login_now')}
          </button>
        </div>
      </div>
    </div>
  );
};
