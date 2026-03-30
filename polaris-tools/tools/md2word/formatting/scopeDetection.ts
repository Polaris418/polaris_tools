import type { FormatScope } from './types';
import type { EditorScopeInfo, MarkdownBlock, PreviewSelectionInfo } from './scopeTypes';

const normalizeOffsets = (content: string, start: number, end: number) => {
  const safeStart = Math.max(0, Math.min(start, content.length));
  const safeEnd = Math.max(0, Math.min(end, content.length));

  return {
    start: Math.min(safeStart, safeEnd),
    end: Math.max(safeStart, safeEnd),
  };
};

export const offsetToLine = (content: string, offset: number): number => {
  const safeOffset = Math.max(0, Math.min(offset, content.length));
  let line = 0;

  for (let index = 0; index < safeOffset; index += 1) {
    if (content[index] === '\n') {
      line += 1;
    }
  }

  return line;
};

const getBlockByLine = (blocks: MarkdownBlock[], line: number): MarkdownBlock | undefined =>
  blocks.find((block) => line >= block.lineStart && line <= block.lineEnd);

const getBlockById = (blocks: MarkdownBlock[], blockId?: string): MarkdownBlock | undefined => {
  if (!blockId) {
    return undefined;
  }

  return blocks.find((block) => block.blockId === blockId);
};

export const resolvePreviewSelectionOffsets = (
  blocks: MarkdownBlock[],
  blockId: string | undefined,
  selectedText: string
): { start: number; end: number; block?: MarkdownBlock } | null => {
  const trimmedSelection = selectedText.trim();
  if (!blockId || !trimmedSelection) {
    return null;
  }

  const block = getBlockById(blocks, blockId);
  if (!block) {
    return null;
  }

  const relativeStart = block.text.indexOf(trimmedSelection);
  if (relativeStart < 0) {
    return null;
  }

  const start = block.startOffset + relativeStart;
  return {
    start,
    end: start + trimmedSelection.length,
    block,
  };
};

export const detectEditorScope = (
  content: string,
  blocks: MarkdownBlock[],
  selectionStart: number,
  selectionEnd: number,
  preferredBlockId?: string,
  previewSelection?: PreviewSelectionInfo | null
): EditorScopeInfo => {
  const { start, end } = normalizeOffsets(content, selectionStart, selectionEnd);
  const caretLine = offsetToLine(content, end);
  const selectedText = end > start ? content.slice(start, end) : undefined;

  if (previewSelection && previewSelection.segments.length > 0) {
    if (previewSelection.segments.length === 1) {
      const [segment] = previewSelection.segments;
      const currentBlock = getBlockById(blocks, segment.blockId);
      return {
        scope: {
          scopeType: 'selection',
          start: segment.sourceStart,
          end: segment.sourceEnd,
        },
        currentBlock,
        selectedText: previewSelection.selectedText,
        previewSelection,
        caretLine,
        blocks,
      };
    }

    return {
      scope: {
        scopeType: 'preview-selection',
        segmentIds: previewSelection.segmentIds,
      },
      selectedText: previewSelection.selectedText,
      previewSelection,
      caretLine,
      blocks,
    };
  }

  if (selectedText) {
    const currentBlock = getBlockByLine(blocks, offsetToLine(content, start));
    return {
      scope: {
        scopeType: 'selection',
        start,
        end,
      },
      currentBlock,
      selectedText,
      caretLine,
      blocks,
    };
  }

  const preferredBlock = getBlockById(blocks, preferredBlockId);
  if (preferredBlock) {
    return {
      scope: {
        scopeType: 'block',
        blockId: preferredBlock.blockId,
      },
      currentBlock: preferredBlock,
      caretLine,
      blocks,
    };
  }

  const currentBlock = getBlockByLine(blocks, caretLine);
  if (currentBlock) {
    return {
      scope: {
        scopeType: 'block',
        blockId: currentBlock.blockId,
      },
      currentBlock,
      caretLine,
      blocks,
    };
  }

  return {
    scope: { scopeType: 'document' as FormatScope['scopeType'] },
    caretLine,
    blocks,
  };
};
