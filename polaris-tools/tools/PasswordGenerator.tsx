import React, { useMemo, useState, useCallback } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeSimilar: boolean;
  excludeAmbiguous: boolean;
}

interface PasswordPool {
  key: keyof Pick<PasswordOptions, 'uppercase' | 'lowercase' | 'numbers' | 'symbols'>;
  label: string;
  chars: string;
}

interface PasswordGenerationResult {
  password: string;
  minimumLength: number;
}

export interface PasswordEntropyReport {
  minimumLength: number;
  effectiveLength: number;
  charsetSize: number;
  entropyBits: number;
  securityLabel: '较弱' | '一般' | '较强' | '很强';
  note: string;
}

const PASSWORD_CHARSETS: Record<PasswordPool['key'], string> = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

const SIMILAR_CHARS = 'il1Lo0O';
const AMBIGUOUS_CHARS = '{}[]()/\\\'"`~,;:.<>';

const getRandomInt = (max: number) => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return max > 0 ? array[0] % max : 0;
};

const pickRandomChar = (chars: string) => chars.charAt(getRandomInt(chars.length));

const shuffleChars = (chars: string[]) => {
  const result = [...chars];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = getRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const buildPools = (options: PasswordOptions): PasswordPool[] => {
  const pools: PasswordPool[] = [];

  (Object.entries(PASSWORD_CHARSETS) as [PasswordPool['key'], string][]).forEach(([key, chars]) => {
    if (!options[key]) {
      return;
    }

    let poolChars = chars;
    if (options.excludeSimilar) {
      poolChars = poolChars.split('').filter((char) => !SIMILAR_CHARS.includes(char)).join('');
    }
    if (options.excludeAmbiguous) {
      poolChars = poolChars.split('').filter((char) => !AMBIGUOUS_CHARS.includes(char)).join('');
    }

    if (poolChars) {
      pools.push({
        key,
        label: key,
        chars: poolChars,
      });
    }
  });

  return pools;
};

export const generateSecurePassword = (options: PasswordOptions): PasswordGenerationResult => {
  const pools = buildPools(options);
  const effectivePools = pools.length > 0
    ? pools
    : [{
        key: 'lowercase',
        label: 'lowercase',
        chars: PASSWORD_CHARSETS.lowercase,
      }];

  const minimumLength = Math.max(1, effectivePools.length);
  const targetLength = Math.max(options.length, minimumLength);
  const combinedChars = effectivePools.map((pool) => pool.chars).join('');
  const baseChars = effectivePools.map((pool) => pickRandomChar(pool.chars));
  const extraChars = Array.from({ length: targetLength - baseChars.length }, () => pickRandomChar(combinedChars));

  return {
    password: shuffleChars([...baseChars, ...extraChars]).join(''),
    minimumLength,
  };
};

export const calculatePasswordEntropy = (options: PasswordOptions): PasswordEntropyReport => {
  const pools = buildPools(options);
  const effectivePools = pools.length > 0
    ? pools
    : [{
        key: 'lowercase',
        label: 'lowercase',
        chars: PASSWORD_CHARSETS.lowercase,
      }];

  const minimumLength = Math.max(1, effectivePools.length);
  const effectiveLength = Math.max(options.length, minimumLength);
  const charsetSize = effectivePools.reduce((total, pool) => total + pool.chars.length, 0);
  const mandatoryEntropy = effectivePools.reduce((total, pool) => total + Math.log2(pool.chars.length), 0);
  const flexibleEntropy = Math.max(0, effectiveLength - effectivePools.length) * Math.log2(charsetSize);
  const entropyBits = Number((mandatoryEntropy + flexibleEntropy).toFixed(1));

  let securityLabel: PasswordEntropyReport['securityLabel'] = '较弱';
  let note = '建议提高长度或启用更多字符集。';

  if (entropyBits >= 96) {
    securityLabel = '很强';
    note = '适合长期保存的高价值密码。';
  } else if (entropyBits >= 72) {
    securityLabel = '较强';
    note = '适合多数日常账号使用。';
  } else if (entropyBits >= 48) {
    securityLabel = '一般';
    note = '可用，但建议配合更长长度或更多字符集。';
  }

  return {
    minimumLength,
    effectiveLength,
    charsetSize,
    entropyBits,
    securityLabel,
    note,
  };
};

/**
 * 密码生成器工具
 */
export const PasswordGenerator: React.FC = () => {
  const { t, isGuest, checkGuestUsage, recordGuestToolUsage } = useAppContext();
  const [passwords, setPasswords] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeSimilar: false,
    excludeAmbiguous: false,
  });
  const [hasRecordedUsage, setHasRecordedUsage] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const pools = useMemo(() => buildPools(options), [options]);
  const minimumLength = Math.max(1, pools.length);
  const lengthTooShort = options.length < minimumLength;
  const entropyReport = useMemo(() => calculatePasswordEntropy(options), [options]);

  // 生成多个密码
  const generatePasswords = () => {
    if (lengthTooShort) {
      return;
    }

    if (isGuest && !hasRecordedUsage) {
      if (!checkGuestUsage()) return;
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }

    const newPasswords = Array.from({ length: count }, () => generateSecurePassword(options).password);
    setPasswords(newPasswords);
  };

  // 计算密码强度
  const calculateStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score <= 2) return { score, label: t('password.weak'), color: 'bg-rose-500' };
    if (score <= 4) return { score, label: t('password.medium'), color: 'bg-amber-500' };
    if (score <= 5) return { score, label: t('password.strong'), color: 'bg-emerald-500' };
    return { score, label: t('password.very_strong'), color: 'bg-indigo-500' };
  };

  // 复制单个密码
  const copyPassword = useCallback((password: string, index: number) => {
    navigator.clipboard.writeText(password);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  // 复制全部
  const copyAll = useCallback(() => {
    if (passwords.length > 0) {
      navigator.clipboard.writeText(passwords.join('\n'));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  }, [passwords]);

  // 更新选项
  const updateOption = <K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  // 清空
  const handleClear = () => {
    setPasswords([]);
    setCopiedIndex(null);
    setCopiedAll(false);
  };

  return (
    <ToolLayout toolId="password-generator">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 配置区域 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          {/* 长度滑块 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password-length-range" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('password.length')}
              </label>
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {options.length}
              </span>
            </div>
            <input
              id="password-length-range"
              type="range"
              min="1"
              max="64"
              value={options.length}
              onChange={(e) => updateOption('length', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>1</span>
              <span>64</span>
            </div>
            {lengthTooShort && (
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                密码长度至少需要 {minimumLength} 位，才能覆盖已选择的字符集。
              </p>
            )}
          </div>

          {/* 字符选项 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { key: 'uppercase', label: t('password.uppercase'), sample: 'ABC' },
              { key: 'lowercase', label: t('password.lowercase'), sample: 'abc' },
              { key: 'numbers', label: t('password.numbers'), sample: '123' },
              { key: 'symbols', label: t('password.symbols'), sample: '@#$' },
            ].map(({ key, label, sample }) => (
              <label
                key={key}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  options[key as keyof PasswordOptions]
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options[key as keyof PasswordOptions] as boolean}
                    onChange={(e) => updateOption(key as keyof PasswordOptions, e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                </div>
                <span className="text-xs font-mono text-slate-400">{sample}</span>
              </label>
            ))}
          </div>

          {/* 高级选项 */}
          <div className="flex flex-wrap gap-6 mb-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.excludeSimilar}
                onChange={(e) => updateOption('excludeSimilar', e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{t('password.exclude_similar')}</span>
              <span className="text-xs text-slate-400">(i, l, 1, L, o, 0, O)</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.excludeAmbiguous}
                onChange={(e) => updateOption('excludeAmbiguous', e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{t('password.exclude_ambiguous')}</span>
            </label>
          </div>

          <div className="mb-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">安全说明</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  基于实际字符集大小估算，不是绝对强度判断
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {entropyReport.entropyBits} bits
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {entropyReport.securityLabel}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
              <div className="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">字符集大小</p>
                <p className="mt-1 font-mono text-slate-900 dark:text-white">{entropyReport.charsetSize}</p>
              </div>
              <div className="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">建议最短长度</p>
                <p className="mt-1 font-mono text-slate-900 dark:text-white">{entropyReport.minimumLength}</p>
              </div>
              <div className="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">实际估算长度</p>
                <p className="mt-1 font-mono text-slate-900 dark:text-white">{entropyReport.effectiveLength}</p>
              </div>
              <div className="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">建议</p>
                <p className="mt-1 text-slate-900 dark:text-white text-sm leading-relaxed">{entropyReport.note}</p>
              </div>
            </div>
          </div>

          {/* 数量和生成按钮 */}
          <div className="flex gap-4">
            <div className="w-32">
              <label htmlFor="password-count-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('password.count')}
              </label>
              <input
                id="password-count-input"
                type="number"
                min="1"
                max="50"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1 flex items-end">
              <button
                onClick={generatePasswords}
                disabled={lengthTooShort}
                className="w-full px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                title={lengthTooShort ? `至少需要 ${minimumLength} 位` : t('password.generate')}
              >
                <span className="material-symbols-outlined">password</span>
                {t('password.generate')}
              </button>
            </div>
          </div>
        </div>

        {/* 结果区域 */}
        {passwords.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {t('password.results')} ({passwords.length})
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={copyAll}
                  className={`text-sm transition-colors ${
                    copiedAll
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700'
                  }`}
                >
                  {copiedAll ? t('password.copied_all') : t('password.copy_all')}
                </button>
                <button
                  onClick={handleClear}
                  className="text-sm text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                >
                  {t('password.clear')}
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
              {passwords.map((password, index) => {
                const strength = calculateStrength(password);
                return (
                  <div
                    key={index}
                    className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <code className="font-mono text-slate-900 dark:text-white truncate">
                        {password}
                      </code>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className={`w-16 h-1.5 rounded-full ${strength.color}`} />
                        <span className="text-xs text-slate-500">{strength.label}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => copyPassword(password, index)}
                      className={`text-sm transition-colors flex-shrink-0 ml-4 ${
                        copiedIndex === index
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700'
                      }`}
                    >
                      {copiedIndex === index ? t('password.copied') : t('password.copy')}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {passwords.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-slate-400">lock</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">{t('password.empty_hint')}</p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};
