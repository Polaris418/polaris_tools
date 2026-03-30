import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { StandardToolCard } from '../components/StandardToolCard';
import { SkeletonList } from '../components/SkeletonList';
import { Icon } from '../components/Icon';
import { useTools } from '../hooks/useTools';
import { apiClient } from '../api/client';
import type { Tool, ToolResponse, CategoryResponse } from '../types';

export const CategoryDetail: React.FC = () => {
  const { t, language, currentCategoryId } = useAppContext();
  const navigate = useNavigate();
  
  // State for category info
  const [category, setCategory] = useState<CategoryResponse | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  
  // Fetch tools for this category
  const { data: toolsData, loading: toolsLoading, error: toolsError, refetch } = useTools(
    currentCategoryId ? {
      categoryId: currentCategoryId,
      page: 1,
      size: 50,
      sortBy: 'sortOrder',
      sortOrder: 'asc',
    } : undefined
  );

  // Fetch category details
  useEffect(() => {
    const fetchCategory = async () => {
      if (!currentCategoryId) {
        setCategoryError(t('category.no_selected'));
        setCategoryLoading(false);
        return;
      }

      try {
        setCategoryLoading(true);
        const result = await apiClient.categories.get(currentCategoryId);
        setCategory(result.data);
        setCategoryError(null);
      } catch (err: any) {
        setCategoryError(err.message || t('category.error_load'));
        setCategory(null);
      } finally {
        setCategoryLoading(false);
      }
    };

    fetchCategory();
  }, [currentCategoryId, t]);

  /**
   * Convert API ToolResponse to UI Tool format
   */
  const convertToUITool = (toolResponse: ToolResponse): Tool => {
    // 处理 URL 格式：去掉 /tools/ 前缀，只保留工具路径
    let toolPath = toolResponse.url || '';
    if (toolPath.startsWith('/tools/')) {
      toolPath = toolPath.replace('/tools/', '');
    }
    
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
      path: toolPath,
    };
  };

  // Get category display name
  const getCategoryName = () => {
    if (!category) return '';
    return language === 'zh' && category.nameZh ? category.nameZh : category.name;
  };

  // Get category description
  const getCategoryDescription = () => {
    if (!category) return '';
    return category.description || '';
  };

  // Determine accent color class for the category icon
  const getAccentColorClass = () => {
    if (!category) return 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
    
    // Map accent colors to tailwind classes
    const colorMap: { [key: string]: string } = {
      'rose': 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
      'indigo': 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      'purple': 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
      'emerald': 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      'blue': 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
      'amber': 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
      'cyan': 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
      'pink': 'bg-pink-100 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400',
    };

    // Try to extract color from accentColor
    const accentColor = category.accentColor?.toLowerCase() || '';
    for (const [key, value] of Object.entries(colorMap)) {
      if (accentColor.includes(key)) {
        return value;
      }
    }
    
    return 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
  };

  const loading = categoryLoading || toolsLoading;
  const error = categoryError || (toolsError ? toolsError.message : null);

  // Loading state
  // Requirements: 5.6
  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <Icon name="arrow_back" className="text-[20px]" />
            <span className="text-sm font-medium">{t('category.back')}</span>
          </button>
          
          {/* Header skeleton */}
          <div className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-border-dark">
            <div className="size-12 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
          </div>
          
          {/* Loading skeleton */}
          <SkeletonList count={8} variant="standard" layout="grid" />
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <Icon name="arrow_back" className="text-[20px]" />
            <span className="text-sm font-medium">{t('category.back')}</span>
          </button>
          
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
              <Icon name="error" className="text-[32px]" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">{t('category.error.title')}</h3>
            <p className="text-slate-500 dark:text-text-secondary max-w-sm mb-6">{error}</p>
            <button 
              onClick={() => refetch()}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              {t('category.error.retry')}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Filter active tools
  const activeTools = toolsData?.list.filter(tool => tool.status === 1) || [];

  return (
    <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scrollbar-thin scrollbar-thumb-slate-700">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <Icon name="arrow_back" className="text-[20px]" />
          <span className="text-sm font-medium">{t('category.back')}</span>
        </button>
        
        {/* Category Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-border-dark">
          <div className={`size-12 rounded-xl flex items-center justify-center ${getAccentColorClass()}`}>
            <Icon name={category?.icon || 'folder'} className="text-[24px]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{getCategoryName()}</h2>
            <p className="text-sm text-slate-500 dark:text-text-secondary">
              {activeTools.length} {activeTools.length === 1 ? t('category.tool_singular') : t('category.tool_plural')}
              {getCategoryDescription() && ` · ${getCategoryDescription()}`}
            </p>
          </div>
        </div>

        {/* Tools Grid */}
        {activeTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {activeTools.map(toolResponse => (
              <StandardToolCard key={toolResponse.id} tool={convertToUITool(toolResponse)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-16 bg-slate-100 dark:bg-[#1e293b] rounded-full flex items-center justify-center mb-4 text-slate-400">
              <Icon name="inbox" className="text-[32px]" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">{t('category.empty.title')}</h3>
            <p className="text-slate-500 dark:text-text-secondary max-w-sm mb-6">{t('category.empty.description')}</p>
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              {t('hero.cta.browse')}
            </button>
          </div>
        )}
      </div>
    </main>
  );
};
