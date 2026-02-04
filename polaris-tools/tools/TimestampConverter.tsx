import React, { useState, useCallback, useEffect } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

type Mode = 'toDate' | 'toTimestamp';

/**
 * 时间戳转换工具
 */
export const TimestampConverter: React.FC = () => {
  const { t, language, isGuest, checkGuestUsage, recordGuestToolUsage } = useAppContext();
  const [timestamp, setTimestamp] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState(Math.floor(Date.now() / 1000));
  const [unit, setUnit] = useState<'seconds' | 'milliseconds'>('seconds');
  const [hasRecordedUsage, setHasRecordedUsage] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 更新当前时间戳
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimestamp(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 时间戳转日期
  const timestampToDate = (ts: string): string => {
    if (!ts) return '';
    const num = parseInt(ts);
    if (isNaN(num)) return t('timestamp.invalid');
    
    const ms = unit === 'seconds' ? num * 1000 : num;
    const date = new Date(ms);
    
    if (isNaN(date.getTime())) return t('timestamp.invalid');
    
    return date.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // 日期转时间戳
  const dateToTimestamp = (date: string): string => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return t('timestamp.invalid');
    
    const ts = unit === 'seconds' ? Math.floor(d.getTime() / 1000) : d.getTime();
    return ts.toString();
  };

  // 处理时间戳输入
  const handleTimestampChange = (value: string) => {
    if (isGuest && !hasRecordedUsage && value.length > 0 && timestamp.length === 0) {
      if (!checkGuestUsage()) return;
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }
    setTimestamp(value);
  };

  // 处理日期输入
  const handleDateChange = (value: string) => {
    if (isGuest && !hasRecordedUsage && value.length > 0 && dateStr.length === 0) {
      if (!checkGuestUsage()) return;
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }
    setDateStr(value);
  };

  // 复制到剪贴板
  const copyToClipboard = useCallback((value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  // 使用当前时间
  const useCurrentTime = () => {
    const ts = unit === 'seconds' ? currentTimestamp : currentTimestamp * 1000;
    setTimestamp(ts.toString());
  };

  // 格式化当前时间显示
  const formatCurrentTime = () => {
    return new Date(currentTimestamp * 1000).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // 清空
  const handleClear = () => {
    setTimestamp('');
    setDateStr('');
  };

  const convertedDate = timestampToDate(timestamp);
  const convertedTimestamp = dateToTimestamp(dateStr);

  return (
    <ToolLayout toolId="timestamp-converter">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 当前时间显示 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm mb-1">{t('timestamp.current_time')}</p>
              <p className="text-3xl font-bold font-mono">{currentTimestamp}</p>
              <p className="text-indigo-200 text-sm mt-1">{formatCurrentTime()}</p>
            </div>
            <button
              onClick={useCurrentTime}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
            >
              {t('timestamp.use_current')}
            </button>
          </div>
        </div>

        {/* 单位选择 */}
        <div className="flex justify-center">
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setUnit('seconds')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                unit === 'seconds'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('timestamp.seconds')}
            </button>
            <button
              onClick={() => setUnit('milliseconds')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                unit === 'milliseconds'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('timestamp.milliseconds')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 时间戳转日期 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400">schedule</span>
                {t('timestamp.to_date')}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('timestamp.timestamp_input')}
                </label>
                <input
                  type="text"
                  value={timestamp}
                  onChange={(e) => handleTimestampChange(e.target.value)}
                  placeholder={unit === 'seconds' ? '1704067200' : '1704067200000'}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('timestamp.date_result')}
                  </label>
                  {convertedDate && convertedDate !== t('timestamp.invalid') && (
                    <button
                      onClick={() => copyToClipboard(convertedDate, 'date')}
                      className={`text-sm transition-colors ${
                        copiedField === 'date' 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700'
                      }`}
                    >
                      {copiedField === 'date' ? t('timestamp.copied') : t('timestamp.copy')}
                    </button>
                  )}
                </div>
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg min-h-[48px] flex items-center">
                  <span className={`font-mono ${convertedDate === t('timestamp.invalid') ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                    {convertedDate || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 日期转时间戳 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">event</span>
                {t('timestamp.to_timestamp')}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label htmlFor="date-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('timestamp.date_input')}
                </label>
                <input
                  id="date-input"
                  type="datetime-local"
                  value={dateStr}
                  onChange={(e) => handleDateChange(e.target.value)}
                  aria-label={t('timestamp.date_input')}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('timestamp.timestamp_result')}
                  </label>
                  {convertedTimestamp && convertedTimestamp !== t('timestamp.invalid') && (
                    <button
                      onClick={() => copyToClipboard(convertedTimestamp, 'timestamp')}
                      className={`text-sm transition-colors ${
                        copiedField === 'timestamp' 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700'
                      }`}
                    >
                      {copiedField === 'timestamp' ? t('timestamp.copied') : t('timestamp.copy')}
                    </button>
                  )}
                </div>
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg min-h-[48px] flex items-center">
                  <span className={`font-mono ${convertedTimestamp === t('timestamp.invalid') ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                    {convertedTimestamp || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 常用时间戳参考 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t('timestamp.reference')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { label: t('timestamp.today_start'), value: new Date().setHours(0, 0, 0, 0) },
              { label: t('timestamp.today_end'), value: new Date().setHours(23, 59, 59, 999) },
              { label: t('timestamp.yesterday'), value: Date.now() - 86400000 },
              { label: t('timestamp.week_ago'), value: Date.now() - 604800000 },
            ].map(({ label, value }) => {
              const ts = unit === 'seconds' ? Math.floor(value / 1000) : value;
              return (
                <button
                  key={label}
                  onClick={() => setTimestamp(ts.toString())}
                  className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <p className="text-slate-500 dark:text-slate-400 text-xs">{label}</p>
                  <p className="text-slate-900 dark:text-white font-mono">{ts}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
};
