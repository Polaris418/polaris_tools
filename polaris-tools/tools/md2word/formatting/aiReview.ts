import type {
  AiFormattingParseResponse,
  AiFormattingProposedStyleChangeResponse,
} from '../../../api/aiFormattingApi';
import type { PreviewSelectionInfo } from './scopeTypes';
import type { DocumentFormatPatch, ScopedFormatPatch } from './types';

export interface PendingAiStyleChange extends AiFormattingProposedStyleChangeResponse {
  changeId: string;
  selected: boolean;
}

export interface PendingAiSegmentReview {
  segmentId: string;
  blockId: string;
  blockType: string;
  textPreview: string;
  selectedText: string;
  sourceStart: number;
  sourceEnd: number;
  selected: boolean;
  summary?: string;
  styleChanges: PendingAiStyleChange[];
}

export interface PendingAiReviewState {
  instruction: string;
  summary: string;
  providerUsed?: string | null;
  remainingCount?: number | null;
  totalSegmentCount: number;
  unmatchedSegmentCount: number;
  segments: PendingAiSegmentReview[];
}

export interface PendingAiStyleChangeGroup {
  key: string;
  label: string;
  changes: PendingAiStyleChange[];
}

export interface AppliedAiFormattingSummaryDetail {
  id: string;
  title: string;
  description: string;
  changeCount: number;
  revertAction: {
    kind: 'document-patch' | 'scoped-patch';
    patchId?: string;
  };
  previewTarget?: {
    kind: 'document' | 'block' | 'selection';
    targetId?: string;
    fallbackBlockType?: string;
  };
}

export interface AppliedAiFormattingSummary {
  scopeCount: number;
  styleChangeCount: number;
  hasDocumentLevelChanges: boolean;
  details: AppliedAiFormattingSummaryDetail[];
}

const CHANGE_LABELS: Record<string, string> = {
  fontFamily: '字体',
  fontSizePt: '字号',
  color: '颜色',
  align: '对齐',
  bold: '加粗',
  italic: '斜体',
  lineSpacing: '行距',
  paragraphSpacingBeforePt: '段前距',
  paragraphSpacingAfterPt: '段后距',
  indentLeftPt: '缩进',
  backgroundColor: '背景色',
  imageQuality: '图片质量',
  includeTableOfContents: '目录',
  pageNumbers: '页码',
  mirrorMargins: '镜像页边距',
  pageSize: '纸张大小',
};

const TARGET_LABELS: Record<string, string> = {
  h1: '一级标题',
  h2: '二级标题',
  h3: '三级标题',
  body: '正文',
  paragraph: '段落',
  blockquote: '引用块',
  list: '列表',
  code: '代码块',
  document: '文档',
};

const sanitizePreviewTargetId = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, '-');

const stringifyValue = (value: string | number | boolean): string => {
  if (typeof value === 'boolean') {
    return value ? '开启' : '关闭';
  }

  return String(value);
};

const buildFallbackLabel = (change: AiFormattingProposedStyleChangeResponse): string => {
  const propertyLabel = CHANGE_LABELS[change.property] ?? change.property;
  return `${propertyLabel}：${stringifyValue(change.value)}`;
};

const buildChangeId = (
  segmentId: string,
  index: number,
  change: AiFormattingProposedStyleChangeResponse
): string => `${segmentId}-${change.target}-${change.property}-${index}`.replace(/[^a-zA-Z0-9_-]/g, '-');

const buildPatchFromStyleChanges = (styleChanges: PendingAiStyleChange[]): DocumentFormatPatch =>
  styleChanges.reduce<DocumentFormatPatch>((patch, change) => {
    if (!change.selected) {
      return patch;
    }

    const currentTarget = patch[change.target] ?? {};
    return {
      ...patch,
      [change.target]: {
        ...currentTarget,
        [change.property]: change.value,
      },
    };
  }, {});

const isPatchEmpty = (patch: DocumentFormatPatch): boolean =>
  Object.keys(patch).every((target) => {
    const value = patch[target as keyof DocumentFormatPatch];
    return value == null || Object.keys(value).length === 0;
  });

export const buildPendingAiReview = (
  response: AiFormattingParseResponse,
  previewSelection: PreviewSelectionInfo,
  instruction: string
): PendingAiReviewState | null => {
  if (!response.proposedChanges || response.proposedChanges.length === 0) {
    return null;
  }

  const segmentMap = new Map(previewSelection.segments.map((segment) => [segment.segmentId, segment]));

  const segments = response.proposedChanges
    .map<PendingAiSegmentReview | null>((change) => {
      const matchedSegment = segmentMap.get(change.segmentId);
      if (!matchedSegment || !change.styleChanges || change.styleChanges.length === 0) {
        return null;
      }

      return {
        segmentId: change.segmentId,
        blockId: change.blockId ?? matchedSegment.blockId,
        blockType: change.blockType ?? matchedSegment.blockType,
        textPreview: change.textPreview ?? matchedSegment.textPreview,
        selectedText: matchedSegment.selectedText,
        sourceStart: matchedSegment.sourceStart,
        sourceEnd: matchedSegment.sourceEnd,
        selected: true,
        summary: change.summary,
        styleChanges: change.styleChanges.map((styleChange, index) => ({
          ...styleChange,
          changeId: styleChange.changeId ?? buildChangeId(change.segmentId, index, styleChange),
          label: styleChange.label?.trim() || buildFallbackLabel(styleChange),
          selected: true,
        })),
      };
    })
    .filter((segment): segment is PendingAiSegmentReview => segment !== null);

  if (segments.length === 0) {
    return null;
  }

  return {
    instruction,
    summary: response.summary,
    providerUsed: response.providerUsed ?? null,
    remainingCount: response.remainingCount ?? null,
    totalSegmentCount: previewSelection.segments.length,
    unmatchedSegmentCount: Math.max(previewSelection.segments.length - segments.length, 0),
    segments,
  };
};

export const compilePendingAiReviewToScopedPatches = (review: PendingAiReviewState): ScopedFormatPatch[] =>
  review.segments
    .map((segment, index) => {
      if (!segment.selected) {
        return null;
      }

      const selectedStyleChanges = segment.styleChanges.filter((change) => change.selected);
      if (selectedStyleChanges.length === 0) {
        return null;
      }

      const patch = buildPatchFromStyleChanges(selectedStyleChanges);
      if (isPatchEmpty(patch)) {
        return null;
      }

      return {
        id: `ai-review-${Date.now()}-${index}`,
        scope: {
          scopeType: 'selection' as const,
          start: segment.sourceStart,
          end: segment.sourceEnd,
        },
        patch,
        source: 'ai' as const,
        summary:
          segment.summary ??
          selectedStyleChanges
            .map((change) => change.label)
            .filter(Boolean)
            .join('、'),
      };
    })
    .filter((patch): patch is ScopedFormatPatch => patch !== null);

export const countSelectedAiChanges = (review: PendingAiReviewState | null): number =>
  review == null
    ? 0
    : review.segments.reduce((total, segment) => {
        if (!segment.selected) {
          return total;
        }

        return total + segment.styleChanges.filter((change) => change.selected).length;
      }, 0);

export const buildPendingPreviewLabels = (review: PendingAiReviewState | null): Map<string, string> => {
  const labels = new Map<string, string>();
  if (!review) {
    return labels;
  }

  review.segments.forEach((segment) => {
    if (!segment.selected) {
      return;
    }

    const selectedLabels = segment.styleChanges
      .filter((change) => change.selected)
      .map((change) => change.label)
      .filter((label): label is string => Boolean(label));

    if (selectedLabels.length === 0) {
      return;
    }

    const summary =
      selectedLabels.length <= 2
        ? selectedLabels.join(' · ')
        : `${selectedLabels.slice(0, 2).join(' · ')} +${selectedLabels.length - 2}`;

    labels.set(segment.segmentId, summary);
  });

  return labels;
};

const resolveChangeGroupKey = (change: PendingAiStyleChange): PendingAiStyleChangeGroup['key'] => {
  if (change.target === 'document') {
    return 'document';
  }

  if (
    ['align', 'lineSpacing', 'paragraphSpacingBeforePt', 'paragraphSpacingAfterPt', 'indentLeftPt'].includes(
      change.property
    )
  ) {
    return 'paragraph';
  }

  return 'text';
};

export const getPendingAiStyleChangeGroups = (segment: PendingAiSegmentReview): PendingAiStyleChangeGroup[] => {
  const groups = new Map<string, PendingAiStyleChangeGroup>();

  segment.styleChanges.forEach((change) => {
    const key = resolveChangeGroupKey(change);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: key === 'document' ? '文档设置' : key === 'paragraph' ? '段落样式' : '文本样式',
        changes: [],
      });
    }

    groups.get(key)?.changes.push(change);
  });

  return Array.from(groups.values());
};

export const togglePendingAiSegment = (review: PendingAiReviewState, segmentId: string): PendingAiReviewState => ({
  ...review,
  segments: review.segments.map((segment) => {
    if (segment.segmentId !== segmentId) {
      return segment;
    }

    const nextSelected = !segment.selected;
    return {
      ...segment,
      selected: nextSelected,
      styleChanges: segment.styleChanges.map((change) => ({
        ...change,
        selected: nextSelected,
      })),
    };
  }),
});

export const togglePendingAiStyleChange = (
  review: PendingAiReviewState,
  segmentId: string,
  changeId: string
): PendingAiReviewState => ({
  ...review,
  segments: review.segments.map((segment) => {
    if (segment.segmentId !== segmentId) {
      return segment;
    }

    const styleChanges = segment.styleChanges.map((change) =>
      change.changeId === changeId ? { ...change, selected: !change.selected } : change
    );

    return {
      ...segment,
      selected: styleChanges.some((change) => change.selected),
      styleChanges,
    };
  }),
});

export const clearPendingAiSelections = (review: PendingAiReviewState): PendingAiReviewState => ({
  ...review,
  segments: review.segments.map((segment) => ({
    ...segment,
    selected: false,
    styleChanges: segment.styleChanges.map((change) => ({
      ...change,
      selected: false,
    })),
  })),
});

const countPatchProperties = (patch: DocumentFormatPatch | null | undefined): number => {
  if (!patch) {
    return 0;
  }

  return Object.values(patch).reduce((total, targetPatch) => {
    if (!targetPatch) {
      return total;
    }

    return total + Object.keys(targetPatch).length;
  }, 0);
};

const summarizePatchTargets = (patch: DocumentFormatPatch): string[] =>
  Object.entries(patch).flatMap(([targetKey, targetPatch]) => {
    if (!targetPatch || Object.keys(targetPatch).length === 0) {
      return [];
    }

    const targetLabel = TARGET_LABELS[targetKey] ?? targetKey;
    const propertyLabels = Object.keys(targetPatch).map((property) => CHANGE_LABELS[property] ?? property);
    return [`${targetLabel}：${propertyLabels.join('、')}`];
  });

const buildScopeTitle = (patch: ScopedFormatPatch, index: number): string => {
  if (patch.summary?.trim()) {
    return patch.summary.trim();
  }

  const primaryTarget =
    Object.keys(patch.patch).find((target) => {
      const targetPatch = patch.patch[target as keyof DocumentFormatPatch];
      return targetPatch && Object.keys(targetPatch).length > 0;
    }) ?? null;
  const primaryTargetLabel = primaryTarget ? TARGET_LABELS[primaryTarget] ?? primaryTarget : null;

  switch (patch.scope.scopeType) {
    case 'selection':
      return primaryTargetLabel ? `${primaryTargetLabel}局部修改 ${index + 1}` : `局部文本修改 ${index + 1}`;
    case 'block':
      return primaryTargetLabel ? `${primaryTargetLabel}块级修改 ${index + 1}` : `块级修改 ${index + 1}`;
    case 'document':
      return '整篇文档修改';
    case 'preview-selection':
      return `预览选区修改 ${index + 1}`;
    default:
      return `AI 修改 ${index + 1}`;
  }
};

const resolveFallbackBlockType = (patch: DocumentFormatPatch): string | undefined => {
  if (patch.h1 && Object.keys(patch.h1).length > 0) {
    return 'heading1';
  }

  if (patch.h2 && Object.keys(patch.h2).length > 0) {
    return 'heading2';
  }

  if (patch.h3 && Object.keys(patch.h3).length > 0) {
    return 'heading3';
  }

  if (patch.code && Object.keys(patch.code).length > 0) {
    return 'code';
  }

  if (patch.blockquote && Object.keys(patch.blockquote).length > 0) {
    return 'blockquote';
  }

  if (patch.list && Object.keys(patch.list).length > 0) {
    return 'list';
  }

  if (patch.paragraph && Object.keys(patch.paragraph).length > 0) {
    return 'paragraph';
  }

  if (patch.body && Object.keys(patch.body).length > 0) {
    return 'paragraph';
  }

  return undefined;
};

export const buildAppliedAiFormattingSummary = (
  documentPatch: DocumentFormatPatch,
  scopedPatches: ScopedFormatPatch[]
): AppliedAiFormattingSummary => {
  const aiScopedPatches = scopedPatches.filter((patch) => patch.source === 'ai');
  const documentLevelCount = countPatchProperties(documentPatch);
  const scopedLevelCount = aiScopedPatches.reduce((total, patch) => total + countPatchProperties(patch.patch), 0);
  const details: AppliedAiFormattingSummaryDetail[] = [];

  if (documentLevelCount > 0) {
    const documentLines = summarizePatchTargets(documentPatch);
    details.push({
      id: 'document-level',
      title: '整篇文档级设置',
      description: documentLines.join('；'),
      changeCount: documentLevelCount,
      revertAction: {
        kind: 'document-patch',
      },
      previewTarget: {
        kind: 'document',
      },
    });
  }

  aiScopedPatches.forEach((patch, index) => {
    const changeCount = countPatchProperties(patch.patch);
    if (changeCount <= 0) {
      return;
    }

    const patchLines = summarizePatchTargets(patch.patch);
    details.push({
      id: patch.id,
      title: buildScopeTitle(patch, index),
      description: patchLines.join('；'),
      changeCount,
      revertAction: {
        kind: 'scoped-patch',
        patchId: patch.id,
      },
      previewTarget:
        patch.scope.scopeType === 'selection'
          ? {
              kind: 'selection',
              targetId: sanitizePreviewTargetId(patch.id),
            }
          : patch.scope.scopeType === 'block'
            ? {
                kind: 'block',
                targetId: patch.scope.blockId,
                fallbackBlockType: resolveFallbackBlockType(patch.patch),
              }
            : {
                kind: 'document',
              },
    });
  });

  return {
    scopeCount: aiScopedPatches.length + (documentLevelCount > 0 ? 1 : 0),
    styleChangeCount: documentLevelCount + scopedLevelCount,
    hasDocumentLevelChanges: documentLevelCount > 0,
    details,
  };
};
