import React, { useState, useCallback } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

type Mode = 'encode' | 'decode';

/**
 * Base64 编码/解码工具
 */
export const Base64Encoder: React.FC = () => {
  const { t, isGuest, checkGuestUsage, recordGuestToolUsage } = useAppContext();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<Mode>('encode');
  const [error, setError] = useState<string | null>(null);
  const [hasRecordedUsage, setHasRecordedUsage] = useState(false);
  const [copied, setCopied] = useState(false);

  // 处理输入变更
  const handleInputChange = (value: string) => {
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

    try {
      if (mode === 'encode') {
        // 使用 TextEncoder 处理 Unicode 字符
        const encoder = new TextEncoder();
        const data = encoder.encode(value);
        const binary = Array.from(data).map(b => String.fromCharCode(b)).join('');
        setOutput(btoa(binary));
      } else {
        // 解码
        const binary = atob(value);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const decoder = new TextDecoder();
        setOutput(decoder.decode(bytes));
      }
    } catch (e) {
      setError(mode === 'decode' ? t('base64.invalid_input') : t('base64.encode_error'));
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

  // 交换输入输出
  const handleSwap = () => {
    if (output && !error) {
      setInput(output);
      setMode(mode === 'encode' ? 'decode' : 'encode');
      handleInputChange(output);
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
