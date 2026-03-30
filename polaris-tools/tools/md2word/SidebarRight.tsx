import React, { useState } from 'react';
import {
  DocumentPresentationState,
  ExportFormat,
} from './types';
import { useAppContext } from '../../context/AppContext';
import { ToastType } from '../../components/Toast';
import { AiFormatAssistant } from './AiFormatAssistant';
import { AiReviewPanel } from './AiReviewPanel';
import type { AppliedAiFormattingSummary, PendingAiReviewState } from './formatting/aiReview';
import {
  buildSuperDocStructureGuidanceItems,
  buildSuperDocStructureSummaryText,
  shouldPreferSuperDocDocxExport,
  type SuperDocStructureSummary,
} from './superdocStructure';

type SidebarTabId = 'ai' | 'export';

interface SuperDocPendingReviewCardState {
  instruction: string;
  scopeSummary: string;
  summary: string | null;
  provider: string | null;
  bridgeReady: boolean;
  candidateSummary: AppliedAiFormattingSummary;
}

interface SidebarRightProps {
  onExport: (format: ExportFormat) => void;
  showToast: (message: string, type: ToastType) => void;
  previewEngine: 'superdoc' | 'html';
  superDocStructureSummary: SuperDocStructureSummary;
  onSwitchToHtmlFallback: () => void;
  onExportSettingsChange?: (settings: {
    imageQuality: number;
    includeTableOfContents: boolean;
    pageNumbers: boolean;
    mirrorMargins: boolean;
  }) => void;
  onApplyAiFormatting?: (instruction: string) => Promise<void>;
  onUndoAi?: () => void;
  onClearAi?: (options?: { rollbackLastApply?: boolean }) => void;
  aiApplying?: boolean;
  aiRemainingCount?: number | null;
  aiLastSummary?: string | null;
  aiLastProvider?: string | null;
  aiScopeSummary?: string;
  canUndoAi?: boolean;
  canClearAi?: boolean;
  aiPendingReview?: PendingAiReviewState | null;
  superDocPendingReview?: SuperDocPendingReviewCardState | null;
  onApplySuperDocPendingReview?: () => void;
  onCancelSuperDocPendingReview?: () => void;
  onRevertSuperDocLastAppliedReview?: () => void;
  canRevertSuperDocLastAppliedReview?: boolean;
  isApplyingSuperDocPendingReview?: boolean;
  isRevertingSuperDocLastAppliedReview?: boolean;
  aiPendingSelectedCount?: number;
  onTogglePendingAiSegment?: (segmentId: string) => void;
  onTogglePendingAiStyleChange?: (segmentId: string, changeId: string) => void;
  onApplyPendingAiReview?: () => void;
  onClearPendingAiSelections?: () => void;
  onCancelPendingAiReview?: () => void;
  aiHoveredSegmentId?: string | null;
  onHoverPendingAiSegment?: (segmentId: string | null) => void;
  aiAppliedSummary?: AppliedAiFormattingSummary | null;
  activeAiAppliedDetailId?: string | null;
  onSelectAiAppliedDetail?: (detailId: string) => void;
  onHoverAiAppliedDetail?: (detailId: string | null) => void;
  onRevertAiAppliedDetail?: (detailId: string) => void;
  aiAppliedSummaryAnchorId?: string;
  highlightAiAppliedSummary?: boolean;
  documentPresentation: DocumentPresentationState;
  onDocumentPresentationChange: (state: DocumentPresentationState) => void;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({
  onExport,
  showToast,
  previewEngine,
  superDocStructureSummary = {
    hasDetectedStructures: false,
    highestSupportRisk: null,
    items: [],
  },
  onSwitchToHtmlFallback,
  onExportSettingsChange,
  onApplyAiFormatting,
  onUndoAi,
  onClearAi,
  aiApplying = false,
  aiRemainingCount,
  aiLastSummary,
  aiLastProvider,
  aiScopeSummary = '作用域：整篇文档',
  canUndoAi = false,
  canClearAi = false,
  aiPendingReview = null,
  superDocPendingReview = null,
  onApplySuperDocPendingReview,
  onCancelSuperDocPendingReview,
  onRevertSuperDocLastAppliedReview,
  canRevertSuperDocLastAppliedReview = false,
  isApplyingSuperDocPendingReview = false,
  isRevertingSuperDocLastAppliedReview = false,
  aiPendingSelectedCount = 0,
  onTogglePendingAiSegment,
  onTogglePendingAiStyleChange,
  onApplyPendingAiReview,
  onClearPendingAiSelections,
  onCancelPendingAiReview,
  aiHoveredSegmentId,
  onHoverPendingAiSegment,
  aiAppliedSummary,
  activeAiAppliedDetailId = null,
  onSelectAiAppliedDetail,
  onHoverAiAppliedDetail,
  onRevertAiAppliedDetail,
  aiAppliedSummaryAnchorId,
  highlightAiAppliedSummary = false,
  documentPresentation,
  onDocumentPresentationChange,
}) => {
  const { t, language } = useAppContext();
  const [activeTab, setActiveTab] = useState<SidebarTabId>('ai');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('docx');
  const [imageQuality, setImageQuality] = useState(85);
  const [isAiSummaryExpanded, setIsAiSummaryExpanded] = useState(false);
  const pageSettings = documentPresentation.pageSettings;
  const superDocStructureSummaryText = React.useMemo(
    () => buildSuperDocStructureSummaryText(superDocStructureSummary, language === 'zh' ? 'zh' : 'en'),
    [language, superDocStructureSummary]
  );
  const superDocGuidanceItems = React.useMemo(
    () => buildSuperDocStructureGuidanceItems(superDocStructureSummary, language === 'zh' ? 'zh' : 'en'),
    [language, superDocStructureSummary]
  );
  const superDocPrimaryGuidanceItem = superDocGuidanceItems[0] ?? null;
  const shouldPreferSuperDocDocx = React.useMemo(
    () => shouldPreferSuperDocDocxExport(superDocStructureSummary),
    [superDocStructureSummary]
  );
  const superDocExportGuidance = React.useMemo(() => {
    if (previewEngine !== 'superdoc' || !superDocStructureSummary.hasDetectedStructures) {
      return null;
    }

    if (shouldPreferSuperDocDocx) {
      return {
        strategy: 'superdoc' as const,
        title: language === 'zh' ? 'DOCX 导出建议' : 'DOCX export guidance',
        description:
          language === 'zh'
            ? '当前文档包含结构化内容，但仍可优先使用 SuperDoc 路径导出 DOCX。导出后建议复核表格、引用等复杂样式。'
            : 'Structured content was detected, but DOCX can still prefer the SuperDoc export path. Review tables, references, and other complex styling after export.',
        actionLabel: language === 'zh' ? '继续使用 SuperDoc 导出' : 'Keep using SuperDoc export',
      };
    }

    return {
      strategy: 'html-fallback' as const,
      title: language === 'zh' ? 'DOCX 导出建议' : 'DOCX export guidance',
      description:
        language === 'zh'
          ? '当前文档含公式或脚注等复杂结构。DOCX 导出会优先走本地 HTML 路径，以降低版式偏移。'
          : 'Complex structures such as formulas or footnotes were detected. DOCX export will prefer the local HTML path to reduce layout drift.',
      actionLabel: language === 'zh' ? '切到 HTML 回退复核' : 'Switch to HTML fallback for review',
    };
  }, [language, previewEngine, shouldPreferSuperDocDocx, superDocStructureSummary.hasDetectedStructures]);

  React.useEffect(() => {
    if (onExportSettingsChange) {
      onExportSettingsChange({
        imageQuality,
        includeTableOfContents: false,
        pageNumbers: pageSettings.showPageNumbers,
        mirrorMargins: pageSettings.mirrorMargins,
      });
    }
  }, [
    imageQuality,
    onExportSettingsChange,
    pageSettings.mirrorMargins,
    pageSettings.showPageNumbers,
  ]);

  React.useEffect(() => {
    if (!aiAppliedSummary || aiAppliedSummary.styleChangeCount === 0) {
      setIsAiSummaryExpanded(false);
    }
  }, [aiAppliedSummary]);

  React.useEffect(() => {
    if (aiPendingReview || superDocPendingReview) {
      setActiveTab('ai');
    }
  }, [aiPendingReview, superDocPendingReview]);

  const handleExport = () => {
    onExport(exportFormat);
  };

  const updatePageSettings = <K extends keyof DocumentPresentationState['pageSettings']>(
    key: K,
    value: DocumentPresentationState['pageSettings'][K]
  ) => {
    onDocumentPresentationChange({
      ...documentPresentation,
      pageSettings: {
        ...pageSettings,
        [key]: value,
      },
    });
  };

  const tabs: Array<{ id: SidebarTabId; label: string; icon: string }> = [
    { id: 'ai', label: 'AI', icon: 'auto_awesome' },
    { id: 'export', label: language === 'zh' ? '导出' : 'Export', icon: 'download' },
  ];

  const getSuperDocBlockSubtypeLabel = React.useCallback(
    (detail: AppliedAiFormattingSummary['details'][number]) => {
      const searchableText = `${detail.title} ${detail.description}`.toLowerCase();
      const previewTarget = detail.previewTarget as { blockType?: string; fallbackBlockType?: string } | null;
      const blockTypeHint = previewTarget?.blockType ?? previewTarget?.fallbackBlockType ?? '';
      const normalizedHint = blockTypeHint.toLowerCase();

      if (/code|代码/.test(searchableText) || normalizedHint.includes('code')) {
        return language === 'zh' ? '代码块' : 'Code block';
      }
      if (/quote|blockquote|引用/.test(searchableText) || normalizedHint.includes('quote')) {
        return language === 'zh' ? '引用块' : 'Blockquote';
      }
      if (/list|列表|li\b/.test(searchableText) || normalizedHint.includes('list')) {
        return language === 'zh' ? '列表块' : 'List block';
      }
      if (/paragraph|正文|段落/.test(searchableText) || normalizedHint.includes('paragraph')) {
        return language === 'zh' ? '段落块' : 'Paragraph';
      }
      if (/heading|标题/.test(searchableText) || normalizedHint.includes('heading')) {
        return language === 'zh' ? '标题块' : 'Heading block';
      }

      return language === 'zh' ? '块级样式' : 'Block style';
    },
    [language]
  );

  const superDocReviewGroups = React.useMemo(() => {
    if (!superDocPendingReview) {
      return null;
    }

    const groups: Array<{
      key: 'text' | 'block' | 'document';
      title: string;
      description: string;
      items: AppliedAiFormattingSummary['details'];
    }> = [
      {
        key: 'text',
        title: language === 'zh' ? '当前选区文本样式' : 'Current selection text styles',
        description:
          language === 'zh'
            ? '这些修改作用于当前选中的文字范围，例如字体、颜色、加粗或斜体。'
            : 'These changes target the currently selected text, such as font, color, bold, or italic.',
        items: [],
      },
      {
        key: 'block',
        title: language === 'zh' ? '当前块样式（整块应用）' : 'Current block styles (block-level)',
        description:
          language === 'zh'
            ? '这些修改会整体作用于当前块，而不是只改选中文字。块类型会尽量标成段落、引用、列表或代码块，方便你定位。'
            : 'These changes apply to the entire current block, not just the selected text. Block types are labeled as paragraph, blockquote, list, or code block when possible.',
        items: [],
      },
      {
        key: 'document',
        title: language === 'zh' ? '文档级设置' : 'Document-level settings',
        description:
          language === 'zh'
            ? '这些修改影响整篇文档设置，例如纸张、目录或页码。'
            : 'These changes affect document-wide settings, such as page size, TOC, or page numbers.',
        items: [],
      },
    ];

    for (const detail of superDocPendingReview.candidateSummary.details) {
      const previewKind = detail.previewTarget?.kind;
      const isDocument =
        previewKind === 'document' || detail.revertAction.kind === 'document-patch';
      const isBlock =
        previewKind === 'block' ||
        (!isDocument &&
          /标题|段落|块|heading|paragraph|block/i.test(`${detail.title} ${detail.description}`));

      if (isDocument) {
        groups[2].items.push(detail);
      } else if (isBlock) {
        groups[1].items.push(detail);
      } else {
        groups[0].items.push(detail);
      }
    }

    return groups.filter((group) => group.items.length > 0);
  }, [language, superDocPendingReview]);

  return (
    <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col shrink-0 z-20 h-full overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-lg">menu_book</span>
          <h2 className="font-bold text-slate-900 dark:text-white text-sm">
            {language === 'zh' ? 'AI 文档助手' : 'AI Document Assistant'}
          </h2>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          {language === 'zh'
            ? 'AI 格式助手会根据当前作用域作用于预览与导出结果。'
            : 'The AI format assistant applies formatting based on the current scope.'}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {language === 'zh' ? '当前作用域' : 'Current scope'}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {aiScopeSummary}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-400/10 dark:text-indigo-200'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-4">
          {activeTab === 'ai' &&
            (superDocPendingReview ? (
              <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {language === 'zh' ? 'SuperDoc 确认模式' : 'SuperDoc Review Mode'}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {language === 'zh'
                        ? '当前结果已切换到 SuperDoc 确认流。面板会区分“当前选区文本样式”和“当前块样式”；块级样式会按整个块应用，并尽量标出段落、引用、列表或代码块。'
                        : 'The current result is staged in the SuperDoc review flow. The panel separates selected text styles from block styles; block styles apply to the whole block and are labeled as paragraph, blockquote, list, or code block when possible.'}
                    </p>
                  </div>
                  <span className="rounded-full border border-indigo-200 bg-white px-2 py-1 text-[10px] font-semibold text-indigo-700 dark:border-indigo-400/20 dark:bg-slate-900/20 dark:text-indigo-200">
                    {language === 'zh' ? 'SuperDoc' : 'SuperDoc'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/20">
                    <p className="font-semibold text-slate-500 dark:text-slate-400">
                      {language === 'zh' ? '当前作用域' : 'Current scope'}
                    </p>
                    <p className="mt-1 text-slate-900 dark:text-white">
                      {superDocPendingReview.scopeSummary || aiScopeSummary}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/20">
                    <p className="font-semibold text-slate-500 dark:text-slate-400">
                      {language === 'zh' ? '桥接状态' : 'Bridge status'}
                    </p>
                    <p className="mt-1 text-slate-900 dark:text-white">
                      {superDocPendingReview.bridgeReady
                        ? language === 'zh'
                          ? '已连接'
                          : 'Connected'
                        : language === 'zh'
                          ? '等待接入'
                          : 'Waiting for bridge'}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/20">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {language === 'zh' ? '本次指令' : 'Instruction'}
                  </p>
                  <p className="mt-2 text-sm text-slate-900 dark:text-white">
                    {superDocPendingReview.instruction}
                  </p>
                  {(superDocPendingReview.summary || superDocPendingReview.provider) && (
                    <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {superDocPendingReview.summary && (
                        <p>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {language === 'zh' ? '摘要：' : 'Summary: '}
                          </span>
                          {superDocPendingReview.summary}
                        </p>
                      )}
                      {superDocPendingReview.provider && (
                        <p>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {language === 'zh' ? '模型：' : 'Provider: '}
                          </span>
                          {superDocPendingReview.provider}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-slate-200 bg-white/80 px-2 py-3 dark:border-slate-700 dark:bg-slate-900/20">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {superDocPendingReview.candidateSummary.scopeCount}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {language === 'zh' ? '作用范围' : 'Scopes'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white/80 px-2 py-3 dark:border-slate-700 dark:bg-slate-900/20">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {superDocPendingReview.candidateSummary.styleChangeCount}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {language === 'zh' ? '样式变化' : 'Changes'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white/80 px-2 py-3 dark:border-slate-700 dark:bg-slate-900/20">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {superDocPendingReview.candidateSummary.hasDocumentLevelChanges ? '1' : '0'}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {language === 'zh' ? '文档设置' : 'Doc settings'}
                    </p>
                  </div>
                </div>

                {superDocReviewGroups && superDocReviewGroups.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {language === 'zh' ? '待应用修改' : 'Pending changes'}
                    </p>
                    {superDocReviewGroups.map((group) => (
                      <div
                        key={group.key}
                        className="rounded-lg border border-slate-200 bg-white/70 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/20"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">
                              {group.title}
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                              {group.description}
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {language === 'zh' ? `${group.items.length} 组` : `${group.items.length} items`}
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {group.items.map((detail) => (
                            <div
                              key={detail.id}
                              className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/10"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                    {detail.title}
                                  </p>
                                  <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                    {group.key === 'block'
                                      ? getSuperDocBlockSubtypeLabel(detail)
                                      : group.key === 'text'
                                        ? language === 'zh'
                                          ? '选区文本'
                                          : 'Selection text'
                                        : language === 'zh'
                                          ? '文档设置'
                                          : 'Document'}
                                  </span>
                                </div>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {language === 'zh'
                                    ? `${detail.changeCount} 项`
                                    : `${detail.changeCount} changes`}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] leading-5 text-slate-600 dark:text-slate-300">
                                {detail.description}
                              </p>
                              {group.key === 'block' && (
                                <p className="mt-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-300">
                                  {language === 'zh'
                                    ? `将按${getSuperDocBlockSubtypeLabel(detail)}整体应用`
                                    : `Applied to the entire ${getSuperDocBlockSubtypeLabel(detail).toLowerCase()}`}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onApplySuperDocPendingReview}
                    disabled={!onApplySuperDocPendingReview || isApplyingSuperDocPendingReview}
                    className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-base">task_alt</span>
                    <span>
                      {isApplyingSuperDocPendingReview
                        ? language === 'zh'
                          ? '应用中...'
                          : 'Applying...'
                        : language === 'zh'
                          ? '应用到 SuperDoc'
                          : 'Apply to SuperDoc'}
                    </span>
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onCancelSuperDocPendingReview}
                      disabled={!onCancelSuperDocPendingReview || isApplyingSuperDocPendingReview}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {language === 'zh' ? '返回编辑' : 'Back to editing'}
                    </button>
                    <button
                      type="button"
                      onClick={onRevertSuperDocLastAppliedReview}
                      disabled={
                        !onRevertSuperDocLastAppliedReview ||
                        !canRevertSuperDocLastAppliedReview ||
                        isRevertingSuperDocLastAppliedReview
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {isRevertingSuperDocLastAppliedReview
                        ? language === 'zh'
                          ? '回滚中...'
                          : 'Reverting...'
                        : language === 'zh'
                          ? '回滚上次应用'
                          : 'Revert last apply'}
                    </button>
                  </div>
                </div>
              </div>
            ) : aiPendingReview &&
              onTogglePendingAiSegment &&
              onTogglePendingAiStyleChange &&
              onApplyPendingAiReview &&
              onClearPendingAiSelections &&
              onCancelPendingAiReview ? (
              <AiReviewPanel
                review={aiPendingReview}
                selectedCount={aiPendingSelectedCount}
                isApplying={aiApplying}
                hoveredSegmentId={aiHoveredSegmentId}
                onToggleSegment={onTogglePendingAiSegment}
                onToggleStyleChange={onTogglePendingAiStyleChange}
                onApply={onApplyPendingAiReview}
                onClearSelections={onClearPendingAiSelections}
                onBack={onCancelPendingAiReview}
                onHoverSegment={onHoverPendingAiSegment}
              />
            ) : onApplyAiFormatting && onUndoAi && onClearAi ? (
              <>
              <AiFormatAssistant
                scopeSummary={aiScopeSummary}
                remainingCount={aiRemainingCount}
                isApplying={aiApplying}
                  lastSummary={aiLastSummary}
                  lastProvider={aiLastProvider}
                  canUndo={canUndoAi}
                  canClear={canClearAi}
                  onApply={onApplyAiFormatting}
                  onUndo={onUndoAi}
                  onClear={onClearAi}
                />
              </>
            ) : null)}

          {activeTab === 'export' && !aiPendingReview && !superDocPendingReview && (
            <>
              {superDocExportGuidance && (
                <div
                  data-superdoc-export-guidance="true"
                  data-export-strategy={superDocExportGuidance.strategy}
                  className={`mb-3 rounded-lg border p-3 ${
                    superDocExportGuidance.strategy === 'html-fallback'
                      ? 'border-amber-200 dark:border-amber-400/20 bg-amber-50/90 dark:bg-amber-500/10'
                      : 'border-indigo-200 dark:border-indigo-400/20 bg-indigo-50/90 dark:bg-indigo-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {superDocExportGuidance.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        {superDocExportGuidance.description}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                        superDocExportGuidance.strategy === 'html-fallback'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-200'
                      }`}
                    >
                      {superDocExportGuidance.strategy === 'html-fallback'
                        ? language === 'zh'
                          ? '建议 HTML'
                          : 'Prefer HTML'
                        : language === 'zh'
                          ? '优先 SuperDoc'
                          : 'Prefer SuperDoc'}
                    </span>
                  </div>
                  {superDocStructureSummaryText.featureLabels.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {superDocStructureSummaryText.featureLabels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-slate-200/80 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-700/70 dark:bg-slate-950/10 dark:text-slate-200"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  {superDocPrimaryGuidanceItem && (
                    <p
                      className="mt-3 text-[11px] leading-5 text-slate-600 dark:text-slate-300"
                      data-superdoc-export-guidance-detail="true"
                    >
                      <span className="font-semibold">
                        {superDocPrimaryGuidanceItem.label}
                        {language === 'zh' ? '：' : ': '}
                      </span>
                      {superDocPrimaryGuidanceItem.recommendedAction}
                    </p>
                  )}
                  {superDocExportGuidance.strategy === 'html-fallback' && (
                    <button
                      type="button"
                      onClick={onSwitchToHtmlFallback}
                      className="mt-3 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-50 dark:border-amber-400/20 dark:bg-slate-900/20 dark:text-amber-200 dark:hover:bg-amber-400/10"
                    >
                      {superDocExportGuidance.actionLabel}
                    </button>
                  )}
                </div>
              )}
              {aiAppliedSummary && aiAppliedSummary.styleChangeCount > 0 && (
                <div
                  id={aiAppliedSummaryAnchorId}
                  data-ai-export-summary-card="true"
                  data-highlighted={highlightAiAppliedSummary ? 'true' : 'false'}
                  className={`rounded-lg border p-3 transition-all duration-300 ${
                    highlightAiAppliedSummary
                      ? 'border-emerald-400 dark:border-emerald-300 bg-emerald-100 dark:bg-emerald-400/20 ring-2 ring-emerald-300/70 dark:ring-emerald-300/30 shadow-lg shadow-emerald-300/20'
                      : 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-300 text-lg">
                      task_alt
                    </span>
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                      {language === 'zh' ? '导出前摘要' : 'Export Summary'}
                    </p>
                  </div>
                  <p className="text-xs text-emerald-900 dark:text-emerald-100">
                    {language === 'zh'
                      ? `本次导出将包含 ${aiAppliedSummary.scopeCount} 个 AI 作用范围、${aiAppliedSummary.styleChangeCount} 条样式变化`
                      : `This export includes ${aiAppliedSummary.scopeCount} AI scopes and ${aiAppliedSummary.styleChangeCount} style changes.`}
                  </p>
                  {aiAppliedSummary.hasDocumentLevelChanges && (
                    <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                      {language === 'zh' ? '包含整篇文档级设置' : 'Includes document-level settings'}
                    </p>
                  )}
                  {aiAppliedSummary.details.length > 0 && (
                    <div className="mt-3">
                      <button
                        type="button"
                        aria-label={language === 'zh' ? '查看具体修改项' : 'View detailed changes'}
                        onClick={() => setIsAiSummaryExpanded((current) => !current)}
                        className="flex w-full items-center justify-between rounded-md border border-emerald-200/70 dark:border-emerald-400/20 bg-white/60 dark:bg-slate-900/10 px-3 py-2 text-left text-xs font-semibold text-emerald-900 dark:text-emerald-100 transition-colors hover:bg-white/80 dark:hover:bg-slate-900/20"
                      >
                        <span>{language === 'zh' ? '查看具体修改项' : 'View detailed changes'}</span>
                        <span
                          className={`material-symbols-outlined text-base transition-transform ${
                            isAiSummaryExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          expand_more
                        </span>
                      </button>
                      {isAiSummaryExpanded && (
                        <div className="mt-2 space-y-2" data-ai-export-summary-details="true">
                      {aiAppliedSummary.details.map((detail) => (
                        <div
                          key={detail.id}
                          className="rounded-md border border-emerald-200/80 dark:border-emerald-400/15 bg-white/70 dark:bg-slate-950/10 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            {detail.previewTarget && detail.previewTarget.kind !== 'document' && onSelectAiAppliedDetail ? (
                              <button
                                type="button"
                                onClick={() => onSelectAiAppliedDetail(detail.id)}
                                onMouseEnter={() => onHoverAiAppliedDetail?.(detail.id)}
                                onMouseLeave={() => onHoverAiAppliedDetail?.(null)}
                                onFocus={() => onHoverAiAppliedDetail?.(detail.id)}
                                onBlur={() => onHoverAiAppliedDetail?.(null)}
                                className={`flex-1 rounded-md px-2 py-1 text-left transition-colors ${
                                  activeAiAppliedDetailId === detail.id
                                    ? 'bg-emerald-100 dark:bg-emerald-400/10'
                                    : 'hover:bg-emerald-50 dark:hover:bg-emerald-400/5'
                                }`}
                              >
                                <p className="text-xs font-semibold text-emerald-950 dark:text-emerald-50">
                                  {detail.title}
                                </p>
                              </button>
                            ) : (
                              <p className="flex-1 text-xs font-semibold text-emerald-950 dark:text-emerald-50 px-2 py-1">
                                {detail.title}
                              </p>
                            )}
                            <span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-200">
                              {language === 'zh' ? `${detail.changeCount} 项` : `${detail.changeCount} changes`}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-5 text-emerald-800 dark:text-emerald-200/90">
                            {detail.description}
                          </p>
                          {onRevertAiAppliedDetail && (
                            <div className="mt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() => onRevertAiAppliedDetail(detail.id)}
                                className="rounded-md border border-emerald-300/80 dark:border-emerald-400/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-400/5"
                              >
                                {language === 'zh' ? '撤销此项' : 'Revert item'}
                              </button>
                            </div>
                          )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  {t('md2word.export_settings')}
                </label>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-900 dark:text-white font-medium mb-1.5">
                      {t('md2word.output_format')}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['docx', 'pdf', 'html'] as ExportFormat[]).map((format) => (
                        <button
                          key={format}
                          onClick={() => setExportFormat(format)}
                          className={`flex items-center justify-center gap-1 rounded py-2 text-xs font-medium shadow-sm border transition-colors ${
                            exportFormat === format
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {format === 'docx' ? 'description' : format === 'pdf' ? 'picture_as_pdf' : 'code'}
                          </span>
                          {format.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-xs text-slate-900 dark:text-white font-medium">
                        {t('md2word.image_quality')}
                      </p>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">{imageQuality}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={imageQuality}
                      onChange={(e) => setImageQuality(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  <div>
                    <FieldLabel>{language === 'zh' ? '纸张大小' : 'Page Size'}</FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {(['a4', 'letter'] as const).map((pageSize) => (
                        <button
                          key={pageSize}
                          type="button"
                          onClick={() => updatePageSettings('pageSize', pageSize)}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                            pageSettings.pageSize === pageSize
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-400/10 dark:text-indigo-200'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                          }`}
                        >
                          {pageSize.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ToggleOption
                    label={language === 'zh' ? '显示页码' : 'Show page numbers'}
                    checked={pageSettings.showPageNumbers}
                    onChange={(checked) => updatePageSettings('showPageNumbers', checked)}
                  />
                  <ToggleOption
                    label={language === 'zh' ? '镜像页边距' : 'Mirror margins'}
                    checked={pageSettings.mirrorMargins}
                    onChange={(checked) => updatePageSettings('mirrorMargins', checked)}
                  />
                  <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-[11px] leading-5 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {language === 'zh'
                      ? `当前导出纸张：${pageSettings.pageSize.toUpperCase()}，页码：${
                          pageSettings.showPageNumbers ? '已开启' : '已关闭'
                        }，镜像页边距：${pageSettings.mirrorMargins ? '已开启' : '已关闭'}。`
                      : `Current export page size: ${pageSettings.pageSize.toUpperCase()}, page numbers are ${
                          pageSettings.showPageNumbers ? 'on' : 'off'
                        }, mirror margins are ${pageSettings.mirrorMargins ? 'on' : 'off'}.`}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleExport}
                  className="w-full flex items-center justify-center rounded-lg h-11 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 transition-all text-white gap-2 text-sm font-bold shadow-lg shadow-indigo-600/30 hover:shadow-xl hover:shadow-indigo-600/40 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  <span>{t('md2word.convert_now')}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const FieldLabel: React.FC<React.PropsWithChildren> = ({ children }) => (
  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
    {children}
  </label>
);

const ToggleOption: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hideLabel?: boolean;
}> = ({
  label,
  checked,
  onChange,
  hideLabel = false,
}) => (
  <div className="flex items-center justify-between py-1">
    {!hideLabel && <p className="text-xs text-slate-900 dark:text-white font-medium">{label}</p>}
    <div
      role="switch"
      aria-checked={checked}
      aria-label={hideLabel ? (label || (checked ? 'toggle-on' : 'toggle-off')) : label}
      tabIndex={0}
      className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${
        checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'
      }`}
      onClick={() => onChange(!checked)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <div
        className="w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm"
        style={{ left: checked ? 'calc(100% - 18px)' : '2px' }}
      />
    </div>
  </div>
);
