import React from 'react';

type EmailStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RETRYING';
type QueueStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
type SuppressionReason = 'HARD_BOUNCE' | 'SOFT_BOUNCE' | 'COMPLAINT';

interface EmailStatusBadgeProps {
  status: EmailStatus | QueueStatus | SuppressionReason;
  type?: 'email' | 'queue' | 'suppression';
}

/**
 * EmailStatusBadge 组件
 * 统一的状态徽章样式，支持多种状态类型，带图标和颜色
 * 
 * 需求: 12.3 - 统一的状态徽章样式
 */
export const EmailStatusBadge: React.FC<EmailStatusBadgeProps> = ({ status, type = 'email' }) => {
  const getStatusConfig = () => {
    switch (status) {
      // Email/Queue statuses
      case 'PENDING':
        return {
          label: '待发送',
          icon: 'schedule',
          color: 'text-slate-600 dark:text-slate-400',
          bg: 'bg-slate-100 dark:bg-slate-800',
          border: 'border-slate-200 dark:border-slate-700',
        };
      case 'PROCESSING':
        return {
          label: '处理中',
          icon: 'sync',
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
        };
      case 'SENT':
        return {
          label: '已发送',
          icon: 'check_circle',
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
        };
      case 'FAILED':
        return {
          label: '发送失败',
          icon: 'error',
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
        };
      case 'RETRYING':
        return {
          label: '重试中',
          icon: 'refresh',
          color: 'text-orange-600 dark:text-orange-400',
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
        };
      
      // Suppression reasons
      case 'HARD_BOUNCE':
        return {
          label: '硬退信',
          icon: 'block',
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
        };
      case 'SOFT_BOUNCE':
        return {
          label: '软退信',
          icon: 'warning',
          color: 'text-yellow-600 dark:text-yellow-400',
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
        };
      case 'COMPLAINT':
        return {
          label: '投诉',
          icon: 'report',
          color: 'text-purple-600 dark:text-purple-400',
          bg: 'bg-purple-50 dark:bg-purple-900/20',
          border: 'border-purple-200 dark:border-purple-800',
        };
      
      default:
        return {
          label: status,
          icon: 'help',
          color: 'text-slate-600 dark:text-slate-400',
          bg: 'bg-slate-100 dark:bg-slate-800',
          border: 'border-slate-200 dark:border-slate-700',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color} ${config.border}`}
    >
      <span className="material-symbols-outlined text-sm">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};
