import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { DocumentPresentationState, DocumentStats, PreviewEngine, ViewMode } from './types';
import { useAppContext } from '../../context/AppContext';
import { DEFAULT_BASE_TEMPLATE, TEMPLATE_DEFAULTS } from './formatting/defaults';
import { buildScopedBlockCss } from './formatting/applyScopedPatches';
import { parseMarkdownBlocks } from './formatting/parseMarkdownBlocks';
import { SuperDocPreview } from './SuperDocPreview';
import {
  buildSelectionCss,
  injectSelectionMarkers,
  replaceSelectionMarkersWithHtml,
  resolveAppliedSelectionPatches,
} from './formatting/selectionFormatting';
import {
  annotatePreviewSegments,
  annotatePreviewSelectionHighlights,
  buildPreviewSegments,
  resolvePreviewSelection,
  resolvePreviewSelectionFromPoints,
} from './formatting/previewSelection';
import { buildPagedPreview } from './formatting/pagedPreview';
import { buildPendingPreviewLabels, type AppliedAiFormattingSummaryDetail, type PendingAiReviewState } from './formatting/aiReview';
import { detectEditorScope } from './formatting/scopeDetection';
import type { EditorScopeInfo, MarkdownBlockType } from './formatting/scopeTypes';
import {
  analyzeSuperDocStructure,
  buildSuperDocStructureGuidanceItems,
  buildSuperDocStructureSummaryText,
} from './superdocStructure';
import type {
  SuperDocFormattingApplicationRequest,
  SuperDocFormattingApplicationResult,
  SuperDocFormattingReviewState,
  SuperDocRuntimeSelectionState,
} from './superdocSelection';
import type { LegacyPreviewStyle, ResolvedFormatConfig, ScopedFormatPatch } from './formatting/types';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  formatConfig?: ResolvedFormatConfig;
  documentPresentation: DocumentPresentationState;
  documentName: string;
  previewEngine: PreviewEngine;
  customStyles?: LegacyPreviewStyle[];
  scopedPatches?: ScopedFormatPatch[];
  pendingAiReview?: PendingAiReviewState | null;
  activeReviewSegmentId?: string | null;
  activeAppliedSummaryDetail?: AppliedAiFormattingSummaryDetail | null;
  onScopeChange?: (scopeInfo: EditorScopeInfo) => void;
  onPreviewEngineChange?: (engine: PreviewEngine) => void;
  onSuperDocSelectionChange?: (selection: SuperDocRuntimeSelectionState | null) => void;
  onSuperDocRuntimeAdapterChange?: (adapter: import('../../utils/documentConverter').SuperDocDocxExportAdapter | null) => void;
  onSuperDocStatusChange?: (status: import('./SuperDocPreview').SuperDocPreviewStatus) => void;
  pendingSuperDocFormattingRequest?: SuperDocFormattingApplicationRequest | null;
  superDocUndoSignal?: number;
  superDocReviewState?: SuperDocFormattingReviewState | null;
  onSuperDocFormattingApplied?: (result: SuperDocFormattingApplicationResult) => void;
  onSuperDocReviewOpen?: () => void;
  onSuperDocReviewClose?: () => void;
}

/**
 * MD2Word 编辑器 - 支持分栏视图、快捷键和字数统计
 */
export const Editor: React.FC<EditorProps> = ({ 
  content, 
  onChange, 
  formatConfig = TEMPLATE_DEFAULTS[DEFAULT_BASE_TEMPLATE],
  documentPresentation,
  documentName,
  previewEngine,
  customStyles = [],
  scopedPatches = [],
  pendingAiReview = null,
  activeReviewSegmentId = null,
  activeAppliedSummaryDetail = null,
  onScopeChange,
  onPreviewEngineChange,
  onSuperDocSelectionChange,
  onSuperDocRuntimeAdapterChange,
  onSuperDocStatusChange,
  pendingSuperDocFormattingRequest = null,
  superDocUndoSignal = 0,
  superDocReviewState = null,
  onSuperDocFormattingApplied,
  onSuperDocReviewOpen,
  onSuperDocReviewClose,
}) => {
  const { language } = useAppContext();
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRootRef = useRef<HTMLDivElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const selectionSyncFrameRef = useRef<number | null>(null);
  const previewSelectionSyncFrameRef = useRef<number | null>(null);
  const previewPointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressPreviewClickRef = useRef(false);
  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 });
  const [previewSelectedBlockId, setPreviewSelectedBlockId] = useState<string | undefined>(undefined);
  const [previewSelectionInfo, setPreviewSelectionInfo] = useState<EditorScopeInfo['previewSelection']>(undefined);
  const [superDocSelectionState, setSuperDocSelectionState] = useState<SuperDocRuntimeSelectionState | null>(null);
  const [activeSelectionOrigin, setActiveSelectionOrigin] = useState<'source' | 'preview' | 'superdoc'>('source');
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return 0.5;
    }

    const saved = window.localStorage.getItem('md2word-editor-split-ratio');
    const parsed = saved ? Number(saved) : NaN;
    if (!Number.isFinite(parsed)) {
      return 0.5;
    }

    return Math.min(0.72, Math.max(0.28, parsed));
  });
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const markdownBlocks = useMemo(() => parseMarkdownBlocks(content), [content]);
  const previewSegments = useMemo(() => buildPreviewSegments(markdownBlocks), [markdownBlocks]);
  const superDocStructureSummary = useMemo(() => analyzeSuperDocStructure(content), [content]);
  const superDocStructureSummaryText = useMemo(
    () => buildSuperDocStructureSummaryText(superDocStructureSummary, language === 'zh' ? 'zh' : 'en'),
    [language, superDocStructureSummary]
  );
  const superDocStructureGuidanceItems = useMemo(
    () => buildSuperDocStructureGuidanceItems(superDocStructureSummary, language === 'zh' ? 'zh' : 'en'),
    [language, superDocStructureSummary]
  );
  const appliedSelections = useMemo(
    () => resolveAppliedSelectionPatches(content, markdownBlocks, scopedPatches),
    [content, markdownBlocks, scopedPatches]
  );
  const isHtmlPreview = previewEngine === 'html';
  const isSuperDocPreview = previewEngine === 'superdoc';
  const isPagedPreview = isHtmlPreview && documentPresentation.previewMode === 'paged';
  const superDocScopeInfo = useMemo<EditorScopeInfo | null>(() => {
    if (!isSuperDocPreview || activeSelectionOrigin !== 'superdoc' || !superDocSelectionState?.hasSelection) {
      return null;
    }

    return {
      scope: {
        scopeType: 'selection',
        start: 0,
        end: superDocSelectionState.text.length,
      },
      selectedText: superDocSelectionState.text,
      caretLine: 0,
      blocks: markdownBlocks,
    };
  }, [activeSelectionOrigin, isSuperDocPreview, markdownBlocks, superDocSelectionState]);
  const scopeInfo = useMemo(
    () =>
      superDocScopeInfo ??
      detectEditorScope(
        content,
        markdownBlocks,
        selectionRange.start,
        selectionRange.end,
        previewSelectedBlockId,
        previewSelectionInfo
      ),
    [content, markdownBlocks, previewSelectedBlockId, previewSelectionInfo, selectionRange, superDocScopeInfo]
  );

  const publishScopeChange = useCallback(
    (
      nextSelectionRange: { start: number; end: number },
      nextPreferredBlockId?: string,
      nextPreviewSelectionInfo?: EditorScopeInfo['previewSelection']
    ) => {
      onScopeChange?.(
        detectEditorScope(
          content,
          markdownBlocks,
          nextSelectionRange.start,
          nextSelectionRange.end,
          nextPreferredBlockId,
          nextPreviewSelectionInfo ?? previewSelectionInfo
        )
      );
    },
    [content, markdownBlocks, onScopeChange, previewSelectionInfo]
  );

  const handleSuperDocSelectionChange = useCallback(
    (snapshot: SuperDocRuntimeSelectionState | null) => {
      onSuperDocSelectionChange?.(snapshot);
      setSuperDocSelectionState(snapshot);
      if (!snapshot || !snapshot.hasSelection) {
        if (isSuperDocPreview) {
          onScopeChange?.({
            scope: {
              scopeType: 'document',
            },
            caretLine: 0,
            blocks: markdownBlocks,
          });
        }
        return;
      }

      setActiveSelectionOrigin('superdoc');
      setPreviewSelectedBlockId(undefined);
      setPreviewSelectionInfo(undefined);
      setSelectionRange({
        start: 0,
        end: snapshot.text.length,
      });
      onScopeChange?.({
        scope: {
          scopeType: 'selection',
          start: 0,
          end: snapshot.text.length,
        },
        selectedText: snapshot.text,
        caretLine: 0,
        blocks: markdownBlocks,
      });
    },
    [isSuperDocPreview, markdownBlocks, onScopeChange, onSuperDocSelectionChange]
  );

  const getBlockTypeLabel = useCallback(
    (blockType: MarkdownBlockType) => {
      const labels = {
        heading1: language === 'zh' ? '一级标题' : 'Heading 1',
        heading2: language === 'zh' ? '二级标题' : 'Heading 2',
        heading3: language === 'zh' ? '三级标题' : 'Heading 3',
        paragraph: language === 'zh' ? '段落' : 'Paragraph',
        blockquote: language === 'zh' ? '引用块' : 'Blockquote',
        code: language === 'zh' ? '代码块' : 'Code Block',
        list: language === 'zh' ? '列表' : 'List',
        hr: language === 'zh' ? '分隔线' : 'Divider',
        html: language === 'zh' ? 'HTML 块' : 'HTML Block',
        unknown: language === 'zh' ? '内容块' : 'Content Block',
      } satisfies Record<MarkdownBlockType, string>;

      return labels[blockType];
    },
    [language]
  );

  const scopeSummary = useMemo(() => {
    if (scopeInfo.scope.scopeType === 'preview-selection' && scopeInfo.previewSelection) {
      return language === 'zh'
        ? `预览选区：${scopeInfo.previewSelection.segments.length} 个片段`
        : `Preview selection: ${scopeInfo.previewSelection.segments.length} segments`;
    }

    if (scopeInfo.scope.scopeType === 'selection') {
      const textLength = scopeInfo.selectedText?.trim().length ?? 0;
      return language === 'zh' ? `当前选中内容：${textLength} 字` : `Selection: ${textLength} chars`;
    }

    if (scopeInfo.scope.scopeType === 'block' && scopeInfo.currentBlock) {
      return language === 'zh'
        ? `当前块：${getBlockTypeLabel(scopeInfo.currentBlock.blockType)}`
        : `Current block: ${getBlockTypeLabel(scopeInfo.currentBlock.blockType)}`;
    }

    return language === 'zh' ? '作用域：整篇文档' : 'Scope: Document';
  }, [getBlockTypeLabel, language, scopeInfo]);

  const getSuperDocFocusTargetTypeLabel = useCallback(
    (previewTarget: AppliedAiFormattingSummaryDetail['previewTarget']) => {
      if (!previewTarget) {
        return language === 'zh' ? '当前目标' : 'Current target';
      }

      if (previewTarget.kind === 'document') {
        return language === 'zh' ? '整篇文档' : 'Whole document';
      }

      if (previewTarget.kind === 'selection') {
        return language === 'zh' ? '当前选区文本' : 'Current text selection';
      }

      if (!previewTarget.fallbackBlockType) {
        return language === 'zh' ? '当前内容块' : 'Current content block';
      }

      return language === 'zh'
        ? `${getBlockTypeLabel(previewTarget.fallbackBlockType as MarkdownBlockType)}块`
        : `${getBlockTypeLabel(previewTarget.fallbackBlockType as MarkdownBlockType)} block`;
    },
    [getBlockTypeLabel, language]
  );

  const superDocFocusState = useMemo(() => {
    if (!activeAppliedSummaryDetail) {
      return null;
    }

    const previewTarget = activeAppliedSummaryDetail.previewTarget;
    if (!previewTarget) {
      return null;
    }

    const kind =
      previewTarget.kind === 'document'
        ? 'document'
        : previewTarget.kind === 'block'
          ? 'block'
          : 'selection';

    const badge =
      kind === 'document'
        ? language === 'zh'
          ? '文档级'
          : 'Document'
        : kind === 'block'
          ? language === 'zh'
            ? '块级'
            : 'Block'
          : language === 'zh'
            ? '选区级'
            : 'Selection';

    const targetTypeLabel = getSuperDocFocusTargetTypeLabel(previewTarget);

    return {
      title: activeAppliedSummaryDetail.title,
      description: activeAppliedSummaryDetail.description,
      kind,
      badge,
      targetTypeLabel,
    };
  }, [activeAppliedSummaryDetail, getSuperDocFocusTargetTypeLabel, language]);

  const syncSelectionFromTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const next = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };

    setPreviewSelectedBlockId(undefined);
    setPreviewSelectionInfo(undefined);
    setActiveSelectionOrigin('source');
    setSelectionRange((current) => {
      if (current.start === next.start && current.end === next.end) {
        return current;
      }

      return next;
    });
    publishScopeChange(next);
  }, [publishScopeChange]);

  const scheduleSelectionSync = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const sync = () => {
      selectionSyncFrameRef.current = null;
      syncSelectionFromTextarea();
    };

    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      sync();
      return;
    }

    if (selectionSyncFrameRef.current !== null) {
      window.cancelAnimationFrame(selectionSyncFrameRef.current);
    }

    selectionSyncFrameRef.current = window.requestAnimationFrame(sync);
  }, [syncSelectionFromTextarea]);

  const syncSelectionFromPreview = useCallback(() => {
    const previewRoot = previewRootRef.current;
    const selection = window.getSelection?.() ?? null;
    if (!previewRoot || !selection || selection.rangeCount === 0) {
      return;
    }

    const resolvedPreviewSelection = resolvePreviewSelection(previewRoot, selection, previewSegments);
    if (!resolvedPreviewSelection) {
      return;
    }

    const nextSelectionRange = {
      start: resolvedPreviewSelection.segments[0].sourceStart,
      end: resolvedPreviewSelection.segments[resolvedPreviewSelection.segments.length - 1].sourceEnd,
    };

    setPreviewSelectedBlockId(undefined);
    setPreviewSelectionInfo((current) => {
      const isSameSelection =
        current?.segments.length === resolvedPreviewSelection.segments.length &&
        current?.segments.every((segment, index) => {
          const nextSegment = resolvedPreviewSelection.segments[index];
          return (
            segment.segmentId === nextSegment.segmentId &&
            segment.selectedStart === nextSegment.selectedStart &&
            segment.selectedEnd === nextSegment.selectedEnd
          );
        });

      if (isSameSelection) {
        return current;
      }

      return resolvedPreviewSelection;
    });
    setActiveSelectionOrigin('preview');
    setSelectionRange((current) => {
      if (current.start === nextSelectionRange.start && current.end === nextSelectionRange.end) {
        return current;
      }

      return nextSelectionRange;
    });
    publishScopeChange(nextSelectionRange, undefined, resolvedPreviewSelection);
  }, [previewSegments, publishScopeChange]);

  const schedulePreviewSelectionSync = useCallback(() => {
    const previewRoot = previewRootRef.current;
    if (!previewRoot) {
      return;
    }

    const sync = () => {
      previewSelectionSyncFrameRef.current = null;
      syncSelectionFromPreview();
    };

    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      sync();
      return;
    }

    if (previewSelectionSyncFrameRef.current !== null) {
      window.cancelAnimationFrame(previewSelectionSyncFrameRef.current);
    }

    previewSelectionSyncFrameRef.current = window.requestAnimationFrame(sync);
  }, [syncSelectionFromPreview]);

  useEffect(() => {
    onScopeChange?.(scopeInfo);
  }, [onScopeChange, scopeInfo]);

  useEffect(() => {
    return () => {
      if (selectionSyncFrameRef.current !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(selectionSyncFrameRef.current);
      }
      if (previewSelectionSyncFrameRef.current !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(previewSelectionSyncFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('md2word-editor-split-ratio', String(splitRatio));
  }, [splitRatio]);

  useEffect(() => {
    if (!isDraggingSplit || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const clampSplitRatio = (value: number) => Math.min(0.72, Math.max(0.28, value));

    const updateSplitRatio = (clientX: number) => {
      const container = splitContainerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }

      const nextRatio = clampSplitRatio((clientX - rect.left) / rect.width);
      setSplitRatio(nextRatio);
    };

    const handlePointerMove = (event: PointerEvent) => {
      updateSplitRatio(event.clientX);
    };

    const handlePointerUp = () => {
      setIsDraggingSplit(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDraggingSplit]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const textarea = textareaRef.current;
      const previewRoot = previewRootRef.current;
      const selection = window.getSelection?.() ?? null;
      if (!textarea || document.activeElement !== textarea) {
        if (!previewRoot || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
          return;
        }

        const range = selection.getRangeAt(0);
        const commonAncestor =
          range.commonAncestorContainer instanceof Element
            ? range.commonAncestorContainer
            : range.commonAncestorContainer.parentElement;

        if (!commonAncestor || !previewRoot.contains(commonAncestor)) {
          return;
        }

        schedulePreviewSelectionSync();
        return;
      }

      scheduleSelectionSync();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [schedulePreviewSelectionSync, scheduleSelectionSync]);

  useEffect(() => {
    const previewRoot = previewRootRef.current;
    if (!previewRoot) {
      return;
    }

    const linkedElements = Array.from(
      previewRoot.querySelectorAll<HTMLElement>('[data-preview-selection-linked="true"]')
    );
    linkedElements.forEach((element) => {
      delete element.dataset.previewSelectionLinked;
    });

    if (!previewSelectionInfo?.segmentIds.length) {
      return;
    }

    previewSelectionInfo.segmentIds.forEach((segmentId) => {
      const elements = Array.from(
        previewRoot.querySelectorAll<HTMLElement>(
          `[data-segment-id="${segmentId}"], [data-source-segment-id="${segmentId}"]`
        )
      );
      elements.forEach((element) => {
        element.dataset.previewSelectionLinked = 'true';
      });
    });
  }, [previewSelectionInfo]);

  useEffect(() => {
    const previewRoot = previewRootRef.current;
    if (!previewRoot) {
      return;
    }

    const labels = buildPendingPreviewLabels(pendingAiReview);
    const segmentElements = Array.from(previewRoot.querySelectorAll<HTMLElement>('[data-segment-id]'));
    segmentElements.forEach((element) => {
      delete element.dataset.aiReview;
      delete element.dataset.aiReviewLabel;
      delete element.dataset.aiReviewActive;
    });

    labels.forEach((label, segmentId) => {
      const elements = Array.from(
        previewRoot.querySelectorAll<HTMLElement>(
          `[data-segment-id="${segmentId}"], [data-source-segment-id="${segmentId}"]`
        )
      );
      elements.forEach((element) => {
        element.dataset.aiReview = 'true';
        element.dataset.aiReviewLabel = label;
        if (activeReviewSegmentId === segmentId) {
          element.dataset.aiReviewActive = 'true';
        }
      });
    });
  }, [activeReviewSegmentId, content, pendingAiReview, previewSegments, previewSelectedBlockId]);

  useEffect(() => {
    const previewRoot = previewRootRef.current;
    if (!previewRoot) {
      return;
    }

    const highlightedElements = Array.from(
      previewRoot.querySelectorAll<HTMLElement>('[data-ai-applied-active="true"], [data-ai-applied-linked="true"]')
    );
    highlightedElements.forEach((element) => {
      delete element.dataset.aiAppliedActive;
      delete element.dataset.aiAppliedLinked;
    });

    const previewTarget = activeAppliedSummaryDetail?.previewTarget;
    if (!previewTarget || previewTarget.kind === 'document' || !previewTarget.targetId) {
      return;
    }

    const selector =
      previewTarget.kind === 'selection'
        ? `[data-selection-id="${previewTarget.targetId}"]`
        : `[data-block-id="${previewTarget.targetId}"]`;
    let targetElements = Array.from(previewRoot.querySelectorAll<HTMLElement>(selector));
    if (targetElements.length === 0 && previewTarget.kind === 'block' && previewTarget.fallbackBlockType) {
      targetElements = Array.from(
        previewRoot.querySelectorAll<HTMLElement>(`[data-block-type="${previewTarget.fallbackBlockType}"]`)
      );
    }
    if (targetElements.length === 0) {
      return;
    }

    targetElements.forEach((element) => {
      element.dataset.aiAppliedActive = 'true';
    });

    const linkedSegmentIds = new Set<string>();
    targetElements.forEach((element) => {
      const selectionParent = element.closest<HTMLElement>('[data-source-segment-id], [data-segment-id]');
      const linkedSegmentId = selectionParent?.dataset.sourceSegmentId ?? selectionParent?.dataset.segmentId;
      if (linkedSegmentId) {
        linkedSegmentIds.add(linkedSegmentId);
      }
    });

    linkedSegmentIds.forEach((segmentId) => {
      const elements = Array.from(
        previewRoot.querySelectorAll<HTMLElement>(
          `[data-segment-id="${segmentId}"], [data-source-segment-id="${segmentId}"]`
        )
      );
      elements.forEach((element) => {
        if (!element.dataset.aiAppliedActive) {
          element.dataset.aiAppliedLinked = 'true';
        }
      });
    });

    targetElements[0].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeAppliedSummaryDetail]);

  useEffect(() => {
    const previewRoot = previewRootRef.current;
    if (!previewRoot) {
      return;
    }

    const pages = Array.from(previewRoot.querySelectorAll<HTMLElement>('[data-page-id]'));
    pages.forEach((page) => {
      delete page.dataset.pageSelectionActive;
      delete page.dataset.pageReviewActive;
      delete page.dataset.pageAppliedActive;
    });

    const markPages = (selector: string, attr: 'pageSelectionActive' | 'pageReviewActive' | 'pageAppliedActive') => {
      const elements = Array.from(previewRoot.querySelectorAll<HTMLElement>(selector));
      elements.forEach((element) => {
        const page = element.closest<HTMLElement>('[data-page-id]');
        if (page) {
          page.dataset[attr] = 'true';
        }
      });
    };

    markPages('[data-preview-selection-active="true"], [data-preview-selection-linked="true"]', 'pageSelectionActive');
    markPages('[data-ai-review="true"]', 'pageReviewActive');
    markPages('[data-ai-applied-active="true"], [data-ai-applied-linked="true"]', 'pageAppliedActive');
  }, [activeAppliedSummaryDetail, content, pendingAiReview, previewSelectionInfo]);

  // 动态插入全局样式
  useEffect(() => {
    const styleId = 'md2word-preview-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
      .markdown-preview .toc {
        display: block !important;
        background: #ffffff !important;
        border: 1px solid #d4d4d8 !important;
        border-radius: 4px !important;
        padding: 18px 20px !important;
        margin: 24px 0 28px !important;
        width: 100% !important;
        box-sizing: border-box !important;
        position: relative !important;
        z-index: 10 !important;
        min-height: 50px !important;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8) !important;
      }
      .markdown-preview .toc-title {
        font-weight: 700 !important;
        font-size: 12pt !important;
        margin-bottom: 14px !important;
        color: #111827 !important;
        display: block !important;
        letter-spacing: 0.02em !important;
      }
      .markdown-preview .toc-item {
        margin: 0 !important;
        color: #111827 !important;
        cursor: pointer;
        display: flex !important;
        align-items: baseline !important;
        gap: 8px !important;
        line-height: 1.85 !important;
        font-size: 10.5pt !important;
        font-family: "Times New Roman", "SimSun", serif !important;
      }
      .markdown-preview .toc-item:hover {
        color: #1d4ed8 !important;
      }
      .markdown-preview .toc-label {
        white-space: nowrap !important;
      }
      .markdown-preview .toc-dots {
        flex: 1 1 auto !important;
        min-width: 24px !important;
        height: 1px !important;
        align-self: center !important;
        background-image: radial-gradient(circle, rgba(15, 23, 42, 0.42) 1px, transparent 1.4px) !important;
        background-size: 6px 1px !important;
        background-repeat: repeat-x !important;
        background-position: left center !important;
        opacity: 0.8 !important;
      }
      .markdown-preview .toc-page {
        min-width: 16px !important;
        text-align: right !important;
        color: #334155 !important;
        font-variant-numeric: tabular-nums !important;
      }
      .markdown-preview .toc-item[data-level="2"] {
        padding-left: 18px !important;
      }
      .markdown-preview .toc-item[data-level="3"] {
        padding-left: 36px !important;
      }
      .markdown-preview sup {
        vertical-align: super !important;
        font-size: 0.75em !important;
        line-height: 0 !important;
      }
      .markdown-preview .citation {
        color: #2563eb !important;
        font-weight: 500 !important;
        cursor: pointer !important;
      }
      .markdown-preview .citation a {
        color: inherit !important;
        text-decoration: none !important;
      }
      .markdown-preview .citation:hover {
        color: #1d4ed8 !important;
      }
      .markdown-preview .citation:hover a {
        color: inherit !important;
      }
      .markdown-preview .references {
        display: block !important;
        margin-top: 48px !important;
        padding-top: 24px !important;
        border-top: 2px solid #e5e7eb !important;
        width: 100% !important;
      }
      .markdown-preview .references-title {
        font-size: 16pt !important;
        font-weight: bold !important;
        color: #111827 !important;
        margin-bottom: 16px !important;
        display: block !important;
      }
      .markdown-preview .reference-item {
        margin: 8px 0 !important;
        padding-left: 24px !important;
        text-indent: -24px !important;
        font-size: 10pt !important;
        color: #374151 !important;
        line-height: 1.6 !important;
        display: block !important;
        transition: background-color 0.3s ease !important;
        padding: 8px !important;
        border-radius: 4px !important;
      }
        .markdown-preview .reference-id {
          color: #2563eb !important;
          font-weight: 500 !important;
        }
        .markdown-preview [data-segment-id][data-ai-review="true"] {
          position: relative;
          display: inline-block;
          background: rgba(251, 191, 36, 0.18);
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.45);
          border-radius: 4px;
        }
        .markdown-preview [data-preview-selection-active="true"] {
          position: relative;
          display: inline-block;
          background: rgba(59, 130, 246, 0.14);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.28);
          border-radius: 4px;
          transition: box-shadow 120ms ease, background-color 120ms ease;
        }
        .markdown-preview [data-preview-selection-linked="true"] {
          position: relative;
          display: inline-block;
          background: rgba(96, 165, 250, 0.08);
          box-shadow: inset 0 -2px 0 rgba(59, 130, 246, 0.28);
          border-radius: 4px;
        }
        .markdown-preview [data-preview-selection-linked="true"][data-preview-selection-active="true"] {
          background: rgba(59, 130, 246, 0.16);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.32);
        }
        .markdown-preview.md2word-preview-paged {
          max-width: none;
          padding: 8px 0 40px;
        }
        .markdown-preview.md2word-preview-paged .md2word-pages {
          display: flex;
          flex-direction: column;
          gap: 28px;
          align-items: center;
        }
        .markdown-preview.md2word-preview-paged .md2word-page {
          width: min(100%, var(--md2word-page-width));
          min-height: var(--md2word-page-height);
          background: #ffffff;
          border: 0;
          border-radius: 0;
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
          position: relative;
          overflow: hidden;
        }
        .markdown-preview.md2word-preview-paged .md2word-page-inner {
          min-height: var(--md2word-page-height);
          background: #ffffff;
        }
        .markdown-preview.md2word-preview-paged .md2word-page-content {
          min-height: var(--md2word-page-height);
          box-sizing: border-box;
        }
        .markdown-preview.md2word-preview-paged .md2word-cover-layout {
          min-height: 100%;
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 32px;
        }
        .markdown-preview.md2word-preview-paged .md2word-cover-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          color: #64748b;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .markdown-preview.md2word-preview-paged .md2word-cover-main {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 20px;
          padding: 56px 0 36px;
        }
        .markdown-preview.md2word-preview-paged .md2word-cover-title {
          margin: 0;
          border-bottom: 0;
          padding-bottom: 0;
          font-size: 26pt;
          line-height: 1.2;
          letter-spacing: 0.04em;
        }
        .markdown-preview.md2word-preview-paged .md2word-cover-subtitle {
          margin: 0;
          font-size: 13pt;
          line-height: 1.7;
          color: #475569;
          text-align: center;
        }
        .markdown-preview.md2word-preview-paged .md2word-cover-meta {
          display: grid;
          gap: 20px;
          color: #1e293b;
        }
        .markdown-preview.md2word-preview-paged .md2word-cover-author {
          margin: 0;
          font-weight: 600;
          text-align: center;
        }
        .markdown-preview.md2word-preview-paged .md2word-cover-abstract {
          border-top: 1px solid rgba(148, 163, 184, 0.3);
          padding-top: 16px;
        }
        .markdown-preview.md2word-preview-paged .md2word-cover-abstract h2 {
          margin-top: 0;
        }
        .markdown-preview [data-segment-id][data-ai-review="true"]::after {
          content: attr(data-ai-review-label);
          position: absolute;
          left: 0;
          top: -1.6rem;
          white-space: nowrap;
          padding: 2px 8px;
          border-radius: 9999px;
          background: rgba(15, 23, 42, 0.92);
          color: #fff;
          font-size: 10px;
          line-height: 1.4;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
          pointer-events: none;
        }
        .markdown-preview [data-segment-id][data-ai-review-active="true"] {
          background: rgba(249, 115, 22, 0.22);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.55);
          transform: translateY(-1px);
        }
        .markdown-preview [data-selection-id][data-ai-applied-active="true"] {
          position: relative;
          background: rgba(16, 185, 129, 0.18);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.45);
          border-radius: 4px;
        }
        .markdown-preview [data-ai-applied-linked="true"] {
          position: relative;
          background: rgba(16, 185, 129, 0.08);
          box-shadow: inset 0 -2px 0 rgba(16, 185, 129, 0.28);
          border-radius: 4px;
        }
        .markdown-preview [data-block-id][data-ai-applied-active="true"] {
          position: relative;
          background: rgba(16, 185, 129, 0.12);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.35);
          border-radius: 8px;
        }
        .md2word-preview-stage {
          min-height: 100%;
          background:
            radial-gradient(circle at top, rgba(148, 163, 184, 0.14), transparent 36%),
            linear-gradient(180deg, #eef2ff 0%, #e2e8f0 100%);
          padding: 24px 16px 40px;
          box-sizing: border-box;
          overflow-x: hidden;
        }
        .md2word-preview-stage .markdown-preview {
          max-width: none;
        }
        .md2word-page {
          width: min(100%, var(--md2word-page-width, 794px));
          min-height: var(--md2word-page-height, 1123px);
          margin: 0 auto 28px;
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.24);
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
          border-radius: 10px;
          overflow: hidden;
          transition: box-shadow 160ms ease, border-color 160ms ease, transform 160ms ease;
        }
        .md2word-page[data-page-selection-active="true"] {
          border-color: rgba(59, 130, 246, 0.45);
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12), 0 0 0 3px rgba(59, 130, 246, 0.18);
        }
        .md2word-page[data-page-review-active="true"] {
          border-color: rgba(245, 158, 11, 0.52);
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12), 0 0 0 3px rgba(245, 158, 11, 0.18);
        }
        .md2word-page[data-page-applied-active="true"] {
          border-color: rgba(16, 185, 129, 0.48);
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12), 0 0 0 3px rgba(16, 185, 129, 0.16);
        }
        .md2word-page-inner {
          min-height: 1123px;
          display: flex;
          flex-direction: column;
        }
        .md2word-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 22px 32px 0;
          color: #64748b;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .md2word-page-header-title {
          max-width: 70%;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .md2word-page-content {
          flex: 1;
          padding: 96px 92px 72px;
        }
        .md2word-page-cover .md2word-page-content {
          padding: 110px 92px 96px;
        }
        .md2word-page-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 32px 26px;
          color: #64748b;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .md2word-page-number {
          text-align: center;
          font-size: 10pt;
          color: #64748b;
        }
        .md2word-cover-layout {
          min-height: 920px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .md2word-cover-header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-start;
        }
        .md2word-cover-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 18px;
        }
        .md2word-cover-title {
          margin: 0;
          font-size: 28pt;
          line-height: 1.25;
          color: #0f172a;
          letter-spacing: 0.01em;
        }
        .md2word-cover-subtitle {
          margin: 0;
          font-size: 14pt;
          line-height: 1.6;
          color: #475569;
        }
        .md2word-cover-author,
        .md2word-cover-organization,
        .md2word-cover-date {
          margin: 0;
          font-size: 11pt;
          color: #334155;
        }
        .md2word-cover-meta {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .md2word-cover-abstract {
          border-top: 1px solid #cbd5e1;
          padding-top: 18px;
        }
        .md2word-cover-abstract h2 {
          margin: 0 0 10px;
          font-size: 12pt;
          color: #0f172a;
        }
        .md2word-cover-abstract p {
          margin: 0;
          font-size: 11pt;
          line-height: 1.8;
          color: #334155;
        }
        .md2word-cover-academic .md2word-cover-title {
          text-align: center;
          font-family: 'SimSun', serif;
        }
        .md2word-cover-corporate .md2word-cover-title {
          text-transform: uppercase;
          font-family: 'Microsoft YaHei', sans-serif;
        }
        .md2word-cover-corporate .md2word-cover-header {
          padding-bottom: 24px;
          border-bottom: 3px solid #1d4ed8;
        }
        .md2word-cover-classic .md2word-cover-main {
          align-items: center;
          text-align: center;
        }
        .md2word-page[data-page-side="left"] .md2word-page-header,
        .md2word-page[data-page-side="left"] .md2word-page-footer {
          padding-left: 40px;
          padding-right: 28px;
        }
        .md2word-page[data-page-side="right"] .md2word-page-header,
        .md2word-page[data-page-side="right"] .md2word-page-footer {
          padding-left: 28px;
          padding-right: 40px;
        }
        [data-fragment-continuation="true"] {
          position: relative;
        }
        [data-fragment-continuation="true"]::before {
          content: "续上页";
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 10px;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.08);
          color: #2563eb;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }
        .md2word-preview-selection-banner {
          position: sticky;
          top: 0;
          z-index: 5;
          width: min(100%, 794px);
          margin: 0 auto 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.82);
          color: white;
          backdrop-filter: blur(8px);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
        }
        .md2word-preview-selection-banner strong {
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .md2word-preview-selection-banner span {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.78);
        }
      `;
    
    return () => {
      // 清理函数（可选）
    };
  }, []);

  // 处理引用点击跳转
  useEffect(() => {
    const handleCitationClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="#ref-"]');
      
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          const targetId = href.substring(1); // 移除 #
          const targetElement = document.getElementById(targetId);
          
          if (targetElement) {
            // 找到预览容器
            const previewContainer = targetElement.closest('.overflow-y-auto');
            
            if (previewContainer) {
              // 计算目标元素相对于容器的位置
              const containerRect = previewContainer.getBoundingClientRect();
              const targetRect = targetElement.getBoundingClientRect();
              const scrollTop = previewContainer.scrollTop;
              const offset = targetRect.top - containerRect.top + scrollTop - 100; // 100px 偏移量
              
              // 平滑滚动到目标位置
              previewContainer.scrollTo({
                top: offset,
                behavior: 'smooth',
              });
              
              // 添加高亮效果
              targetElement.style.backgroundColor = '#fef3c7';
              setTimeout(() => {
                targetElement.style.backgroundColor = '';
              }, 2000);
            }
          }
        }
      }
    };

    document.addEventListener('click', handleCitationClick);
    
    return () => {
      document.removeEventListener('click', handleCitationClick);
    };
  }, []);

  // 计算文档统计信息
  const stats: DocumentStats = useMemo(() => {
    const text = content || '';
    const charCount = text.length;
    const charCountNoSpaces = text.replace(/\s/g, '').length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lineCount = text.split('\n').length;
    const paragraphCount = text.split(/\n\s*\n/).filter((p: string) => p.trim()).length || 1;
    
    // 预估阅读时间（按中文 300字/分钟，英文 200词/分钟）
    const isChinese = /[\u4e00-\u9fa5]/.test(text);
    const readTime = Math.ceil(isChinese ? charCountNoSpaces / 300 : wordCount / 200);
    
    return { charCount, charCountNoSpaces, wordCount, lineCount, paragraphCount, readTime };
  }, [content]);

  // 插入文本到光标位置
  const insertText = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    onChange(newText);
    
    // 恢复光标位置
    setTimeout(() => {
      textarea.focus();
      const newPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [content, onChange]);

  // 工具栏按钮处理
  const handleToolbarAction = useCallback((action: string) => {
    switch (action) {
      case 'bold':
        insertText('**', '**');
        break;
      case 'italic':
        insertText('*', '*');
        break;
      case 'heading':
        insertText('## ');
        break;
      case 'link':
        insertText('[链接文字](', ')');
        break;
      case 'image':
        insertText('![图片描述](', ')');
        break;
      case 'code':
        insertText('`', '`');
        break;
      case 'codeblock':
        insertText('```\n', '\n```');
        break;
      case 'list':
        insertText('- ');
        break;
      case 'quote':
        insertText('> ');
        break;
      case 'table':
        insertText('| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 内容 | 内容 | 内容 |');
        break;
    }
  }, [insertText]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!textareaRef.current || document.activeElement !== textareaRef.current) return;
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            handleToolbarAction('bold');
            break;
          case 'i':
            e.preventDefault();
            handleToolbarAction('italic');
            break;
          case 'k':
            e.preventDefault();
            handleToolbarAction('link');
            break;
          case '`':
            e.preventDefault();
            handleToolbarAction('code');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleToolbarAction]);

  // LaTeX 到 Unicode 转换函数
  const convertLatexToUnicode = useCallback((latex: string): string => {
    let result = latex;
    
    const replacements: Record<string, string> = {
      '\\int': '∫', '\\sum': '∑', '\\prod': '∏', '\\infty': '∞',
      '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
      '\\epsilon': 'ε', '\\theta': 'θ', '\\lambda': 'λ', '\\mu': 'μ',
      '\\pi': 'π', '\\sigma': 'σ', '\\phi': 'φ', '\\omega': 'ω',
      '\\Delta': 'Δ', '\\Sigma': 'Σ', '\\Omega': 'Ω',
      '\\pm': '±', '\\times': '×', '\\div': '÷',
      '\\leq': '≤', '\\geq': '≥', '\\neq': '≠', '\\approx': '≈', '\\equiv': '≡',
      '\\in': '∈', '\\subset': '⊂', '\\supset': '⊃', '\\cup': '∪', '\\cap': '∩',
      '\\emptyset': '∅', '\\forall': '∀', '\\exists': '∃',
      '\\nabla': '∇', '\\partial': '∂', '\\sqrt': '√', '\\max': 'max', '\\hat': '^',
    };
    
    for (const [latex, unicode] of Object.entries(replacements)) {
      result = result.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), unicode);
    }
    
    result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');
    result = result.replace(/\^2/g, '²').replace(/\^3/g, '³').replace(/\^n/g, 'ⁿ');
    result = result.replace(/\^\{2\}/g, '²').replace(/\^\{3\}/g, '³').replace(/\^\{n\}/g, 'ⁿ').replace(/\^\{-1\}/g, '⁻¹');
    result = result.replace(/_\{([^}]+)\}/g, '₍$1₎').replace(/_([a-zA-Z0-9])/g, '₍$1₎');
    result = result.replace(/[{}\\]/g, '');
    
    return result.trim();
  }, []);

  // 简单的 Markdown 预览渲染
  const previewContent = useMemo(() => {
    if (!content) return '';

    const previewMarkdown = injectSelectionMarkers(content, appliedSelections);

    // 生成目录
    let toc = '';
    if (formatConfig.document.includeTableOfContents) {
      const headings: Array<{level: number; text: string; id: string}> = [];
      const lines = content.split('\n');
      lines.forEach((line: string, index: number) => {
        if (line.startsWith('# ')) {
          headings.push({ level: 1, text: line.substring(2), id: `h1-${index}` });
        } else if (line.startsWith('## ')) {
          headings.push({ level: 2, text: line.substring(3), id: `h2-${index}` });
        } else if (line.startsWith('### ')) {
          headings.push({ level: 3, text: line.substring(4), id: `h3-${index}` });
        }
      });
      
      if (headings.length > 0) {
        toc = '<div class="toc" data-doc-structure="toc"><div class="toc-title">目录 / Table of Contents</div>';
        headings.forEach((h: any, index: number) => {
          const pageNumber = Math.max(1, index + 1);
          toc += `<div class="toc-item" data-level="${h.level}"><span class="toc-label">${h.text}</span><span class="toc-dots" aria-hidden="true"></span><span class="toc-page">${pageNumber}</span></div>`;
        });
        toc += '</div>';
      }
    }
    
    // 提取文献引用
    const references: Array<{id: string; text: string}> = [];
    const refPattern = /^\[\^(\w+)\]:\s*(.+)$/gm;
    let refMatch: RegExpExecArray | null;
    while ((refMatch = refPattern.exec(previewMarkdown)) !== null) {
      references.push({ id: refMatch[1], text: refMatch[2] });
    }
    
    let html = previewMarkdown
      // 移除文献定义行（不在正文中显示）
      .replace(/^\[\^(\w+)\]:\s*.+$/gm, '')
      // 文献引用标记 [^1] - 必须在链接处理之前
      .replace(/\[\^(\w+)\]/g, '<sup class="citation"><a href="#ref-$1" style="text-decoration: none; color: inherit;">[$1]</a></sup>')
      // 先处理数学公式（避免被其他规则干扰）
      .replace(/\$\$([\s\S]*?)\$\$/g, (_m: string, formula: string) => {
        const unicodeFormula = convertLatexToUnicode(formula.trim());
        return `<div class="my-4 text-center text-lg formula">${unicodeFormula}</div>`;
      })
      .replace(/\$([^$\n]+)\$/g, (_m: string, formula: string) => {
        const unicodeFormula = convertLatexToUnicode(formula);
        return `<span class="formula">${unicodeFormula}</span>`;
      })
      // 代码块
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto mb-4 border border-slate-200 dark:border-slate-700"><code class="text-sm font-mono text-slate-800 dark:text-slate-200">$2</code></pre>')
      // 标题
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // 粗体和斜体
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
      // 行内代码
      .replace(/`([^`]+)`/g, '<code class="bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded text-sm text-indigo-600 dark:text-indigo-400 font-mono">$1</code>')
      // 引用
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-indigo-500 pl-4 py-2 my-4 bg-slate-50 dark:bg-slate-800/50 italic text-slate-600 dark:text-slate-300">$1</blockquote>')
      // 无序列表
      .replace(/^- (.+)$/gm, '<li class="ml-5 list-disc mb-1">$1</li>')
      // 有序列表
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-5 list-decimal mb-1">$1</li>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">$1</a>')
      // 图片
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure class="my-4"><img src="$2" alt="$1" class="rounded-lg max-w-full shadow-md" /><figcaption class="text-xs text-center text-slate-500 mt-2">$1</figcaption></figure>')
      // 水平线
      .replace(/^---$/gm, '<hr class="my-6 border-slate-200 dark:border-slate-700" />')
      // 段落
      .replace(/^(?!<[hluopfbrd])(.+)$/gm, '<p>$1</p>');

    // 生成参考文献列表
    let referencesHtml = '';
    if (references.length > 0) {
      referencesHtml =
        '<div class="references" data-doc-structure="references"><h2 class="references-title">参考文献 / References</h2>';
      references.forEach((ref: any) => {
        referencesHtml += `<div class="reference-item" id="ref-${ref.id}"><span class="reference-id">[${ref.id}]</span> ${ref.text}</div>`;
      });
      referencesHtml += '</div>';
    }

    // 添加页码
    const pageNumber = formatConfig.document.pageNumbers ? '<div class="page-number">- 1 -</div>' : '';

    const blockAnnotatedHtml = (() => {
      if (typeof DOMParser === 'undefined') {
        return replaceSelectionMarkersWithHtml(toc + html + referencesHtml + pageNumber, appliedSelections);
      }

      const parser = new DOMParser();
      const documentNode = parser.parseFromString(
        `<div id="md2word-preview-root">${toc}${html}${referencesHtml}${pageNumber}</div>`,
        'text/html'
      );
      const root = documentNode.getElementById('md2word-preview-root');

      if (!root) {
        return toc + html + referencesHtml + pageNumber;
      }

      const tagToBlockType: Record<string, MarkdownBlockType> = {
        H1: 'heading1',
        H2: 'heading2',
        H3: 'heading3',
        P: 'paragraph',
        BLOCKQUOTE: 'blockquote',
        PRE: 'code',
        UL: 'list',
        OL: 'list',
        HR: 'hr',
      };

      const supportedBlocks = markdownBlocks.filter((block) =>
        ['heading1', 'heading2', 'heading3', 'paragraph', 'blockquote', 'formula', 'code', 'list', 'hr'].includes(block.blockType)
      );

      const topLevelElements = Array.from(root.children) as HTMLElement[];
      let blockIndex = 0;

      topLevelElements.forEach((element) => {
        const expectedBlockType =
          element.tagName === 'DIV' && element.classList.contains('formula')
            ? 'formula'
            : tagToBlockType[element.tagName];
        if (!expectedBlockType) {
          return;
        }

        while (
          blockIndex < supportedBlocks.length &&
          supportedBlocks[blockIndex].blockType !== expectedBlockType
        ) {
          blockIndex += 1;
        }

        const currentBlock = supportedBlocks[blockIndex];
        if (!currentBlock || currentBlock.blockType !== expectedBlockType) {
          return;
        }

        element.dataset.blockId = currentBlock.blockId;
        element.dataset.blockType = currentBlock.blockType;

        if (currentBlock.blockId === previewSelectedBlockId) {
          element.dataset.blockSelected = 'true';
        }

        blockIndex += 1;
      });

      const htmlWithSelections = replaceSelectionMarkersWithHtml(root.innerHTML, appliedSelections);
      const finalDocument = parser.parseFromString(
        `<div id="md2word-preview-final">${htmlWithSelections}</div>`,
        'text/html'
      );
      const finalRoot = finalDocument.getElementById('md2word-preview-final');

      if (!finalRoot) {
        return htmlWithSelections;
      }

      annotatePreviewSegments(finalRoot, previewSegments);
      annotatePreviewSelectionHighlights(finalRoot, previewSelectionInfo);
      return finalRoot.innerHTML;
    })();

    return blockAnnotatedHtml;
  }, [
    appliedSelections,
    content,
    convertLatexToUnicode,
    formatConfig,
    markdownBlocks,
    previewSegments,
    previewSelectionInfo,
    previewSelectedBlockId,
  ]);

  const renderedPreview = useMemo(() => {
    if (!content) {
      return '';
    }

    const scopedBlockCss = buildScopedBlockCss(markdownBlocks, formatConfig, scopedPatches);
    const scopedSelectionCss = buildSelectionCss(formatConfig, scopedPatches, appliedSelections);
    let templateCSS = `
      <style>
        .markdown-preview h1 {
          font-size: ${formatConfig.h1.fontSizePt}pt;
          font-family: ${formatConfig.h1.fontFamily};
          text-align: ${formatConfig.h1.align};
          font-weight: ${formatConfig.h1.bold ? 'bold' : 'normal'};
          color: ${formatConfig.h1.color};
          line-height: ${formatConfig.h1.lineSpacing};
          margin: 24px 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #333;
        }
        .markdown-preview h2 {
          font-size: ${formatConfig.h2.fontSizePt}pt;
          font-family: ${formatConfig.h2.fontFamily};
          font-weight: ${formatConfig.h2.bold ? 'bold' : 'normal'};
          color: ${formatConfig.h2.color};
          line-height: ${formatConfig.h2.lineSpacing};
          margin: 20px 0 12px 0;
        }
        .markdown-preview h3 {
          font-size: ${formatConfig.h3.fontSizePt}pt;
          font-family: ${formatConfig.h3.fontFamily};
          font-weight: ${formatConfig.h3.bold ? 'bold' : 'normal'};
          color: ${formatConfig.h3.color};
          line-height: ${formatConfig.h3.lineSpacing};
          margin: 16px 0 10px 0;
        }
        .markdown-preview p {
          font-size: ${formatConfig.body.fontSizePt}pt;
          font-family: ${formatConfig.body.fontFamily};
          line-height: ${formatConfig.body.lineSpacing};
          color: ${formatConfig.body.color};
          margin: 12px 0;
          text-align: ${formatConfig.body.align};
        }
        .markdown-preview .page-number {
          display: ${formatConfig.document.pageNumbers ? 'block' : 'none'};
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 10pt;
        }
        ${scopedBlockCss}
        ${scopedSelectionCss}
      </style>
    `;

    if (customStyles.length > 0) {
      customStyles.forEach((style) => {
        templateCSS += `\n        ${style.css}`;
      });
    }

    const previewBody = isPagedPreview
      ? buildPagedPreview(previewContent, documentPresentation).html
      : previewContent;

    return templateCSS + previewBody;
  }, [
    appliedSelections,
    content,
    customStyles,
    documentPresentation,
    formatConfig,
    isPagedPreview,
    markdownBlocks,
    previewContent,
    scopedPatches,
  ]);

  const handlePreviewClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (suppressPreviewClickRef.current) {
        suppressPreviewClickRef.current = false;
        return;
      }

      const selectedText = window.getSelection?.()?.toString().trim();
      if (selectedText) {
        return;
      }

      const target = event.target as HTMLElement;
      const blockElement = target.closest<HTMLElement>('[data-block-id]');

      if (!blockElement) {
        return;
      }

      const blockId = blockElement.dataset.blockId;
      if (blockId) {
        const nextSelectionRange = {
          start: selectionRange.end,
          end: selectionRange.end,
        };
        setPreviewSelectedBlockId(blockId);
        setPreviewSelectionInfo(undefined);
        setActiveSelectionOrigin('preview');
        setSelectionRange(nextSelectionRange);
        publishScopeChange(nextSelectionRange, blockId);
      }
    },
    [publishScopeChange, selectionRange.end]
  );

  const handlePreviewMouseUp = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const pointerSelection = resolvePreviewSelectionFromPoints(
      previewRootRef.current,
      previewSegments,
      previewPointerStartRef.current,
      { x: event.clientX, y: event.clientY }
    );
    const selection = window.getSelection?.();
    const selectedText = selection?.toString() ?? '';
    const trimmedSelection = selectedText.trim();

    previewPointerStartRef.current = null;

    if (pointerSelection && pointerSelection.selectedText.trim()) {
      setPreviewSelectedBlockId(undefined);
      setPreviewSelectionInfo(pointerSelection);
      setActiveSelectionOrigin('preview');
      const nextSelectionRange = {
        start: pointerSelection.segments[0].sourceStart,
        end: pointerSelection.segments[pointerSelection.segments.length - 1].sourceEnd,
      };
      setSelectionRange(nextSelectionRange);
      publishScopeChange(nextSelectionRange, undefined, pointerSelection);
      selection?.removeAllRanges();
      suppressPreviewClickRef.current = true;
      return;
    }

    if (!selection || !trimmedSelection) {
      return;
    }

    const resolvedPreviewSelection = resolvePreviewSelection(previewRootRef.current, selection, previewSegments);

    if (resolvedPreviewSelection) {
      setPreviewSelectedBlockId(undefined);
      setPreviewSelectionInfo(resolvedPreviewSelection);
      setActiveSelectionOrigin('preview');

      if (resolvedPreviewSelection.segments.length === 1) {
        const [segment] = resolvedPreviewSelection.segments;
        const nextSelectionRange = {
          start: segment.sourceStart,
          end: segment.sourceEnd,
        };
        setSelectionRange(nextSelectionRange);
        publishScopeChange(nextSelectionRange, undefined, resolvedPreviewSelection);
        return;
      }

      const nextSelectionRange = {
        start: resolvedPreviewSelection.segments[0].sourceStart,
        end: resolvedPreviewSelection.segments[resolvedPreviewSelection.segments.length - 1].sourceEnd,
      };
      setSelectionRange(nextSelectionRange);
      publishScopeChange(nextSelectionRange, undefined, resolvedPreviewSelection);
      return;
    }

    const anchorNode = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode?.parentElement;
    const focusNode = selection.focusNode instanceof Element ? selection.focusNode : selection.focusNode?.parentElement;
    const anchorBlock = anchorNode?.closest<HTMLElement>('[data-block-id]');
    const focusBlock = focusNode?.closest<HTMLElement>('[data-block-id]');

    if (!anchorBlock || !focusBlock || anchorBlock.dataset.blockId !== focusBlock.dataset.blockId) {
      return;
    }

    // 预览区选区如果无法精确映射到 segment，就不要退回到“按文本找第一次出现”。
    // 否则一旦命中重复文本或浏览器边界节点异常，容易把前文整段错误卷入。
    return;
  }, [markdownBlocks, previewSegments, publishScopeChange]);

  const handlePreviewPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    previewPointerStartRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleSplitDragStart = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDraggingSplit(true);
  }, []);

  // 工具按钮配置
  const toolbarButtons = [
    { icon: 'format_bold', action: 'bold', title: language === 'zh' ? '粗体 (Ctrl+B)' : 'Bold (Ctrl+B)' },
    { icon: 'format_italic', action: 'italic', title: language === 'zh' ? '斜体 (Ctrl+I)' : 'Italic (Ctrl+I)' },
    { icon: 'title', action: 'heading', title: language === 'zh' ? '标题' : 'Heading' },
    { divider: true },
    { icon: 'link', action: 'link', title: language === 'zh' ? '链接 (Ctrl+K)' : 'Link (Ctrl+K)' },
    { icon: 'image', action: 'image', title: language === 'zh' ? '图片' : 'Image' },
    { divider: true },
    { icon: 'code', action: 'code', title: language === 'zh' ? '行内代码' : 'Inline Code' },
    { icon: 'code_blocks', action: 'codeblock', title: language === 'zh' ? '代码块' : 'Code Block' },
    { divider: true },
    { icon: 'format_list_bulleted', action: 'list', title: language === 'zh' ? '列表' : 'List' },
    { icon: 'format_quote', action: 'quote', title: language === 'zh' ? '引用' : 'Quote' },
    { icon: 'table_chart', action: 'table', title: language === 'zh' ? '表格' : 'Table' },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900 relative">
      {/* 工具栏 */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 justify-between bg-white dark:bg-slate-800 sticky top-0 z-10">
        <div className="flex items-center gap-0.5">
          {toolbarButtons.map((btn, index) => (
            btn.divider ? (
              <div key={`divider-${index}`} className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-2"></div>
            ) : (
              <button 
                key={btn.icon} 
                onClick={() => handleToolbarAction(btn.action!)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title={btn.title}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{btn.icon}</span>
              </button>
            )
          ))}
        </div>

        {/* 视图切换 */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
            {([
              { value: 'superdoc', label: language === 'zh' ? 'Word 预览' : 'Word Preview' },
              { value: 'html', label: language === 'zh' ? 'HTML 回退' : 'HTML Fallback' },
            ] as Array<{ value: PreviewEngine; label: string }>).map((engine) => (
              <button
                key={engine.value}
                type="button"
                onClick={() => onPreviewEngineChange?.(engine.value)}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                  previewEngine === engine.value
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                {engine.label}
              </button>
            ))}
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
            {(['split', 'source', 'preview'] as ViewMode[]).map((mode) => (
              <button 
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                  viewMode === mode 
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                {mode === 'split' ? (language === 'zh' ? '分栏' : 'Split') : 
                 mode === 'source' ? (language === 'zh' ? '源码' : 'Source') :
                 (language === 'zh' ? '预览' : 'Preview')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 编辑器区域 */}
      <div
        ref={splitContainerRef}
        data-editor-split-container="true"
        className={`flex-1 flex overflow-hidden ${isDraggingSplit ? 'cursor-col-resize' : ''}`}
      >
        {/* 代码输入 */}
        {(viewMode === 'split' || viewMode === 'source') && (
          <div
            data-editor-pane="source"
            className={`bg-white dark:bg-slate-800 overflow-y-auto flex flex-col min-w-0 ${
              viewMode === 'split' ? '' : 'flex-1'
            }`}
            style={
              viewMode === 'split'
                ? {
                    flex: `0 0 ${Math.round(splitRatio * 1000) / 10}%`,
                  }
                : undefined
            }
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              onSelect={syncSelectionFromTextarea}
              onClick={syncSelectionFromTextarea}
              onKeyUp={syncSelectionFromTextarea}
              onMouseUp={scheduleSelectionSync}
              onPointerUp={scheduleSelectionSync}
              onInput={syncSelectionFromTextarea}
              onFocus={syncSelectionFromTextarea}
              className="w-full flex-1 p-6 font-mono text-sm leading-relaxed text-slate-800 dark:text-slate-200 bg-transparent resize-none focus:outline-none"
              placeholder={language === 'zh' ? '在此输入 Markdown 内容...' : 'Type your Markdown here...'}
              spellCheck={false}
            />
          </div>
        )}

        {viewMode === 'split' && (
          <div className="relative w-4 flex-shrink-0 bg-slate-100 dark:bg-slate-800 border-x border-slate-200 dark:border-slate-700">
            <button
              type="button"
              aria-label={language === 'zh' ? '拖动调整编辑区与预览区宽度' : 'Resize editor and preview panes'}
              data-splitter-handle="true"
              onPointerDown={handleSplitDragStart}
              className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 cursor-col-resize touch-none group"
            >
              <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-slate-300 dark:bg-slate-600 group-hover:bg-indigo-400 group-active:bg-indigo-500 transition-colors" />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1">
                <span className="block w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500" />
                <span className="block w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500" />
                <span className="block w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500" />
              </span>
            </button>
          </div>
        )}

        {/* 实时预览 */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div
            data-editor-pane="preview"
            className={`bg-slate-100 dark:bg-slate-900 overflow-y-auto h-full min-w-0 ${
              viewMode === 'split' ? '' : 'flex-1'
            }`}
            style={
              viewMode === 'split'
                ? {
                    flex: `1 1 ${Math.round((1 - splitRatio) * 1000) / 10}%`,
                  }
                : undefined
            }
          >
            {isSuperDocPreview ? (
              <div className="relative min-h-full p-4 md:p-6">
                <div className="h-full min-h-[72vh] w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
                  <SuperDocPreview
                    markdown={content}
                    documentName={documentName}
                    language={language}
                    formatConfig={formatConfig}
                    scopedPatches={scopedPatches}
                    structureSummaryText={superDocStructureSummaryText}
                    structureGuidanceItems={superDocStructureGuidanceItems}
                    focusState={superDocFocusState}
                    onSelectionChange={handleSuperDocSelectionChange}
                    onRuntimeAdapterChange={onSuperDocRuntimeAdapterChange}
                    onStatusChange={onSuperDocStatusChange}
                    pendingFormattingRequest={pendingSuperDocFormattingRequest}
                    reviewState={superDocReviewState}
                    undoSignal={superDocUndoSignal}
                    onApplyFormatting={onSuperDocFormattingApplied}
                    onOpenReview={onSuperDocReviewOpen}
                    onCloseReview={onSuperDocReviewClose}
                  />
                </div>
                {!content && (
                  <div className="text-center text-slate-400 dark:text-slate-500 mt-20">
                    <span className="material-symbols-outlined text-5xl mb-4 block">edit_note</span>
                    <p>{language === 'zh' ? 'Word 预览将在此显示' : 'Word preview will appear here'}</p>
                  </div>
                )}
              </div>
            ) : isPagedPreview ? (
              <div className="relative min-h-full p-4 md:p-6">
                <div
                  ref={previewRootRef}
                  className={`markdown-preview prose dark:prose-invert max-w-none md2word-preview-paged mx-auto w-full max-w-none`}
                  data-preview-engine="html"
                  onPointerDown={handlePreviewPointerDown}
                  onClick={handlePreviewClick}
                  onMouseUp={handlePreviewMouseUp}
                  dangerouslySetInnerHTML={{ __html: renderedPreview }}
                />
                {!content && (
                  <div className="text-center text-slate-400 dark:text-slate-500 mt-20">
                    <span className="material-symbols-outlined text-5xl mb-4 block">edit_note</span>
                    <p>{language === 'zh' ? '预览将在此显示' : 'Preview will appear here'}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 max-w-3xl mx-auto min-h-full">
                <div
                  ref={previewRootRef}
                  className="markdown-preview prose dark:prose-invert max-w-none"
                  data-preview-engine="html"
                  onPointerDown={handlePreviewPointerDown}
                  onClick={handlePreviewClick}
                  onMouseUp={handlePreviewMouseUp}
                  dangerouslySetInnerHTML={{ __html: renderedPreview }}
                />
                {!content && (
                  <div className="text-center text-slate-400 dark:text-slate-500 mt-20">
                    <span className="material-symbols-outlined text-5xl mb-4 block">edit_note</span>
                    <p>{language === 'zh' ? '预览将在此显示' : 'Preview will appear here'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="h-8 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center px-4 justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span>{language === 'zh' ? `${stats.charCount} 字符` : `${stats.charCount} chars`}</span>
          <span>{language === 'zh' ? `${stats.wordCount} 词` : `${stats.wordCount} words`}</span>
          <span>{language === 'zh' ? `${stats.lineCount} 行` : `${stats.lineCount} lines`}</span>
          <span>{language === 'zh' ? `${stats.paragraphCount} 段` : `${stats.paragraphCount} paragraphs`}</span>
          <span>{scopeSummary}</span>
          <span>
            {language === 'zh'
              ? `预览引擎：${isSuperDocPreview ? 'SuperDoc' : 'HTML'}`
              : `Preview engine: ${isSuperDocPreview ? 'SuperDoc' : 'HTML'}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">schedule</span>
          <span>{language === 'zh' ? `约 ${stats.readTime} 分钟阅读` : `~${stats.readTime} min read`}</span>
        </div>
      </div>
    </div>
  );
};
