import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/Icon';
import { useAppContext } from '../../context/AppContext';
import { apiClient } from '../../api/client';
import type { NotificationResponse, NotificationCreateRequest, NotificationUpdateRequest } from '../../types';

/**
 * 管理后台 - 通知管理页面
 */
export const AdminNotifications: React.FC = () => {
  const { t, language, showToast, showConfirm } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationResponse | null>(null);
  const [editingNotification, setEditingNotification] = useState<NotificationResponse | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterScope, setFilterScope] = useState<'all' | 'global' | 'personal'>('all'); // 通知范围筛选
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set()); // 展开的全站通知组

  // 加载通知列表
  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.notifications.listAll({ 
        page, 
        size: 20,
        type: filterType || undefined,
        includeDeleted: showDeleted || undefined
      });
      setNotifications(result.data.list);
      setTotal(result.data.total);
    } catch (err: any) {
      setError(err.message || t('admin.error.load_notifications'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [page, filterType, showDeleted]);

  // 删除通知
  const handleDeleteNotification = async (id: number) => {
    const confirmed = await showConfirm({
      title: t('confirm.delete_title'),
      message: t('admin.notifications.confirm_delete'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await apiClient.notifications.delete(id);
      showToast(t('admin.notifications.deleted'), 'success');
      loadNotifications();
    } catch (err: any) {
      showToast(err.message || t('admin.error.delete_notification'), 'error');
    }
  };

  // 查看通知详情
  const handleViewNotification = (notification: NotificationResponse) => {
    setSelectedNotification(notification);
  };

  // 编辑通知
  const handleEditNotification = (notification: NotificationResponse) => {
    setEditingNotification(notification);
    setShowEditModal(true);
  };

  // 恢复已删除的通知
  const handleRestoreNotification = async (id: number) => {
    const confirmed = await showConfirm({
      title: t('confirm.restore_title'),
      message: t('admin.notifications.confirm_restore'),
      confirmText: t('common.restore'),
      cancelText: t('common.cancel'),
      type: 'warning',
    });

    if (!confirmed) return;

    try {
      await apiClient.notifications.restore(id);
      showToast(t('admin.notifications.restored'), 'success');
      loadNotifications();
    } catch (err: any) {
      showToast(err.message || t('admin.error.restore_notification'), 'error');
    }
  };

  // 重新发送已删除的通知
  const handleResendNotification = async (id: number) => {
    const confirmed = await showConfirm({
      title: t('admin.notifications.resend_title'),
      message: t('admin.notifications.confirm_resend'),
      confirmText: t('admin.notifications.resend_button'),
      cancelText: t('common.cancel'),
      type: 'info',
    });

    if (!confirmed) return;

    try {
      const result = await apiClient.notifications.resend(id);
      showToast(t('admin.notifications.resend_success', { count: result.data }), 'success');
      loadNotifications();
    } catch (err: any) {
      showToast(err.message || t('admin.error.resend_notification'), 'error');
    }
  };

  // 切换展开/折叠全站通知组
  const toggleGroupExpand = (groupKey: string) => {
    const newExpandedGroups = new Set(expandedGroups);
    if (newExpandedGroups.has(groupKey)) {
      newExpandedGroups.delete(groupKey);
    } else {
      newExpandedGroups.add(groupKey);
    }
    setExpandedGroups(newExpandedGroups);
  };

  // 过滤通知
  let filteredNotifications = notifications;
  
  // 按搜索关键词过滤
  if (searchKeyword) {
    filteredNotifications = filteredNotifications.filter(n => 
      n.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (n.content && n.content.toLowerCase().includes(searchKeyword.toLowerCase()))
    );
  }
  
  // 按通知范围过滤
  if (filterScope === 'global') {
    filteredNotifications = filteredNotifications.filter(n => n.isGlobal === 1);
  } else if (filterScope === 'personal') {
    filteredNotifications = filteredNotifications.filter(n => n.isGlobal === 0);
  }
  
  // 对全站通知进行分组
  interface NotificationGroup {
    key: string;
    title: string;
    type: string;
    notifications: NotificationResponse[];
    isGlobal: boolean;
  }
  
  const groupedNotifications: NotificationGroup[] = [];
  const globalNotificationsMap = new Map<string, NotificationResponse[]>();
  
  filteredNotifications.forEach(notif => {
    if (notif.isGlobal === 1) {
      // 全站通知：按 globalNotificationId 分组（如果有），否则按标题+类型分组（兼容旧数据）
      const groupKey = notif.globalNotificationId 
        ? `global-${notif.globalNotificationId}`
        : `${notif.title}|||${notif.type}`;
      
      if (!globalNotificationsMap.has(groupKey)) {
        globalNotificationsMap.set(groupKey, []);
      }
      globalNotificationsMap.get(groupKey)!.push(notif);
    }
  });
  
  // 构建显示列表
  filteredNotifications.forEach(notif => {
    if (notif.isGlobal === 1) {
      // 全站通知：检查是否已经添加过这个组
      const groupKey = notif.globalNotificationId 
        ? `global-${notif.globalNotificationId}`
        : `${notif.title}|||${notif.type}`;
      const existingGroup = groupedNotifications.find(g => g.key === groupKey);
      
      if (!existingGroup) {
        const groupNotifications = globalNotificationsMap.get(groupKey) || [];
        groupedNotifications.push({
          key: groupKey,
          title: notif.title,
          type: notif.type,
          notifications: groupNotifications,
          isGlobal: true
        });
      }
    } else {
      // 个人通知：单独显示
      groupedNotifications.push({
        key: `personal-${notif.id}`,
        title: notif.title,
        type: notif.type,
        notifications: [notif],
        isGlobal: false
      });
    }
  });

  // 获取通知类型图标
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

    if (hours < 1) return t('time.just_now');
    if (hours < 24) return t('time.hours_ago', { hours });
    if (days === 1) return t('time.day_ago');
    return t('time.days_ago', { days });
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="size-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 mx-auto text-red-600 dark:text-red-400">
          <Icon name="error" className="text-[32px]" />
        </div>
        <p className="text-slate-600 dark:text-slate-400">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* 头部 */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t('admin.notifications.title')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('admin.notifications.subtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <Icon name="add" className="text-[20px]" />
            {t('admin.notifications.send')}
          </button>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder={t('admin.notifications.search_placeholder')}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <select
            value={filterScope}
            onChange={(e) => setFilterScope(e.target.value as any)}
            title={t('admin.notifications.scope.all')}
            className="px-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
          >
            <option value="all">{t('admin.notifications.scope.all')}</option>
            <option value="global">{t('admin.notifications.scope.global')}</option>
            <option value="personal">{t('admin.notifications.scope.personal')}</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            title={t('admin.notifications.filter.all_types')}
            className="px-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
          >
            <option value="">{t('admin.notifications.filter.all_types')}</option>
            <option value="system">{t('admin.notifications.type.system')}</option>
            <option value="security">{t('admin.notifications.type.security')}</option>
            <option value="subscription">{t('admin.notifications.type.subscription')}</option>
            <option value="tool_update">{t('admin.notifications.type.tool_update')}</option>
            <option value="comment_reply">{t('admin.notifications.type.comment_reply')}</option>
          </select>
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            title={t('status.deleted')}
            className={`h-10 px-4 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              showDeleted
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <Icon name="delete" className="text-[18px]" />
            <span>{t('status.deleted')}</span>
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="p-5 bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                {t('admin.notifications.total')}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{total}</p>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <Icon name="notifications" className="text-[24px] text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                {t('admin.notifications.unread')}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {notifications.filter(n => n.isRead === 0).length}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Icon name="mark_email_unread" className="text-[24px] text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                {t('admin.notifications.today')}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {notifications.filter(n => {
                  const created = new Date(n.createdAt);
                  const today = new Date();
                  return created.toDateString() === today.toDateString();
                }).length}
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Icon name="today" className="text-[24px] text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 通知列表 */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark">
        <div className="p-4 border-b border-slate-200 dark:border-border-dark">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {t('admin.notifications.list')}
          </h3>
        </div>
        
        <div className="divide-y divide-slate-200 dark:divide-border-dark">
          {groupedNotifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {searchKeyword ? t('admin.notifications.no_search_results') : t('admin.notifications.no_data')}
            </div>
          ) : (
            groupedNotifications.map((group) => {
              const isExpanded = expandedGroups.has(group.key);
              const displayNotifications = group.isGlobal && !isExpanded ? [group.notifications[0]] : group.notifications;
              
              return (
                <div key={group.key} className="border-b border-slate-200 dark:border-border-dark last:border-b-0">
                  {displayNotifications.map((notif, index) => {
                    const iconConfig = getNotificationIcon(notif.type);
                    const isDeleted = (notif as any).deleted === 1;
                    const isFirstInGroup = index === 0;
                    
                    return (
                      <div key={notif.id} className={`p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${isDeleted ? 'opacity-60' : ''} ${!isFirstInGroup ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}>
                        <div className="flex gap-4">
                          <div className={`flex-shrink-0 size-10 rounded-full flex items-center justify-center ${iconConfig.bgColor} ${iconConfig.color}`}>
                            <Icon name={iconConfig.icon} className="text-[20px]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                  {notif.title}
                                </h4>
                                {isDeleted && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                                    {t('status.deleted')}
                                  </span>
                                )}
                                {group.isGlobal && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                                    {t('admin.notifications.scope.global')}
                                  </span>
                                )}
                                {!group.isGlobal && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                    {t('admin.notifications.scope.personal')} (ID: {notif.userId})
                                  </span>
                                )}
                                {notif.isRead === 0 && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
                                    {t('admin.notifications.unread_badge')}
                                  </span>
                                )}
                                {group.isGlobal && isFirstInGroup && group.notifications.length > 1 && (
                                  <button
                                    onClick={() => toggleGroupExpand(group.key)}
                                    className="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-1"
                                  >
                                    <Icon name={isExpanded ? "expand_less" : "expand_more"} className="text-[14px]" />
                                    {isExpanded ? t('admin.notifications.collapse') : t('admin.notifications.expand_count', { count: group.notifications.length })}
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatTime(notif.createdAt)}
                                </span>
                                {/* 操作按钮 */}
                                {isDeleted ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleViewNotification(notif)}
                                      className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                                      title={t('admin.notifications.action.view')}
                                      aria-label={t('admin.notifications.action.view')}
                                    >
                                      <Icon name="visibility" className="text-[16px]" />
                                      {t('common.view')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEditNotification(notif)}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                                      title={t('admin.notifications.action.edit')}
                                      aria-label={t('admin.notifications.action.edit')}
                                    >
                                      <Icon name="edit" className="text-[16px]" />
                                      {t('common.edit')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleResendNotification(notif.id)}
                                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                                      title={t('admin.notifications.action.resend')}
                                      aria-label={t('admin.notifications.action.resend')}
                                    >
                                      <Icon name="send" className="text-[16px]" />
                                      {t('admin.notifications.resend_button')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreNotification(notif.id)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                                      title={t('admin.notifications.action.restore')}
                                      aria-label={t('admin.notifications.action.restore')}
                                    >
                                      <Icon name="restore" className="text-[16px]" />
                                      {t('common.restore')}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() => handleViewNotification(notif)}
                                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                                      title={t('admin.notifications.action.view')}
                                      aria-label={t('admin.notifications.action.view')}
                                    >
                                      <Icon name="visibility" className="text-[18px] text-slate-600 dark:text-slate-400" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEditNotification(notif)}
                                      className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                                      title={t('admin.notifications.action.edit')}
                                      aria-label={t('admin.notifications.action.edit')}
                                    >
                                      <Icon name="edit" className="text-[18px] text-blue-600 dark:text-blue-400" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteNotification(notif.id)}
                                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                      title={t('admin.notifications.action.delete')}
                                      aria-label={t('admin.notifications.action.delete')}
                                    >
                                      <Icon name="delete" className="text-[18px] text-red-600 dark:text-red-400" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {notif.content && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2 line-clamp-2">
                                {notif.content}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Icon name="person" className="text-[14px]" />
                                  {notif.userId === 0 
                                    ? t('admin.notifications.all_users')
                                    : `${t('admin.notifications.user_id')}: ${notif.userId}`
                                  }
                                </span>
                                <span className="flex items-center gap-1">
                                  <Icon name="label" className="text-[14px]" />
                                  {notif.type}
                                </span>
                                {notif.linkUrl && (
                                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                                    <Icon name="link" className="text-[14px]" />
                                    {t('admin.notifications.has_link')}
                                  </span>
                                )}
                              </div>
                              {notif.readAt && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                  {t('admin.notifications.read_at')}: {formatTime(notif.readAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* 分页 */}
        {total > 20 && (
          <div className="p-4 border-t border-slate-200 dark:border-border-dark flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('common.showing')} {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} {t('common.of')} {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {t('common.previous')}
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= total}
                className="px-3 py-1 rounded border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 发送通知模态框 */}
      {showSendModal && (
        <SendNotificationModal
          onClose={() => setShowSendModal(false)}
          onSuccess={() => {
            setShowSendModal(false);
            loadNotifications();
          }}
        />
      )}

      {/* 通知详情模态框 */}
      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />
      )}

      {/* 编辑通知模态框 */}
      {showEditModal && editingNotification && (
        <EditNotificationModal
          notification={editingNotification}
          onClose={() => {
            setShowEditModal(false);
            setEditingNotification(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingNotification(null);
            loadNotifications();
          }}
        />
      )}
    </div>
  );
};

/**
 * 通知详情模态框
 */
const NotificationDetailModal: React.FC<{
  notification: NotificationResponse;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const { t, language } = useAppContext();

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

  const iconConfig = getNotificationIcon(notification.type);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-slate-700 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`size-12 rounded-full flex items-center justify-center ${iconConfig.bgColor} ${iconConfig.color}`}>
                <Icon name={iconConfig.icon} className="text-[24px]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('admin.notifications.detail_title')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  ID: {notification.id}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <Icon name="close" className="text-[24px]" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t('admin.notifications.form.type')}
              </label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-medium">
                  {t(`admin.notifications.type.${notification.type}`)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t('admin.notifications.form.scope')}
              </label>
              <div className="flex items-center gap-2">
                {notification.userId === 0 ? (
                  <span className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium flex items-center gap-1">
                    <Icon name="public" className="text-[16px]" />
                    {t('admin.notifications.form.global')}
                  </span>
                ) : (
                  <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium flex items-center gap-1">
                    <Icon name="person" className="text-[16px]" />
                    {t('admin.notifications.form.personal')} (ID: {notification.userId})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 标题 */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              {t('admin.notifications.form.title')}
            </label>
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              {notification.title}
            </p>
          </div>

          {/* 内容 */}
          {notification.content && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                {t('admin.notifications.form.content')}
              </label>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                {notification.content}
              </p>
            </div>
          )}

          {/* 链接 */}
          {notification.linkUrl && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                {t('admin.notifications.form.link')}
              </label>
              <a
                href={notification.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline break-all flex items-center gap-1"
              >
                <Icon name="link" className="text-[16px]" />
                {notification.linkUrl}
              </a>
            </div>
          )}

          {/* 状态信息 */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t('admin.notifications.detail.status')}
              </label>
              <div className="flex items-center gap-2">
                {notification.isRead === 1 ? (
                  <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm font-medium flex items-center gap-1">
                    <Icon name="done_all" className="text-[16px]" />
                    {t('admin.notifications.detail.read')}
                  </span>
                ) : (
                  <span className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm font-medium flex items-center gap-1">
                    <Icon name="mark_email_unread" className="text-[16px]" />
                    {t('admin.notifications.detail.unread')}
                  </span>
                )}
              </div>
            </div>

            {notification.readAt && (
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t('admin.notifications.read_at')}
                </label>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {formatDateTime(notification.readAt)}
                </p>
              </div>
            )}
          </div>

          {/* 时间信息 */}
          <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div>
              <span className="font-medium">{t('admin.notifications.detail.created')}:</span>{' '}
              {formatDateTime(notification.createdAt)}
            </div>
            <div>
              <span className="font-medium">{t('admin.notifications.detail.updated')}:</span>{' '}
              {formatDateTime(notification.updatedAt)}
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="sticky bottom-0 bg-slate-50 dark:bg-slate-900/50 p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 发送通知模态框组件
 */
const SendNotificationModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const { t, showToast } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NotificationCreateRequest>({
    isGlobal: true,
    type: 'system',
    title: '',
    content: '',
    linkUrl: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showToast(t('admin.notifications.form.title_required'), 'warning');
      return;
    }

    if (!formData.isGlobal && !formData.userId) {
      showToast(t('admin.notifications.form.user_required'), 'warning');
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.notifications.send(formData);
      const count = result.data;
      showToast(
        formData.isGlobal 
          ? t('admin.notifications.sent_global', { count })
          : t('admin.notifications.sent_personal'),
        'success'
      );
      onSuccess();
    } catch (err: any) {
      showToast(err.message || t('admin.error.send_notification'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('admin.notifications.send_title')}
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <Icon name="close" className="text-[24px]" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 通知范围 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('admin.notifications.form.scope')}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.isGlobal}
                  onChange={() => setFormData({ ...formData, isGlobal: true, userId: undefined })}
                  className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {t('admin.notifications.form.global')}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!formData.isGlobal}
                  onChange={() => setFormData({ ...formData, isGlobal: false })}
                  className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {t('admin.notifications.form.personal')}
                </span>
              </label>
            </div>
          </div>

          {/* 用户ID（仅个人通知） */}
          {!formData.isGlobal && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.notifications.form.user_id')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.userId || ''}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder={t('admin.notifications.form.user_id_placeholder')}
                required={!formData.isGlobal}
              />
            </div>
          )}

          {/* 通知类型 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('admin.notifications.form.type')} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
            >
              <option value="system">{t('admin.notifications.type.system')}</option>
              <option value="security">{t('admin.notifications.type.security')}</option>
              <option value="subscription">{t('admin.notifications.type.subscription')}</option>
              <option value="tool_update">{t('admin.notifications.type.tool_update')}</option>
              <option value="comment_reply">{t('admin.notifications.type.comment_reply')}</option>
            </select>
          </div>

          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('admin.notifications.form.title')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder={t('admin.notifications.form.title_placeholder')}
              required
            />
          </div>

          {/* 内容 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('admin.notifications.form.content')}
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
              placeholder={t('admin.notifications.form.content_placeholder')}
            />
          </div>

          {/* 链接地址 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('admin.notifications.form.link')}
            </label>
            <input
              type="text"
              value={formData.linkUrl}
              onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder={t('admin.notifications.form.link_placeholder')}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-border-dark">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              title={t('common.cancel')}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              title={t('admin.notifications.send')}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <Icon name="send" className="text-[18px]" />
              {t('admin.notifications.send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * 编辑通知模态框
 */
const EditNotificationModal: React.FC<{
  notification: NotificationResponse;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ notification, onClose, onSuccess }) => {
  const { t, showToast } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: notification.type,
    title: notification.title,
    content: notification.content || '',
    linkUrl: notification.linkUrl || '',
    updateAll: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.type || !formData.title) {
      showToast(t('admin.error.required_fields'), 'error');
      return;
    }

    try {
      setLoading(true);
      const result = await apiClient.notifications.update(notification.id, formData);
      const count = result.data;
      
      if (formData.updateAll) {
        showToast(t('admin.notifications.updated_count', { count: count.toString() }), 'success');
      } else {
        showToast(t('admin.notifications.updated'), 'success');
      }
      
      onSuccess();
    } catch (err: any) {
      showToast(err.message || t('admin.error.update_notification'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-slate-700 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('admin.notifications.edit_title')}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                ID: {notification.id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <Icon name="close" className="text-[24px]" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 通知类型 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('admin.notifications.form.type')} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
              required
            >
              <option value="system">{t('admin.notifications.type.system')}</option>
              <option value="security">{t('admin.notifications.type.security')}</option>
              <option value="subscription">{t('admin.notifications.type.subscription')}</option>
              <option value="tool_update">{t('admin.notifications.type.tool_update')}</option>
              <option value="comment_reply">{t('admin.notifications.type.comment_reply')}</option>
            </select>
          </div>

          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('admin.notifications.form.title')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder={t('admin.notifications.form.title_placeholder')}
              required
            />
          </div>

          {/* 内容 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('admin.notifications.form.content')}
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
              placeholder={t('admin.notifications.form.content_placeholder')}
            />
          </div>

          {/* 链接地址 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('admin.notifications.form.link')}
            </label>
            <input
              type="text"
              value={formData.linkUrl}
              onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder={t('admin.notifications.form.link_placeholder')}
            />
          </div>

          {/* 批量更新选项（仅全站通知显示） */}
          {notification.userId === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.updateAll}
                  onChange={(e) => setFormData({ ...formData, updateAll: e.target.checked })}
                  className="mt-0.5 size-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                    {t('admin.notifications.edit.update_all')}
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    {t('admin.notifications.edit.update_all_hint')}
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 font-medium">
                    💡 {t('admin.notifications.edit.include_deleted_hint')}
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-border-dark">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <Icon name="save" className="text-[18px]" />
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
