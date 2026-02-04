import React from 'react';

interface PlanBadgeProps {
  planType: number;
}

/**
 * PlanBadge 组件 - 显示用户计划类型徽章
 * 
 * 根据 planType 显示不同的徽章样式：
 * - 管理员（999）：紫色
 * - 企业版（2）：蓝色
 * - 专业版（1）：靛蓝色
 * - 免费版（0）：灰色
 * 
 * Requirements: 12.3 避免不必要的重新渲染
 * 
 * @param planType - 用户的计划类型代码
 */
export const PlanBadge: React.FC<PlanBadgeProps> = React.memo(({ planType }) => {
  const getPlanConfig = () => {
    switch (planType) {
      case 999:
        return {
          name: '管理员',
          color: 'text-purple-600 dark:text-purple-400',
          bg: 'bg-purple-50 dark:bg-purple-900/20',
        };
      case 2:
        return {
          name: '企业版',
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
        };
      case 1:
        return {
          name: '专业版',
          color: 'text-indigo-600 dark:text-indigo-400',
          bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        };
      default:
        return {
          name: '免费版',
          color: 'text-slate-600 dark:text-slate-400',
          bg: 'bg-slate-50 dark:bg-slate-800/50',
        };
    }
  };

  const plan = getPlanConfig();

  return (
    <span className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium ${plan.bg} ${plan.color}`}>
      {plan.name}
    </span>
  );
});
