import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

type Mode = 'toDate' | 'toTimestamp';

export interface TimestampFormatItem {
  key: string;
  label: string;
  value: string;
}

const pad2 = (value: number): string => String(value).padStart(2, '0');

export const formatLocalIsoString = (date: Date): string => {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = pad2(Math.floor(absoluteOffset / 60));
  const offsetRemainder = pad2(absoluteOffset % 60);

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}${sign}${offsetHours}:${offsetRemainder}`;
};

export const buildTimestampFormats = (
  timestampSeconds: number,
  language: 'zh' | 'en'
): TimestampFormatItem[] => {
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const date = new Date(timestampSeconds * 1000);

  return [
    {
      key: 'unix-seconds',
      label: language === 'zh' ? '当前时间戳（秒）' : 'Unix seconds',
      value: String(timestampSeconds),
    },
    {
      key: 'unix-milliseconds',
      label: language === 'zh' ? '当前时间戳（毫秒）' : 'Unix milliseconds',
      value: String(timestampSeconds * 1000),
    },
    {
      key: 'local',
      label: language === 'zh' ? '本地时间' : 'Local time',
      value: date.toLocaleString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    },
    {
      key: 'utc',
      label: language === 'zh' ? 'UTC 时间' : 'UTC time',
      value: date.toLocaleString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      }),
    },
    {
      key: 'iso-utc',
      label: language === 'zh' ? 'ISO 8601 UTC' : 'ISO 8601 UTC',
      value: date.toISOString(),
    },
    {
      key: 'iso-local',
      label: language === 'zh' ? 'ISO 8601 本地' : 'ISO 8601 local',
      value: formatLocalIsoString(date),
    },
  ];
};

export const parseTimestampInput = (value: string): { milliseconds: number; unit: 'seconds' | 'milliseconds' } | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{13}$/.test(trimmed)) {
    return { milliseconds: Number(trimmed), unit: 'milliseconds' };
  }

  if (/^\d{10}$/.test(trimmed)) {
    return { milliseconds: Number(trimmed) * 1000, unit: 'seconds' };
  }

  const parsedDate = new Date(trimmed);
  if (!Number.isNaN(parsedDate.getTime())) {
    return { milliseconds: parsedDate.getTime(), unit: 'milliseconds' };
  }

  return null;
};

export const buildRelativeTimeLabel = (timestampMs: number, nowMs: number, language: 'zh' | 'en') => {
  const diffMs = timestampMs - nowMs;
  const absoluteSeconds = Math.round(Math.abs(diffMs) / 1000);
  const absoluteMinutes = Math.round(absoluteSeconds / 60);
  const absoluteHours = Math.round(absoluteMinutes / 60);
  const absoluteDays = Math.round(absoluteHours / 24);

  const format = (value: number, unitZh: string, unitEn: string) =>
    language === 'zh'
      ? `${value}${unitZh}${diffMs >= 0 ? '后' : '前'}`
      : `${value} ${unitEn}${value === 1 ? '' : 's'} ${diffMs >= 0 ? 'from now' : 'ago'}`;

  if (absoluteSeconds < 60) return format(absoluteSeconds, '秒', 'second');
  if (absoluteMinutes < 60) return format(absoluteMinutes, '分钟', 'minute');
  if (absoluteHours < 24) return format(absoluteHours, '小时', 'hour');
  return format(absoluteDays, '天', 'day');
};

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
  const currentFormats = useMemo(() => buildTimestampFormats(currentTimestamp, language), [currentTimestamp, language]);

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
    const parsed = parseTimestampInput(ts);
    if (!parsed) return t('timestamp.invalid');

    const date = new Date(parsed.milliseconds);
    
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
  const parsedTimestamp = parseTimestampInput(timestamp);
  const relativeTimeLabel = parsedTimestamp
    ? buildRelativeTimeLabel(parsedTimestamp.milliseconds, Date.now(), language)
    : '';

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {currentFormats.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => copyToClipboard(item.value, item.key)}
                className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-3 text-left transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.2em] text-indigo-100">{item.label}</span>
                  <span className="text-xs text-indigo-100/80">
                    {copiedField === item.key
                      ? language === 'zh'
                        ? '已复制'
                        : 'Copied'
                      : language === 'zh'
                        ? '点击复制'
                        : 'Copy'}
                  </span>
                </div>
                <p className="mt-2 font-mono text-sm break-all text-white">{item.value}</p>
              </button>
            ))}
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
                {relativeTimeLabel && convertedDate !== t('timestamp.invalid') && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {language === 'zh' ? '相对时间：' : 'Relative time: '}
                    {relativeTimeLabel}
                  </p>
                )}
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
