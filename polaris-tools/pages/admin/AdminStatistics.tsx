import React, { useEffect, useState, useMemo } from 'react';
import { Icon } from '../../components/Icon';
import { useAppContext } from '../../context/AppContext';
import { adminApi } from '../../api/adminClient';

interface TrendDataPoint {
  date: string;
  count: number;
}

interface PopularTool {
  toolId: number;
  toolName: string;
  count: number;
}

/**
 * 日历热图组件 - GitHub 风格贡献图
 */
const CalendarHeatmap: React.FC<{
  data: TrendDataPoint[];
  title: string;
  colorScheme: 'indigo' | 'emerald';
  language: string;
  days: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}> = ({ data, title, colorScheme, language, days, t }) => {
  // 生成日历数据
  const calendarData = useMemo(() => {
    const dataMap = new Map(data.map(d => [d.date, d.count]));
    const maxCount = Math.max(...data.map(d => d.count), 1);
    
    // 生成指定天数的数据
    const today = new Date();
    const weeks: { date: Date; count: number; level: number }[][] = [];
    
    // 找到开始日期并调整到该周的周日
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days + 1);
    while (startDate.getDay() !== 0) {
      startDate.setDate(startDate.getDate() - 1);
    }
    
    let currentWeek: { date: Date; count: number; level: number }[] = [];
    const endDate = new Date(today);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const count: number = (dataMap.get(dateStr) as number | undefined) || 0;
      const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / maxCount) * 4));
      
      currentWeek.push({
        date: new Date(d),
        count,
        level,
      });
      
      if (d.getDay() === 6 || d.getTime() === endDate.getTime()) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    return { weeks, maxCount };
  }, [data, days]);

  const colorClasses = {
    indigo: {
      0: 'bg-slate-100 dark:bg-slate-800',
      1: 'bg-indigo-200 dark:bg-indigo-900/40',
      2: 'bg-indigo-400 dark:bg-indigo-700/60',
      3: 'bg-indigo-500 dark:bg-indigo-500',
      4: 'bg-indigo-700 dark:bg-indigo-400',
    },
    emerald: {
      0: 'bg-slate-100 dark:bg-slate-800',
      1: 'bg-emerald-200 dark:bg-emerald-900/40',
      2: 'bg-emerald-400 dark:bg-emerald-700/60',
      3: 'bg-emerald-500 dark:bg-emerald-500',
      4: 'bg-emerald-700 dark:bg-emerald-400',
    },
  };

  const weekDays = language === 'zh' 
    ? ['日', '一', '二', '三', '四', '五', '六']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const monthNames = language === 'zh'
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // 获取月份标签
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    calendarData.weeks.forEach((week, index) => {
      const firstDay = week.find(d => d);
      if (firstDay && firstDay.date.getMonth() !== lastMonth) {
        lastMonth = firstDay.date.getMonth();
        labels.push({ month: monthNames[lastMonth], weekIndex: index });
      }
    });
    return labels;
  }, [calendarData.weeks, monthNames]);

  const totalCount = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalCount.toLocaleString()}</p>
          <p className="text-xs text-slate-500 dark:text-text-secondary">
            {t('admin.statistics.total_in_days', { days })}
          </p>
        </div>
      </div>
      
      {/* 月份标签 */}
      <div className="flex mb-2 ml-8 text-xs text-slate-400 dark:text-slate-500">
        {monthLabels.map((label, idx) => (
          <span
            key={idx}
            style={{ 
              marginLeft: idx === 0 ? `${label.weekIndex * 15}px` : `${(label.weekIndex - (monthLabels[idx - 1]?.weekIndex || 0) - 1) * 15}px`,
            }}
          >
            {label.month}
          </span>
        ))}
      </div>

      {/* 日历热图 */}
      <div className="flex gap-1">
        {/* 星期标签 */}
        <div className="flex flex-col gap-[3px] mr-1">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => (
            <div
              key={day}
              className="h-[12px] w-6 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-end pr-1"
            >
              {day % 2 === 1 ? weekDays[day] : ''}
            </div>
          ))}
        </div>
        
        {/* 热图格子 */}
        <div className="flex gap-[3px] overflow-x-auto">
          {calendarData.weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                const day = week.find(d => d.date.getDay() === dayIndex);
                if (!day) {
                  return <div key={dayIndex} className="w-[12px] h-[12px]" />;
                }
                const isToday = day.date.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={dayIndex}
                    className={`w-[12px] h-[12px] rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-slate-400 dark:hover:ring-slate-500 ${
                      colorClasses[colorScheme][day.level as keyof typeof colorClasses.indigo]
                    } ${isToday ? 'ring-2 ring-slate-500 dark:ring-slate-400' : ''}`}
                    title={`${day.date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')}: ${day.count} ${language === 'zh' ? '次' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-slate-500 dark:text-slate-400">
        <span>{t('admin.statistics.less')}</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`w-[12px] h-[12px] rounded-sm ${colorClasses[colorScheme][level as keyof typeof colorClasses.indigo]}`}
          />
        ))}
        <span>{t('admin.statistics.more')}</span>
      </div>
    </div>
  );
};

/**
 * Admin Statistics Component
 * 管理员数据统计页面 - 使用日历热图显示趋势
 */
export const AdminStatistics: React.FC = () => {
  const { t, language } = useAppContext();
  
  const [usageTrend, setUsageTrend] = useState<TrendDataPoint[]>([]);
  const [userTrend, setUserTrend] = useState<TrendDataPoint[]>([]);
  const [popularTools, setPopularTools] = useState<PopularTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(90); // 默认90天更适合日历显示

  useEffect(() => {
    fetchStatistics();
  }, [days]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [usageResult, userResult, toolsResult] = await Promise.all([
        adminApi.statistics.usageTrend(days),
        adminApi.statistics.userTrend(days),
        adminApi.statistics.popularTools(10),
      ]);

      setUsageTrend(usageResult.data || []);
      setUserTrend(userResult.data || []);
      setPopularTools(toolsResult.data || []);
    } catch (err: any) {
      console.error('Failed to fetch statistics:', err);
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('admin.statistics.title')}
          </h1>
          <p className="text-slate-500 dark:text-text-secondary mt-1">
            {t('admin.statistics.subtitle')}
          </p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          {[30, 90, 180].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {d} {t('admin.statistics.days')}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <Icon name="error" className="text-red-600 dark:text-red-400 text-[20px] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {t('admin.statistics.error_fetch')}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchStatistics}
            className="px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Calendar Heatmaps */}
          <div className="space-y-6">
            {/* Usage Trend Calendar */}
            <CalendarHeatmap
              data={usageTrend}
              title={t('admin.statistics.usage_trend')}
              colorScheme="indigo"
              language={language}
              days={days}
              t={t}
            />

            {/* User Growth Calendar */}
            <CalendarHeatmap
              data={userTrend}
              title={t('admin.statistics.user_growth')}
              colorScheme="emerald"
              language={language}
              days={days}
              t={t}
            />
          </div>

          {/* Popular Tools */}
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {t('admin.statistics.popular_tools')}
            </h3>
            {popularTools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {popularTools.map((tool, index) => {
                  const maxCount = popularTools[0]?.count || 1;
                  const percentage = (tool.count / maxCount) * 100;
                  return (
                    <div key={tool.toolId} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div className={`flex items-center justify-center size-10 rounded-lg font-bold text-sm ${
                        index === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                        index === 1 ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' :
                        index === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        #{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {tool.toolName}
                          </span>
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-300 ml-2">
                            {tool.count.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                {t('admin.statistics.no_usage_data')}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
