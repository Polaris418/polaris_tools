import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { StandardToolCard } from '../components/StandardToolCard';
import { SkeletonList } from '../components/SkeletonList';
import { Icon } from '../components/Icon';
import { useFavorites } from '../hooks/useFavorites';
import type { Tool, ToolResponse } from '../types';

export const Favorites: React.FC = () => {
  const { t, language, navigate, isAuthenticated } = useAppContext();
  const { data: favorites, loading, error, removeFavorite, refetch } = useFavorites();
  const [removingId, setRemovingId] = useState<number | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('login');
    }
  }, [isAuthenticated, navigate]);

  /**
   * Convert API ToolResponse to UI Tool format
   * Requirements: 5.7
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
   * Handle remove favorite
   * Requirements: 5.6
   */
  const handleRemoveFavorite = async (toolId: number) => {
    setRemovingId(toolId);
    try {
      await removeFavorite(toolId);
      // Refetch favorites list after removal
      await refetch();
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    } finally {
      setRemovingId(null);
    }
  };

  // Show loading state
  // Requirements: 5.6
  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center gap-3 pb-6 border-b border-slate-200 dark:border-border-dark">
            <div className="size-10 rounded-lg bg-yellow-100 dark:bg-yellow-500/10 flex items-center justify-center text-yellow-600 dark:text-yellow-500">
              <Icon name="star" filled={true} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('favorites.title')}</h2>
              <p className="text-sm text-slate-500 dark:text-text-secondary">{t('favorites.loading')}</p>
            </div>
          </div>
          <SkeletonList count={8} variant="standard" layout="grid" />
        </div>
      </main>
    );
  }

  // Show error state
  if (error) {
    return (
      <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center gap-3 pb-6 border-b border-slate-200 dark:border-border-dark">
            <div className="size-10 rounded-lg bg-yellow-100 dark:bg-yellow-500/10 flex items-center justify-center text-yellow-600 dark:text-yellow-500">
              <Icon name="star" filled={true} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('favorites.title')}</h2>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
              <Icon name="error" className="text-[32px]" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">{t('favorites.error_load')}</h3>
            <p className="text-slate-500 dark:text-text-secondary max-w-sm mb-6">{error instanceof Error ? error.message : String(error)}</p>
            <button 
              onClick={() => refetch()}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              {t('favorites.try_again')}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scrollbar-thin scrollbar-thumb-slate-700">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-200 dark:border-border-dark">
            <div className="size-10 rounded-lg bg-yellow-100 dark:bg-yellow-500/10 flex items-center justify-center text-yellow-600 dark:text-yellow-500">
                <Icon name="star" filled={true} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('favorites.title')}</h2>
                <p className="text-sm text-slate-500 dark:text-text-secondary">
                  {favorites && favorites.length === 1 
                    ? t('favorites.tool_saved')
                    : t('favorites.tools_saved', { count: favorites ? favorites.length : 0 })}
                </p>
            </div>
        </div>

        {favorites && favorites.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {favorites.map(toolResponse => {
              const tool = convertToUITool(toolResponse);
              return (
                <div key={tool.id} className="relative group">
                  <StandardToolCard tool={tool} showFavoriteButton={false} />
                  {/* Remove favorite button */}
                  <button
                    onClick={() => handleRemoveFavorite(toolResponse.id)}
                    disabled={removingId === toolResponse.id}
                    className="absolute top-2 right-2 size-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    title={t('favorites.remove_from_favorites')}
                  >
                    {removingId === toolResponse.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <Icon name="close" className="text-red-600 dark:text-red-400 text-[18px]" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-16 bg-slate-100 dark:bg-[#1e293b] rounded-full flex items-center justify-center mb-4 text-slate-400">
                <Icon name="star_border" className="text-[32px]" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">{t('favorites.no_favorites_title')}</h3>
            <p className="text-slate-500 dark:text-text-secondary max-w-sm mb-6">{t('favorites.no_favorites')}</p>
            <button 
                onClick={() => navigate('dashboard')}
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
