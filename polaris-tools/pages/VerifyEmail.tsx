import React, { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAppContext } from '../context/AppContext';
import { apiClient } from '../api/client';

export const VerifyEmail: React.FC = () => {
  const { navigate, t, showToast, refreshUser } = useAppContext();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      // 从 URL 获取 token
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage(t('verify.failed'));
        return;
      }

      try {
        // 调用后端验证接口
        const response = await apiClient.email.verify(token);

        if (response.code === 200) {
          setStatus('success');
          setMessage(t('verify.success'));
          showToast(t('verify.success_toast'), 'success');
          
          // 刷新用户信息以更新验证状态
          await refreshUser();
          
          // 3秒后跳转到首页
          setTimeout(() => {
            navigate('dashboard');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(response.message || t('verify.failed'));
        }
      } catch (error: any) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage(error.message || t('verify.failed_retry'));
      }
    };

    verifyEmail();
  }, [t, navigate, showToast, refreshUser]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4">
              <Icon name="mail" className="text-3xl text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t('auth.email_verification')}
            </h1>
          </div>

          {/* Status Content */}
          <div className="text-center">
            {status === 'loading' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  {t('verify.verifying')}
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                    <Icon name="check_circle" className="text-4xl text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {t('verify.success_title')}
                </h2>
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                  {message}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('auth.redirecting')}
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <Icon name="error" className="text-4xl text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {t('verify.failed_title')}
                </h2>
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                  {message}
                </p>
                <button
                  onClick={() => navigate('dashboard')}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  {t('verify.back_home')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('footer.rights')}
          </p>
        </div>
      </div>
    </div>
  );
};
