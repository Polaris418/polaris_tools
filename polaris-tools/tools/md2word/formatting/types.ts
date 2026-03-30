export type BaseTemplateId = 'academic' | 'corporate' | 'technical' | 'memo';

export type FormatTarget = 'h1' | 'h2' | 'h3' | 'body' | 'code';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type PageSize = 'a4' | 'letter';

export interface TextFormatPatch {
  fontFamily?: string;
  fontSizePt?: number;
  color?: string;
  align?: TextAlign;
  bold?: boolean;
  italic?: boolean;
  lineSpacing?: number;
  paragraphSpacingBeforePt?: number;
  paragraphSpacingAfterPt?: number;
  indentLeftPt?: number;
}

export interface CodeFormatPatch extends TextFormatPatch {
  backgroundColor?: string;
}

export interface DocumentSettingsPatch {
  imageQuality?: number;
  includeTableOfContents?: boolean;
  pageNumbers?: boolean;
  mirrorMargins?: boolean;
  pageSize?: PageSize;
}

export interface DocumentFormatPatch {
  h1?: TextFormatPatch;
  h2?: TextFormatPatch;
  h3?: TextFormatPatch;
  body?: TextFormatPatch;
  code?: CodeFormatPatch;
  document?: DocumentSettingsPatch;
}

export type FormatScope =
  | { scopeType: 'document' }
  | { scopeType: 'block'; blockId: string }
  | { scopeType: 'selection'; start: number; end: number }
  | { scopeType: 'preview-selection'; segmentIds: string[] };

export interface ScopedFormatPatch {
  id: string;
  scope: FormatScope;
  patch: DocumentFormatPatch;
  source?: 'manual' | 'ai';
  summary?: string;
}

export interface LegacyPreviewStyle {
  id: string;
  css: string;
}

export interface FormatState {
  baseTemplate: BaseTemplateId;
  documentPatch: DocumentFormatPatch;
  scopedPatches: ScopedFormatPatch[];
  legacyPreviewStyles: LegacyPreviewStyle[];
}

export interface ResolvedTextStyle {
  fontFamily: string;
  fontSizePt: number;
  color: string;
  align: TextAlign;
  bold: boolean;
  italic: boolean;
  lineSpacing: number;
  paragraphSpacingBeforePt: number;
  paragraphSpacingAfterPt: number;
  indentLeftPt: number;
}

export interface ResolvedCodeStyle extends ResolvedTextStyle {
  backgroundColor: string;
}

export interface ResolvedDocumentSettings {
  imageQuality: number;
  includeTableOfContents: boolean;
  pageNumbers: boolean;
  mirrorMargins: boolean;
  pageSize: PageSize;
}

export interface ResolvedFormatConfig {
  templateId: BaseTemplateId;
  h1: ResolvedTextStyle;
  h2: ResolvedTextStyle;
  h3: ResolvedTextStyle;
  body: ResolvedTextStyle;
  code: ResolvedCodeStyle;
  document: ResolvedDocumentSettings;
}
