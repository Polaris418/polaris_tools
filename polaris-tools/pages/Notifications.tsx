import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { Icon } from '../components/Icon';
import { apiClient } from '../api/client';
import type { NotificationResponse } from '../types';

export const Notifications: React.FC = () => {
  const { t, language, showToast } = useAppContext();
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<NotificationResponse | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 加载通知列表
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [notifResult, countResult] = await Promise.all([
        apiClient.notifications.list({ page: 1, size: 50 }),
        apiClient.notifications.getUnreadCount()
      ]);
      setNotifications(notifResult.data.list);
      setUnreadCount(countResult.data);
    } catch (err: any) {
      showToast(err.message || t('notifications.error_load'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // 标记所有为已读
  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.notifications.markAllAsRead();
      showToast(t('notifications.marked_all_read'), 'success');
      loadNotifications();
    } catch (err: any) {
      showToast(err.message || t('notifications.error_mark_read'), 'error');
    }
  };

  // 标记单个为已读
  const handleMarkAsRead = async (id: number) => {
    try {
      await apiClient.notifications.markAsRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, isRead: 1, readAt: new Date().toISOString() } : n
      ));
      setUnreadCount(count => Math.max(0, count - 1));
    } catch (err: any) {
      showToast(err.message || t('notifications.error_mark_read'), 'error');
    }
  };
  
  // 打开通知详情
  const handleOpenNotification = async (notif: NotificationResponse) => {
    setSelectedNotification(notif);
    setShowDetailModal(true);
    
    // 如果是未读通知，标记为已读
    if (notif.isRead === 0) {
      await handleMarkAsRead(notif.id);
    }
  };
  
  // 关闭通知详情
  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedNotification(null);
  };

  // 获取通知图标配置
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'system':
        return { icon: 'rocket_launch', color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-500/10' };
      case 'security':
        return { icon: 'shield', color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-500/10' };
      case 'subscription':
      case 'promo':
        return { icon: 'local_offer', color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-500/10' };
      case 'tool_update':
        return { icon: 'build', color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-500/10' };
      case 'comment_reply':
        return { icon: 'comment', color: 'text-pink-500', bgColor: 'bg-pink-50 dark:bg-pink-500/10' };
      default:
        return { icon: 'notifications', color: 'text-slate-500', bgColor: 'bg-slate-50 dark:bg-slate-500/10' };
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return t('notifications.time.just_now');
    if (hours < 24) return t('notifications.time.hours_ago', { hours });
    if (days === 1) return t('notifications.time.day_ago');
    return t('notifications.time.days_ago', { days });
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="max-w-3xl mx-auto">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
          </div>
          
          {/* Notification skeletons */}
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="p-5 rounded-xl border border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 size-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scrollbar-thin scrollbar-thumb-slate-700">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('notifications.title')}</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('notifications.unread_count', { count: unreadCount })}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              {t('notifications.mark_read')}
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-16 bg-slate-100 dark:bg-[#1e293b] rounded-full flex items-center justify-center mb-4 text-slate-400">
              <Icon name="notifications_none" className="text-[32px]" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              {t('notifications.empty.title')}
            </h3>
            <p className="text-slate-500 dark:text-text-secondary max-w-sm">
              {t('notifications.empty.description')}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {notifications.map((notif) => {
                const iconConfig = getNotificationIcon(notif.type);
                const isUnread = notif.isRead === 0;
                
                return (
                  <div 
                    key={notif.id} 
                    onClick={() => handleOpenNotification(notif)}
                    className={`relative p-5 rounded-xl border transition-all cursor-pointer ${
                      isUnread
                        ? 'bg-white dark:bg-surface-dark border-indigo-200 dark:border-indigo-900/50 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-md' 
                        : 'bg-slate-50 dark:bg-[#0f172a]/50 border-transparent opacity-80 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-[#0f172a]'
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className={`flex-shrink-0 size-10 rounded-full flex items-center justify-center ${iconConfig.bgColor} ${iconConfig.color}`}>
                        <Icon name={iconConfig.icon} className="text-[20px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-sm font-bold ${isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                            {notif.title}
                          </h4>
                          <span className="text-xs text-slate-500 dark:text-slate-500 whitespace-nowrap ml-2">
                            {formatTime(notif.createdAt)}
                          </span>
                        </div>
                        {notif.content && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                            {notif.content}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                              {t('notifications.view_detail')}
                            </span>
                          <Icon name="arrow_forward" className="text-[14px] text-indigo-600 dark:text-indigo-400" />
                        </div>
                      </div>
                    </div>
                    {isUnread && (
                      <div className="absolute top-6 right-5 size-2 bg-indigo-500 rounded-full"></div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-xs text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                {t('notifications.end')}
              </p>
            </div>
          </>
        )}
        
        {/* 通知详情模态框 */}
        {showDetailModal && selectedNotification && (
          <div 
            className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={handleCloseDetail}
          >
            <div 
              className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 模态框头部 */}
              <div className="flex items-start justify-between p-6 border-b border-slate-200 dark:border-border-dark">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`flex-shrink-0 size-12 rounded-full flex items-center justify-center ${getNotificationIcon(selectedNotification.type).bgColor} ${getNotificationIcon(selectedNotification.type).color}`}>
                    <Icon name={getNotificationIcon(selectedNotification.type).icon} className="text-[24px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                      {selectedNotification.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatTime(selectedNotification.createdAt)}
                      {selectedNotification.isRead === 1 && selectedNotification.readAt && (
                        <span className="ml-2">
                          · 已读于 {new Date(selectedNotification.readAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseDetail}
                  className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Icon name="close" className="text-[20px]" />
                </button>
              </div>
              
              {/* 模态框内容 */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
                {selectedNotification.content && (
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedNotification.content}
                    </p>
                  </div>
                )}
                
                {!selectedNotification.content && (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                    暂无详细内容
                  </p>
                )}
              </div>
              
              {/* 模态框底部 */}
              <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-[#0f172a]">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Icon name="label" className="text-[14px]" />
                  <span className="capitalize">{selectedNotification.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedNotification.linkUrl && (
                    <a
                      href={selectedNotification.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      <Icon name="open_in_new" className="text-[16px]" />
                      <span>查看相关链接</span>
                    </a>
                  )}
                  <button
                    onClick={handleCloseDetail}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors text-sm"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
