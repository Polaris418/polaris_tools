import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { useFavoriteStatus } from '../hooks/useFavorites';
import { apiClient } from '../api/client';
import { Icon } from './Icon';

interface ToolLayoutProps {
  toolId: string;
  children: React.ReactNode;
}

/**
 * 通用工具布局组件
 * 自动处理：标题、面包屑导航、返回按钮、背景样式、收藏功能、使用记录
 * 开发者只需关注核心功能实现
 */
export const ToolLayout: React.FC<ToolLayoutProps> = ({ toolId, children }) => {
  const { setPage, language, toolRegistry, t, isAuthenticated, showToast } = useAppContext();

  // 从注册表获取工具信息
  const tool = toolRegistry.find(t => t.path === toolId);
  
  // 收藏功能 - 需要从数据库获取工具的数字ID
  // 注意：toolId 是路径字符串，我们需要工具的数字 ID
  const numericToolId = tool?.numericId ?? null;
  const { isFavorited, loading: favoriteLoading, toggleFavorite } = useFavoriteStatus(
    isAuthenticated && numericToolId ? numericToolId : null
  );
  const [isToggling, setIsToggling] = useState(false);
  
  // 记录工具使用 - 包含使用时长追踪
  const hasRecordedUsage = useRef(false);
  const usageIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  
  // 发送使用时长的函数
  const sendDuration = useCallback(async () => {
    if (usageIdRef.current) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      // 只有使用超过1秒才记录
      if (duration > 0) {
        try {
          await apiClient.tools.updateUsageDuration(usageIdRef.current, duration);
          console.debug('Tool usage duration recorded:', duration, 'seconds');
        } catch (err) {
          console.debug('Failed to update usage duration:', err);
        }
      }
      usageIdRef.current = null;
    }
  }, []);
  
  useEffect(() => {
    const recordToolUsage = async () => {
      // 通过 toolId (即 URL/path) 记录使用，尚未记录时才执行
      if (toolId && !hasRecordedUsage.current) {
        hasRecordedUsage.current = true;
        startTimeRef.current = Date.now();
        try {
          // 使用工具的 path/url 来记录使用
          const result = await apiClient.tools.recordUseByUrl(toolId);
          if (result.data) {
            usageIdRef.current = result.data;
            console.debug('Tool usage recorded, usageId:', result.data);
          }
        } catch (err) {
          // 忽略错误，不影响用户使用工具
          console.debug('Failed to record tool usage:', err);
        }
      }
    };
    
    recordToolUsage();
    
    // 页面卸载时发送使用时长
    const handleBeforeUnload = () => {
      if (usageIdRef.current) {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        // 使用 sendBeacon 确保在页面关闭时也能发送
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        navigator.sendBeacon(
          `${baseUrl}/api/v1/tools/usage/${usageIdRef.current}/duration?duration=${duration}`,
          ''
        );
      }
    };
    
    // 页面可见性变化时发送（用于切换标签页）
    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendDuration();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 清理函数 - 组件卸载时发送使用时长
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sendDuration();
    };
  }, [toolId, sendDuration]);
  
  const handleFavoriteClick = async () => {
    if (!isAuthenticated) {
      showToast(t('favorite.login_required'), 'warning');
      return;
    }
    
    if (isToggling || favoriteLoading || !numericToolId) return;
    
    setIsToggling(true);
    try {
      await toggleFavorite();
      showToast(
        isFavorited ? t('favorite.removed') : t('favorite.added'),
        'success'
      );
    } catch (err) {
      showToast(t('favorite.error'), 'error');
    } finally {
      setIsToggling(false);
    }
  };
  
  if (!tool) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
            error_outline
          </span>
          <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {t('tool.layout.not_found')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {t('tool.layout.check_id')}
          </p>
          <button
            onClick={() => setPage('dashboard')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            {t('tool.layout.back_home')}
          </button>
        </div>
      </div>
    );
  }

  const title = language === 'zh' && tool.title_zh ? tool.title_zh : tool.title;
  const description = language === 'zh' && tool.description_zh ? tool.description_zh : tool.description;
  const categoryName = language === 'zh' && tool.category_zh ? tool.category_zh : tool.category;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* 顶部导航栏 */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* 返回按钮 */}
            <button
              onClick={() => setPage('dashboard')}
              className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
              <span className="text-sm font-medium">
                {t('tool.layout.back')}
              </span>
            </button>

            {/* 分隔线 */}
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-600"></div>

            {/* 面包屑导航 */}
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                {t('tool.layout.home')}
              </span>
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-sm">
                chevron_right
              </span>
              <span className="text-slate-500 dark:text-slate-400">{categoryName}</span>
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-sm">
                chevron_right
              </span>
              <span className="text-slate-900 dark:text-white font-medium">{title}</span>
            </div>
          </div>
          
          {/* 收藏按钮 */}
          {isAuthenticated && numericToolId && (
            <button
              onClick={handleFavoriteClick}
              disabled={isToggling || favoriteLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                isFavorited
                  ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-600'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 hover:text-yellow-600 dark:hover:text-yellow-400 border border-slate-200 dark:border-slate-600'
              } ${isToggling || favoriteLoading ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
              title={isFavorited ? t('favorite.remove') : t('favorite.add')}
            >
              {isToggling || favoriteLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <Icon name="star" filled={isFavorited} className="text-[18px]" />
              )}
              <span className="text-sm">
                {isFavorited ? t('favorite.favorited') : t('favorite.add_to_favorites')}
              </span>
            </button>
          )}
        </div>

        {/* 工具标题和描述 */}
        <div className="mt-4 flex items-center space-x-4">
          <div className={`w-12 h-12 rounded-xl ${tool.bgHoverClass || 'bg-indigo-500/10'} flex items-center justify-center`}>
            <span className={`material-symbols-outlined text-2xl ${tool.colorClass || 'text-indigo-600 dark:text-indigo-400'}`}>
              {tool.icon}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
            {description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
            )}
          </div>
        </div>
      </div>

      {/* 工具内容区域 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
