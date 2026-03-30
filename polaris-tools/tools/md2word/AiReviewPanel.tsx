import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { getPendingAiStyleChangeGroups, type PendingAiReviewState } from './formatting/aiReview';

interface AiReviewPanelProps {
  review: PendingAiReviewState;
  onToggleSegment: (segmentId: string) => void;
  onToggleStyleChange: (segmentId: string, changeId: string) => void;
  onApply: () => void;
  onClearSelections: () => void;
  onBack: () => void;
  selectedCount: number;
  isApplying: boolean;
  hoveredSegmentId?: string | null;
  onHoverSegment?: (segmentId: string | null) => void;
}

export const AiReviewPanel: React.FC<AiReviewPanelProps> = ({
  review,
  onToggleSegment,
  onToggleStyleChange,
  onApply,
  onClearSelections,
  onBack,
  selectedCount,
  isApplying,
  hoveredSegmentId,
  onHoverSegment,
}) => {
  const { language } = useAppContext();
  const hasSelectedChanges = selectedCount > 0;

  return (
    <div className="border border-amber-200 dark:border-amber-500/20 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
      <div className="p-3 border-b border-amber-200 dark:border-amber-500/20 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-amber-500 text-lg">preview</span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {language === 'zh' ? 'AI 确认模式' : 'AI Review Mode'}
          </span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-300">
          {review.summary}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          {review.providerUsed && (
            <span>{language === 'zh' ? `提供商：${review.providerUsed}` : `Provider: ${review.providerUsed}`}</span>
          )}
          {review.remainingCount != null && (
            <span>
              {language === 'zh' ? `今日剩余 ${review.remainingCount} 次` : `${review.remainingCount} uses left today`}
            </span>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            {language === 'zh' ? '本次指令' : 'Instruction'}
          </p>
          <p className="text-xs text-slate-700 dark:text-slate-200">{review.instruction}</p>
        </div>

        <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            {language === 'zh' ? '待应用修改' : 'Pending Changes'}
          </p>
          <p className="text-xs text-slate-700 dark:text-slate-200">
            {language === 'zh'
              ? `当前选中 ${selectedCount} 条样式变化`
              : `${selectedCount} style changes selected`}
          </p>
        </div>

        {review.unmatchedSegmentCount > 0 && (
          <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10 p-3">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              {language === 'zh'
                ? `AI 本次只返回了 ${review.segments.length}/${review.totalSegmentCount} 个片段的候选修改，其余片段保持不变。`
                : `AI returned proposed changes for ${review.segments.length}/${review.totalSegmentCount} segments. The rest will stay unchanged.`}
            </p>
          </div>
        )}

        {!hasSelectedChanges && (
          <div className="rounded-md border border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 p-3">
            <p className="text-xs text-rose-900 dark:text-rose-100">
              {language === 'zh'
                ? '当前没有选中的修改项。你可以重新勾选某些样式变化，或返回编辑模式。'
                : 'No changes are currently selected. Re-select some style changes or go back to editing.'}
            </p>
          </div>
        )}

        <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
          {review.segments.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {language === 'zh' ? '当前没有可确认的片段' : 'No reviewable segments'}
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {language === 'zh'
                  ? '请返回编辑模式重新发起 AI 分析。'
                  : 'Go back to editing mode and run AI analysis again.'}
              </p>
            </div>
          )}

          {review.segments.map((segment) => (
            <div
              key={segment.segmentId}
              data-review-segment-id={segment.segmentId}
              onMouseEnter={() => onHoverSegment?.(segment.segmentId)}
              onMouseLeave={() => onHoverSegment?.(null)}
              className={`rounded-lg border transition-colors ${
                hoveredSegmentId === segment.segmentId
                  ? 'border-amber-400 bg-amber-50/70 dark:border-amber-400 dark:bg-amber-500/10'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40'
              }`}
            >
              <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={segment.selected}
                    onChange={() => onToggleSegment(segment.segmentId)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      {segment.textPreview}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {segment.selectedText}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {segment.blockType}
                    </p>
                  </div>
                </label>
              </div>

              <div className="p-3 space-y-2">
                {getPendingAiStyleChangeGroups(segment).map((group) => (
                  <div key={group.key} className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {group.label}
                    </p>
                    {group.changes.map((change) => (
                      <label
                        key={change.changeId}
                        className="flex items-start gap-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={change.selected}
                          onChange={() => onToggleStyleChange(segment.segmentId, change.changeId)}
                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="min-w-0">
                          <p className="text-xs text-slate-800 dark:text-slate-100">{change.label}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {change.target}.{change.property}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                ))}
                {segment.selected && segment.styleChanges.every((change) => !change.selected) && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'zh'
                      ? '该片段当前不会应用任何修改。'
                      : 'No changes will be applied to this segment.'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onApply}
            disabled={selectedCount === 0 || isApplying}
            className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-3 py-2 transition-colors"
          >
            {isApplying
              ? language === 'zh'
                ? '应用中...'
                : 'Applying...'
              : language === 'zh'
                ? '应用选中修改'
                : 'Apply Selected'}
          </button>
          <button
            type="button"
            onClick={onClearSelections}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            {language === 'zh' ? '全部取消' : 'Clear All'}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            {language === 'zh' ? '返回编辑' : 'Back'}
          </button>
        </div>
      </div>
    </div>
  );
};
