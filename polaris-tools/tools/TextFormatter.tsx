import React, { useMemo, useState } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

interface TextFormatOptions {
  trimLines: boolean;
  collapseSpaces: boolean;
  removeBlankLines: boolean;
  uniqueLines: boolean;
  sortLines: boolean;
  reverseLines: boolean;
  tabsToSpaces: boolean;
  spacesPerTab: number;
}

export const applyTextFormatting = (input: string, options: TextFormatOptions): string => {
  if (!input) {
    return '';
  }

  const normalized = input.replace(/\r\n?/g, '\n');
  const tabReplacement = ' '.repeat(Math.max(1, options.spacesPerTab));
  let lines = normalized.split('\n');

  lines = lines.map((line) => (options.tabsToSpaces ? line.replace(/\t/g, tabReplacement) : line));

  if (options.trimLines) {
    lines = lines.map((line) => line.trim());
  }

  if (options.collapseSpaces) {
    lines = lines.map((line) => line.replace(/[ \t]{2,}/g, ' '));
  }

  if (options.removeBlankLines) {
    lines = lines.filter((line) => line.trim().length > 0);
  }

  if (options.uniqueLines) {
    const seen = new Set<string>();
    lines = lines.filter((line) => {
      const key = line.trim().toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  if (options.sortLines) {
    lines = [...lines].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  }

  if (options.reverseLines) {
    lines = [...lines].reverse();
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
};

export const getTextFormatterStats = (text: string) => {
  const normalized = text.replace(/\r\n?/g, '\n');
  const lines = normalized ? normalized.split('\n') : [];
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  const words = (normalized.match(/[A-Za-z]+|\d+|[\u4e00-\u9fff]{1,}/g) || []).length;

  return {
    characters: normalized.length,
    lines: lines.length,
    nonEmptyLines: nonEmptyLines.length,
    words,
  };
};

export const TextFormatter: React.FC = () => {
  const { language, isGuest, checkGuestUsage, recordGuestToolUsage } = useAppContext();
  const [input, setInput] = useState('');
  const [hasRecordedUsage, setHasRecordedUsage] = useState(false);
  const [options, setOptions] = useState<TextFormatOptions>({
    trimLines: true,
    collapseSpaces: true,
    removeBlankLines: false,
    uniqueLines: false,
    sortLines: false,
    reverseLines: false,
    tabsToSpaces: true,
    spacesPerTab: 2,
  });

  const output = useMemo(() => applyTextFormatting(input, options), [input, options]);
  const inputStats = useMemo(() => getTextFormatterStats(input), [input]);
  const outputStats = useMemo(() => getTextFormatterStats(output), [output]);

  const ensureUsage = (nextValue: string) => {
    if (isGuest && !hasRecordedUsage && nextValue.length > 0 && input.length === 0) {
      if (!checkGuestUsage()) {
        return false;
      }
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }
    return true;
  };

  const handleCopy = async (text: string) => {
    if (!text) {
      return;
    }
    await navigator.clipboard.writeText(text);
  };

  const handleApplyOutputAsInput = () => {
    if (!output) {
      return;
    }
    setInput(output);
  };

  const toggleOption = (key: keyof TextFormatOptions, value: boolean) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };

  return (
    <ToolLayout toolId="text-formatter">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                文本格式化
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                清理空白、去重、排序、重排行文本
              </p>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'zh' ? '中文/英文混合文本' : 'Chinese / English mixed text'}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-0">
            <div className="p-5 border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h4 className="font-medium text-slate-900 dark:text-white">输入文本</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(output)}
                    className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    复制结果
                  </button>
                  <button
                    onClick={handleApplyOutputAsInput}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-indigo-300 transition-colors"
                  >
                    结果回填输入
                  </button>
                </div>
              </div>

              <textarea
                value={input}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (!ensureUsage(nextValue)) {
                    return;
                  }
                  setInput(nextValue);
                }}
                placeholder="在这里粘贴或输入需要整理的文本..."
                className="w-full h-96 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 font-mono text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={options.trimLines}
                    onChange={(event) => toggleOption('trimLines', event.target.checked)}
                  />
                  去除首尾空格
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={options.collapseSpaces}
                    onChange={(event) => toggleOption('collapseSpaces', event.target.checked)}
                  />
                  合并多余空格
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={options.removeBlankLines}
                    onChange={(event) => toggleOption('removeBlankLines', event.target.checked)}
                  />
                  删除空行
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={options.tabsToSpaces}
                    onChange={(event) => toggleOption('tabsToSpaces', event.target.checked)}
                  />
                  Tab 转空格
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={options.uniqueLines}
                    onChange={(event) => toggleOption('uniqueLines', event.target.checked)}
                  />
                  行去重
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={options.sortLines}
                    onChange={(event) => toggleOption('sortLines', event.target.checked)}
                  />
                  行排序
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={options.reverseLines}
                    onChange={(event) => toggleOption('reverseLines', event.target.checked)}
                  />
                  反转行顺序
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="whitespace-nowrap">Tab 宽度</span>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={options.spacesPerTab}
                    onChange={(event) =>
                      setOptions((current) => ({
                        ...current,
                        spacesPerTab: Math.max(1, Math.min(8, Number(event.target.value) || 1)),
                      }))
                    }
                    className="w-16 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-slate-900 dark:text-white"
                  />
                </label>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">输入</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                    {inputStats.characters.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">字符 / {inputStats.lines} 行</p>
                </div>
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/70 dark:bg-indigo-500/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-indigo-700 dark:text-indigo-300">输出</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                    {outputStats.characters.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">字符 / {outputStats.lines} 行</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <h4 className="font-medium text-slate-900 dark:text-white">格式化结果</h4>
                  <button
                    onClick={() => handleCopy(output)}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                  >
                    复制全部
                  </button>
                </div>
                <pre className="min-h-[24rem] max-h-[32rem] overflow-auto p-4 text-sm text-slate-900 dark:text-white whitespace-pre-wrap font-mono leading-6">
                  {output || '格式化后的文本会显示在这里'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
};

export default TextFormatter;
