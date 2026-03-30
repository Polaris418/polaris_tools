import type { Result } from '../types';
import type { DocumentFormatPatch, FormatScope, ResolvedFormatConfig } from '../tools/md2word/formatting/types';
import type { MarkdownBlock } from '../tools/md2word/formatting/scopeTypes';
import type { HttpRequester } from './http';

export interface AiFormattingParseRequest {
  instruction: string;
  mode: 'merge';
  scope: FormatScope;
  currentBlock?: {
    blockId: string;
    blockType: MarkdownBlock['blockType'];
    lineStart: number;
    lineEnd: number;
    text: string;
    textPreview: string;
  };
  currentSelection?: {
    start: number;
    end: number;
    text: string;
  };
  currentResolvedFormat: ResolvedFormatConfig;
  supportedProperties: string[];
  selectionSegments?: Array<{
    segmentId: string;
    blockId: string;
    blockType: MarkdownBlock['blockType'];
    segmentRole: string;
    selectedText: string;
    textPreview: string;
    sourceStart: number;
    sourceEnd: number;
    selectedStart: number;
    selectedEnd: number;
  }>;
}

export interface AiFormattingScopedPatchResponse {
  scope: FormatScope;
  patch: DocumentFormatPatch;
  summary?: string;
}

export interface AiFormattingParseResponse {
  documentPatch: DocumentFormatPatch;
  scopedPatches: AiFormattingScopedPatchResponse[];
  proposedChanges?: AiFormattingProposedChangeResponse[];
  summary: string;
  providerUsed?: string;
  remainingCount?: number | null;
}

export interface AiFormattingProposedStyleChangeResponse {
  changeId?: string;
  target: 'h1' | 'h2' | 'h3' | 'body' | 'code' | 'document';
  property: string;
  value: string | number | boolean;
  label?: string;
}

export interface AiFormattingProposedChangeResponse {
  segmentId: string;
  blockId?: string;
  blockType?: MarkdownBlock['blockType'];
  textPreview?: string;
  summary?: string;
  styleChanges: AiFormattingProposedStyleChangeResponse[];
}

export const createAiFormattingApi = (client: HttpRequester) => ({
  parseIntent: (
    payload: AiFormattingParseRequest,
    guestId?: string
  ): Promise<Result<AiFormattingParseResponse>> => {
    const headers: HeadersInit = {
      ...(guestId ? { 'X-Guest-Id': guestId } : {}),
    };

    return client.request<AiFormattingParseResponse>('/api/v1/ai/formatting/parse', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },
});
