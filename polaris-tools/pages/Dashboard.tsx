import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Hero } from '../components/Hero';
import { RecentToolCard } from '../components/RecentToolCard';
import { StandardToolCard } from '../components/StandardToolCard';
import { SkeletonList } from '../components/SkeletonList';
import { Icon } from '../components/Icon';
import { useAppContext } from '../context/AppContext';
import { useTools } from '../hooks/useTools';
import { useCategories } from '../hooks/useCategories';
import type { Tool, ToolResponse, CategoryResponse } from '../types';
import { apiClient } from '../api/client';

const SCROLL_POSITION_KEY = 'dashboard_scroll_position';

export const Dashboard: React.FC = () => {
  const { t, language, navigate } = useAppContext();
  const mainRef = useRef<HTMLElement>(null);
  
  // Fetch tools with default query - 获取所有工具
  const { data: toolsData, loading: toolsLoading, error: toolsError } = useTools({
    page: 1,
    size: 100, // 获取足够多的工具以显示所有分类
    sortBy: 'sortOrder',
    sortOrder: 'asc',
  });
  
  // Fetch categories
  const { data: categories, loading: categoriesLoading, error: categoriesError } = useCategories();
  
  // State for recent tools
  const [recentTools, setRecentTools] = useState<ToolResponse[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);
  
  /**
   * 格式化相对时间
   */
  const formatRelativeTime = (dateString?: string): string => {
    if (!dateString) return t('section.recently_used');
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
      return t('time.just_now');
    } else if (diffMinutes < 60) {
      return t('time.minutes_ago', { minutes: diffMinutes });
    } else if (diffHours < 24) {
      return t('time.hours_ago', { hours: diffHours });
    } else if (diffDays < 7) {
      return t('time.days_ago', { days: diffDays });
    } else {
      // 显示具体日期
      return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  /**
   * Fetch recent tools on mount
   * Requirements: 6.1, 6.6
   * Only fetch if user is authenticated
   */
  useEffect(() => {
    const fetchRecentTools = async () => {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        // User not authenticated, skip fetching recent tools
        setRecentLoading(false);
        setRecentTools([]);
        setRecentError(null);
        return;
      }

      try {
        setRecentLoading(true);
        const result = await apiClient.usage.recent(3);
        setRecentTools(result.data);
        setRecentError(null);
      } catch (err: any) {
        // Don't show error for authentication issues
        if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
          setRecentError(null);
        } else {
          setRecentError(err.message || t('section.recent_error'));
        }
        setRecentTools([]);
      } finally {
        setRecentLoading(false);
      }
    };

    fetchRecentTools();
  }, [t]);

  /**
   * Convert API ToolResponse to UI Tool format
   * Requirements: 2.7
   * Preserve conditional rendering for database content (nameZh, descriptionZh)
   */
  const convertToUITool = (toolResponse: ToolResponse): Tool => {
    return {
      id: toolResponse.id.toString(),
      numericId: toolResponse.id,
      title: language === 'zh' && toolResponse.nameZh ? toolResponse.nameZh : toolResponse.name,
      title_zh: toolResponse.nameZh,
      description: language === 'zh' && toolResponse.descriptionZh ? toolResponse.descriptionZh : toolResponse.description || '',
      description_zh: toolResponse.descriptionZh,
      icon: toolResponse.icon,
      category: toolResponse.categoryName,
      colorClass: toolResponse.colorClass,
      bgHoverClass: toolResponse.bgHoverClass,
      path: toolResponse.url,
    };
  };

  /**
   * Group tools by category
   * Requirements: 3.1, 3.4
   */
  const groupToolsByCategory = () => {
    if (!toolsData || !categories) return [];
    
    return categories
      .filter(cat => cat.status === 1) // Only active categories
      .map(category => {
        const categoryTools = toolsData.list.filter(
          tool => tool.categoryId === category.id && tool.status === 1
        );
        return {
          category,
          tools: categoryTools,
        };
      })
      .filter(group => group.tools.length > 0); // Only show categories with tools
  };

  const toolGroups = groupToolsByCategory();

  // 检查是否需要恢复滚动位置（使用 ref 避免每次渲染都读取 sessionStorage）
  const [scrollRestored, setScrollRestored] = useState(false);
  const savedPositionRef = useRef<string | null>(null);
  
  // 只在首次渲染时读取保存的位置
  if (savedPositionRef.current === null) {
    savedPositionRef.current = sessionStorage.getItem(SCROLL_POSITION_KEY) || '';
  }
  const hasSavedPosition = savedPositionRef.current !== '';

  // 数据加载完成后恢复滚动位置
  useLayoutEffect(() => {
    if (!toolsLoading && !categoriesLoading && toolGroups.length > 0 && !scrollRestored) {
      if (savedPositionRef.current && mainRef.current) {
        mainRef.current.scrollTop = parseInt(savedPositionRef.current, 10);
      }
      setScrollRestored(true);
    }
  }, [toolsLoading, categoriesLoading, toolGroups.length, scrollRestored]);

  // 如果有保存的位置但还没恢复，从一开始就隐藏内容避免闪烁
  const shouldHideContent = hasSavedPosition && !scrollRestored;

  return (
    <main 
      ref={mainRef}
      className={`flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scrollbar-thin scrollbar-thumb-slate-700 ${shouldHideContent ? 'invisible' : 'visible'}`}
    >
      <div className="max-w-7xl mx-auto space-y-12">
        <Hero />
        
        {/* Recently Used - Only show if there are recent tools or if loading */}
        {(recentLoading || recentTools.length > 0 || recentError) && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight tracking-tight">{t('section.recent')}</h2>
              <button onClick={() => navigate('history')} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium hover:underline">{t('section.recent.view_history')}</button>
            </div>
            
            {recentLoading ? (
              <SkeletonList count={6} variant="recent" layout="grid" />
            ) : recentError ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{recentError}</p>
              </div>
            ) : recentTools.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {recentTools.map(tool => {
                  const uiTool: Tool = {
                    ...convertToUITool(tool),
                    lastUsed: formatRelativeTime(tool.lastUsedAt),
                  };
                  return <RecentToolCard key={tool.id} tool={uiTool} />;
                })}
              </div>
            ) : null}
          </div>
        )}

        {/* Tool Categories */}
        {toolsLoading || categoriesLoading ? (
          <div className="flex flex-col gap-12">
            {/* Category skeleton */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-200 dark:border-border-dark/50">
                <div className="size-6 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              </div>
              <SkeletonList count={8} variant="standard" layout="grid" />
            </div>
          </div>
        ) : toolsError || categoriesError ? (
          <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Icon name="error" className="text-red-600 dark:text-red-400 text-[24px] flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-1">{t('section.tools_error')}</h3>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {toolsError instanceof Error ? toolsError.message : String(toolsError || categoriesError)}
                </p>
              </div>
            </div>
          </div>
        ) : toolGroups.length > 0 ? (
          <div className="flex flex-col gap-12">
            {toolGroups.map(({ category, tools }, index) => (
              <div key={category.id} data-category-section={index === 0 ? 'true' : undefined}>
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-200 dark:border-border-dark/50">
                  <div className="flex items-center justify-center text-slate-900 dark:text-white">
                    <Icon name={category.icon} />
                  </div>
                  <h2 className="text-slate-900 dark:text-white text-lg font-bold">
                    {language === 'zh' && category.nameZh ? category.nameZh : category.name}
                  </h2>
                  <span className="text-sm text-slate-500 dark:text-text-secondary">
                    ({tools.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {tools.map(tool => (
                    <StandardToolCard key={tool.id} tool={convertToUITool(tool)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="size-16 bg-slate-100 dark:bg-[#1e293b] rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Icon name="search_off" className="text-[32px]" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">{t('section.no_tools')}</h3>
            <p className="text-slate-500 dark:text-text-secondary">{t('section.no_tools_desc')}</p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="mt-20 pt-8 pb-4 border-t border-slate-200 dark:border-border-dark flex flex-col md:flex-row justify-between items-center text-xs text-slate-400 dark:text-slate-600 gap-4 transition-colors duration-300">
        <div className="flex items-center gap-2">
          <svg className="text-slate-300 dark:text-slate-700" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"></path>
          </svg>
          <p>{t('footer.rights')}</p>
        </div>
        <div className="flex gap-6 font-medium">
          <button onClick={() => navigate('privacy')} className="hover:text-slate-900 dark:hover:text-slate-400 transition-colors">{t('footer.privacy')}</button>
          <button onClick={() => navigate('terms')} className="hover:text-slate-900 dark:hover:text-slate-400 transition-colors">{t('footer.terms')}</button>
          <button onClick={() => navigate('contact')} className="hover:text-slate-900 dark:hover:text-slate-400 transition-colors">{t('footer.contact')}</button>
        </div>
      </footer>
    </main>
  );
};
