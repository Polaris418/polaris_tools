/**
 * EmailProviderSwitcher - 邮件服务提供商切换组件
 * 
 * 允许管理员在不同的邮件服务提供商之间切换
 * - AWS SES
 * - Resend
 */

import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { adminApi } from '../api/adminClient';
import type { ProviderStatus } from '../pages/admin/types';

interface EmailProviderSwitcherProps {
  onSwitch?: (provider: string) => void;
}

export const EmailProviderSwitcher: React.FC<EmailProviderSwitcherProps> = ({ onSwitch }) => {
  const [providers, setProviders] = useState<Record<string, ProviderStatus>>({});
  const [currentProvider, setCurrentProvider] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // 加载提供商状态
  const loadProviders = async () => {
    try {
      setLoading(true);
      const result = await adminApi.emailProvider.getStatus();
      
      if (result.code === 200 && result.data) {
        setProviders(result.data);
        
        // 找到当前提供商
        const current = Object.values(result.data).find(p => p.current);
        if (current) {
          setCurrentProvider(current.name);
        }
      }
    } catch (error) {
      console.error('加载邮件服务提供商失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  // 切换提供商
  const handleSwitch = async (providerName: string) => {
    if (providerName === currentProvider) {
      return;
    }

    if (!providers[providerName]?.available) {
      alert('该邮件服务提供商不可用，请检查配置');
      return;
    }

    if (!confirm(`确定要切换到 ${providers[providerName]?.displayName} 吗？`)) {
      return;
    }

    try {
      setSwitching(true);
      const result = await adminApi.emailProvider.switch(providerName);
      
      if (result.code === 200) {
        setCurrentProvider(providerName);
        alert(`成功切换到 ${providers[providerName]?.displayName}`);
        
        // 重新加载状态
        await loadProviders();
        
        // 触发回调
        if (onSwitch) {
          onSwitch(providerName);
        }
      } else {
        alert(`切换失败: ${result.message}`);
      }
    } catch (error) {
      console.error('切换邮件服务提供商失败:', error);
      alert('切换失败，请稍后重试');
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
        邮件服务:
      </span>
      
      <div className="flex items-center gap-2">
        {Object.entries(providers).map(([key, provider]) => (
          <button
            key={key}
            onClick={() => handleSwitch(key)}
            disabled={switching || !provider.available}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              flex items-center gap-2
              ${provider.current
                ? 'bg-indigo-600 text-white shadow-md'
                : provider.available
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }
              ${switching ? 'opacity-50 cursor-wait' : ''}
            `}
          >
            {/* 提供商图标 */}
            {key === 'aws-ses' && (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.75 11.35a4.32 4.32 0 0 0-.79-.08 4.34 4.34 0 0 0-4.34 4.34 4.34 4.34 0 0 0 4.34 4.34 4.34 4.34 0 0 0 4.34-4.34 4.32 4.32 0 0 0-.08-.79l-3.47 3.47zm-7.5 0a4.32 4.32 0 0 0-.79-.08 4.34 4.34 0 0 0-4.34 4.34 4.34 4.34 0 0 0 4.34 4.34 4.34 4.34 0 0 0 4.34-4.34 4.32 4.32 0 0 0-.08-.79l-3.47 3.47zM5.25 6.35a4.32 4.32 0 0 0-.79-.08 4.34 4.34 0 0 0-4.34 4.34 4.34 4.34 0 0 0 4.34 4.34 4.34 4.34 0 0 0 4.34-4.34 4.32 4.32 0 0 0-.08-.79l-3.47 3.47z"/>
              </svg>
            )}
            {key === 'resend' && (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            )}
            
            <span>{provider.displayName}</span>
            
            {/* 状态指示器 */}
            {provider.current && (
              <Icon name="check_circle" className="text-white" />
            )}
            {!provider.available && (
              <Icon name="error" className="text-red-500" />
            )}
          </button>
        ))}
      </div>
      
      {/* 刷新按钮 */}
      <button
        onClick={loadProviders}
        disabled={loading || switching}
        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        title="刷新状态"
      >
        <Icon name="refresh" className={loading ? 'animate-spin' : ''} />
      </button>
    </div>
  );
};
