import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';

interface AiFormatAssistantProps {
  scopeSummary: string;
  remainingCount?: number | null;
  isApplying: boolean;
  lastSummary?: string | null;
  lastProvider?: string | null;
  canUndo: boolean;
  canClear: boolean;
  onApply: (instruction: string) => Promise<void>;
  onUndo: () => void;
  onClear: (options?: { rollbackLastApply?: boolean }) => void;
}

export const AiFormatAssistant: React.FC<AiFormatAssistantProps> = ({
  scopeSummary,
  remainingCount,
  isApplying,
  lastSummary,
  lastProvider,
  canUndo,
  canClear,
  onApply,
  onUndo,
  onClear,
}) => {
  const { language, isGuest } = useAppContext();
  const [instruction, setInstruction] = useState('');
  const [error, setError] = useState<string | null>(null);

  const examplePrompts = language === 'zh'
    ? [
        '把一级标题改成黑体三号居中，正文改成仿宋小四，1.5 倍行距',
        '正文改成宋体小四，首行缩进 2 字符，段后间距 6 磅',
        '把当前选中的这几个字改成红色加粗',
        '代码块改成 Consolas，字号 10 磅，浅灰底',
        '整篇文档开启目录和页码，页边距保持镜像',
      ]
    : [
        'Make H1 centered SimHei 16pt, body FangSong 12pt, 1.5 line spacing',
        'Set body to SimSun 12pt with first-line indent and 6pt spacing after',
        'Make the selected text red and bold',
        'Use Consolas 10pt with light gray code blocks',
        'Enable table of contents, page numbers, and mirror margins',
      ];

  useEffect(() => {
    if (!isApplying) {
      setError(null);
    }
  }, [isApplying]);

  const handleApply = async () => {
    const value = instruction.trim();
    if (!value) {
      setError(language === 'zh' ? '请先输入格式需求' : 'Enter a formatting request first');
      return;
    }

    setError(null);
    await onApply(value);
    setInstruction('');
  };

  const handleClearClick = () => {
    onClear();
  };

  const remainingLabel =
    remainingCount == null
      ? language === 'zh'
        ? '剩余额度暂不可用'
        : 'Remaining quota unavailable'
      : language === 'zh'
        ? `今日剩余 ${remainingCount} 次`
        : `${remainingCount} uses left today`;

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
      <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-amber-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-amber-500 text-lg">auto_awesome</span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {language === 'zh' ? 'AI 格式助手' : 'AI Format Assistant'}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {language === 'zh'
            ? '用自然语言描述要修改的标题、正文、代码块或文档设置。'
            : 'Describe title, body, code, or document formatting in natural language.'}
        </p>
      </div>

      <div className="p-3 space-y-3">
        <div
          className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-2"
          data-ai-scope-summary={scopeSummary}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {language === 'zh' ? '当前作用域' : 'Current Scope'}
            </p>
            <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
              {scopeSummary}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
            {language === 'zh'
              ? 'AI 会根据当前作用域生成建议；如果要修改局部内容，请先在编辑区选中目标文本。'
              : 'AI generates suggestions based on the current scope. Select the target text first for local edits.'}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 px-2 py-0.5 text-[10px] font-semibold">
              {language === 'zh' ? '当前作用域已接入' : 'Scope connected'}
            </span>
            <span className="rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 text-[10px] font-semibold">
              {language === 'zh' ? '局部或整篇文档' : 'Scoped or whole document'}
            </span>
            <span className="rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 text-[10px] font-semibold">
              {language === 'zh' ? '支持回退' : 'Fallback supported'}
            </span>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {language === 'zh' ? '额度' : 'Quota'}
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-200">{remainingLabel}</p>
          </div>
          {isGuest && (
            <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 px-2 py-1 text-[10px] font-semibold">
              {language === 'zh' ? '游客每日 10 次' : 'Guest 10/day'}
            </span>
          )}
        </div>

        <div>
          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            rows={5}
            placeholder={
              language === 'zh'
                ? '例如：把一级标题改成黑体三号居中，正文改成仿宋四号，代码块灰底。'
                : 'Example: Make H1 centered SimHei 16pt, body FangSong 12pt, code blocks with gray background.'
            }
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/20 resize-none"
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            {language === 'zh' ? '推荐指令' : 'Suggested Prompts'}
          </p>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInstruction(prompt)}
                className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-1.5 text-[11px] text-slate-700 dark:text-slate-200 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying || remainingCount === 0}
            className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-3 py-2 transition-colors"
          >
            {isApplying
              ? language === 'zh'
                ? '应用中...'
                : 'Applying...'
              : language === 'zh'
                ? '应用 AI 格式'
                : 'Apply AI Format'}
          </button>
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo || isApplying}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed"
          >
            {language === 'zh' ? '撤销上次' : 'Undo'}
          </button>
          <button
            type="button"
            onClick={handleClearClick}
            disabled={!canClear || isApplying}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed"
          >
            {language === 'zh' ? '清空 AI' : 'Clear AI'}
          </button>
        </div>

        {(lastSummary || lastProvider) && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-1">
              {language === 'zh' ? '最近一次 AI 结果' : 'Latest AI Result'}
            </p>
            {lastSummary && <p className="text-xs text-emerald-900 dark:text-emerald-100">{lastSummary}</p>}
            {lastProvider && (
              <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                {language === 'zh' ? '提供商' : 'Provider'}: {lastProvider}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
