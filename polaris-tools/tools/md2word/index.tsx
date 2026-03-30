import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { TopNavigation } from './TopNavigation';
import { SidebarLeft } from './SidebarLeft';
import { Editor } from './Editor';
import { SidebarRight } from './SidebarRight';
import { FileUploader } from './FileUploader';
import { FileList } from './FileList';
import { BatchToolbar } from './BatchToolbar';
import {
  BaseTemplateId,
  DEFAULT_DOCUMENT_PRESENTATION_STATE,
  DocumentPresentationState,
  FileItem,
  ExportFormat,
  PreviewEngine,
  TabMode,
  FileStatus,
  GlobalSettings,
} from './types';
import { useAppContext } from '../../context/AppContext';
import { ToastContainer, ToastType } from '../../components/Toast';
import {
  exportDocxWithPriority,
  markdownToPdf,
  markdownToHtml,
  downloadFile,
  type SuperDocDocxExportAdapter,
} from '../../utils/documentConverter';
import type { AiFormattingParseResponse } from '../../api/aiFormattingApi';
import { apiClient, ApiError } from '../../api/client';
import { createDefaultFormatState, DEFAULT_BASE_TEMPLATE } from './formatting/defaults';
import {
  buildAppliedAiFormattingSummary,
  buildPendingAiReview,
  clearPendingAiSelections,
  compilePendingAiReviewToScopedPatches,
  countSelectedAiChanges,
  togglePendingAiSegment,
  togglePendingAiStyleChange,
  type AppliedAiFormattingSummaryDetail,
  type PendingAiReviewState,
} from './formatting/aiReview';
import { mergeDocumentFormatPatch } from './formatting/mergePatch';
import { resolveFormatConfig } from './formatting/resolveFormatConfig';
import type {
  DocumentFormatPatch,
  DocumentSettingsPatch,
  FormatState,
  FormatScope,
  ScopedFormatPatch,
} from './formatting/types';
import type { EditorScopeInfo } from './formatting/scopeTypes';
import {
  buildSuperDocRuntimeScopeSummary,
  type SuperDocFormattingApplicationRequest,
  type SuperDocFormattingApplicationResult,
  type SuperDocFormattingChange,
  type SuperDocFormattingReviewState,
  type SuperDocRuntimeSelectionState,
  shouldUseSuperDocDocumentScope,
  shouldApplySuperDocFormattingGlobally,
} from './superdocSelection';
import { analyzeSuperDocStructure, shouldPreferSuperDocDocxExport } from './superdocStructure';
import {
  type Md2WordHistoryEntry,
} from './history';

const AI_SUPPORTED_PROPERTIES = [
  'fontFamily',
  'fontSizePt',
  'color',
  'align',
  'bold',
  'italic',
  'lineSpacing',
  'paragraphSpacingBeforePt',
  'paragraphSpacingAfterPt',
  'indentLeftPt',
  'backgroundColor',
  'imageQuality',
  'includeTableOfContents',
  'pageNumbers',
  'mirrorMargins',
  'pageSize',
] as const;

const SUPERDOC_DIRECT_PROPERTIES = new Set([
  'bold',
  'italic',
  'fontFamily',
  'fontSizePt',
  'color',
  'align',
  'lineSpacing',
  'indentLeftPt',
]);

const toSuperDocReviewChanges = (
  patch: DocumentFormatPatch,
  summary: string | undefined,
  prefix: string
): SuperDocFormattingChange[] =>
  Object.entries(patch).flatMap(([target, targetPatch]) => {
    if (!targetPatch) {
      return [];
    }

    return Object.entries(targetPatch)
      .filter(([property]) => SUPERDOC_DIRECT_PROPERTIES.has(property))
      .map(([property, value], index) => ({
        changeId: `${prefix}-${target}-${property}-${index}`.replace(/[^a-zA-Z0-9_-]/g, '-'),
        target,
        property,
        value: value as string | number | boolean,
        label: summary ?? `${target}.${property}`,
      }));
  });

const buildSuperDocPendingReview = (
  response: AiFormattingParseResponse,
  selection: SuperDocRuntimeSelectionState,
  instruction: string
): PendingAiReviewState | null => {
  const documentLevelChanges = toSuperDocReviewChanges(
    response.documentPatch ?? {},
    response.summary ?? undefined,
    'superdoc-document'
  );
  const scopedChanges = (response.scopedPatches ?? []).flatMap((patch, index) =>
    toSuperDocReviewChanges(
      patch.patch ?? {},
      patch.summary ?? response.summary ?? undefined,
      `superdoc-scoped-${index}`
    )
  );
  const styleChanges = [...documentLevelChanges, ...scopedChanges].map((change) => ({
    ...change,
    selected: true,
  }));

  if (styleChanges.length === 0) {
    return null;
  }

  return {
    instruction,
    summary: response.summary,
    providerUsed: response.providerUsed ?? null,
    remainingCount: response.remainingCount ?? null,
    totalSegmentCount: 1,
    unmatchedSegmentCount: 0,
    segments: [
      {
        segmentId: 'superdoc-current-selection',
        blockId: 'superdoc-current-selection',
        blockType: 'selection',
        textPreview: selection.text.slice(0, 80),
        selectedText: selection.text,
        sourceStart: selection.from,
        sourceEnd: selection.to,
        selected: true,
        summary: response.summary,
        styleChanges,
      },
    ],
  };
};

const getOrCreateGuestId = (): string => {
  if (typeof localStorage === 'undefined') {
    return 'guest-fallback';
  }

  const storageKey = 'md2word_ai_guest_id';
  const existing = localStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  localStorage.setItem(storageKey, generated);
  return generated;
};

const createEmptyDocumentPatch = (): DocumentFormatPatch => ({});
const AI_EXPORT_SUMMARY_CARD_ID = 'md2word-ai-export-summary-card';
const AI_EXPORT_SUMMARY_HIGHLIGHT_MS = 2200;
const SUPERDOC_PREVIEW_STORAGE_KEY = 'md2word-preview-engine';

const buildExportSuccessAiSummary = (
  scopeCount: number,
  styleChangeCount: number,
  hasDocumentLevelChanges: boolean,
  language: string
): string => {
  if (styleChangeCount <= 0) {
    return '';
  }

  if (language === 'zh') {
    const baseSummary = `，包含 ${scopeCount} 个 AI 作用范围、${styleChangeCount} 条样式变化`;
    return hasDocumentLevelChanges ? `${baseSummary}，并包含整篇文档级设置` : baseSummary;
  }

  const baseSummary = `, including ${scopeCount} AI scopes and ${styleChangeCount} style changes`;
  return hasDocumentLevelChanges ? `${baseSummary}, with document-level settings` : baseSummary;
};

// 默认 Markdown 内容
const DEFAULT_CONTENT = `# 测试文献引用功能

## 引言

人工智能的发展已经改变了我们的生活方式[^1]。深度学习技术在图像识别领域取得了突破性进展[^2]。

## 研究背景

根据最新研究[^3]，自然语言处理技术正在快速发展。Transformer架构的提出[^4]为大语言模型的发展奠定了基础。

## 数学公式示例

深度学习中常用的激活函数包括：

- Sigmoid函数：$\\sigma(x) = \\frac{1}{1+e^{-x}}$
- ReLU函数：$f(x) = \\max(0, x)$

损失函数的计算公式为：

$$
L = \\frac{1}{n}\\sum_{i=1}^{n}(y_i - \\hat{y}_i)^2
$$

## 结论

本文综述了人工智能领域的最新进展[^5]，并展望了未来的发展方向。

---

[^1]: LeCun, Y., Bengio, Y., & Hinton, G. (2015). Deep learning. Nature, 521(7553), 436-444.
[^2]: He, K., Zhang, X., Ren, S., & Sun, J. (2016). Deep residual learning for image recognition. CVPR, 770-778.
[^3]: Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2018). BERT: Pre-training of deep bidirectional transformers for language understanding. arXiv preprint arXiv:1810.04805.
[^4]: Vaswani, A., et al. (2017). Attention is all you need. Advances in neural information processing systems, 30.
[^5]: Goodfellow, I., Bengio, Y., & Courville, A. (2016). Deep learning. MIT press.
`;

const INITIAL_FILES: FileItem[] = [
  { 
    id: '1', 
    name: 'Untitled.md', 
    content: DEFAULT_CONTENT, 
    lastEdited: 'Just now', 
    type: 'markdown', 
    size: DEFAULT_CONTENT.length, 
    status: FileStatus.Pending, 
    progress: 0 
  }
];

/**
 * MD2Word 主组件
 * Markdown 转 Word 文档工具
 * 支持单文档编辑模式和批量转换模式
 */
export const Md2Word: React.FC = () => {
  const {
    setPage,
    t,
    language,
    isGuest,
    isAuthenticated,
    user,
    checkGuestUsage,
    recordGuestToolUsage,
  } = useAppContext();
  
  // Tab 模式状态
  const [tabMode, setTabMode] = useState<TabMode>('editor');
  
  // 编辑器模式状态
  const [files, setFiles] = useState<FileItem[]>(INITIAL_FILES);
  const [historyItems, setHistoryItems] = useState<Md2WordHistoryEntry[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [activeFileId, setActiveFileId] = useState<string>('1');
  const [formatState, setFormatState] = useState<FormatState>(() =>
    createDefaultFormatState(DEFAULT_BASE_TEMPLATE)
  );
  const [documentPresentationState, setDocumentPresentationState] = useState<DocumentPresentationState>(
    DEFAULT_DOCUMENT_PRESENTATION_STATE
  );
  const [previewEngine, setPreviewEngine] = useState<PreviewEngine>(() => {
    if (typeof window === 'undefined') {
      return 'superdoc';
    }

    const saved = window.localStorage.getItem(SUPERDOC_PREVIEW_STORAGE_KEY);
    if (saved === 'superdoc' || saved === 'html') {
      return saved;
    }

    return import.meta.env.MODE === 'test' ? 'html' : 'superdoc';
  });
  const [aiDocumentPatch, setAiDocumentPatch] = useState<DocumentFormatPatch>(() => createEmptyDocumentPatch());
  const [aiScopedPatches, setAiScopedPatches] = useState<ScopedFormatPatch[]>([]);
  const [lastAiState, setLastAiState] = useState<{
    documentPatch: DocumentFormatPatch;
    scopedPatches: ScopedFormatPatch[];
  } | null>(null);
  const [scopeInfo, setScopeInfo] = useState<EditorScopeInfo | null>(null);
  const scopeInfoRef = useRef<EditorScopeInfo | null>(null);
  const [aiRemainingCount, setAiRemainingCount] = useState<number | null | undefined>(undefined);
  const [aiLastSummary, setAiLastSummary] = useState<string | null>(null);
  const [aiLastProvider, setAiLastProvider] = useState<string | null>(null);
  const [pendingAiReview, setPendingAiReview] = useState<PendingAiReviewState | null>(null);
  const [hoveredAiReviewSegmentId, setHoveredAiReviewSegmentId] = useState<string | null>(null);
  const [activeAiAppliedDetailId, setActiveAiAppliedDetailId] = useState<string | null>(null);
  const [hoveredAiAppliedDetailId, setHoveredAiAppliedDetailId] = useState<string | null>(null);
  const [highlightAiAppliedSummary, setHighlightAiAppliedSummary] = useState(false);
  const [isApplyingAi, setIsApplyingAi] = useState(false);
  const [superDocSelectionState, setSuperDocSelectionState] = useState<SuperDocRuntimeSelectionState | null>(null);
  const [superDocRuntime, setSuperDocRuntime] = useState<SuperDocDocxExportAdapter | null>(null);
  const [superDocPendingReview, setSuperDocPendingReview] = useState<PendingAiReviewState | null>(null);
  const [superDocFormattingRequest, setSuperDocFormattingRequest] =
    useState<SuperDocFormattingApplicationRequest | null>(null);
  const [superDocUndoSignal, setSuperDocUndoSignal] = useState(0);
  const [superDocCanUndo, setSuperDocCanUndo] = useState(false);
  const guestIdRef = useRef<string>(getOrCreateGuestId());
  const aiSummaryHighlightTimerRef = useRef<number | null>(null);
  const historySaveTimerRef = useRef<number | null>(null);
  const superDocRuntimeReady = Boolean(superDocRuntime?.exportDocx);
  const normalizeHistoryEntry = useCallback((entry: Md2WordHistoryEntry): Md2WordHistoryEntry => ({
    ...entry,
    id: Number(entry.id),
    clientFileId: String(entry.clientFileId),
    documentName: entry.documentName || 'Untitled.md',
    content: entry.content ?? '',
    previewText: entry.previewText ?? undefined,
    wordCount: typeof entry.wordCount === 'number' ? entry.wordCount : undefined,
    charCount: typeof entry.charCount === 'number' ? entry.charCount : undefined,
    updatedAt: new Date(entry.updatedAt).toISOString(),
  }), []);
  
  // 批量转换模式状态
  const [batchFiles, setBatchFiles] = useState<FileItem[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    template: DEFAULT_BASE_TEMPLATE,
    format: 'docx'
  });
  
  // Toast 提示状态
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      message: string;
      type: ToastType;
      actionLabel?: string;
      actionAriaLabel?: string;
      onAction?: () => void;
    }>
  >([]);
  
  // 游客使用记录
  const [hasRecordedUsage, setHasRecordedUsage] = useState(false);
  
  // 记录工具使用 - 包含使用时长追踪
  const hasRecordedToolUsage = useRef(false);
  const usageIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  
  // 发送使用时长的函数
  const sendDuration = useCallback(async () => {
    if (usageIdRef.current) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (duration > 0) {
        try {
          await apiClient.tools.updateUsageDuration(usageIdRef.current, duration);
          console.debug('Tool usage duration recorded:', duration, 'seconds');
        } catch (err) {
          console.debug('Failed to update usage duration:', err);
        }
      }
      usageIdRef.current = null;
    }
  }, []);
  
  useEffect(() => {
    const recordToolUsage = async () => {
      if (isGuest) {
        return;
      }
      if (!hasRecordedToolUsage.current) {
        hasRecordedToolUsage.current = true;
        startTimeRef.current = Date.now();
        try {
          const result = await apiClient.tools.recordUseByUrl('md2word');
          if (result.data) {
            usageIdRef.current = result.data;
            console.debug('Tool usage recorded, usageId:', result.data);
          }
        } catch (err) {
          console.debug('Failed to record tool usage:', err);
        }
      }
    };
    recordToolUsage();
    
    // 页面卸载时发送使用时长
    const handleBeforeUnload = () => {
      if (usageIdRef.current) {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const token = localStorage.getItem('token');
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        navigator.sendBeacon(
          `${baseUrl}/api/v1/tools/usage/${usageIdRef.current}/duration?duration=${duration}`,
          ''
        );
      }
    };
    
    // 页面可见性变化时发送
    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendDuration();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sendDuration();
    };
  }, [isGuest, sendDuration]);
  
  // Toast 管理
  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    options?: {
      actionLabel?: string;
      actionAriaLabel?: string;
      onAction?: () => void;
    }
  ) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, ...options }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const focusAiAppliedSummary = useCallback(() => {
    const summaryCard = document.getElementById(AI_EXPORT_SUMMARY_CARD_ID);
    if (!summaryCard) {
      return;
    }

    summaryCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setHighlightAiAppliedSummary(true);
    if (aiSummaryHighlightTimerRef.current !== null) {
      window.clearTimeout(aiSummaryHighlightTimerRef.current);
    }
    aiSummaryHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightAiAppliedSummary(false);
      aiSummaryHighlightTimerRef.current = null;
    }, AI_EXPORT_SUMMARY_HIGHLIGHT_MS);
  }, []);

  const handleSelectAiAppliedDetail = useCallback((detailId: string) => {
    setActiveAiAppliedDetailId((current) => (current === detailId ? null : detailId));
  }, []);

  const handleHoverAiAppliedDetail = useCallback((detailId: string | null) => {
    setHoveredAiAppliedDetailId(detailId);
  }, []);

  useEffect(() => () => {
    if (aiSummaryHighlightTimerRef.current !== null) {
      window.clearTimeout(aiSummaryHighlightTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SUPERDOC_PREVIEW_STORAGE_KEY, previewEngine);
  }, [previewEngine]);

  const currentUserId = user?.id != null ? String(user.id) : null;

  useEffect(() => {
    if (!isAuthenticated || !currentUserId) {
      setHistoryItems([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const result = await apiClient.documents.getMd2WordHistory(historySearch);
        if (cancelled) {
          return;
        }

        const nextHistory = (result.data ?? [])
          .map((item) => normalizeHistoryEntry(item as Md2WordHistoryEntry))
          .filter((item) => Boolean(item.clientFileId))
          .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

        setHistoryItems(nextHistory);
      } catch (error) {
        if (!cancelled) {
          setHistoryItems([]);
          console.debug('Failed to load md2word history:', error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, historySearch, isAuthenticated, normalizeHistoryEntry]);

  useEffect(
    () => () => {
      if (historySaveTimerRef.current !== null) {
        window.clearTimeout(historySaveTimerRef.current);
      }
    },
    []
  );
  
  // 获取当前活跃文件
  const activeFile = files.find(f => f.id === activeFileId);
  const activeFileName = activeFile?.name || 'Untitled';
  const activeContent = activeFile?.content || '';
  const superDocStructureSummary = React.useMemo(
    () => analyzeSuperDocStructure(activeContent),
    [activeContent]
  );
  const shouldPreferSuperDocExport = useMemo(
    () => previewEngine === 'superdoc' && shouldPreferSuperDocDocxExport(superDocStructureSummary),
    [previewEngine, superDocStructureSummary]
  );
  const effectiveFormatState = React.useMemo<FormatState>(
    () => ({
      ...formatState,
      documentPatch: mergeDocumentFormatPatch(formatState.documentPatch, aiDocumentPatch),
      scopedPatches: [...formatState.scopedPatches, ...aiScopedPatches],
    }),
    [aiDocumentPatch, aiScopedPatches, formatState]
  );
  const resolvedFormatConfig = React.useMemo(
    () => resolveFormatConfig(effectiveFormatState),
    [effectiveFormatState]
  );
  const selectedTemplate = formatState.baseTemplate;
  const customStyles = formatState.legacyPreviewStyles;
  const exportSettings = React.useMemo(
    () => ({
      imageQuality: resolvedFormatConfig.document.imageQuality,
      includeTableOfContents: resolvedFormatConfig.document.includeTableOfContents,
      pageNumbers: resolvedFormatConfig.document.pageNumbers,
      mirrorMargins: resolvedFormatConfig.document.mirrorMargins,
    }),
    [resolvedFormatConfig]
  );
  const aiAppliedSummary = React.useMemo(
    () => buildAppliedAiFormattingSummary(aiDocumentPatch, aiScopedPatches),
    [aiDocumentPatch, aiScopedPatches]
  );
  const currentPendingAiReview = previewEngine === 'superdoc' ? superDocPendingReview : pendingAiReview;
  const currentCanUndoAi = previewEngine === 'superdoc' ? superDocCanUndo : lastAiState !== null;
  const currentCanClearAi =
    previewEngine === 'superdoc'
      ? Boolean(superDocPendingReview || superDocCanUndo || aiLastSummary || aiLastProvider)
      : Object.keys(aiDocumentPatch).length > 0 || aiScopedPatches.length > 0;
  const superDocReviewState = React.useMemo<SuperDocFormattingReviewState | null>(() => {
    if (!isApplyingAi && !superDocPendingReview && !superDocFormattingRequest) {
      return null;
    }

    return {
      status: superDocFormattingRequest ? 'applying' : superDocPendingReview ? 'review' : 'idle',
      selectedCount: superDocPendingReview ? countSelectedAiChanges(superDocPendingReview) : 0,
      hasPendingChanges: Boolean(superDocPendingReview),
      summary: superDocPendingReview?.summary ?? aiLastSummary ?? undefined,
    };
  }, [aiLastSummary, isApplyingAi, superDocFormattingRequest, superDocPendingReview]);
  const displayedAiAppliedDetailId = hoveredAiAppliedDetailId ?? activeAiAppliedDetailId;
  const activeAiAppliedDetail = React.useMemo<AppliedAiFormattingSummaryDetail | null>(
    () => aiAppliedSummary.details.find((detail) => detail.id === displayedAiAppliedDetailId) ?? null,
    [aiAppliedSummary.details, displayedAiAppliedDetailId]
  );
  const handleRevertAiAppliedDetail = useCallback(
    (detailId: string) => {
      const detail = aiAppliedSummary.details.find((item) => item.id === detailId);
      if (!detail) {
        return;
      }

      if (detail.revertAction.kind === 'document-patch') {
        setAiDocumentPatch(createEmptyDocumentPatch());
      } else if (detail.revertAction.kind === 'scoped-patch' && detail.revertAction.patchId) {
        setAiScopedPatches((current) =>
          current.filter((patch) => patch.id !== detail.revertAction.patchId)
        );
      }

      setActiveAiAppliedDetailId((current) => (current === detailId ? null : current));
      setHoveredAiAppliedDetailId((current) => (current === detailId ? null : current));
      setLastAiState(null);
      showToast(language === 'zh' ? '已撤销该项 AI 修改' : 'AI change removed', 'info');
    },
    [aiAppliedSummary.details, language, showToast]
  );

  const handleTemplateSelect = useCallback((template: string) => {
    setFormatState(prev => ({
      ...prev,
      baseTemplate: template as BaseTemplateId,
    }));
  }, []);

  const handleSwitchToHtmlFallback = useCallback(() => {
    setPreviewEngine('html');
    showToast(
      language === 'zh'
        ? '已切换到 HTML 回退，方便你复核复杂结构的排版效果。'
        : 'Switched to the HTML fallback preview to review complex structures.',
      'info'
    );
  }, [language, showToast]);

  const handleExportSettingsChange = useCallback((settings: DocumentSettingsPatch) => {
    setFormatState(prev => ({
      ...prev,
      documentPatch: mergeDocumentFormatPatch(prev.documentPatch, {
        document: {
          imageQuality: settings.imageQuality,
          includeTableOfContents: settings.includeTableOfContents,
          pageNumbers: settings.pageNumbers,
          mirrorMargins: settings.mirrorMargins,
        },
      }),
    }));
  }, []);

  const handleHistorySelect = useCallback(
    (historyId: string) => {
      const historyItem = historyItems.find((item) => item.clientFileId === historyId);
      if (!historyItem) {
        return;
      }

      const restoredFile: FileItem = {
        id: historyItem.clientFileId,
        name: historyItem.documentName,
        content: historyItem.content,
        lastEdited: language === 'zh' ? '刚刚恢复' : 'Restored just now',
        type: 'markdown',
        size: historyItem.content.length,
        status: FileStatus.Pending,
        progress: 0,
      };

      setFiles((prev) => [restoredFile, ...prev.filter((file) => file.id !== historyId)]);
      setActiveFileId(historyItem.clientFileId);
      showToast(language === 'zh' ? '已从历史记录恢复文档' : 'Document restored from history', 'success');
    },
    [historyItems, language, showToast]
  );

  const handleHistorySearchChange = useCallback((keyword: string) => {
    setHistorySearch(keyword);
  }, []);

  const handleHistoryRename = useCallback(
    async (historyId: string, documentName: string) => {
      const historyItem = historyItems.find((item) => item.clientFileId === historyId);
      if (!historyItem) {
        return;
      }

      try {
        const result = await apiClient.documents.renameMd2WordHistory(historyItem.id, documentName);
        const renamedEntry = normalizeHistoryEntry(result.data as Md2WordHistoryEntry);
        setHistoryItems((current) =>
          current.map((item) => (item.id === renamedEntry.id ? renamedEntry : item))
        );
        setFiles((current) =>
          current.map((file) =>
            file.id === historyItem.clientFileId ? { ...file, name: renamedEntry.documentName } : file
          )
        );
        showToast(language === 'zh' ? '历史记录已重命名' : 'History renamed', 'success');
      } catch (error) {
        console.debug('Failed to rename md2word history:', error);
        showToast(language === 'zh' ? '重命名失败，请稍后重试' : 'Failed to rename history', 'error');
      }
    },
    [historyItems, language, normalizeHistoryEntry, showToast]
  );

  const handleHistoryDelete = useCallback(
    async (historyId: string) => {
      const historyItem = historyItems.find((item) => item.clientFileId === historyId);
      if (!historyItem) {
        return;
      }

      try {
        await apiClient.documents.deleteMd2WordHistory(historyItem.id);
        setHistoryItems((current) => current.filter((item) => item.id !== historyItem.id));
        showToast(language === 'zh' ? '历史记录已删除' : 'History deleted', 'success');
      } catch (error) {
        console.debug('Failed to delete md2word history:', error);
        showToast(language === 'zh' ? '删除失败，请稍后重试' : 'Failed to delete history', 'error');
      }
    },
    [historyItems, language, showToast]
  );

  const handleDocumentPresentationChange = useCallback((nextState: DocumentPresentationState) => {
    setDocumentPresentationState(nextState);
    setFormatState((prev) => ({
      ...prev,
      documentPatch: mergeDocumentFormatPatch(prev.documentPatch, {
        document: {
          pageSize: nextState.pageSettings.pageSize,
          pageNumbers: nextState.pageSettings.showPageNumbers,
          mirrorMargins: nextState.pageSettings.mirrorMargins,
        },
      }),
    }));
  }, []);

  useEffect(() => {
    setDocumentPresentationState((current) => ({
      ...current,
      pageSettings: {
        ...current.pageSettings,
        pageSize: resolvedFormatConfig.document.pageSize,
        showPageNumbers: resolvedFormatConfig.document.pageNumbers,
        mirrorMargins: resolvedFormatConfig.document.mirrorMargins,
      },
    }));
  }, [
    resolvedFormatConfig.document.mirrorMargins,
    resolvedFormatConfig.document.pageNumbers,
    resolvedFormatConfig.document.pageSize,
  ]);

  // 处理内容变更
  const saveHistoryEntry = useCallback(
    async (file: FileItem) => {
      if (!isAuthenticated || !currentUserId) {
        return;
      }

      if (!file.content.trim()) {
        return;
      }

      try {
        const result = await apiClient.documents.saveMd2WordHistory({
          clientFileId: file.id,
          documentName: file.name,
          content: file.content,
        });
        const savedEntry = normalizeHistoryEntry(result.data as Md2WordHistoryEntry);
        setHistoryItems((current) => [
          savedEntry,
          ...current.filter((item) => item.clientFileId !== savedEntry.clientFileId),
        ]);
      } catch (error) {
        console.debug('Failed to save md2word history:', error);
      }
    },
    [currentUserId, isAuthenticated, normalizeHistoryEntry]
  );

  const scheduleHistorySave = useCallback(
    (file: FileItem) => {
      if (!isAuthenticated || !currentUserId) {
        return;
      }

      if (historySaveTimerRef.current !== null) {
        window.clearTimeout(historySaveTimerRef.current);
      }

      historySaveTimerRef.current = window.setTimeout(() => {
        void saveHistoryEntry(file);
        historySaveTimerRef.current = null;
      }, 500);
    },
    [currentUserId, isAuthenticated, saveHistoryEntry]
  );

  const handleContentChange = useCallback((newContent: string) => {
    const nextFile = {
      ...(activeFile ?? {
        id: activeFileId,
        name: activeFileName,
        type: 'markdown' as const,
        status: FileStatus.Pending,
        progress: 0,
        lastEdited: 'Just now',
        size: newContent.length,
      }),
      content: newContent,
      lastEdited: 'Just now',
      size: newContent.length,
    };

    setFiles((prev) =>
      prev.map((file) =>
        file.id === activeFileId
          ? { ...file, content: newContent, lastEdited: 'Just now', size: newContent.length }
          : file
      )
    );
    scheduleHistorySave(nextFile);
  }, [activeFile, activeFileId, activeFileName, scheduleHistorySave]);

  // 创建新文件
  const handleNewFile = useCallback(() => {
    const newId = Date.now().toString();
    const newFile: FileItem = {
      id: newId,
      name: `Untitled_${files.length + 1}.md`,
      content: `# New Document\n\nStart writing here...`,
      lastEdited: 'Just now',
      type: 'markdown',
      size: 0,
      status: FileStatus.Pending,
      progress: 0
    };
    setFiles((prev) => [newFile, ...prev]);
    setActiveFileId(newId);
    scheduleHistorySave(newFile);
  }, [files.length, scheduleHistorySave]);

  // 处理右侧栏文件上传
  const handleSidebarFileUpload = useCallback((uploadedFiles: File[]) => {
    // 在编辑器模式下，读取第一个文件内容到当前编辑区
    if (uploadedFiles.length > 0) {
      const file = uploadedFiles[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // 创建新文件或更新当前文件
        const newId = Date.now().toString();
        const newFile: FileItem = {
          id: newId,
          name: file.name,
          content: content,
          lastEdited: 'Just now',
          type: 'markdown',
          size: file.size,
          status: FileStatus.Pending,
          progress: 0
        };
        setFiles((prev) => [newFile, ...prev]);
        setActiveFileId(newId);
        scheduleHistorySave(newFile);
      };
      reader.readAsText(file);
    }
  }, [scheduleHistorySave]);

  // 处理导出 - 使用纯前端转换
  const handleExport = useCallback(async (format: ExportFormat) => {
    // 检查游客限制
    if (isGuest && !hasRecordedUsage) {
      if (!checkGuestUsage()) {
        return;
      }
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }

    try {
      const fileName = activeFileName.replace(/\.md$/, '');
      
      // 使用前端转换器
      let blob: Blob;
      
      if (format === 'docx') {
        const shouldWarnAboutStructureFallback =
          previewEngine === 'superdoc' && !shouldPreferSuperDocDocxExport(superDocStructureSummary);
        const docxResult = await exportDocxWithPriority(
          activeContent,
          resolvedFormatConfig,
          effectiveFormatState.scopedPatches,
          {
            preferSuperDoc: shouldPreferSuperDocExport,
            superDocAdapter: superDocRuntime,
          }
        );
        blob = docxResult.blob;
        if (shouldWarnAboutStructureFallback) {
          showToast(
            language === 'zh'
              ? '检测到复杂结构，DOCX 导出已优先回退到本地链路以降低版式偏差'
              : 'Complex structures were detected, so DOCX export used the local path to reduce layout drift',
            'info'
          );
        } else if (previewEngine === 'superdoc' && docxResult.strategy !== 'superdoc') {
          showToast(
            language === 'zh'
              ? `SuperDoc 未就绪，已回退到 ${docxResult.strategy === 'native-docx' ? '本地 DOCX' : 'HTML DOCX'} 导出`
              : `SuperDoc is unavailable; fell back to ${
                  docxResult.strategy === 'native-docx' ? 'local DOCX' : 'HTML DOCX'
                } export`,
            'info'
          );
        }
      } else if (format === 'pdf') {
        blob = await markdownToPdf(activeContent, resolvedFormatConfig, effectiveFormatState.scopedPatches);
      } else if (format === 'html') {
        const htmlContent = markdownToHtml(activeContent, resolvedFormatConfig, effectiveFormatState.scopedPatches);
        blob = new Blob([htmlContent], { type: 'text/html' });
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }
      
      // 下载文件
      downloadFile(blob, fileName, format);
      
      // 显示成功消息
      const successMessage =
        t('md2word.export_success', { fileName, format }) +
        buildExportSuccessAiSummary(
          aiAppliedSummary.scopeCount,
          aiAppliedSummary.styleChangeCount,
          aiAppliedSummary.hasDocumentLevelChanges,
          language
        );

      showToast(successMessage, 'success', aiAppliedSummary.styleChangeCount > 0
        ? {
            actionLabel: language === 'zh' ? '查看本次修改' : 'View changes',
            actionAriaLabel: language === 'zh' ? '查看本次已应用的 AI 修改' : 'View applied AI changes',
            onAction: focusAiAppliedSummary,
          }
        : undefined);
    } catch (error) {
      console.error('Export failed:', error);
      showToast(
        t('md2word.export_failed', { error: error instanceof Error ? error.message : 'Unknown error' }),
        'error'
      );
    }
  }, [
    activeFileName,
    activeContent,
    aiAppliedSummary.hasDocumentLevelChanges,
    aiAppliedSummary.scopeCount,
    aiAppliedSummary.styleChangeCount,
    effectiveFormatState.scopedPatches,
    resolvedFormatConfig,
    t,
    showToast,
    isGuest,
    hasRecordedUsage,
    checkGuestUsage,
    recordGuestToolUsage,
    language,
    focusAiAppliedSummary,
    previewEngine,
    superDocStructureSummary,
    shouldPreferSuperDocExport,
    superDocRuntime,
  ]);

  const scopeSummary = React.useMemo(() => {
    if (previewEngine === 'superdoc') {
      return buildSuperDocRuntimeScopeSummary(superDocSelectionState, language);
    }

    if (!scopeInfo) {
      return language === 'zh' ? '作用域：整篇文档' : 'Scope: Document';
    }

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
        ? `当前块：${scopeInfo.currentBlock.textPreview}`
        : `Current block: ${scopeInfo.currentBlock.textPreview}`;
    }

    return language === 'zh' ? '作用域：整篇文档' : 'Scope: Document';
  }, [language, previewEngine, scopeInfo, superDocSelectionState]);

  const mapScopeForRequest = useCallback((scope: FormatScope | undefined): FormatScope => {
    if (!scope) {
      return { scopeType: 'document' };
    }
    return scope;
  }, []);

  const handleScopeChange = useCallback((nextScopeInfo: EditorScopeInfo) => {
    scopeInfoRef.current = nextScopeInfo;
    setScopeInfo(nextScopeInfo);
  }, []);

  const handlePreviewEngineChange = useCallback((nextEngine: PreviewEngine) => {
    setPreviewEngine(nextEngine);
    if (nextEngine !== 'superdoc') {
      setSuperDocSelectionState(null);
      setSuperDocRuntime(null);
      setSuperDocPendingReview(null);
      setSuperDocFormattingRequest(null);
      setSuperDocCanUndo(false);
    }
  }, []);

  const handleSuperDocSelectionChange = useCallback((selection: SuperDocRuntimeSelectionState | null) => {
    setSuperDocSelectionState(selection);
  }, []);

  const handleSuperDocRuntimeAdapterChange = useCallback((adapter: SuperDocDocxExportAdapter | null) => {
    setSuperDocRuntime(adapter);
  }, []);

  const applyAiFormatting = useCallback(async (instruction: string) => {
    setIsApplyingAi(true);
    try {
      const currentScopeInfo = scopeInfoRef.current ?? scopeInfo;
      if (previewEngine === 'superdoc' && !superDocSelectionState?.isReady) {
        showToast(
          language === 'zh'
            ? 'Word 预览尚未准备完成，请稍后再试'
            : 'Word Preview is not ready yet. Please try again in a moment.',
          'warning'
        );
        return;
      }

      const currentScope =
        previewEngine === 'superdoc'
          ? shouldUseSuperDocDocumentScope(instruction)
            ? {
                scopeType: 'document' as const,
              }
            : superDocSelectionState?.hasSelection
            ? {
                scopeType: 'selection' as const,
                start: 0,
                end: superDocSelectionState?.text.length ?? 0,
              }
            : {
                scopeType: 'document' as const,
              }
          : mapScopeForRequest(currentScopeInfo?.scope);

      const currentBlock =
        previewEngine === 'superdoc'
          ? undefined
          : currentScopeInfo?.currentBlock == null
            ? undefined
            : {
                blockId: currentScopeInfo.currentBlock.blockId,
                blockType: currentScopeInfo.currentBlock.blockType,
                lineStart: currentScopeInfo.currentBlock.lineStart,
                lineEnd: currentScopeInfo.currentBlock.lineEnd,
                text: currentScopeInfo.currentBlock.text,
                textPreview: currentScopeInfo.currentBlock.textPreview,
              };
      const currentSelection =
        currentScope.scopeType === 'selection'
          ? {
              start: currentScope.start,
              end: currentScope.end,
              text:
                previewEngine === 'superdoc'
                  ? superDocSelectionState?.text ?? ''
                  : currentScopeInfo?.selectedText ?? '',
            }
          : undefined;
      const selectionSegments =
        previewEngine === 'superdoc'
          ? undefined
          : currentScope.scopeType === 'preview-selection' && currentScopeInfo?.previewSelection
            ? currentScopeInfo.previewSelection.segments.map((segment) => ({
                segmentId: segment.segmentId,
                blockId: segment.blockId,
                blockType: segment.blockType,
                segmentRole: segment.segmentRole,
                selectedText: segment.selectedText,
                textPreview: segment.textPreview,
                sourceStart: segment.sourceStart,
                sourceEnd: segment.sourceEnd,
                selectedStart: segment.selectedStart,
                selectedEnd: segment.selectedEnd,
              }))
            : undefined;

      const result = await apiClient.aiFormatting.parseIntent(
        {
          instruction,
          mode: 'merge',
          scope: currentScope,
          currentBlock,
          currentSelection,
          currentResolvedFormat: resolvedFormatConfig,
          supportedProperties: [...AI_SUPPORTED_PROPERTIES],
          selectionSegments,
        },
        isGuest ? guestIdRef.current : undefined
      );

      const response = result.data;

      const normalizedDocumentPatch = (response.scopedPatches ?? []).reduce<DocumentFormatPatch>(
        (current, scopedPatch) =>
          scopedPatch.scope.scopeType === 'document'
            ? mergeDocumentFormatPatch(current, scopedPatch.patch ?? {})
            : current,
        response.documentPatch ?? {}
      );
      const normalizedScopedPatches = (response.scopedPatches ?? []).filter(
        (scopedPatch) => scopedPatch.scope.scopeType !== 'document'
      );
      setAiRemainingCount(response.remainingCount ?? null);
      setAiLastProvider(response.providerUsed ?? null);

      if (
        previewEngine === 'superdoc' &&
        shouldApplySuperDocFormattingGlobally({
          scope: currentScope,
          response: {
            documentPatch: normalizedDocumentPatch,
            scopedPatches: normalizedScopedPatches,
          },
        })
      ) {
        setLastAiState({
          documentPatch: aiDocumentPatch,
          scopedPatches: aiScopedPatches,
        });
        setPendingAiReview(null);
        setSuperDocPendingReview(null);
        setSuperDocFormattingRequest(null);
        setHoveredAiReviewSegmentId(null);
        setActiveAiAppliedDetailId(null);
        setHoveredAiAppliedDetailId(null);
        setAiDocumentPatch((prev) => mergeDocumentFormatPatch(prev, normalizedDocumentPatch));
        setAiScopedPatches((prev) => [
          ...prev,
          ...normalizedScopedPatches.map<ScopedFormatPatch>((patch, index) => ({
            id: `ai-${Date.now()}-${index}`,
            scope: patch.scope,
            patch: patch.patch,
            source: 'ai',
            summary: patch.summary ?? response.summary,
          })),
        ]);
        setAiLastSummary(response.summary ?? null);
        showToast(
          language === 'zh'
            ? '已将整篇文档样式应用到 Word 预览'
            : 'Document-wide styles applied to Word Preview',
          'success'
        );
        return;
      }

      if (previewEngine === 'superdoc' && superDocSelectionState?.hasSelection) {
        const review = buildSuperDocPendingReview(response, superDocSelectionState, instruction);
        if (!review) {
          throw new ApiError(
            9004,
            language === 'zh'
              ? '当前建议仅包含暂不支持直接写入 SuperDoc 的格式项'
              : 'The returned changes are not supported by SuperDoc yet'
          );
        }

        setPendingAiReview(null);
        setSuperDocPendingReview(review);
        setSuperDocFormattingRequest(null);
        setHoveredAiReviewSegmentId(null);
        setActiveAiAppliedDetailId(null);
        setHoveredAiAppliedDetailId(null);
        setAiLastSummary(response.summary ?? null);
        showToast(
          language === 'zh'
            ? 'AI 已生成 SuperDoc 候选修改，请确认后再应用'
            : 'AI generated SuperDoc changes. Review before applying.',
          'success'
        );
        return;
      }

      if (currentScope.scopeType === 'preview-selection' && currentScopeInfo?.previewSelection) {
        const review = buildPendingAiReview(response, currentScopeInfo.previewSelection, instruction);
        if (!review) {
          throw new ApiError(9004, language === 'zh' ? 'AI 未返回可确认的候选修改' : 'AI returned no reviewable changes');
        }

        setPendingAiReview(review);
        setSuperDocPendingReview(null);
        setHoveredAiReviewSegmentId(null);
        setActiveAiAppliedDetailId(null);
        setHoveredAiAppliedDetailId(null);
        showToast(
          language === 'zh' ? 'AI 已生成候选修改，请确认后再应用' : 'AI generated proposed changes. Review before applying.',
          'success'
        );
        return;
      }

      setLastAiState({
        documentPatch: aiDocumentPatch,
        scopedPatches: aiScopedPatches,
      });
      setPendingAiReview(null);
      setSuperDocPendingReview(null);
      setActiveAiAppliedDetailId(null);
      setHoveredAiAppliedDetailId(null);
      setAiDocumentPatch((prev) => mergeDocumentFormatPatch(prev, normalizedDocumentPatch));
      setAiScopedPatches((prev) => [
        ...prev,
        ...normalizedScopedPatches.map<ScopedFormatPatch>((patch, index) => ({
          id: `ai-${Date.now()}-${index}`,
          scope: patch.scope,
          patch: patch.patch,
          source: 'ai',
          summary: patch.summary ?? response.summary,
        })),
      ]);
      setAiLastSummary(response.summary ?? null);
      showToast(language === 'zh' ? 'AI 格式已应用' : 'AI formatting applied', 'success');
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 9001) {
          setAiRemainingCount(0);
        }
        showToast(error.getUserMessage(), 'error');
      } else {
        showToast(
          language === 'zh' ? 'AI 格式应用失败，请稍后重试' : 'Failed to apply AI formatting',
          'error'
        );
      }
    } finally {
      setIsApplyingAi(false);
    }
  }, [
    aiDocumentPatch,
    aiScopedPatches,
    isGuest,
    language,
    mapScopeForRequest,
    previewEngine,
    resolvedFormatConfig,
    scopeInfo,
    showToast,
    superDocSelectionState,
  ]);

  const handleTogglePendingAiSegment = useCallback((segmentId: string) => {
    if (previewEngine === 'superdoc') {
      setSuperDocPendingReview((current) => (current ? togglePendingAiSegment(current, segmentId) : current));
      return;
    }

    setPendingAiReview((current) => (current ? togglePendingAiSegment(current, segmentId) : current));
  }, [previewEngine]);

  const handleTogglePendingAiStyleChange = useCallback((segmentId: string, changeId: string) => {
    if (previewEngine === 'superdoc') {
      setSuperDocPendingReview((current) =>
        current ? togglePendingAiStyleChange(current, segmentId, changeId) : current
      );
      return;
    }

    setPendingAiReview((current) =>
      current ? togglePendingAiStyleChange(current, segmentId, changeId) : current
    );
  }, [previewEngine]);

  const handleClearPendingAiSelections = useCallback(() => {
    if (previewEngine === 'superdoc') {
      setSuperDocPendingReview((current) => (current ? clearPendingAiSelections(current) : current));
      return;
    }

    setPendingAiReview((current) => (current ? clearPendingAiSelections(current) : current));
  }, [previewEngine]);

  const handleCancelPendingAiReview = useCallback(() => {
    if (previewEngine === 'superdoc') {
      setSuperDocPendingReview(null);
      setHoveredAiReviewSegmentId(null);
      showToast(language === 'zh' ? '已返回编辑模式' : 'Returned to editing mode', 'info');
      return;
    }

    setPendingAiReview(null);
    setHoveredAiReviewSegmentId(null);
    showToast(language === 'zh' ? '已返回编辑模式' : 'Returned to editing mode', 'info');
  }, [language, previewEngine, showToast]);

  const handleApplyPendingAiReview = useCallback(() => {
    if (previewEngine === 'superdoc') {
      if (!superDocPendingReview) {
        return;
      }

      const selectedChanges = superDocPendingReview.segments.flatMap((segment) =>
        segment.selected ? segment.styleChanges.filter((change) => change.selected) : []
      );
      if (selectedChanges.length === 0) {
        showToast(
          language === 'zh' ? '当前没有选中的修改项可应用' : 'No selected changes to apply',
          'warning'
        );
        return;
      }

      setSuperDocFormattingRequest({
        requestId: `superdoc-ai-${Date.now()}`,
        summary: superDocPendingReview.summary,
        changes: selectedChanges.map((change) => ({
          changeId: change.changeId,
          target: change.target,
          property: change.property,
          value: change.value,
          label: change.label,
        })),
      });
      setAiLastSummary(superDocPendingReview.summary ?? null);
      setSuperDocPendingReview(null);
      setHoveredAiReviewSegmentId(null);
      setHoveredAiAppliedDetailId(null);
      return;
    }

    if (!pendingAiReview) {
      return;
    }

    const compiledPatches = compilePendingAiReviewToScopedPatches(pendingAiReview);
    if (compiledPatches.length === 0) {
      showToast(
        language === 'zh' ? '当前没有选中的修改项可应用' : 'No selected changes to apply',
        'warning'
      );
      return;
    }

    setLastAiState({
      documentPatch: aiDocumentPatch,
      scopedPatches: aiScopedPatches,
    });
    setAiScopedPatches((prev) => [...prev, ...compiledPatches]);
    setAiLastSummary(pendingAiReview.summary ?? null);
    setPendingAiReview(null);
    setHoveredAiReviewSegmentId(null);
    setHoveredAiAppliedDetailId(null);
    showToast(language === 'zh' ? '已应用选中的 AI 修改' : 'Selected AI changes applied', 'success');
  }, [
    aiDocumentPatch,
    aiScopedPatches,
    language,
    pendingAiReview,
    previewEngine,
    showToast,
    superDocPendingReview,
  ]);

  const handleSuperDocFormattingApplied = useCallback((result: SuperDocFormattingApplicationResult) => {
    setSuperDocFormattingRequest((current) => (current?.requestId === result.requestId ? null : current));

    if (!result.success) {
      showToast(
        result.error ??
          (language === 'zh'
            ? 'SuperDoc 当前无法直接应用这些格式项'
            : 'SuperDoc cannot apply these changes directly'),
        'error'
      );
      return;
    }

    setSuperDocCanUndo(result.appliedCount > 0);
    const unsupportedSuffix =
      result.unsupportedLabels.length > 0
        ? language === 'zh'
          ? `，另有 ${result.unsupportedLabels.length} 项保留为建议`
          : `, with ${result.unsupportedLabels.length} changes kept as suggestions`
        : '';

    showToast(
      language === 'zh'
        ? `已将 ${result.appliedCount} 项样式应用到当前选区${unsupportedSuffix}`
        : `Applied ${result.appliedCount} changes to the current selection${unsupportedSuffix}`,
      'success'
    );
  }, [language, showToast]);

  const handleUndoAi = useCallback(() => {
    if (previewEngine === 'superdoc') {
      if (!superDocCanUndo) {
        return;
      }

      setSuperDocUndoSignal((current) => current + 1);
      setSuperDocCanUndo(false);
      setSuperDocFormattingRequest(null);
      setSuperDocPendingReview(null);
      setAiLastSummary(null);
      setAiLastProvider(null);
      showToast(language === 'zh' ? '已撤销上次 SuperDoc AI 修改' : 'Last SuperDoc AI change undone', 'info');
      return;
    }

    if (!lastAiState) {
      return;
    }

    setAiDocumentPatch(lastAiState.documentPatch);
    setAiScopedPatches(lastAiState.scopedPatches);
    setLastAiState(null);
    setActiveAiAppliedDetailId(null);
    setHoveredAiAppliedDetailId(null);
    showToast(language === 'zh' ? '已撤销上次 AI 修改' : 'Last AI change undone', 'info');
  }, [language, lastAiState, previewEngine, showToast, superDocCanUndo]);

  const handleClearAi = useCallback((options?: { rollbackLastApply?: boolean }) => {
    if (previewEngine === 'superdoc') {
      setSuperDocPendingReview(null);
      setSuperDocFormattingRequest(null);
      if (options?.rollbackLastApply && superDocCanUndo) {
        setSuperDocUndoSignal((current) => current + 1);
        setSuperDocCanUndo(false);
      }
      setAiLastSummary(null);
      setAiLastProvider(null);
      showToast(language === 'zh' ? '已清空 SuperDoc AI 修改' : 'SuperDoc AI changes cleared', 'info');
      return;
    }

    setAiDocumentPatch(createEmptyDocumentPatch());
    setAiScopedPatches([]);
    setLastAiState(null);
    setAiLastSummary(null);
    setAiLastProvider(null);
    setPendingAiReview(null);
    setHoveredAiReviewSegmentId(null);
    setActiveAiAppliedDetailId(null);
    setHoveredAiAppliedDetailId(null);
    showToast(language === 'zh' ? '已清空 AI 修改' : 'AI changes cleared', 'info');
  }, [language, previewEngine, showToast, superDocCanUndo]);

  const handleBack = useCallback(() => {
    setPage('dashboard');
  }, [setPage]);

  // 批量模式：添加文件
  const handleFilesAdd = useCallback((newFiles: File[]) => {
    const fileItems: FileItem[] = newFiles.map(file => ({
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      content: '',
      lastEdited: 'Just now',
      type: 'markdown',
      size: file.size,
      status: FileStatus.Pending,
      progress: 0,
      file // 保存原始 File 对象以便后续读取
    }));
    
    // 读取文件内容
    fileItems.forEach((item, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBatchFiles(prev => prev.map(f => 
          f.id === item.id 
            ? { ...f, content: e.target?.result as string }
            : f
        ));
      };
      reader.readAsText(newFiles[index]);
    });
    
    setBatchFiles(prev => [...prev, ...fileItems]);
  }, []);

  // 批量模式：移除文件
  const handleFileRemove = useCallback((id: string) => {
    setBatchFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // 批量模式：设置模板覆盖
  const handleTemplateOverride = useCallback((id: string, template: string) => {
    setBatchFiles(prev => prev.map(f => 
      f.id === id ? { ...f, templateOverride: template || undefined } : f
    ));
  }, []);

  // 批量模式：开始转换 - 使用纯前端转换
  const handleStartConversion = useCallback(async () => {
    // 检查游客限制
    if (isGuest && !hasRecordedUsage) {
      if (!checkGuestUsage()) {
        return;
      }
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }

    const pendingFiles = batchFiles.filter(f => f.status === FileStatus.Pending);
    if (pendingFiles.length === 0) return;

    // 逐个转换文件
    for (const file of pendingFiles) {
      try {
        // 设置为转换中
        setBatchFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: FileStatus.Converting, progress: 0 } : f
        ));

        // 模拟进度更新
        const progressInterval = setInterval(() => {
          setBatchFiles(prev => {
            const currentFile = prev.find(f => f.id === file.id);
            if (!currentFile || currentFile.status !== FileStatus.Converting) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev.map(f => 
              f.id === file.id ? { ...f, progress: Math.min(f.progress + 25, 90) } : f
            );
          });
        }, 300);

        // 使用前端转换器
        const template = file.templateOverride || globalSettings.template;
        const fileName = file.name.replace(/\.md$/, '');
        
        let blob: Blob;
        
        if (globalSettings.format === 'docx') {
          blob = (
            await exportDocxWithPriority(file.content, template, [], {
              preferSuperDoc: false,
              superDocAdapter: null,
            })
          ).blob;
        } else if (globalSettings.format === 'pdf') {
          blob = await markdownToPdf(file.content, template);
        } else if (globalSettings.format === 'html') {
          const htmlContent = markdownToHtml(file.content, template);
          blob = new Blob([htmlContent], { type: 'text/html' });
        } else {
          throw new Error(`Unsupported format: ${globalSettings.format}`);
        }

        clearInterval(progressInterval);

        // 保存 blob 到文件对象中以便后续下载
        setBatchFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { 
                ...f, 
                status: FileStatus.Done, 
                progress: 100,
                file: new File([blob], `${fileName}.${globalSettings.format}`)
              }
            : f
        ));

      } catch (error) {
        console.error(`Conversion failed for ${file.name}:`, error);
        setBatchFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { 
                ...f, 
                status: FileStatus.Error, 
                progress: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            : f
        ));
      }
    }
  }, [batchFiles, globalSettings, isGuest, hasRecordedUsage, checkGuestUsage, recordGuestToolUsage]);

  // 批量模式：清除已完成
  const handleClearCompleted = useCallback(() => {
    setBatchFiles(prev => prev.filter(f => f.status !== FileStatus.Done));
  }, []);

  // 批量模式：下载全部
  const handleDownloadAll = useCallback(() => {
    const doneFiles = batchFiles.filter(f => f.status === FileStatus.Done && f.file);
    
    if (doneFiles.length === 0) {
      showToast(
        t('md2word.no_files'),
        'warning'
      );
      return;
    }

    // 逐个下载文件
    doneFiles.forEach(file => {
      if (file.file) {
        const url = window.URL.createObjectURL(file.file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    });

    showToast(
      t('md2word.downloaded_files', { count: doneFiles.length }),
      'success'
    );
  }, [batchFiles, t, showToast]);

  // 批量模式：重试
  const handleRetry = useCallback((id: string) => {
    setBatchFiles(prev => prev.map(f => 
      f.id === id ? { ...f, status: FileStatus.Pending, progress: 0, error: undefined } : f
    ));
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Toast 提示容器 */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* 顶部导航栏 */}
      <TopNavigation 
        activeFileName={tabMode === 'editor' ? activeFileName : undefined}
        tabMode={tabMode}
        onTabChange={setTabMode}
        onBack={handleBack}
      />

      {/* 主内容区域 */}
      {tabMode === 'editor' ? (
        // 编辑器模式
        <div className="flex flex-1 overflow-hidden min-h-0">
          <SidebarLeft 
            files={files} 
            historyItems={historyItems}
            historySearch={historySearch}
            activeFileId={activeFileId} 
            onFileSelect={setActiveFileId}
            onHistorySelect={handleHistorySelect}
            onHistoryRename={handleHistoryRename}
            onHistoryDelete={handleHistoryDelete}
            onHistorySearchChange={handleHistorySearchChange}
            onNewFile={handleNewFile}
            onFileUpload={handleSidebarFileUpload}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={handleTemplateSelect}
          />
          <Editor 
            content={activeContent}
            onChange={handleContentChange}
            formatConfig={resolvedFormatConfig}
            documentPresentation={documentPresentationState}
            documentName={activeFileName}
            previewEngine={previewEngine}
            customStyles={customStyles}
            scopedPatches={effectiveFormatState.scopedPatches}
            pendingAiReview={pendingAiReview}
            activeReviewSegmentId={hoveredAiReviewSegmentId}
            activeAppliedSummaryDetail={activeAiAppliedDetail}
            onScopeChange={handleScopeChange}
            onPreviewEngineChange={handlePreviewEngineChange}
            onSuperDocSelectionChange={handleSuperDocSelectionChange}
            onSuperDocRuntimeAdapterChange={handleSuperDocRuntimeAdapterChange}
            onSuperDocFormattingApplied={handleSuperDocFormattingApplied}
            pendingSuperDocFormattingRequest={superDocFormattingRequest}
            superDocUndoSignal={superDocUndoSignal}
            superDocReviewState={superDocReviewState}
          />
          <SidebarRight 
            onExport={handleExport} 
            showToast={showToast}
            onExportSettingsChange={handleExportSettingsChange}
            documentPresentation={documentPresentationState}
            onDocumentPresentationChange={handleDocumentPresentationChange}
            onApplyAiFormatting={applyAiFormatting}
            onUndoAi={handleUndoAi}
            onClearAi={handleClearAi}
            aiApplying={isApplyingAi}
            aiRemainingCount={aiRemainingCount}
            aiLastSummary={aiLastSummary}
            aiLastProvider={aiLastProvider}
            aiScopeSummary={scopeSummary}
            canUndoAi={currentCanUndoAi}
            canClearAi={currentCanClearAi}
            aiPendingReview={currentPendingAiReview}
            aiPendingSelectedCount={countSelectedAiChanges(currentPendingAiReview)}
            onTogglePendingAiSegment={handleTogglePendingAiSegment}
            onTogglePendingAiStyleChange={handleTogglePendingAiStyleChange}
            onApplyPendingAiReview={handleApplyPendingAiReview}
            onClearPendingAiSelections={handleClearPendingAiSelections}
            onCancelPendingAiReview={handleCancelPendingAiReview}
            aiHoveredSegmentId={hoveredAiReviewSegmentId}
            onHoverPendingAiSegment={setHoveredAiReviewSegmentId}
            aiAppliedSummary={aiAppliedSummary.styleChangeCount > 0 ? aiAppliedSummary : null}
            activeAiAppliedDetailId={activeAiAppliedDetailId}
            onSelectAiAppliedDetail={handleSelectAiAppliedDetail}
            onHoverAiAppliedDetail={handleHoverAiAppliedDetail}
            onRevertAiAppliedDetail={handleRevertAiAppliedDetail}
            aiAppliedSummaryAnchorId={AI_EXPORT_SUMMARY_CARD_ID}
            highlightAiAppliedSummary={highlightAiAppliedSummary}
            previewEngine={previewEngine}
            superDocStructureSummary={superDocStructureSummary}
            onSwitchToHtmlFallback={() => handlePreviewEngineChange('html')}
          />
        </div>
      ) : (
        // 批量转换模式
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
            <div className="p-6 space-y-6 max-w-7xl mx-auto">
              {/* 批量工具栏 */}
              <BatchToolbar 
                settings={globalSettings}
                onSettingsChange={setGlobalSettings}
                files={batchFiles}
                onStartConversion={handleStartConversion}
                onClearCompleted={handleClearCompleted}
                onDownloadAll={handleDownloadAll}
              />

              {/* 文件上传区 */}
              <FileUploader onFilesAdd={handleFilesAdd} />

              {/* 文件列表 */}
              {batchFiles.length > 0 && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                  <FileList 
                    files={batchFiles}
                    globalTemplate={globalSettings.template}
                    onRemove={handleFileRemove}
                    onTemplateOverride={handleTemplateOverride}
                    onRetry={handleRetry}
                  />
                </div>
              )}

              {/* 空状态提示 */}
              {batchFiles.length === 0 && (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500">
                  <span className="material-symbols-outlined text-6xl mb-4 block opacity-50">upload_file</span>
                  <p className="text-lg font-medium">
                    {t('md2word.upload_to_start')}
                  </p>
                  <p className="text-sm mt-2 opacity-75">
                    {t('md2word.batch_processing')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Md2Word;
