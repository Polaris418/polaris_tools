import React, { useState, useCallback } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

type UuidVersion = 'v4' | 'v1-like';

/**
 * UUID 生成器工具
 */
export const UuidGenerator: React.FC = () => {
  const { t, isGuest, checkGuestUsage, recordGuestToolUsage } = useAppContext();
  const [uuids, setUuids] = useState<string[]>([]);
  const [count, setCount] = useState(1);
  const [version, setVersion] = useState<UuidVersion>('v4');
  const [uppercase, setUppercase] = useState(false);
  const [noDashes, setNoDashes] = useState(false);
  const [hasRecordedUsage, setHasRecordedUsage] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // 生成 UUID v4 (随机)
  const generateUuidV4 = (): string => {
    // 使用 crypto.randomUUID() 如果可用
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // 回退方案
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // 生成类 v1 UUID (基于时间戳)
  const generateUuidV1Like = (): string => {
    const now = Date.now();
    const timeHex = now.toString(16).padStart(12, '0');
    const randomPart = Array.from({ length: 4 }, () => 
      Math.floor(Math.random() * 65536).toString(16).padStart(4, '0')
    ).join('');
    
    return `${timeHex.slice(0, 8)}-${timeHex.slice(8, 12)}-1${randomPart.slice(0, 3)}-${randomPart.slice(3, 7)}-${randomPart.slice(7, 19)}`;
  };

  // 格式化 UUID
  const formatUuid = (uuid: string): string => {
    let result = uuid;
    if (noDashes) {
      result = result.replace(/-/g, '');
    }
    if (uppercase) {
      result = result.toUpperCase();
    }
    return result;
  };

  // 生成 UUID
  const generateUuids = () => {
    if (isGuest && !hasRecordedUsage) {
      if (!checkGuestUsage()) return;
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }

    const generator = version === 'v4' ? generateUuidV4 : generateUuidV1Like;
    const newUuids = Array.from({ length: count }, () => formatUuid(generator()));
    setUuids(newUuids);
  };

  // 复制单个 UUID
  const copyUuid = useCallback((uuid: string, index: number) => {
    navigator.clipboard.writeText(uuid);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  // 复制全部
  const copyAll = useCallback(() => {
    if (uuids.length > 0) {
      navigator.clipboard.writeText(uuids.join('\n'));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  }, [uuids]);

  // 清空
  const handleClear = () => {
    setUuids([]);
    setCopiedIndex(null);
    setCopiedAll(false);
  };

  return (
    <ToolLayout toolId="uuid-generator">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 配置区域 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 版本选择 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('uuid.version')}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setVersion('v4')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    version === 'v4'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  UUID v4 ({t('uuid.random')})
                </button>
                <button
                  onClick={() => setVersion('v1-like')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    version === 'v1-like'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  v1-like ({t('uuid.time_based')})
                </button>
              </div>
            </div>

            {/* 数量 */}
            <div>
              <label htmlFor="uuid-count" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('uuid.count')}
              </label>
              <input
                id="uuid-count"
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 选项 */}
          <div className="flex flex-wrap gap-6 mt-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => setUppercase(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{t('uuid.uppercase')}</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={noDashes}
                onChange={(e) => setNoDashes(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{t('uuid.no_dashes')}</span>
            </label>
          </div>

          {/* 生成按钮 */}
          <div className="mt-6">
            <button
              onClick={generateUuids}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">shuffle</span>
              {t('uuid.generate')}
            </button>
          </div>
        </div>

        {/* 结果区域 */}
        {uuids.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {t('uuid.results')} ({uuids.length})
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={copyAll}
                  className={`text-sm transition-colors ${
                    copiedAll 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300'
                  }`}
                >
                  {copiedAll ? t('uuid.copied_all') : t('uuid.copy_all')}
                </button>
                <button
                  onClick={handleClear}
                  className="text-sm text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                >
                  {t('uuid.clear')}
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
              {uuids.map((uuid, index) => (
                <div
                  key={index}
                  className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <code className="font-mono text-slate-900 dark:text-white">{uuid}</code>
                  <button
                    onClick={() => copyUuid(uuid, index)}
                    className={`text-sm transition-colors ${
                      copiedIndex === index 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300'
                    }`}
                  >
                    {copiedIndex === index ? t('uuid.copied') : t('uuid.copy')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {uuids.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-slate-400">key</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">{t('uuid.empty_hint')}</p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};
