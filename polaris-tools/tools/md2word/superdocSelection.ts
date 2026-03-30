import type { FormatScope } from './formatting/types';

export type SuperDocSelectionScopeKind = 'document' | 'selection' | 'block' | 'preview-selection' | 'unknown';

export type SuperDocSelectionSourceKind = 'markdown-source' | 'preview' | 'document' | 'unknown';

export type SuperDocSelectionBoundaryKind = 'entire-document' | 'current-selection' | 'current-block' | 'preview-selection' | 'unknown';

export interface SuperDocSelectionBridgeState {
  scopeKind: SuperDocSelectionScopeKind;
  sourceKind: SuperDocSelectionSourceKind;
  sourceLabel: string;
  boundaryKind: SuperDocSelectionBoundaryKind;
  boundaryLabel: string;
  detailLabel: string;
  isSelectionScoped: boolean;
  isDocumentScoped: boolean;
}

export interface SuperDocSelectionBridgeViewModel {
  title: string;
  sourceLabel: string;
  boundaryLabel: string;
  detailLabel: string;
  scopeLabel: string;
  sourceBadge: string;
  boundaryBadge: string;
  scopeBadge: string;
  isSelectionScoped: boolean;
  isDocumentScoped: boolean;
}

export interface SuperDocRuntimeSelectionState {
  source: 'superdoc';
  isReady: boolean;
  hasSelection: boolean;
  text: string;
  from: number;
  to: number;
  detailLabel: string;
}

export interface SuperDocFormattingReviewState {
  status: 'idle' | 'review' | 'applying' | 'applied';
  selectedCount: number;
  hasPendingChanges: boolean;
  summary?: string;
}

export interface SuperDocFormattingChange {
  changeId: string;
  target: string;
  property: string;
  value: string | number | boolean;
  label: string;
}

export interface SuperDocFormattingApplicationRequest {
  requestId: string;
  summary?: string | null;
  changes: SuperDocFormattingChange[];
}

export interface SuperDocFormattingApplicationResult {
  requestId: string;
  success: boolean;
  appliedCount: number;
  appliedLabels: string[];
  unsupportedLabels: string[];
  error?: string;
}

const SUPERDOC_LOCAL_SCOPE_HINTS = [
  '选中',
  '当前选区',
  '当前选择',
  '选区',
  '这几个字',
  '这些字',
  '这段',
  '当前块',
  '本段',
  '这一段',
  'selected',
  'selection',
  'current selection',
  'this paragraph',
  'this block',
];

const SUPERDOC_DOCUMENT_SCOPE_HINTS = [
  '整篇',
  '全文',
  '全局',
  '文档',
  '正文',
  '一级标题',
  '二级标题',
  '三级标题',
  '标题',
  '段落',
  '行距',
  '页边距',
  '页码',
  '字体',
  '字号',
  'line spacing',
  'heading',
  'body',
  'document',
  'paragraph',
  'page number',
  'margin',
];

interface SuperDocFormattingDecisionInput {
  scope: FormatScope;
  response: {
    documentPatch?: Record<string, unknown> | null;
    scopedPatches?: Array<{
      scope: FormatScope;
      patch?: Record<string, unknown> | null;
    }> | null;
  };
}

const hasPatchContent = (patch: Record<string, unknown> | null | undefined): boolean => {
  if (!patch) {
    return false;
  }

  return Object.values(patch).some((value) => {
    if (!value || typeof value !== 'object') {
      return false;
    }

    return Object.values(value as Record<string, unknown>).some(
      (innerValue) => innerValue !== undefined && innerValue !== null && innerValue !== ''
    );
  });
};

export const shouldApplySuperDocFormattingGlobally = ({
  scope,
  response,
}: SuperDocFormattingDecisionInput): boolean => {
  if (scope.scopeType === 'document') {
    return true;
  }

  if (hasPatchContent(response.documentPatch ?? undefined)) {
    return true;
  }

  return (response.scopedPatches ?? []).some(
    (scopedPatch) =>
      scopedPatch.scope.scopeType === 'document' && hasPatchContent(scopedPatch.patch ?? undefined)
  );
};

export const shouldUseSuperDocDocumentScope = (instruction: string): boolean => {
  const normalized = instruction.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const hasLocalHint = SUPERDOC_LOCAL_SCOPE_HINTS.some((hint) => normalized.includes(hint.toLowerCase()));
  if (hasLocalHint) {
    return false;
  }

  return SUPERDOC_DOCUMENT_SCOPE_HINTS.some((hint) => normalized.includes(hint.toLowerCase()));
};

const hasAny = (value: string, patterns: string[]): boolean =>
  patterns.some((pattern) => value.includes(pattern));

const buildLabels = (
  language: string,
  sourceLabel: string,
  boundaryLabel: string,
  detailLabel: string
): Pick<SuperDocSelectionBridgeState, 'sourceLabel' | 'boundaryLabel' | 'detailLabel'> => ({
  sourceLabel: language === 'zh' ? sourceLabel : sourceLabel,
  boundaryLabel: language === 'zh' ? boundaryLabel : boundaryLabel,
  detailLabel: language === 'zh' ? detailLabel : detailLabel,
});

export const deriveSuperDocSelectionBridge = (
  scopeSummary: string,
  language: string = 'zh'
): SuperDocSelectionBridgeState => {
  const summary = scopeSummary.trim();
  const isPreviewSelection = hasAny(summary, ['预览选区', 'Preview selection']);
  const isSelection = hasAny(summary, ['当前选中内容', 'Selection:']);
  const isBlock = hasAny(summary, ['当前块', 'Current block:']);

  if (isPreviewSelection) {
    return {
      scopeKind: 'preview-selection',
      sourceKind: 'preview',
      ...buildLabels(
        language,
        '预览区',
        '跨块/跨段选区',
        '当前处于预览区选择，后续会映射到 SuperDoc 选区桥接'
      ),
      boundaryKind: 'preview-selection',
      isSelectionScoped: true,
      isDocumentScoped: false,
    };
  }

  if (isSelection) {
    return {
      scopeKind: 'selection',
      sourceKind: 'markdown-source',
      ...buildLabels(
        language,
        'Markdown 源码区',
        '当前选中内容',
        '当前选区将作为 AI 格式修改的输入边界'
      ),
      boundaryKind: 'current-selection',
      isSelectionScoped: true,
      isDocumentScoped: false,
    };
  }

  if (isBlock) {
    return {
      scopeKind: 'block',
      sourceKind: 'markdown-source',
      ...buildLabels(
        language,
        'Markdown 块',
        '当前块',
        '当前块将作为 AI 格式修改的输入边界'
      ),
      boundaryKind: 'current-block',
      isSelectionScoped: true,
      isDocumentScoped: false,
    };
  }

  return {
    scopeKind: 'document',
    sourceKind: 'document',
    ...buildLabels(
      language,
      '整篇文档',
      '全文',
      '当前请求将作用于整篇文档'
    ),
    boundaryKind: 'entire-document',
    isSelectionScoped: false,
    isDocumentScoped: true,
  };
};

export const buildSuperDocSelectionSummary = (
  scopeSummary: string,
  language: string = 'zh'
): string => {
  const bridge = deriveSuperDocSelectionBridge(scopeSummary, language);
  return language === 'zh'
    ? `来源：${bridge.sourceLabel} · 边界：${bridge.boundaryLabel}`
    : `Source: ${bridge.sourceLabel} · Boundary: ${bridge.boundaryLabel}`;
};

export const buildSuperDocSelectionViewModel = (
  scopeSummary: string,
  language: string = 'zh'
): SuperDocSelectionBridgeViewModel => {
  const bridge = deriveSuperDocSelectionBridge(scopeSummary, language);
  return {
    title: language === 'zh' ? 'SuperDoc 选区桥接' : 'SuperDoc Selection Bridge',
    sourceLabel: bridge.sourceLabel,
    boundaryLabel: bridge.boundaryLabel,
    detailLabel: bridge.detailLabel,
    scopeLabel: buildSuperDocSelectionSummary(scopeSummary, language),
    sourceBadge:
      bridge.sourceKind === 'markdown-source'
        ? language === 'zh'
          ? 'Markdown 输入'
          : 'Markdown input'
        : bridge.sourceKind === 'preview'
          ? language === 'zh'
            ? '预览区输入'
            : 'Preview input'
          : bridge.sourceKind === 'document'
            ? language === 'zh'
              ? '整篇文档'
              : 'Document'
            : language === 'zh'
              ? '待接入'
              : 'Pending',
    boundaryBadge:
      bridge.boundaryKind === 'current-selection'
        ? language === 'zh'
          ? '当前选中'
          : 'Current selection'
        : bridge.boundaryKind === 'current-block'
          ? language === 'zh'
            ? '当前块'
            : 'Current block'
          : bridge.boundaryKind === 'preview-selection'
            ? language === 'zh'
              ? '预览区选区'
              : 'Preview selection'
            : bridge.boundaryKind === 'entire-document'
              ? language === 'zh'
                ? '整篇文档'
                : 'Entire document'
              : language === 'zh'
                ? '待接入'
                : 'Pending',
    scopeBadge:
      bridge.scopeKind === 'selection'
        ? language === 'zh'
          ? '局部选区'
          : 'Selection'
        : bridge.scopeKind === 'block'
          ? language === 'zh'
            ? '块级作用域'
            : 'Block'
          : bridge.scopeKind === 'preview-selection'
            ? language === 'zh'
              ? '预览区作用域'
              : 'Preview selection'
            : bridge.scopeKind === 'document'
              ? language === 'zh'
                ? '整篇文档'
                : 'Document'
              : language === 'zh'
                ? '待接入'
                : 'Pending',
    isSelectionScoped: bridge.isSelectionScoped,
    isDocumentScoped: bridge.isDocumentScoped,
  };
};

export const buildSuperDocRuntimeScopeSummary = (
  selection: SuperDocRuntimeSelectionState | null,
  language: string = 'zh'
): string => {
  if (!selection || !selection.isReady || !selection.hasSelection) {
    return language === 'zh' ? '作用域：整篇文档' : 'Scope: Document';
  }

  const textLength = selection.text.trim().length;
  return language === 'zh'
    ? `SuperDoc 选区：${textLength} 字`
    : `SuperDoc selection: ${textLength} chars`;
};

export const buildSuperDocRuntimeSelectionViewModel = (
  selection: SuperDocRuntimeSelectionState | null,
  language: string = 'zh'
): SuperDocSelectionBridgeViewModel => {
  if (!selection || !selection.isReady) {
    return {
      title: language === 'zh' ? 'SuperDoc 选区桥接' : 'SuperDoc Selection Bridge',
      sourceLabel: language === 'zh' ? 'SuperDoc 文档' : 'SuperDoc document',
      boundaryLabel: language === 'zh' ? '整篇文档' : 'Whole document',
      detailLabel:
        language === 'zh'
          ? 'SuperDoc 正在准备文档实例，当前先按整篇文档处理。'
          : 'SuperDoc is still preparing. Requests currently target the whole document.',
      scopeLabel: language === 'zh' ? '作用域：整篇文档' : 'Scope: Document',
      sourceBadge: 'SuperDoc',
      boundaryBadge: language === 'zh' ? '整篇文档' : 'Document',
      scopeBadge: language === 'zh' ? '整篇文档' : 'Document',
      isSelectionScoped: false,
      isDocumentScoped: true,
    };
  }

  if (!selection.hasSelection) {
    return {
      title: language === 'zh' ? 'SuperDoc 选区桥接' : 'SuperDoc Selection Bridge',
      sourceLabel: language === 'zh' ? 'SuperDoc 文档' : 'SuperDoc document',
      boundaryLabel: language === 'zh' ? '整篇文档' : 'Whole document',
      detailLabel:
        language === 'zh'
          ? '当前未选择文本，AI 将按整篇文档生成建议。'
          : 'No text is selected. AI will target the whole document.',
      scopeLabel: language === 'zh' ? '作用域：整篇文档' : 'Scope: Document',
      sourceBadge: 'SuperDoc',
      boundaryBadge: language === 'zh' ? '整篇文档' : 'Document',
      scopeBadge: language === 'zh' ? '整篇文档' : 'Document',
      isSelectionScoped: false,
      isDocumentScoped: true,
    };
  }

  return {
    title: language === 'zh' ? 'SuperDoc 选区桥接' : 'SuperDoc Selection Bridge',
    sourceLabel: language === 'zh' ? 'SuperDoc 文档' : 'SuperDoc document',
    boundaryLabel: language === 'zh' ? '当前选区' : 'Current selection',
    detailLabel: selection.detailLabel,
    scopeLabel: buildSuperDocRuntimeScopeSummary(selection, language),
    sourceBadge: 'SuperDoc',
    boundaryBadge: language === 'zh' ? '当前选中' : 'Current selection',
    scopeBadge: language === 'zh' ? '局部选区' : 'Selection',
    isSelectionScoped: true,
    isDocumentScoped: false,
  };
};
