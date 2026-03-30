import React, { useState, useCallback } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

type Mode = 'encode' | 'decode';

export const normalizeBase64Input = (value: string): string => value.replace(/\s+/g, '');

export const normalizeBase64UrlInput = (value: string): string =>
  normalizeBase64Input(value).replace(/-/g, '+').replace(/_/g, '/');

export const toBase64Url = (value: string): string =>
  value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const padBase64 = (value: string): string => {
  const remainder = value.length % 4;
  if (remainder === 0) {
    return value;
  }

  if (remainder === 1) {
    throw new Error('Invalid Base64 length');
  }

  return `${value}${'='.repeat(4 - remainder)}`;
};

export const encodeBase64Text = (value: string, urlSafe = false): string => {
  if (!value) {
    return '';
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const binary = Array.from(data)
    .map((byte) => String.fromCharCode(byte))
    .join('');

  const base64 = btoa(binary);
  return urlSafe ? toBase64Url(base64) : base64;
};

export const decodeBase64Text = (value: string): string => {
  if (!value) {
    return '';
  }

  const compact = normalizeBase64Input(value);
  if (!/^[A-Za-z0-9+/=_-]+$/.test(compact)) {
    throw new Error('Invalid Base64 characters');
  }

  const firstPadding = compact.indexOf('=');
  if (firstPadding !== -1 && /[^=]/.test(compact.slice(firstPadding))) {
    throw new Error('Invalid Base64 padding');
  }

  const standard = normalizeBase64UrlInput(compact).replace(/=+$/g, '');
  const padded = padBase64(standard);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
};

/**
 * Base64 编码/解码工具
 */
export const Base64Encoder: React.FC = () => {
  const { t, language, isGuest, checkGuestUsage, recordGuestToolUsage } = useAppContext();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<Mode>('encode');
  const [urlSafe, setUrlSafe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRecordedUsage, setHasRecordedUsage] = useState(false);
  const [copied, setCopied] = useState(false);

  // 处理输入变更
  const handleInputChange = (value: string, currentMode?: Mode, currentUrlSafe?: boolean) => {
    if (isGuest && !hasRecordedUsage && value.length > 0 && input.length === 0) {
      if (!checkGuestUsage()) return;
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }
    setInput(value);
    setError(null);
    
    if (!value.trim()) {
      setOutput('');
      return;
    }

    const m = currentMode ?? mode;
    const safe = currentUrlSafe ?? urlSafe;

    try {
      if (m === 'encode') {
        setOutput(encodeBase64Text(value, safe));
      } else {
        setOutput(decodeBase64Text(value));
      }
    } catch (e) {
      const message =
        mode === 'decode'
          ? language === 'zh'
            ? '请输入有效的 Base64 或 Base64URL 字符串'
            : 'Please enter a valid Base64 or Base64URL string'
          : language === 'zh'
            ? '编码失败，请检查输入内容'
            : 'Encoding failed, please check the input';
      setError(message);
      setOutput('');
    }
  };

  // 切换模式
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setInput('');
    setOutput('');
    setError(null);
  };

  const handleUrlSafeChange = (checked: boolean) => {
    setUrlSafe(checked);
    if (input.trim()) {
      handleInputChange(input, mode, checked);
    }
  };

  // 交换输入输出
  const handleSwap = () => {
    if (output && !error) {
      const nextMode = mode === 'encode' ? 'decode' : 'encode';
      setInput(output);
      setMode(nextMode);
      handleInputChange(output, nextMode, urlSafe);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = useCallback(() => {
    if (output) {
      navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [output]);

  // 清空
  const handleClear = () => {
    setInput('');
    setOutput('');
    setError(null);
  };

  return (
    <ToolLayout toolId="base64-encoder">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 模式切换 */}
        <div className="flex justify-center">
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => handleModeChange('encode')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'encode'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('base64.encode')}
            </button>
            <button
              onClick={() => handleModeChange('decode')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'decode'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('base64.decode')}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={urlSafe}
              onChange={(e) => handleUrlSafeChange(e.target.checked)}
              className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
            />
            <span>{language === 'zh' ? '使用 URL-safe Base64' : 'Use URL-safe Base64'}</span>
          </label>
        </div>

        {/* 输入区域 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {mode === 'encode' ? t('base64.plain_text') : t('base64.base64_text')}
            </h3>
            {input && (
              <button
                onClick={handleClear}
                className="text-sm text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
              >
                {t('base64.clear')}
              </button>
            )}
          </div>
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={mode === 'encode' ? t('base64.encode_placeholder') : t('base64.decode_placeholder')}
            className="w-full h-40 p-4 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none font-mono"
          />
        </div>

        {/* 交换按钮 */}
        <div className="flex justify-center">
          <button
            onClick={handleSwap}
            disabled={!output || !!error}
            className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('base64.swap')}
          >
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">swap_vert</span>
          </button>
        </div>

        {/* 输出区域 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {mode === 'encode' ? t('base64.base64_text') : t('base64.plain_text')}
            </h3>
            {output && (
              <button
                onClick={copyToClipboard}
                className={`text-sm transition-colors ${
                  copied 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300'
                }`}
              >
                {copied ? t('base64.copied') : t('base64.copy')}
              </button>
            )}
          </div>
          <div className="p-4 min-h-[160px]">
            {error ? (
              <div className="text-rose-600 dark:text-rose-400">{error}</div>
            ) : output ? (
              <div className="text-slate-900 dark:text-white font-mono break-all whitespace-pre-wrap">
                {output}
              </div>
            ) : (
              <div className="text-slate-400 dark:text-slate-500">{t('base64.output_placeholder')}</div>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
};
