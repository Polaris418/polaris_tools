/**
 * 纯前端文档转换工具
 * 支持 Markdown 到 DOCX/PDF/HTML 的转换
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType, Bookmark, InternalHyperlink, Tab, TabStopType, LeaderType, TabStopPosition } from 'docx';
import MarkdownIt from 'markdown-it';
import markdownItKatex from 'markdown-it-katex';
import { jsPDF } from 'jspdf';
import { DEFAULT_BASE_TEMPLATE, TEMPLATE_DEFAULTS } from '../tools/md2word/formatting/defaults';
import { buildScopedBlockCss, resolveScopedFormatConfig } from '../tools/md2word/formatting/applyScopedPatches';
import { parseMarkdownBlocks } from '../tools/md2word/formatting/parseMarkdownBlocks';
import {
  buildDocxSelectionStyleMap,
  buildSelectionCss,
  getSelectionEndMarker,
  getSelectionStartMarker,
  injectSelectionMarkers,
  replaceSelectionMarkersWithHtml,
  resolveAppliedSelectionPatches,
} from '../tools/md2word/formatting/selectionFormatting';
import type { BaseTemplateId, ResolvedFormatConfig, ScopedFormatPatch } from '../tools/md2word/formatting/types';

// 初始化 Markdown 解析器
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})
  .use(markdownItKatex, { throwOnError: false, errorColor: '#cc0000' });

const SUPERDOC_PREVIEW_PAGE_BREAK = '[[SUPERDOC_PAGE_BREAK]]';
const SUPERDOC_PREVIEW_TOC_TITLE = '[[SUPERDOC_TOC_TITLE:';
const SUPERDOC_PREVIEW_TOC_ITEM = '[[SUPERDOC_TOC_ITEM:';

const parseSuperDocPreviewTocTitle = (line: string): string | null => {
  const trimmed = line.trim();
  if (!trimmed.startsWith(SUPERDOC_PREVIEW_TOC_TITLE) || !trimmed.endsWith(']]')) {
    return null;
  }

  return trimmed.slice(SUPERDOC_PREVIEW_TOC_TITLE.length, -2).trim() || null;
};

const parseSuperDocPreviewTocItem = (
  line: string
): { level: number; label: string; pageNumber: string } | null => {
  const trimmed = line.trim();
  if (!trimmed.startsWith(SUPERDOC_PREVIEW_TOC_ITEM) || !trimmed.endsWith(']]')) {
    return null;
  }

  const rawPayload = trimmed.slice(SUPERDOC_PREVIEW_TOC_ITEM.length, -2);
  const [levelText, label, pageNumber] = rawPayload.split('|');
  const level = Number.parseInt(levelText, 10);
  if (!Number.isFinite(level) || !label || !pageNumber) {
    return null;
  }

  return {
    level: Math.max(0, Math.min(level, 2)),
    label: label.trim(),
    pageNumber: pageNumber.trim(),
  };
};

const buildPreviewTocLeader = (label: string, level: number): string =>
  '.'.repeat(Math.max(10, 34 - Math.min(label.length, 18) - level * 6));

const stripHeadingMarkdown = (value: string): string => value.replace(/^#{1,6}\s+/, '').trim();

const getHeadingBookmarkId = (blockId: string): string => `toc-${blockId}`;

const buildVisibleDocxTocParagraphs = (
  headingBlocks: ReturnType<typeof parseMarkdownBlocks>,
  config: TemplateConfig
): Paragraph[] => {
  const filteredHeadingBlocks = headingBlocks.filter((block) =>
    ['heading1', 'heading2', 'heading3'].includes(block.blockType)
  );

  if (filteredHeadingBlocks.length === 0) {
    return [];
  }

  const paragraphs: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: '目录',
          bold: true,
          size: 32,
          color: '000000',
          font: config.styles.body.font,
        }),
      ],
      spacing: { before: 120, after: 220 },
      alignment: AlignmentType.CENTER,
    }),
  ];

  filteredHeadingBlocks.forEach((block, index) => {
    const level = block.blockType === 'heading1' ? 0 : block.blockType === 'heading2' ? 1 : 2;
    const indentTwips = level === 0 ? 0 : level === 1 ? 420 : 840;
    const tocFontSize = level === 0 ? 22 : level === 1 ? 21 : 20;
    const pageNumber = Math.max(2, Math.ceil((index + 1) / 3) + 1);
    const label = stripHeadingMarkdown(block.text);

    paragraphs.push(
      new Paragraph({
        children: [
          new InternalHyperlink({
            anchor: getHeadingBookmarkId(block.blockId),
            children: [
              new TextRun({
                text: label,
                size: tocFontSize,
                color: '000000',
                font: config.styles.body.font,
              }),
            ],
          }),
          new Tab(),
          new TextRun({
            text: String(pageNumber),
            size: tocFontSize,
            color: '000000',
            font: config.styles.body.font,
          }),
        ],
        indent: {
          left: indentTwips,
        },
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: TabStopPosition.MAX,
            leader: LeaderType.DOT,
          },
        ],
        spacing: { before: 0, after: level === 0 ? 90 : 70, line: 360 },
      })
    );
  });

  paragraphs.push(new Paragraph({ text: '', pageBreakBefore: true }));
  return paragraphs;
};

/**
 * 模板配置
 */
interface TemplateConfig {
  name: string;
  styles: {
    h1: { fontSize: number; bold: boolean; color: string; alignment?: string; font?: string };
    h2: { fontSize: number; bold: boolean; color: string; font?: string };
    h3: { fontSize: number; bold: boolean; color: string; font?: string };
    body: { fontSize: number; color: string; lineSpacing?: number; font?: string };
    code: { fontSize: number; font: string; background?: string };
  };
}

interface InlineRunStyle {
  font: string;
  size: number;
  color: string;
  bold?: boolean;
  italics?: boolean;
  background?: string;
}

export type DocxExportStrategy = 'superdoc' | 'native-docx' | 'html-docx';

export interface SuperDocDocxExportAdapter {
  exportDocx?: (args: {
    markdown: string;
    config: ResolvedFormatConfig;
    scopedPatches: ScopedFormatPatch[];
  }) => Promise<Blob | null | undefined>;
}

export interface DocxExportWithPriorityOptions {
  preferSuperDoc?: boolean;
  superDocAdapter?: SuperDocDocxExportAdapter | null;
  nativeDocxExport?: (args: {
    markdown: string;
    config: ResolvedFormatConfig;
    scopedPatches: ScopedFormatPatch[];
  }) => Promise<Blob>;
  htmlDocxExport?: (args: {
    markdown: string;
    config: ResolvedFormatConfig;
    scopedPatches: ScopedFormatPatch[];
  }) => Blob;
}

const TEMPLATES: Record<string, TemplateConfig> = {
  academic: {
    name: '学术论文',
    styles: {
      h1: { fontSize: 32, bold: true, color: '000000', alignment: 'center', font: 'SimSun' },
      h2: { fontSize: 28, bold: true, color: '000000', font: 'SimSun' },
      h3: { fontSize: 24, bold: true, color: '000000', font: 'SimSun' },
      body: { fontSize: 24, color: '000000', lineSpacing: 360, font: 'SimSun' },
      code: { fontSize: 20, font: 'Consolas', background: 'F5F5F5' },
    },
  },
  corporate: {
    name: '企业报告',
    styles: {
      h1: { fontSize: 36, bold: true, color: '000000', font: 'Microsoft YaHei' },
      h2: { fontSize: 28, bold: true, color: '000000', font: 'Microsoft YaHei' },
      h3: { fontSize: 24, bold: true, color: '000000', font: 'Microsoft YaHei' },
      body: { fontSize: 22, color: '000000', lineSpacing: 276, font: 'Microsoft YaHei' },
      code: { fontSize: 20, font: 'Consolas', background: 'F5F5F5' },
    },
  },
  technical: {
    name: '技术手册',
    styles: {
      h1: { fontSize: 32, bold: true, color: '000000', font: 'Arial' },
      h2: { fontSize: 28, bold: true, color: '000000', font: 'Arial' },
      h3: { fontSize: 24, bold: true, color: '000000', font: 'Arial' },
      body: { fontSize: 22, color: '000000', lineSpacing: 288, font: 'Arial' },
      code: { fontSize: 18, font: 'Consolas', background: '1E1E1E' },
    },
  },
  memo: {
    name: '内部备忘',
    styles: {
      h1: { fontSize: 28, bold: true, color: '000000', font: 'SimHei' },
      h2: { fontSize: 24, bold: true, color: '000000', font: 'SimHei' },
      h3: { fontSize: 22, bold: true, color: '000000', font: 'SimHei' },
      body: { fontSize: 22, color: '000000', lineSpacing: 240, font: 'FangSong' },
      code: { fontSize: 20, font: 'Consolas', background: 'F5F5F5' },
    },
  },
};

type ExportConfigInput = BaseTemplateId | ResolvedFormatConfig;

const normalizeExportConfig = (config?: ExportConfigInput): ResolvedFormatConfig => {
  if (!config) {
    return TEMPLATE_DEFAULTS[DEFAULT_BASE_TEMPLATE];
  }

  if (typeof config === 'string') {
    return TEMPLATE_DEFAULTS[config] ?? TEMPLATE_DEFAULTS[DEFAULT_BASE_TEMPLATE];
  }

  return config;
};

export async function exportDocxWithPriority(
  markdown: string,
  configInput: ExportConfigInput = DEFAULT_BASE_TEMPLATE,
  scopedPatches: ScopedFormatPatch[] = [],
  options: DocxExportWithPriorityOptions = {}
): Promise<{ blob: Blob; strategy: DocxExportStrategy }> {
  const exportOrder: DocxExportStrategy[] = options.preferSuperDoc
    ? options.htmlDocxExport
      ? ['superdoc', 'native-docx', 'html-docx']
      : ['superdoc', 'native-docx']
    : options.htmlDocxExport
      ? ['native-docx', 'html-docx']
      : ['native-docx'];
  let lastError: unknown = null;

  for (const strategy of exportOrder) {
    try {
      if (strategy === 'superdoc') {
        const blob = await options.superDocAdapter?.exportDocx?.({
          markdown,
          config: normalizeExportConfig(configInput),
          scopedPatches,
        });

        if (blob) {
          return { blob, strategy };
        }

        continue;
      }

      if (strategy === 'native-docx') {
        const blob = options.nativeDocxExport
          ? await options.nativeDocxExport({
              markdown,
              config: normalizeExportConfig(configInput),
              scopedPatches,
            })
          : await markdownToDocx(markdown, configInput, scopedPatches);
        return { blob, strategy };
      }

      const htmlDocxExport = options.htmlDocxExport;
      if (htmlDocxExport) {
        return {
          blob: htmlDocxExport({
            markdown,
            config: normalizeExportConfig(configInput),
            scopedPatches,
          }),
          strategy,
        };
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('DOCX export failed');
}

const toLegacyTemplateConfig = (config: ResolvedFormatConfig): TemplateConfig => ({
  name: config.templateId,
  styles: {
    h1: {
      fontSize: config.h1.fontSizePt * 2,
      bold: config.h1.bold,
      color: config.h1.color.replace('#', ''),
      alignment: config.h1.align,
      font: config.h1.fontFamily.split(',')[0].trim(),
    },
    h2: {
      fontSize: config.h2.fontSizePt * 2,
      bold: config.h2.bold,
      color: config.h2.color.replace('#', ''),
      font: config.h2.fontFamily.split(',')[0].trim(),
    },
    h3: {
      fontSize: config.h3.fontSizePt * 2,
      bold: config.h3.bold,
      color: config.h3.color.replace('#', ''),
      font: config.h3.fontFamily.split(',')[0].trim(),
    },
    body: {
      fontSize: config.body.fontSizePt * 2,
      color: config.body.color.replace('#', ''),
      lineSpacing: Math.round(config.body.lineSpacing * 240),
      font: config.body.fontFamily.split(',')[0].trim(),
    },
    code: {
      fontSize: config.code.fontSizePt * 2,
      font: config.code.fontFamily.split(',')[0].trim(),
      background: config.code.backgroundColor.replace('#', ''),
    },
  },
});

const findBlockByLine = (markdown: string, line: number) =>
  parseMarkdownBlocks(markdown).find((block) => line >= block.lineStart && line <= block.lineEnd);

const annotateHtmlWithBlocks = (htmlContent: string, markdown: string): string => {
  if (typeof DOMParser === 'undefined') {
    return htmlContent;
  }

  const blocks = parseMarkdownBlocks(markdown).filter((block) =>
    ['heading1', 'heading2', 'heading3', 'paragraph', 'blockquote', 'code', 'list', 'hr'].includes(block.blockType)
  );
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(`<div id="root">${htmlContent}</div>`, 'text/html');
  const root = documentNode.getElementById('root');

  if (!root) {
    return htmlContent;
  }

  const tagToBlockType: Record<string, string> = {
    H1: 'heading1',
    H2: 'heading2',
    H3: 'heading3',
    P: 'paragraph',
    BLOCKQUOTE: 'blockquote',
    PRE: 'code',
    UL: 'list',
    OL: 'list',
    HR: 'hr',
  };

  let blockIndex = 0;
  Array.from(root.children).forEach((element) => {
    const currentBlock = blocks[blockIndex];
    const expectedBlockType = tagToBlockType[element.tagName];

    if (!currentBlock || !expectedBlockType || currentBlock.blockType !== expectedBlockType) {
      return;
    }

    (element as HTMLElement).dataset.blockId = currentBlock.blockId;
    blockIndex += 1;
  });

  return root.innerHTML;
};

/**
 * Markdown 转 DOCX
 */
export async function markdownToDocx(
  markdown: string,
  configInput: ExportConfigInput = DEFAULT_BASE_TEMPLATE,
  scopedPatches: ScopedFormatPatch[] = []
): Promise<Blob> {
  const baseConfig = normalizeExportConfig(configInput);
  const config = toLegacyTemplateConfig(baseConfig);
  const blocks = parseMarkdownBlocks(markdown);
  const appliedSelections = resolveAppliedSelectionPatches(markdown, blocks, scopedPatches);
  const selectionMarkedMarkdown = injectSelectionMarkers(markdown, appliedSelections);

  // 提取文献引用
  const references: Array<{id: string; text: string}> = [];
  const refPattern = /^\[\^(\w+)\]:\s*(.+)$/gm;
  let refMatch;
  while ((refMatch = refPattern.exec(selectionMarkedMarkdown)) !== null) {
    references.push({ id: refMatch[1], text: refMatch[2] });
  }

  // 移除文献定义行
  let processedMarkdown = selectionMarkedMarkdown.replace(/^\[\^(\w+)\]:\s*.+$/gm, '');

  const lines = processedMarkdown.split('\n');

  // 解析 Markdown
  const paragraphs: Paragraph[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const currentBlock = findBlockByLine(markdown, i);
    const currentResolvedConfig = resolveScopedFormatConfig(
      baseConfig,
      scopedPatches,
      currentBlock?.blockId
    );
    const lineConfig = toLegacyTemplateConfig(currentResolvedConfig);
    const selectionStyleMap = buildDocxSelectionStyleMap(currentBlock, currentResolvedConfig, appliedSelections);

    if (line.trim() === SUPERDOC_PREVIEW_PAGE_BREAK) {
      paragraphs.push(
        new Paragraph({
          text: '',
          pageBreakBefore: true,
        })
      );
      continue;
    }

    const previewTocTitle = parseSuperDocPreviewTocTitle(line);
    if (previewTocTitle) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: previewTocTitle,
              bold: true,
              size: 28,
              color: '000000',
              font: lineConfig.styles.h1.font ?? lineConfig.styles.body.font,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 160, after: 240 },
        })
      );
      continue;
    }

    const previewTocItem = parseSuperDocPreviewTocItem(line);
    if (previewTocItem) {
      const indentTwips = previewTocItem.level * 420;
      const tocFontSize = previewTocItem.level === 0 ? 24 : previewTocItem.level === 1 ? 22 : 20;
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: previewTocItem.label,
              size: tocFontSize,
              color: '000000',
              font: lineConfig.styles.body.font,
            }),
            new Tab(),
            new TextRun({
              text: previewTocItem.pageNumber,
              size: tocFontSize,
              color: '000000',
              font: lineConfig.styles.body.font,
            }),
          ],
          indent: {
            left: indentTwips,
          },
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: TabStopPosition.MAX,
              leader: LeaderType.DOT,
            },
          ],
          spacing: { before: 0, after: 80 },
        })
      );
      continue;
    }

    if (line.startsWith('# ')) {
      // H1 标题 - 不使用预定义样式，直接设置颜色
      paragraphs.push(
        new Paragraph({
          children: [
            new Bookmark({
              id: getHeadingBookmarkId(currentBlock?.blockId ?? `heading1-${i}`),
              children: parseInlineFormatting(line.substring(2), lineConfig, {
                defaultStyle: {
                  font: lineConfig.styles.h1.font ?? lineConfig.styles.body.font ?? 'Microsoft YaHei',
                  size: lineConfig.styles.h1.fontSize,
                  color: lineConfig.styles.h1.color,
                  bold: lineConfig.styles.h1.bold,
                },
                selectionStyles: selectionStyleMap,
              }),
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: lineConfig.styles.h1.alignment === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { before: 400, after: 200 },
        })
      );
    } else if (line.startsWith('## ')) {
      // H2 标题 - 不使用预定义样式，直接设置颜色
      paragraphs.push(
        new Paragraph({
          children: [
            new Bookmark({
              id: getHeadingBookmarkId(currentBlock?.blockId ?? `heading2-${i}`),
              children: parseInlineFormatting(line.substring(3), lineConfig, {
                defaultStyle: {
                  font: lineConfig.styles.h2.font ?? lineConfig.styles.body.font ?? 'Microsoft YaHei',
                  size: lineConfig.styles.h2.fontSize,
                  color: lineConfig.styles.h2.color,
                  bold: lineConfig.styles.h2.bold,
                },
                selectionStyles: selectionStyleMap,
              }),
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      );
    } else if (line.startsWith('### ')) {
      // H3 标题 - 不使用预定义样式，直接设置颜色
      paragraphs.push(
        new Paragraph({
          children: [
            new Bookmark({
              id: getHeadingBookmarkId(currentBlock?.blockId ?? `heading3-${i}`),
              children: parseInlineFormatting(line.substring(4), lineConfig, {
                defaultStyle: {
                  font: lineConfig.styles.h3.font ?? lineConfig.styles.body.font ?? 'Microsoft YaHei',
                  size: lineConfig.styles.h3.fontSize,
                  color: lineConfig.styles.h3.color,
                  bold: lineConfig.styles.h3.bold,
                },
                selectionStyles: selectionStyleMap,
              }),
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // 列表项
      const children = parseInlineFormatting(line.substring(2), lineConfig, {
        selectionStyles: selectionStyleMap,
      });
      paragraphs.push(
        new Paragraph({
          children,
          bullet: { level: 0 },
          spacing: { before: 100, after: 100 },
        })
      );
    } else if (line.startsWith('> ')) {
      // 引用
      paragraphs.push(
        new Paragraph({
          children: parseInlineFormatting(line.substring(2), lineConfig, {
            defaultStyle: {
              font: lineConfig.styles.body.font ?? 'Microsoft YaHei',
              size: lineConfig.styles.body.fontSize,
              color: '666666',
              italics: true,
            },
            selectionStyles: selectionStyleMap,
          }),
          indent: { left: 720 },
          spacing: { before: 100, after: 100 },
        })
      );
    } else if (line.startsWith('```')) {
      // 代码块
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: codeLines.join('\n'),
              font: lineConfig.styles.code.font,
              size: lineConfig.styles.code.fontSize,
              color: '000000',
            }),
          ],
          shading: {
            fill: lineConfig.styles.code.background || 'F5F5F5',
          },
          spacing: { before: 200, after: 200 },
        })
      );
    } else if (line.startsWith('$$')) {
      // 块级数学公式
      const formulaLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('$$')) {
        formulaLines.push(lines[i]);
        i++;
      }
      
      // 转换 LaTeX 为 Unicode
      const formulaText = formulaLines.join(' ');
      const unicodeFormula = convertLatexToUnicode(formulaText);
      
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: unicodeFormula,
              font: 'Cambria Math',
              size: lineConfig.styles.body.fontSize + 4,
              color: '000000',  // 黑色
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
        })
      );
    } else if (line.trim()) {
      // 普通段落 - 处理行内格式和数学公式
      const children = parseInlineFormatting(line, lineConfig, {
        selectionStyles: selectionStyleMap,
      });
      paragraphs.push(
        new Paragraph({
          children,
          spacing: { before: 100, after: 100 },
        })
      );
    } else {
      // 空行
      paragraphs.push(new Paragraph({ text: '' }));
    }
  }

  // 添加参考文献列表
  if (references.length > 0) {
    // 添加分隔线
    paragraphs.push(new Paragraph({ text: '' }));
    paragraphs.push(new Paragraph({ text: '' }));
    
    // 添加参考文献标题
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '参考文献 / References',
            bold: true,
            size: 32,
            color: '000000',
          }),
        ],
        spacing: { before: 400, after: 200 },
      })
    );

    // 添加每条文献（带书签）
    references.forEach((ref) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new Bookmark({
              id: `ref-${ref.id}`,
              children: [
                new TextRun({
                  text: `[${ref.id}] `,
                  bold: true,
                  size: 20,
                  color: '2563eb',
                }),
              ],
            }),
            new TextRun({
              text: ref.text,
              size: 20,
              color: '374151',
            }),
          ],
          spacing: { before: 100, after: 100 },
        })
      );
    });
  }

  // 创建文档
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  // 生成 Blob
  const blob = await Packer.toBlob(doc);
  return blob;
}

/**
 * 将 LaTeX 公式转换为 Unicode 数学符号（简化版）
 */
function convertLatexToUnicode(latex: string): string {
  let result = latex;
  
  // 常见的数学符号转换
  const replacements: Record<string, string> = {
    '\\int': '∫',
    '\\sum': '∑',
    '\\prod': '∏',
    '\\infty': '∞',
    '\\alpha': 'α',
    '\\beta': 'β',
    '\\gamma': 'γ',
    '\\delta': 'δ',
    '\\epsilon': 'ε',
    '\\theta': 'θ',
    '\\lambda': 'λ',
    '\\mu': 'μ',
    '\\pi': 'π',
    '\\sigma': 'σ',
    '\\phi': 'φ',
    '\\omega': 'ω',
    '\\Delta': 'Δ',
    '\\Sigma': 'Σ',
    '\\Omega': 'Ω',
    '\\pm': '±',
    '\\times': '×',
    '\\div': '÷',
    '\\leq': '≤',
    '\\geq': '≥',
    '\\neq': '≠',
    '\\approx': '≈',
    '\\equiv': '≡',
    '\\in': '∈',
    '\\subset': '⊂',
    '\\supset': '⊃',
    '\\cup': '∪',
    '\\cap': '∩',
    '\\emptyset': '∅',
    '\\forall': '∀',
    '\\exists': '∃',
    '\\nabla': '∇',
    '\\partial': '∂',
    '\\sqrt': '√',
  };
  
  // 替换数学符号
  for (const [latex, unicode] of Object.entries(replacements)) {
    result = result.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), unicode);
  }
  
  // 处理分数 \frac{a}{b} -> (a/b)
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');
  
  // 处理上标 ^{n} -> ⁿ (简化处理)
  result = result.replace(/\^2/g, '²');
  result = result.replace(/\^3/g, '³');
  result = result.replace(/\^n/g, 'ⁿ');
  result = result.replace(/\^\{2\}/g, '²');
  result = result.replace(/\^\{3\}/g, '³');
  result = result.replace(/\^\{n\}/g, 'ⁿ');
  result = result.replace(/\^\{-1\}/g, '⁻¹');
  
  // 处理下标 _{n} (保留为普通文本)
  result = result.replace(/_\{([^}]+)\}/g, '₍$1₎');
  result = result.replace(/_([a-zA-Z0-9])/g, '₍$1₎');
  
  // 移除剩余的花括号和反斜杠
  result = result.replace(/[{}\\]/g, '');
  
  // 处理上下限 _{a}^{b} -> [a到b]
  result = result.replace(/₍([^₎]+)₎\^₍([^₎]+)₎/g, '[$1到$2]');
  
  return result.trim();
}

/**
 * 解析行内格式（粗体、斜体、代码、数学公式等）
 */
function parseInlineFormatting(
  text: string,
  config: TemplateConfig,
  options: {
    defaultStyle?: InlineRunStyle;
    selectionStyles?: Map<string, InlineRunStyle>;
  } = {}
): Array<TextRun | InternalHyperlink> {
  const runs: Array<TextRun | InternalHyperlink> = [];
  const defaultStyle: InlineRunStyle = options.defaultStyle ?? {
    font: config.styles.body.font ?? 'Microsoft YaHei',
    size: config.styles.body.fontSize,
    color: config.styles.body.color,
  };
  const selectionStyles = options.selectionStyles ?? new Map<string, InlineRunStyle>();
  let currentText = '';
  let i = 0;
  let activeSelectionStyle: InlineRunStyle | undefined;

  const createRun = (
    textContent: string,
    overrides: Partial<InlineRunStyle> = {}
  ): TextRun => {
    const mergedStyle: InlineRunStyle = {
      ...defaultStyle,
      ...(activeSelectionStyle ?? {}),
      ...overrides,
      bold:
        overrides.bold ??
        activeSelectionStyle?.bold ??
        defaultStyle.bold,
      italics:
        overrides.italics ??
        activeSelectionStyle?.italics ??
        defaultStyle.italics,
    };

    return new TextRun({
      text: textContent,
      font: mergedStyle.font,
      size: mergedStyle.size,
      color: mergedStyle.color,
      bold: mergedStyle.bold,
      italics: mergedStyle.italics,
      shading: mergedStyle.background ? { fill: mergedStyle.background } : undefined,
    });
  };

  const flushCurrentText = () => {
    if (!currentText) {
      return;
    }

    runs.push(createRun(currentText));
    currentText = '';
  };

  const readSelectionMarker = (
    source: string,
    offset: number,
    markerType: 'start' | 'end'
  ): { selectionId: string; marker: string } | null => {
    for (const selectionId of selectionStyles.keys()) {
      const marker =
        markerType === 'start'
          ? getSelectionStartMarker(selectionId)
          : getSelectionEndMarker(selectionId);

      if (source.startsWith(marker, offset)) {
        return { selectionId, marker };
      }
    }

    return null;
  };

  while (i < text.length) {
    const startMarker = readSelectionMarker(text, i, 'start');
    if (startMarker) {
      flushCurrentText();
      activeSelectionStyle = selectionStyles.get(startMarker.selectionId);
      i += startMarker.marker.length;
      continue;
    }

    const endMarker = readSelectionMarker(text, i, 'end');
    if (endMarker) {
      flushCurrentText();
      activeSelectionStyle = undefined;
      i += endMarker.marker.length;
      continue;
    }

    // 行内数学公式 $formula$
    if (text[i] === '$' && text[i + 1] !== '$') {
      flushCurrentText();
      i++; // skip $
      let formulaText = '';
      while (i < text.length && text[i] !== '$') {
        formulaText += text[i];
        i++;
      }
      i++; // skip closing $
      
      // 转换 LaTeX 为 Unicode
      const unicodeFormula = convertLatexToUnicode(formulaText);
      
      runs.push(
        createRun(unicodeFormula, {
          font: 'Cambria Math',
          size: defaultStyle.size,
          color: '000000',
          italics: true,
        })
      );
    }
    // 粗体 **text**
    else if (text.substring(i, i + 2) === '**') {
      flushCurrentText();
      i += 2;
      let boldText = '';
      while (i < text.length && text.substring(i, i + 2) !== '**') {
        boldText += text[i];
        i++;
      }
      runs.push(createRun(boldText, { bold: true }));
      i += 2;
    }
    // 斜体 *text*
    else if (text[i] === '*' && text[i + 1] !== '*') {
      flushCurrentText();
      i++;
      let italicText = '';
      while (i < text.length && text[i] !== '*') {
        italicText += text[i];
        i++;
      }
      runs.push(createRun(italicText, { italics: true }));
      i++;
    }
    // 行内代码 `code`
    else if (text[i] === '`') {
      flushCurrentText();
      i++;
      let codeText = '';
      while (i < text.length && text[i] !== '`') {
        codeText += text[i];
        i++;
      }
      runs.push(
        createRun(codeText, {
          font: config.styles.code.font,
          size: config.styles.code.fontSize,
          color: '000000',
          background: config.styles.code.background || 'F5F5F5',
        })
      );
      i++;
    }
    // 文献引用标记 [^1] - 添加内部超链接
    else if (text.substring(i, i + 2) === '[^') {
      flushCurrentText();
      i += 2; // skip [^
      let refId = '';
      while (i < text.length && text[i] !== ']') {
        refId += text[i];
        i++;
      }
      i++; // skip ]
      
      // 使用 InternalHyperlink 创建可点击的引用
      runs.push(
        new InternalHyperlink({
          anchor: `ref-${refId}`,
          children: [
            new TextRun({
              text: `[${refId}]`,
              superScript: true,
              color: '2563eb',
              size: defaultStyle.size - 4,
              style: 'Hyperlink',
            }),
          ],
        })
      );
    }
    // 链接 [text](url) - 简化处理
    else if (text[i] === '[') {
      flushCurrentText();
      i++;
      let linkText = '';
      while (i < text.length && text[i] !== ']') {
        linkText += text[i];
        i++;
      }
      i++; // skip ]
      if (text[i] === '(') {
        i++; // skip (
        let url = '';
        while (i < text.length && text[i] !== ')') {
          url += text[i];
          i++;
        }
        i++; // skip )
        runs.push(
          new TextRun({
            text: linkText,
            color: '0000FF',
            underline: { type: UnderlineType.SINGLE },
            size: defaultStyle.size,
            font: defaultStyle.font,
            bold: activeSelectionStyle?.bold ?? defaultStyle.bold,
            italics: activeSelectionStyle?.italics ?? defaultStyle.italics,
            shading:
              activeSelectionStyle?.background != null
                ? { fill: activeSelectionStyle.background }
                : undefined,
          })
        );
      }
    } else {
      currentText += text[i];
      i++;
    }
  }

  flushCurrentText();

  return runs.length > 0 ? runs : [createRun(text)];
}

/**
 * Markdown 转 HTML
 */
export function markdownToHtml(
  markdown: string,
  configInput: ExportConfigInput = DEFAULT_BASE_TEMPLATE,
  scopedPatches: ScopedFormatPatch[] = []
): string {
  const baseConfig = normalizeExportConfig(configInput);
  const blocks = parseMarkdownBlocks(markdown);
  const appliedSelections = resolveAppliedSelectionPatches(markdown, blocks, scopedPatches);
  const selectionMarkedMarkdown = injectSelectionMarkers(markdown, appliedSelections);

  // 渲染 Markdown
  const annotatedHtml = replaceSelectionMarkersWithHtml(
    annotateHtmlWithBlocks(md.render(selectionMarkedMarkdown), markdown),
    appliedSelections
  );
  const scopedBlockCss = buildScopedBlockCss(blocks, baseConfig, scopedPatches);
  const selectionCss = buildSelectionCss(baseConfig, scopedPatches, appliedSelections);

  // 添加样式
  const css = `
    <style>
      @import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');
      
      body {
        font-family: '${baseConfig.body.fontFamily}';
        font-size: ${baseConfig.body.fontSizePt}pt;
        line-height: ${baseConfig.body.lineSpacing};
        color: ${baseConfig.body.color};
        max-width: 800px;
        margin: 40px auto;
        padding: 20px;
      }
      
      h1 {
        font-family: '${baseConfig.h1.fontFamily}';
        font-size: ${baseConfig.h1.fontSizePt}pt;
        font-weight: ${baseConfig.h1.bold ? 'bold' : 'normal'};
        font-style: ${baseConfig.h1.italic ? 'italic' : 'normal'};
        color: ${baseConfig.h1.color};
        text-align: ${baseConfig.h1.align || 'left'};
        line-height: ${baseConfig.h1.lineSpacing};
        margin: 24px 0 16px 0;
        padding-bottom: 8px;
        border-bottom: 2px solid #333;
      }
      
      h2 {
        font-family: '${baseConfig.h2.fontFamily}';
        font-size: ${baseConfig.h2.fontSizePt}pt;
        font-weight: ${baseConfig.h2.bold ? 'bold' : 'normal'};
        font-style: ${baseConfig.h2.italic ? 'italic' : 'normal'};
        color: ${baseConfig.h2.color};
        text-align: ${baseConfig.h2.align};
        line-height: ${baseConfig.h2.lineSpacing};
        margin: 20px 0 12px 0;
      }
      
      h3 {
        font-family: '${baseConfig.h3.fontFamily}';
        font-size: ${baseConfig.h3.fontSizePt}pt;
        font-weight: ${baseConfig.h3.bold ? 'bold' : 'normal'};
        font-style: ${baseConfig.h3.italic ? 'italic' : 'normal'};
        color: ${baseConfig.h3.color};
        text-align: ${baseConfig.h3.align};
        line-height: ${baseConfig.h3.lineSpacing};
        margin: 16px 0 10px 0;
      }
      
      p {
        margin: 12px 0;
        font-family: '${baseConfig.body.fontFamily}';
        font-size: ${baseConfig.body.fontSizePt}pt;
        color: ${baseConfig.body.color};
        text-align: ${baseConfig.body.align};
        line-height: ${baseConfig.body.lineSpacing};
      }
      
      code {
        font-family: '${baseConfig.code.fontFamily}';
        font-size: ${baseConfig.code.fontSizePt}pt;
        background-color: ${baseConfig.code.backgroundColor};
        padding: 2px 6px;
        border-radius: 4px;
      }
      
      pre {
        background-color: ${baseConfig.code.backgroundColor};
        padding: 16px;
        border-radius: 8px;
        overflow-x: auto;
        margin: 16px 0;
      }
      
      pre code {
        background: none;
        padding: 0;
      }
      
      blockquote {
        border-left: 4px solid #ccc;
        padding-left: 16px;
        margin: 16px 0;
        color: #666;
        font-style: italic;
      }
      
      ul, ol {
        padding-left: 24px;
        margin: 12px 0;
      }
      
      li {
        margin: 6px 0;
      }
      
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 16px 0;
      }
      
      th, td {
        border: 1px solid #ddd;
        padding: 12px;
        text-align: left;
      }
      
      th {
        background-color: #f5f5f5;
        font-weight: bold;
      }
      
      a {
        color: #0066cc;
        text-decoration: none;
      }
      
      a:hover {
        text-decoration: underline;
      }
      
      img {
        max-width: 100%;
        height: auto;
        margin: 16px 0;
      }

      ${scopedBlockCss}
      ${selectionCss}
    </style>
  `;

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
      ${css}
    </head>
    <body>
      ${annotatedHtml}
    </body>
    </html>
  `;
}

/**
 * Markdown 转 PDF
 */
export async function markdownToPdf(
  markdown: string,
  configInput: ExportConfigInput = DEFAULT_BASE_TEMPLATE,
  scopedPatches: ScopedFormatPatch[] = []
): Promise<Blob> {
  const baseConfig = normalizeExportConfig(configInput);
  const config = toLegacyTemplateConfig(baseConfig);

  // 创建 PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  // 设置字体（使用内置字体）
  doc.setFont('helvetica');

  let yPosition = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxWidth = pageWidth - 2 * margin;

  // 解析 Markdown
  const lines = markdown.split('\n');
  let inBlockFormula = false;
  let formulaLines: string[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const currentBlock = findBlockByLine(markdown, lineIndex);
    const currentResolvedConfig = resolveScopedFormatConfig(
      baseConfig,
      scopedPatches,
      currentBlock?.blockId
    );
    const lineConfig = toLegacyTemplateConfig(currentResolvedConfig);

    // 检查是否需要新页面
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 40;
    }

    // 处理块级数学公式
    if (line.startsWith('$$')) {
      if (!inBlockFormula) {
        inBlockFormula = true;
        formulaLines = [];
        continue;
      } else {
        // 结束块级公式
        inBlockFormula = false;
        
        // 转换 LaTeX 为 Unicode
        const formulaText = formulaLines.join(' ');
        const unicodeFormula = convertLatexToUnicode(formulaText);
        
        doc.setFontSize(lineConfig.styles.body.fontSize / 2 + 2);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(0, 0, 0); // 黑色
        const textLines = doc.splitTextToSize(unicodeFormula, maxWidth);
        doc.text(textLines, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += (lineConfig.styles.body.fontSize / 2 + 2) * textLines.length + 16;
        continue;
      }
    }

    if (inBlockFormula) {
      formulaLines.push(line);
      continue;
    }

    if (line.startsWith('# ')) {
      // H1 标题
      doc.setFontSize(lineConfig.styles.h1.fontSize / 2);
      doc.setFont('helvetica', lineConfig.styles.h1.bold ? 'bold' : 'normal');
      doc.setTextColor(0, 0, 0); // 黑色
      const text = line.substring(2);
      const textLines = doc.splitTextToSize(text, maxWidth);
      doc.text(textLines, lineConfig.styles.h1.alignment === 'center' ? pageWidth / 2 : margin, yPosition, {
        align: lineConfig.styles.h1.alignment === 'center' ? 'center' : 'left',
      });
      yPosition += (lineConfig.styles.h1.fontSize / 2) * textLines.length + 20;
    } else if (line.startsWith('## ')) {
      // H2 标题
      doc.setFontSize(lineConfig.styles.h2.fontSize / 2);
      doc.setFont('helvetica', lineConfig.styles.h2.bold ? 'bold' : 'normal');
      doc.setTextColor(0, 0, 0); // 黑色
      const text = line.substring(3);
      const textLines = doc.splitTextToSize(text, maxWidth);
      doc.text(textLines, margin, yPosition);
      yPosition += (lineConfig.styles.h2.fontSize / 2) * textLines.length + 16;
    } else if (line.startsWith('### ')) {
      // H3 标题
      doc.setFontSize(lineConfig.styles.h3.fontSize / 2);
      doc.setFont('helvetica', lineConfig.styles.h3.bold ? 'bold' : 'normal');
      doc.setTextColor(0, 0, 0); // 黑色
      const text = line.substring(4);
      const textLines = doc.splitTextToSize(text, maxWidth);
      doc.text(textLines, margin, yPosition);
      yPosition += (lineConfig.styles.h3.fontSize / 2) * textLines.length + 14;
    } else if (line.trim()) {
      // 普通文本
      doc.setFontSize(lineConfig.styles.body.fontSize / 2);
      doc.setFont('helvetica', lineConfig.styles.body.font === 'Consolas' ? 'courier' : 'normal');
      doc.setTextColor(0, 0, 0); // 黑色
      
      // 处理行内数学公式
      let cleanText = line;
      cleanText = cleanText.replace(/\$([^$]+)\$/g, (match, formula) => {
        return convertLatexToUnicode(formula);
      });
      
      // 移除其他 Markdown 格式标记
      cleanText = cleanText
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1');
      
      const textLines = doc.splitTextToSize(cleanText, maxWidth);
      doc.text(textLines, margin, yPosition);
      yPosition += (lineConfig.styles.body.fontSize / 2) * textLines.length + 12;
    } else {
      // 空行
      yPosition += 10;
    }
  }

  // 返回 Blob
  return doc.output('blob');
}

/**
 * 下载文件
 */
export function downloadFile(blob: Blob, fileName: string, extension: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
