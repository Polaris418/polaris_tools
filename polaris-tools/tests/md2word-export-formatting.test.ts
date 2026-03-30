import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { markdownToDocx, markdownToHtml } from '../utils/documentConverter';
import { TEMPLATE_DEFAULTS } from '../tools/md2word/formatting/defaults';
import { parseMarkdownBlocks } from '../tools/md2word/formatting/parseMarkdownBlocks';
import { analyzeSuperDocStructure, buildSuperDocStructureSummaryText } from '../tools/md2word/superdocStructure';
import type { ResolvedFormatConfig, ScopedFormatPatch } from '../tools/md2word/formatting/types';

const SAMPLE_MARKDOWN = `# 标题

第一段正文。

## 第二节

第二段正文。
`;

describe('md2word 导出格式统一', () => {
  it('应让 documentPatch 影响 HTML 导出', () => {
    const formatConfig: ResolvedFormatConfig = {
      ...TEMPLATE_DEFAULTS.corporate,
      body: {
        ...TEMPLATE_DEFAULTS.corporate.body,
        fontFamily: 'SimSun, serif',
        fontSizePt: 12,
      },
      document: {
        ...TEMPLATE_DEFAULTS.corporate.document,
        includeTableOfContents: false,
        pageNumbers: false,
      },
    };

    const html = markdownToHtml(SAMPLE_MARKDOWN, formatConfig);

    expect(html).toContain("font-family: 'SimSun, serif'");
    expect(html).toContain('font-size: 12pt');
    expect(html).not.toContain('Table of Contents');
  });

  it('应让 blockPatch 影响 HTML 导出中的指定块', () => {
    const paragraphBlock = parseMarkdownBlocks(SAMPLE_MARKDOWN).find(
      (block) => block.blockType === 'paragraph'
    );

    const scopedPatches: ScopedFormatPatch[] = [
      {
        id: 'paragraph-highlight',
        scope: {
          scopeType: 'block',
          blockId: paragraphBlock?.blockId ?? 'paragraph-fallback',
        },
        patch: {
          body: {
            fontFamily: 'FangSong, serif',
            fontSizePt: 14,
            align: 'center',
          },
        },
        source: 'ai',
      },
    ];

    const html = markdownToHtml(SAMPLE_MARKDOWN, TEMPLATE_DEFAULTS.corporate, scopedPatches);

    expect(html).toContain(`[data-block-id="${paragraphBlock?.blockId}"]`);
    expect(html).toContain('font-family: FangSong, serif;');
    expect(html).toContain('text-align: center;');
  });

  it('应让 selectionPatch 影响 HTML 导出中的选中文本', () => {
    const start = SAMPLE_MARKDOWN.indexOf('第一段正文');
    const end = start + '正文'.length;
    const scopedPatches: ScopedFormatPatch[] = [
      {
        id: 'selection-inline',
        scope: {
          scopeType: 'selection',
          start,
          end,
        },
        patch: {
          body: {
            fontFamily: 'FangSong, serif',
            color: '#c1121f',
            bold: true,
          },
        },
        source: 'ai',
      },
    ];

    const html = markdownToHtml(SAMPLE_MARKDOWN, TEMPLATE_DEFAULTS.corporate, scopedPatches);

    expect(html).toContain('data-selection-id="selection-inline"');
    expect(html).toContain('font-family: FangSong, serif;');
    expect(html).toContain('color: #c1121f;');
    expect(html).toContain('font-weight: bold;');
  });

  it('应允许 DOCX 导出直接使用统一格式配置', async () => {
    const formatConfig: ResolvedFormatConfig = {
      ...TEMPLATE_DEFAULTS.academic,
      h1: {
        ...TEMPLATE_DEFAULTS.academic.h1,
        align: 'center',
      },
    };

    const blob = await markdownToDocx(SAMPLE_MARKDOWN, formatConfig, []);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('即使开启目录选项，DOCX 导出也不应再自动插入目录页', async () => {
    const formatConfig: ResolvedFormatConfig = {
      ...TEMPLATE_DEFAULTS.academic,
      document: {
        ...TEMPLATE_DEFAULTS.academic.document,
        includeTableOfContents: true,
      },
    };

    const blob = await markdownToDocx(SAMPLE_MARKDOWN, formatConfig, []);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const documentXml = await zip.file('word/document.xml')?.async('string');

    expect(documentXml).not.toContain('目录');
    expect(documentXml).not.toContain('w:anchor=');
  });

  it('应允许 DOCX 导出处理 selectionPatch 而不丢失文档生成', async () => {
    const start = SAMPLE_MARKDOWN.indexOf('第二段正文');
    const end = start + '第二段'.length;
    const scopedPatches: ScopedFormatPatch[] = [
      {
        id: 'selection-docx',
        scope: {
          scopeType: 'selection',
          start,
          end,
        },
        patch: {
          body: {
            color: '#1d4ed8',
            italic: true,
          },
        },
        source: 'ai',
      },
    ];

    const blob = await markdownToDocx(SAMPLE_MARKDOWN, TEMPLATE_DEFAULTS.corporate, scopedPatches);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('复杂结构文档应在 SuperDoc 中给出回退建议，但 DOCX 仍应可生成', async () => {
    const markdown = [
      '# 复杂结构',
      '',
      '| 列一 | 列二 |',
      '| --- | --- |',
      '| A | B |',
      '',
      '$$',
      'E = mc^2',
      '$$',
      '',
      '这里有一个脚注[^alpha]和引用[1]。',
      '',
      '[^alpha]: 这是脚注内容',
      '[1]: 这是引用来源',
    ].join('\n');

    const summary = analyzeSuperDocStructure(markdown);
    const summaryText = buildSuperDocStructureSummaryText(summary, 'zh');
    const blob = await markdownToDocx(markdown, TEMPLATE_DEFAULTS.academic, []);

    expect(summary.recommendation).toBe('prefer-html-fallback');
    expect(summaryText.shortLabel).toBe('建议切回 HTML 回退');
    expect(summaryText.featureLabels).toEqual(['表格 x1', '公式 x1', '脚注 x1', '引用 x1']);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('SuperDoc 结构摘要应与关闭自动目录后的 DOCX 导出保持同一份文档前提', async () => {
    const markdown = [
      '# 一级标题',
      '',
      '## 二级标题',
      '',
      '### 三级标题',
      '',
      '正文内容',
    ].join('\n');

    const summary = analyzeSuperDocStructure(markdown);
    const summaryText = buildSuperDocStructureSummaryText(summary, 'zh');
    const blob = await markdownToDocx(
      markdown,
      {
        ...TEMPLATE_DEFAULTS.academic,
        document: {
          ...TEMPLATE_DEFAULTS.academic.document,
          includeTableOfContents: true,
        },
      },
      []
    );

    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const documentXml = await zip.file('word/document.xml')?.async('string');

    expect(summary.hasDetectedStructures).toBe(false);
    expect(summaryText.shortLabel).toBe('未检测到复杂结构');
    expect(documentXml).toContain('一级标题');
    expect(documentXml).toContain('二级标题');
    expect(documentXml).toContain('三级标题');
    expect(documentXml).not.toContain('w:anchor=');
  });
});
