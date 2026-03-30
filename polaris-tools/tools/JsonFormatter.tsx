import React, { useMemo, useState } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

type JsonAction = 'validate' | 'format' | 'minify';

export interface JsonFormatResult {
  valid: boolean;
  formatted: string;
  minified: string;
  value: unknown;
}

export const parseJsonText = (input: string): JsonFormatResult => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('请输入 JSON 内容');
  }

  const value = JSON.parse(trimmed) as unknown;
  return {
    valid: true,
    formatted: JSON.stringify(value, null, 2),
    minified: JSON.stringify(value),
    value,
  };
};

export const formatJsonText = (input: string, indent = 2): string => {
  const parsed = parseJsonText(input);
  return JSON.stringify(parsed.value, null, indent);
};

export const minifyJsonText = (input: string): string => {
  const parsed = parseJsonText(input);
  return JSON.stringify(parsed.value);
};

const getJsonSummary = (value: unknown) => {
  if (Array.isArray(value)) {
    return `数组 · ${value.length} 项`;
  }

  if (value && typeof value === 'object') {
    return `对象 · ${Object.keys(value as Record<string, unknown>).length} 个键`;
  }

  return typeof value;
};

export const JsonFormatter: React.FC = () => {
  const { language, isGuest, checkGuestUsage, recordGuestToolUsage } = useAppContext();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasRecordedUsage, setHasRecordedUsage] = useState(false);

  const copyOutput = () => {
    if (!output) {
      return;
    }
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInputChange = (value: string) => {
    if (isGuest && !hasRecordedUsage && value.length > 0 && input.length === 0) {
      if (!checkGuestUsage()) return;
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }

    setInput(value);
    setError(null);
    setSummary(null);
    if (!value.trim()) {
      setOutput('');
    }
  };

  const execute = (action: JsonAction) => {
    try {
      const parsed = parseJsonText(input);
      setError(null);
      setSummary(
        `${parsed.valid ? (language === 'zh' ? '有效 JSON' : 'Valid JSON') : ''} · ${getJsonSummary(parsed.value)}`
      );

      if (action === 'validate') {
        setOutput(parsed.formatted);
        return;
      }

      if (action === 'format') {
        setOutput(formatJsonText(input));
        return;
      }

      setOutput(minifyJsonText(input));
    } catch (err) {
      const message = err instanceof Error ? err.message : language === 'zh' ? 'JSON 解析失败' : 'JSON parsing failed';
      setError(message);
      setSummary(null);
      setOutput('');
    }
  };

  const stats = useMemo(() => {
    const lineCount = input ? input.split('\n').length : 0;
    const charCount = input.length;
    return { lineCount, charCount };
  }, [input]);

  return (
    <ToolLayout toolId="json-formatter">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {language === 'zh' ? 'JSON 输入' : 'JSON Input'}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => execute('validate')}
                  className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300 transition-colors"
                >
                  {language === 'zh' ? '校验' : 'Validate'}
                </button>
                <button
                  onClick={() => execute('format')}
                  className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300 transition-colors"
                >
                  {language === 'zh' ? '格式化' : 'Format'}
                </button>
                <button
                  onClick={() => execute('minify')}
                  className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300 transition-colors"
                >
                  {language === 'zh' ? '压缩' : 'Minify'}
                </button>
                {input && (
                  <button
                    onClick={() => {
                      setInput('');
                      setOutput('');
                      setError(null);
                      setSummary(null);
                    }}
                    className="text-sm px-3 py-1.5 rounded-md text-slate-500 hover:text-rose-600 transition-colors"
                  >
                    {language === 'zh' ? '清空' : 'Clear'}
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={language === 'zh' ? '粘贴 JSON 文本，支持校验、格式化和压缩' : 'Paste JSON to validate, format, or minify'}
              className="w-full min-h-[420px] p-4 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-y focus:outline-none font-mono text-sm leading-6"
            />
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {language === 'zh' ? '结果' : 'Result'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'zh' ? '输出会在此显示，可直接复制' : 'Formatted output appears here'}
                  </p>
                </div>
                <button
                  onClick={copyOutput}
                  disabled={!output}
                  className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:border-indigo-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {copied ? (language === 'zh' ? '已复制' : 'Copied') : (language === 'zh' ? '复制结果' : 'Copy')}
                </button>
              </div>
              <div className="mt-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 min-h-[180px]">
                {error ? (
                  <div className="text-rose-600 dark:text-rose-400 text-sm whitespace-pre-wrap">{error}</div>
                ) : output ? (
                  <pre className="text-slate-900 dark:text-white text-sm leading-6 whitespace-pre-wrap break-words font-mono">{output}</pre>
                ) : (
                  <div className="text-slate-400 dark:text-slate-500 text-sm">
                    {language === 'zh' ? '这里会显示校验或格式化后的 JSON' : 'Validated or formatted JSON will appear here'}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {language === 'zh' ? '状态' : 'Status'}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3">
                  <div className="text-slate-500 dark:text-slate-400">{language === 'zh' ? '字符数' : 'Characters'}</div>
                  <div className="text-slate-900 dark:text-white font-semibold">{stats.charCount}</div>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3">
                  <div className="text-slate-500 dark:text-slate-400">{language === 'zh' ? '行数' : 'Lines'}</div>
                  <div className="text-slate-900 dark:text-white font-semibold">{stats.lineCount}</div>
                </div>
              </div>
              {summary && (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-500/10 p-3 text-sm text-emerald-900 dark:text-emerald-100">
                  {summary}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                {language === 'zh' ? '提示' : 'Tips'}
              </h3>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li>{language === 'zh' ? '校验会解析输入并反馈是否有效。' : 'Validate parses the input and reports whether it is valid.'}</li>
                <li>{language === 'zh' ? '格式化会输出 2 空格缩进的 JSON。' : 'Format outputs pretty JSON with 2-space indentation.'}</li>
                <li>{language === 'zh' ? '压缩会去掉多余空白并输出最小 JSON。' : 'Minify removes whitespace and outputs compact JSON.'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
};

