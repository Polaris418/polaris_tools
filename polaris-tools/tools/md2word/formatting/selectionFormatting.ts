import { resolveScopedFormatConfig } from './applyScopedPatches';
import type { MarkdownBlock, MarkdownBlockType } from './scopeTypes';
import type {
  DocumentFormatPatch,
  ResolvedCodeStyle,
  ResolvedFormatConfig,
  ResolvedTextStyle,
  ScopedFormatPatch,
} from './types';

const SUPPORTED_SELECTION_BLOCK_TYPES = new Set<MarkdownBlockType>([
  'heading1',
  'heading2',
  'heading3',
  'paragraph',
  'blockquote',
  'list',
]);

const SELECTION_START_PREFIX = '__MD2W_SELECTION_START__';
const SELECTION_END_PREFIX = '__MD2W_SELECTION_END__';

export interface AppliedSelectionPatch {
  id: string;
  blockId: string;
  blockType: MarkdownBlockType;
  start: number;
  end: number;
  patch: DocumentFormatPatch;
  source?: ScopedFormatPatch['source'];
  summary?: string;
}

export interface InlineSelectionStyle {
  font: string;
  size: number;
  color: string;
  bold?: boolean;
  italics?: boolean;
  background?: string;
}

const sanitizeSelectionId = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]/g, '-');

const rangesOverlap = (left: AppliedSelectionPatch, right: AppliedSelectionPatch): boolean =>
  left.start < right.end && right.start < left.end;

const isSelectionPatch = (patch: ScopedFormatPatch): boolean =>
  patch.scope.scopeType === 'selection' && patch.scope.end > patch.scope.start;

const findContainingBlock = (
  blocks: MarkdownBlock[],
  start: number,
  end: number
): MarkdownBlock | undefined =>
  blocks.find(
    (block) =>
      SUPPORTED_SELECTION_BLOCK_TYPES.has(block.blockType) &&
      start >= block.startOffset &&
      end <= block.endOffset
  );

const applyTextPatch = (
  base: ResolvedTextStyle,
  patch?: Partial<ResolvedTextStyle>
): ResolvedTextStyle => ({
  ...base,
  ...(patch ?? {}),
});

const applyCodePatch = (
  base: ResolvedCodeStyle,
  patch?: Partial<ResolvedCodeStyle>
): ResolvedCodeStyle => ({
  ...base,
  ...(patch ?? {}),
});

const resolveSelectionStyle = (
  blockType: MarkdownBlockType,
  currentConfig: ResolvedFormatConfig,
  patch: DocumentFormatPatch
): ResolvedTextStyle | ResolvedCodeStyle => {
  switch (blockType) {
    case 'heading1':
      return applyTextPatch(applyTextPatch(currentConfig.h1, patch.body), patch.h1);
    case 'heading2':
      return applyTextPatch(applyTextPatch(currentConfig.h2, patch.body), patch.h2);
    case 'heading3':
      return applyTextPatch(applyTextPatch(currentConfig.h3, patch.body), patch.h3);
    case 'code':
      return applyCodePatch(applyCodePatch(currentConfig.code, patch.body), patch.code);
    case 'paragraph':
    case 'blockquote':
    case 'list':
    default:
      return applyTextPatch(currentConfig.body, patch.body);
  }
};

const buildInlineCss = (style: ResolvedTextStyle | ResolvedCodeStyle): string => {
  const cssEntries: Array<[string, string | number | undefined]> = [
    ['font-family', style.fontFamily],
    ['font-size', `${style.fontSizePt}pt`],
    ['color', style.color],
    ['font-weight', style.bold ? 'bold' : 'normal'],
    ['font-style', style.italic ? 'italic' : 'normal'],
    ['line-height', style.lineSpacing],
  ];

  if ('backgroundColor' in style) {
    cssEntries.push(['background-color', style.backgroundColor]);
  }

  return cssEntries
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');
};

export const getSelectionStartMarker = (selectionId: string): string =>
  `${SELECTION_START_PREFIX}${selectionId}__`;

export const getSelectionEndMarker = (selectionId: string): string =>
  `${SELECTION_END_PREFIX}${selectionId}__`;

export const resolveAppliedSelectionPatches = (
  content: string,
  blocks: MarkdownBlock[],
  scopedPatches: ScopedFormatPatch[]
): AppliedSelectionPatch[] => {
  const resolved: AppliedSelectionPatch[] = [];

  scopedPatches.forEach((patch, index) => {
    if (!isSelectionPatch(patch)) {
      return;
    }

    const selectedText = content.slice(patch.scope.start, patch.scope.end);
    if (!selectedText || selectedText.includes('\n')) {
      return;
    }

    const block = findContainingBlock(blocks, patch.scope.start, patch.scope.end);
    if (!block) {
      return;
    }

    const selectionId = sanitizeSelectionId(
      patch.id || `${block.blockId}-${patch.scope.start}-${patch.scope.end}-${index}`
    );

    const appliedPatch: AppliedSelectionPatch = {
      id: selectionId,
      blockId: block.blockId,
      blockType: block.blockType,
      start: patch.scope.start,
      end: patch.scope.end,
      patch: patch.patch,
      source: patch.source,
      summary: patch.summary,
    };

    for (let existingIndex = resolved.length - 1; existingIndex >= 0; existingIndex -= 1) {
      if (
        resolved[existingIndex].blockId === appliedPatch.blockId &&
        rangesOverlap(resolved[existingIndex], appliedPatch)
      ) {
        resolved.splice(existingIndex, 1);
      }
    }

    resolved.push(appliedPatch);
  });

  return resolved.sort((left, right) => left.start - right.start);
};

export const injectSelectionMarkers = (
  content: string,
  appliedSelections: AppliedSelectionPatch[]
): string => {
  if (appliedSelections.length === 0) {
    return content;
  }

  let markedContent = content;
  const selectionsDescending = [...appliedSelections].sort((left, right) => right.start - left.start);

  selectionsDescending.forEach((selection) => {
    const startMarker = getSelectionStartMarker(selection.id);
    const endMarker = getSelectionEndMarker(selection.id);
    markedContent =
      markedContent.slice(0, selection.end) +
      endMarker +
      markedContent.slice(selection.end);
    markedContent =
      markedContent.slice(0, selection.start) +
      startMarker +
      markedContent.slice(selection.start);
  });

  return markedContent;
};

export const replaceSelectionMarkersWithHtml = (
  content: string,
  appliedSelections: AppliedSelectionPatch[]
): string =>
  appliedSelections.reduce((current, selection) => {
    const startMarker = getSelectionStartMarker(selection.id);
    const endMarker = getSelectionEndMarker(selection.id);

    return current
      .split(startMarker)
      .join(`<span data-selection-id="${selection.id}">`)
      .split(endMarker)
      .join('</span>');
  }, content);

export const buildSelectionCss = (
  baseConfig: ResolvedFormatConfig,
  scopedPatches: ScopedFormatPatch[],
  appliedSelections: AppliedSelectionPatch[]
): string =>
  appliedSelections
    .map((selection) => {
      const currentConfig = resolveScopedFormatConfig(baseConfig, scopedPatches, selection.blockId);
      const resolvedStyle = resolveSelectionStyle(selection.blockType, currentConfig, selection.patch);
      const css = buildInlineCss(resolvedStyle);

      if (!css) {
        return '';
      }

      return `
      [data-selection-id="${selection.id}"] {
        ${css}
      }`;
    })
    .join('\n');

export const buildDocxSelectionStyleMap = (
  block: MarkdownBlock | undefined,
  currentConfig: ResolvedFormatConfig,
  appliedSelections: AppliedSelectionPatch[]
): Map<string, InlineSelectionStyle> => {
  if (!block) {
    return new Map();
  }

  const selectionStyles = new Map<string, InlineSelectionStyle>();

  appliedSelections
    .filter((selection) => selection.blockId === block.blockId)
    .forEach((selection) => {
      const resolvedStyle = resolveSelectionStyle(block.blockType, currentConfig, selection.patch);
      selectionStyles.set(selection.id, {
        font: resolvedStyle.fontFamily.split(',')[0].trim(),
        size: resolvedStyle.fontSizePt * 2,
        color: resolvedStyle.color.replace('#', ''),
        bold: resolvedStyle.bold,
        italics: resolvedStyle.italic,
        background:
          'backgroundColor' in resolvedStyle ? resolvedStyle.backgroundColor.replace('#', '') : undefined,
      });
    });

  return selectionStyles;
};
