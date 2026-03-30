import React, { useMemo, useState } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

type DiffRowType = 'equal' | 'insert' | 'delete';

interface DiffRow {
  type: DiffRowType;
  oldLine?: string;
  newLine?: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface DiffOptions {
  ignoreCase: boolean;
  ignoreWhitespace: boolean;
  ignoreBlankLines: boolean;
}

const normalizeForDiff = (value: string, options: DiffOptions) => {
  let normalized = value.replace(/\r\n?/g, '\n');

  if (options.ignoreBlankLines) {
    normalized = normalized
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .join('\n');
  }

  return normalized
    .split('\n')
    .map((line) => {
      let current = line;
      if (options.ignoreWhitespace) {
        current = current.replace(/\s+/g, ' ').trim();
      }
      if (options.ignoreCase) {
        current = current.toLowerCase();
      }
      return current;
    });
};

const splitLines = (value: string) => value.replace(/\r\n?/g, '\n').split('\n');

export const buildTextDiffRows = (
  oldText: string,
  newText: string,
  options: DiffOptions
): DiffRow[] => {
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  const normalizedOld = normalizeForDiff(oldText, options);
  const normalizedNew = normalizeForDiff(newText, options);

  const oldLength = normalizedOld.length;
  const newLength = normalizedNew.length;
  const dp = Array.from({ length: oldLength + 1 }, () => Array<number>(newLength + 1).fill(0));

  for (let i = oldLength - 1; i >= 0; i -= 1) {
    for (let j = newLength - 1; j >= 0; j -= 1) {
      dp[i][j] = normalizedOld[i] === normalizedNew[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  let oldLineNumber = 1;
  let newLineNumber = 1;

  while (i < oldLength && j < newLength) {
    if (normalizedOld[i] === normalizedNew[j]) {
      rows.push({
        type: 'equal',
        oldLine: oldLines[i],
        newLine: newLines[j],
        oldLineNumber,
        newLineNumber,
      });
      i += 1;
      j += 1;
      oldLineNumber += 1;
      newLineNumber += 1;
      continue;
    }

    if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({
        type: 'delete',
        oldLine: oldLines[i],
        oldLineNumber,
      });
      i += 1;
      oldLineNumber += 1;
      continue;
    }

    rows.push({
      type: 'insert',
      newLine: newLines[j],
      newLineNumber,
    });
    j += 1;
    newLineNumber += 1;
  }

  while (i < oldLength) {
    rows.push({
      type: 'delete',
      oldLine: oldLines[i],
      oldLineNumber,
    });
    i += 1;
    oldLineNumber += 1;
  }

  while (j < newLength) {
    rows.push({
      type: 'insert',
      newLine: newLines[j],
      newLineNumber,
    });
    j += 1;
    newLineNumber += 1;
  }

  return rows;
};

export const buildDiffSummary = (rows: DiffRow[]) => {
  let insertions = 0;
  let deletions = 0;
  let equal = 0;

  rows.forEach((row) => {
    if (row.type === 'insert') {
      insertions += 1;
    } else if (row.type === 'delete') {
      deletions += 1;
    } else {
      equal += 1;
    }
  });

  return {
    insertions,
    deletions,
    equal,
    total: rows.length,
  };
};

export const TextDiff: React.FC = () => {
  const { language, isGuest, checkGuestUsage, recordGuestToolUsage } = useAppContext();
  const [oldText, setOldText] = useState('');
  const [newText, setNewText] = useState('');
  const [hasRecordedUsage, setHasRecordedUsage] = useState(false);
  const [options, setOptions] = useState<DiffOptions>({
    ignoreCase: false,
    ignoreWhitespace: false,
    ignoreBlankLines: false,
  });

  const ensureUsage = (nextValue: string) => {
    if (isGuest && !hasRecordedUsage && nextValue.length > 0 && oldText.length === 0 && newText.length === 0) {
      if (!checkGuestUsage()) {
        return false;
      }
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }
    return true;
  };

  const rows = useMemo(
    () => buildTextDiffRows(oldText, newText, options),
    [newText, oldText, options]
  );
  const summary = useMemo(() => buildDiffSummary(rows), [rows]);

  const handleCopy = async () => {
    const text = rows
      .map((row) => {
        if (row.type === 'equal') {
          return `  ${row.oldLine ?? ''}`;
        }
        if (row.type === 'delete') {
          return `- ${row.oldLine ?? ''}`;
        }
        return `+ ${row.newLine ?? ''}`;
      })
      .join('\n');
    await navigator.clipboard.writeText(text);
  };

  const handleSwap = () => {
    setOldText(newText);
    setNewText(oldText);
  };

  const renderRow = (row: DiffRow, index: number) => {
    const baseClass = 'grid grid-cols-[72px_1fr_1fr] gap-3 px-4 py-2 text-sm border-b border-slate-200 dark:border-slate-700';
    const rowClass =
      row.type === 'equal'
        ? 'bg-white dark:bg-slate-900/40 text-slate-800 dark:text-slate-200'
        : row.type === 'delete'
          ? 'bg-rose-50/80 dark:bg-rose-500/10 text-rose-700 dark:text-rose-200'
          : 'bg-emerald-50/80 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';

    return (
      <div key={`${row.type}-${index}`} className={`${baseClass} ${rowClass}`}>
        <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {row.oldLineNumber ?? '-'} / {row.newLineNumber ?? '-'}
        </div>
        <div className="font-mono whitespace-pre-wrap break-words">
          {row.type !== 'insert' ? row.oldLine : ''}
        </div>
        <div className="font-mono whitespace-pre-wrap break-words">
          {row.type !== 'delete' ? row.newLine : ''}
        </div>
      </div>
    );
  };

  return (
    <ToolLayout toolId="text-diff">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">文本对比</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                逐行比较两段文本，输出删除、插入和保留内容
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSwap}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-indigo-300 transition-colors"
              >
                交换两侧
              </button>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                复制 diff
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-0">
            <div className="p-5 border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-700 space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                原文
              </label>
              <textarea
                value={oldText}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (!ensureUsage(nextValue)) {
                    return;
                  }
                  setOldText(nextValue);
                }}
                placeholder="输入原始文本..."
                className="w-full h-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 font-mono text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                新文
              </label>
              <textarea
                value={newText}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (!ensureUsage(nextValue)) {
                    return;
                  }
                  setNewText(nextValue);
                }}
                placeholder="输入修改后的文本..."
                className="w-full h-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 font-mono text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={options.ignoreWhitespace}
                    onChange={(event) => setOptions((current) => ({ ...current, ignoreWhitespace: event.target.checked }))}
                  />
                  忽略空白差异
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={options.ignoreCase}
                    onChange={(event) => setOptions((current) => ({ ...current, ignoreCase: event.target.checked }))}
                  />
                  忽略大小写
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={options.ignoreBlankLines}
                    onChange={(event) => setOptions((current) => ({ ...current, ignoreBlankLines: event.target.checked }))}
                  />
                  忽略空行
                </label>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-500/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300">删除</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{summary.deletions}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-500/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">插入</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{summary.insertions}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">保留</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{summary.equal}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 grid grid-cols-[72px_1fr_1fr] gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <div>行号</div>
                  <div>原文</div>
                  <div>新文</div>
                </div>
                <div className="max-h-[40rem] overflow-auto">
                  {rows.length > 0 ? (
                    rows.map(renderRow)
                  ) : (
                    <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                      输入两段文本后会显示差异结果
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/70 dark:bg-indigo-500/10 p-4 text-sm text-slate-700 dark:text-slate-200">
                {language === 'zh'
                  ? '支持逐行对比，适合快速查看新增、删除和顺序变化。'
                  : 'Line-by-line diff is useful for quick review of additions, deletions, and reordering.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
};

export default TextDiff;
