import React, { useState, useCallback } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeSimilar: boolean;
  excludeAmbiguous: boolean;
}

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

  // 字符集
  const charsets = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  };

  // 相似字符
  const similarChars = 'il1Lo0O';
  // 歧义字符
  const ambiguousChars = '{}[]()/\\\'"`~,;:.<>';

  // 生成密码
  const generatePassword = (): string => {
    let charset = '';
    
    if (options.uppercase) charset += charsets.uppercase;
    if (options.lowercase) charset += charsets.lowercase;
    if (options.numbers) charset += charsets.numbers;
    if (options.symbols) charset += charsets.symbols;

    if (!charset) {
      charset = charsets.lowercase; // 默认至少使用小写字母
    }

    // 排除相似字符
    if (options.excludeSimilar) {
      charset = charset.split('').filter(c => !similarChars.includes(c)).join('');
    }

    // 排除歧义字符
    if (options.excludeAmbiguous) {
      charset = charset.split('').filter(c => !ambiguousChars.includes(c)).join('');
    }

    // 使用 crypto API 生成随机数
    const array = new Uint32Array(options.length);
    crypto.getRandomValues(array);
    
    let password = '';
    for (let i = 0; i < options.length; i++) {
      password += charset[array[i] % charset.length];
    }

    return password;
  };

  // 生成多个密码
  const generatePasswords = () => {
    if (isGuest && !hasRecordedUsage) {
      if (!checkGuestUsage()) return;
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }

    const newPasswords = Array.from({ length: count }, generatePassword);
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
    setOptions(prev => ({ ...prev, [key]: value }));
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
              min="4"
              max="64"
              value={options.length}
              onChange={(e) => updateOption('length', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>4</span>
              <span>64</span>
            </div>
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
                className="w-full px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
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
