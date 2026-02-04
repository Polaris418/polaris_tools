import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { useAppContext } from '../context/AppContext';
import { apiClient } from '../api/client';
import { guestUsageManager } from '../utils/guestUsageManager';

export const Header: React.FC = () => {
  const { theme, toggleTheme, language, toggleLanguage, t, page, navigate, isAuthenticated, isGuest, isAdmin, logout, guestUsage, showConfirm } = useAppContext();
  const [unreadCount, setUnreadCount] = useState(0);
  const [remainingCount, setRemainingCount] = useState(0);

  // 加载未读通知数量
  useEffect(() => {
    if (isAuthenticated) {
      loadUnreadCount();
      // 每30秒刷新一次
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // 更新游客剩余使用次数
  useEffect(() => {
    if (isGuest) {
      const updateRemainingCount = () => {
        setRemainingCount(guestUsageManager.getRemainingCount());
      };
      
      // 初始加载
      updateRemainingCount();
      
      // 监听 guestUsage 变化
      const interval = setInterval(updateRemainingCount, 1000);
      return () => clearInterval(interval);
    }
  }, [isGuest, guestUsage]);

  const loadUnreadCount = async () => {
    try {
      const result = await apiClient.notifications.getUnreadCount();
      setUnreadCount(result.data);
    } catch (err) {
      // 静默失败
      console.error('Failed to load unread count:', err);
    }
  };

  const getPageTitle = () => {
    switch(page) {
        case 'settings': return t('nav.settings');
        case 'profile': return t('profile.title');
        case 'notifications': return t('notifications.title');
        case 'favorites': return t('favorites.title');
        case 'dashboard': 
        default: return t('header.overview');
    }
  }

  /**
   * 处理剩余次数徽章点击
   * 显示详细的使用限制信息
   */
  const handleRemainingCountClick = () => {
    const usage = guestUsageManager.getUsage();
    const nextReset = guestUsageManager.getNextResetTime();
    const hours = Math.floor((nextReset.getTime() - Date.now()) / (1000 * 60 * 60));
    const minutes = Math.floor(((nextReset.getTime() - Date.now()) % (1000 * 60 * 60)) / (1000 * 60));
    
    showConfirm({
      title: '游客使用限制',
      message: `您今天还可以使用 ${remainingCount} 次工具。\n\n已使用：${usage.count}/${usage.limit} 次\n重置时间：${hours}小时${minutes}分钟后\n\n登录后即可无限使用所有工具！`,
      confirmText: '立即登录',
      cancelText: '稍后再说',
      type: 'info',
    }).then((confirmed) => {
      if (confirmed) {
        navigate('login');
      }
    });
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-border-dark bg-white/80 dark:bg-surface-dark/90 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0 transition-colors duration-300">
      {/* 左侧：面包屑导航 */}
      <div className="flex items-center gap-2 text-slate-500 dark:text-text-secondary text-sm font-medium">
        <span onClick={() => navigate('dashboard')} className="hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors">{t('app.name')}</span>
        <Icon name="chevron_right" className="text-[16px]" />
        <span className="text-slate-900 dark:text-white">{getPageTitle()}</span>
      </div>
      
      {/* 右侧：用户操作区 */}
      <div className="flex items-center gap-3">
        {/* 主题切换 */}
        <button 
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={t('header.toggle_theme')}
        >
          <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} filled={true} className="text-[20px]" />
        </button>

        {/* 语言切换 */}
        <button 
          onClick={toggleLanguage}
          className="flex items-center justify-center h-9 px-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
          title={t('header.switch_language')}
        >
          <Icon name="translate" className="text-[18px] mr-1" />
          {language === 'en' ? 'EN' : '中文'}
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-border-dark mx-1"></div>

        {/* 管理员：显示进入后台按钮 */}
        {isAdmin && (
          <>
            <button
              onClick={() => navigate('admin')}
              className="flex items-center gap-2 h-9 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all hover:shadow-sm group"
              title={language === 'zh' ? '进入管理后台' : 'Admin Panel'}
            >
              <Icon name="admin_panel_settings" className="text-indigo-600 dark:text-indigo-400 text-[18px] group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                {language === 'zh' ? '管理后台' : 'Admin'}
              </span>
            </button>
            
            <div className="h-6 w-px bg-slate-200 dark:bg-border-dark mx-1"></div>
          </>
        )}

        {/* 游客模式：显示剩余次数徽章 */}
        {isGuest && (
          <>
            <button
              onClick={handleRemainingCountClick}
              className="flex items-center gap-2 h-9 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700 transition-all hover:shadow-sm group"
              title="点击查看详细信息"
            >
              <Icon name="schedule" className="text-amber-600 dark:text-amber-400 text-[18px] group-hover:scale-110 transition-transform" />
              <div className="flex flex-col items-start">
                <span className="text-[10px] leading-none text-amber-600 dark:text-amber-400 font-medium opacity-75">
                  剩余次数
                </span>
                <span className="text-sm leading-none font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                  {remainingCount}
                </span>
              </div>
            </button>
            
            <div className="h-6 w-px bg-slate-200 dark:bg-border-dark mx-1"></div>
          </>
        )}

        {/* 游客模式：显示登录/注册按钮 */}
        {isGuest ? (
          <>
            <button 
              onClick={() => navigate('login')}
              className="flex items-center justify-center h-9 px-4 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              登录
            </button>
            <button 
              onClick={() => navigate('register')}
              className="flex items-center justify-center h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              注册
            </button>
          </>
        ) : (
          <>
            {/* 登录用户：显示通知和退出 */}
            <button 
              onClick={() => navigate('notifications')}
              className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                page === 'notifications' 
                  ? 'text-indigo-600 dark:text-white bg-indigo-50 dark:bg-indigo-500/20' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="通知"
            >
              <Icon name="notifications" filled={page === 'notifications'} className="text-[20px]" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-surface-dark">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            <button 
              onClick={() => logout()}
              className="flex items-center justify-center h-9 px-4 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              {t('header.logout')}
            </button>
          </>
        )}
      </div>
    </header>
  );
};
