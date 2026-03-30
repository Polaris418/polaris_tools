import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import type { MarkdownBlock, MarkdownBlockType } from './scopeTypes';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

const createLineStartOffsets = (content: string): number[] => {
  const offsets: number[] = [0];

  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === '\n') {
      offsets.push(index + 1);
    }
  }

  return offsets;
};

const toPreviewText = (rawText: string): string =>
  rawText
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 120);

const hashText = (value: string): string => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
};

const getBlockType = (token: Token, text: string): MarkdownBlockType => {
  const trimmedText = text.trim();
  if (token.type === 'heading_open') {
    if (token.tag === 'h1') return 'heading1';
    if (token.tag === 'h2') return 'heading2';
    if (token.tag === 'h3') return 'heading3';
    return 'unknown';
  }

  switch (token.type) {
    case 'paragraph_open':
      if (trimmedText.startsWith('$$') && trimmedText.endsWith('$$')) {
        return 'formula';
      }
      return 'paragraph';
    case 'blockquote_open':
      return 'blockquote';
    case 'fence':
    case 'code_block':
      return 'code';
    case 'bullet_list_open':
    case 'ordered_list_open':
      return 'list';
    case 'hr':
      return 'hr';
    case 'html_block':
      return 'html';
    default:
      return 'unknown';
  }
};

const shouldIncludeToken = (token: Token): boolean => {
  if (!token.map) {
    return false;
  }

  if (token.type === 'fence' || token.type === 'code_block' || token.type === 'html_block' || token.type === 'hr') {
    return true;
  }

  if (token.nesting === 1 && token.level === 0) {
    return (
      token.type === 'heading_open' ||
      token.type === 'paragraph_open' ||
      token.type === 'blockquote_open' ||
      token.type === 'bullet_list_open' ||
      token.type === 'ordered_list_open'
    );
  }

  return false;
};

export const parseMarkdownBlocks = (content: string): MarkdownBlock[] => {
  if (!content.trim()) {
    return [];
  }

  const tokens = md.parse(content, {});
  const lines = content.split('\n');
  const lineStartOffsets = createLineStartOffsets(content);

  return tokens
    .filter(shouldIncludeToken)
    .map((token) => {
      const [lineStart, lineEndExclusive] = token.map ?? [0, 0];
      const lineEnd = Math.max(lineStart, lineEndExclusive - 1);
      const text = lines.slice(lineStart, lineEndExclusive).join('\n');
      const blockType = getBlockType(token, text);
      const contentHash = hashText(`${blockType}:${text}`);
      const startOffset = lineStartOffsets[lineStart] ?? 0;
      const endOffset = lineStartOffsets[lineEndExclusive] ?? content.length;

      return {
        blockId: `${blockType}-${lineStart}-${contentHash}`,
        blockType,
        lineStart,
        lineEnd,
        startOffset,
        endOffset,
        text,
        textPreview: toPreviewText(text),
      };
    });
};
