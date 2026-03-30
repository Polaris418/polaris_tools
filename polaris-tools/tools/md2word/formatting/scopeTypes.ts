import type { FormatScope } from './types';

export type MarkdownBlockType =
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'paragraph'
  | 'blockquote'
  | 'formula'
  | 'code'
  | 'list'
  | 'hr'
  | 'html'
  | 'unknown';

export interface MarkdownBlock {
  blockId: string;
  blockType: MarkdownBlockType;
  lineStart: number;
  lineEnd: number;
  startOffset: number;
  endOffset: number;
  text: string;
  textPreview: string;
}

export type PreviewSegmentRole = 'heading' | 'paragraph' | 'list-item' | 'blockquote';

export interface PreviewSegment {
  segmentId: string;
  blockId: string;
  blockType: MarkdownBlockType;
  segmentRole: PreviewSegmentRole;
  text: string;
  textPreview: string;
  sourceStart: number;
  sourceEnd: number;
}

export interface PreviewSelectionSegment extends PreviewSegment {
  selectedText: string;
  selectedStart: number;
  selectedEnd: number;
}

export interface PreviewSelectionInfo {
  segmentIds: string[];
  segments: PreviewSelectionSegment[];
  selectedText: string;
}

export interface EditorScopeInfo {
  scope: FormatScope;
  currentBlock?: MarkdownBlock;
  selectedText?: string;
  previewSelection?: PreviewSelectionInfo;
  caretLine: number;
  blocks: MarkdownBlock[];
}
