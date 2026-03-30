import React, { useState, useCallback } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

type UuidVersion = 'v4' | 'v7' | 'v1-like';

export interface ParsedUuidInfo {
  normalized: string;
  valid: boolean;
  version: string;
  variant: string;
}

const getRandomBytes = (size: number) => {
  const bytes = new Uint8Array(size);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    return bytes;
  }

  for (let i = 0; i < size; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const bytesToUuid = (bytes: Uint8Array) => {
  const hex = bytesToHex(bytes);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
};

export const parseUuidInfo = (value: string): ParsedUuidInfo => {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(
    /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/
  );

  if (!match) {
    return {
      normalized,
      valid: false,
      version: '无效',
      variant: '无效',
    };
  }

  const versionNibble = match[3][0];
  const variantNibble = parseInt(match[4][0], 16);
  const variant =
    (variantNibble & 0b1000) === 0
      ? 'NCS'
      : (variantNibble & 0b1100) === 0b1000
        ? 'RFC 4122'
        : (variantNibble & 0b1110) === 0b1100
          ? 'Microsoft'
          : 'Future';

  return {
    normalized,
    valid: true,
    version: `v${parseInt(versionNibble, 16)}`,
    variant,
  };
};

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
  const [inspectInput, setInspectInput] = useState('');

  // 生成 UUID v4 (随机)
  const generateUuidV4 = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    const bytes = getRandomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return bytesToUuid(bytes);
  };

  // 生成 UUID v7 (时间有序)
  const generateUuidV7 = (): string => {
    const bytes = getRandomBytes(16);
    const timestamp = BigInt(Date.now());

    bytes[0] = Number((timestamp >> 40n) & 0xffn);
    bytes[1] = Number((timestamp >> 32n) & 0xffn);
    bytes[2] = Number((timestamp >> 24n) & 0xffn);
    bytes[3] = Number((timestamp >> 16n) & 0xffn);
    bytes[4] = Number((timestamp >> 8n) & 0xffn);
    bytes[5] = Number(timestamp & 0xffn);
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return bytesToUuid(bytes);
  };

  // 生成类 v1 UUID (基于时间戳)
  const generateUuidV1Like = (): string => {
    const timestamp = Date.now().toString(16).padStart(12, '0');
    const randomHex = bytesToHex(getRandomBytes(10));

    return [
      timestamp.slice(0, 8),
      timestamp.slice(8, 12),
      `1${randomHex.slice(0, 3)}`,
      randomHex.slice(3, 7),
      randomHex.slice(7, 19),
    ].join('-');
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

    const generator = version === 'v4' ? generateUuidV4 : version === 'v7' ? generateUuidV7 : generateUuidV1Like;
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

  const parsedInfo = inspectInput ? parseUuidInfo(inspectInput) : null;

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
                  onClick={() => setVersion('v7')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    version === 'v7'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  UUID v7 ({t('uuid.time_based')})
                </button>
                <button
                  onClick={() => setVersion('v1-like')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    version === 'v1-like'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  v1-like
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

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">UUID 校验与解析</h3>
          </div>
          <div className="p-4 space-y-4">
            <input
              type="text"
              value={inspectInput}
              onChange={(e) => setInspectInput(e.target.value)}
              placeholder="粘贴一个 UUID 进行校验"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {parsedInfo && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">状态</p>
                  <p className={`mt-1 font-medium ${parsedInfo.valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {parsedInfo.valid ? '有效 UUID' : '无效 UUID'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">版本</p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-white">{parsedInfo.version}</p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">变体</p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-white">{parsedInfo.variant}</p>
                </div>
              </div>
            )}
          </div>
        </div>

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
