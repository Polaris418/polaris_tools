import type {
  BaseTemplateId,
  FormatState,
  ResolvedDocumentSettings,
  ResolvedFormatConfig,
  ResolvedTextStyle,
} from './types';

const createTextStyle = (overrides: Partial<ResolvedTextStyle>): ResolvedTextStyle => ({
  fontFamily: 'Microsoft YaHei, sans-serif',
  fontSizePt: 11,
  color: '#000000',
  align: 'left',
  bold: false,
  italic: false,
  lineSpacing: 1.15,
  paragraphSpacingBeforePt: 0,
  paragraphSpacingAfterPt: 12,
  indentLeftPt: 0,
  ...overrides,
});

const createDocumentSettings = (
  overrides: Partial<ResolvedDocumentSettings>
): ResolvedDocumentSettings => ({
  imageQuality: 85,
  includeTableOfContents: true,
  pageNumbers: true,
  mirrorMargins: false,
  pageSize: 'a4',
  ...overrides,
});

export const DEFAULT_BASE_TEMPLATE: BaseTemplateId = 'corporate';

export const TEMPLATE_DEFAULTS: Record<BaseTemplateId, ResolvedFormatConfig> = {
  academic: {
    templateId: 'academic',
    h1: createTextStyle({
      fontFamily: 'SimSun, serif',
      fontSizePt: 16,
      align: 'center',
      bold: true,
      lineSpacing: 1.5,
    }),
    h2: createTextStyle({
      fontFamily: 'SimSun, serif',
      fontSizePt: 14,
      bold: true,
      lineSpacing: 1.5,
    }),
    h3: createTextStyle({
      fontFamily: 'SimSun, serif',
      fontSizePt: 12,
      bold: true,
      lineSpacing: 1.5,
    }),
    body: createTextStyle({
      fontFamily: 'SimSun, serif',
      fontSizePt: 12,
      lineSpacing: 1.5,
    }),
    code: {
      ...createTextStyle({
        fontFamily: 'Consolas, monospace',
        fontSizePt: 10,
        lineSpacing: 1.4,
      }),
      backgroundColor: '#F5F5F5',
    },
    document: createDocumentSettings({}),
  },
  corporate: {
    templateId: 'corporate',
    h1: createTextStyle({
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSizePt: 18,
      bold: true,
    }),
    h2: createTextStyle({
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSizePt: 14,
      bold: true,
    }),
    h3: createTextStyle({
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSizePt: 12,
      bold: true,
    }),
    body: createTextStyle({
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSizePt: 11,
      lineSpacing: 1.15,
    }),
    code: {
      ...createTextStyle({
        fontFamily: 'Consolas, monospace',
        fontSizePt: 10,
        lineSpacing: 1.2,
      }),
      backgroundColor: '#F5F5F5',
    },
    document: createDocumentSettings({}),
  },
  technical: {
    templateId: 'technical',
    h1: createTextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSizePt: 16,
      bold: true,
      lineSpacing: 1.2,
    }),
    h2: createTextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSizePt: 14,
      bold: true,
      lineSpacing: 1.2,
    }),
    h3: createTextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSizePt: 12,
      bold: true,
      lineSpacing: 1.2,
    }),
    body: createTextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSizePt: 11,
      lineSpacing: 1.2,
    }),
    code: {
      ...createTextStyle({
        fontFamily: 'Consolas, monospace',
        fontSizePt: 9,
        lineSpacing: 1.2,
      }),
      backgroundColor: '#1E1E1E',
    },
    document: createDocumentSettings({}),
  },
  memo: {
    templateId: 'memo',
    h1: createTextStyle({
      fontFamily: 'SimHei, sans-serif',
      fontSizePt: 14,
      bold: true,
      lineSpacing: 1,
    }),
    h2: createTextStyle({
      fontFamily: 'SimHei, sans-serif',
      fontSizePt: 12,
      bold: true,
      lineSpacing: 1,
    }),
    h3: createTextStyle({
      fontFamily: 'SimHei, sans-serif',
      fontSizePt: 11,
      bold: true,
      lineSpacing: 1,
    }),
    body: createTextStyle({
      fontFamily: 'FangSong, serif',
      fontSizePt: 11,
      lineSpacing: 1,
    }),
    code: {
      ...createTextStyle({
        fontFamily: 'Consolas, monospace',
        fontSizePt: 10,
        lineSpacing: 1.1,
      }),
      backgroundColor: '#F5F5F5',
    },
    document: createDocumentSettings({}),
  },
};

export const createDefaultFormatState = (
  baseTemplate: BaseTemplateId = DEFAULT_BASE_TEMPLATE
): FormatState => ({
  baseTemplate,
  documentPatch: {},
  scopedPatches: [],
  legacyPreviewStyles: [],
});
