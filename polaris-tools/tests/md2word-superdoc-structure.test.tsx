import { beforeEach, describe, expect, it } from 'vitest';
import {
  analyzeSuperDocStructure,
  buildSuperDocStructureGuidanceItems,
  buildSuperDocStructureReviewChecklist,
  buildSuperDocStructureSummaryText,
  shouldPreferSuperDocDocxExport,
} from '../tools/md2word/superdocStructure';

describe('md2word SuperDoc 复杂结构检测', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('应检测表格、公式、脚注、引用并生成结构摘要与建议', () => {
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

    expect(summary.hasDetectedStructures).toBe(true);
    expect(summary.detectedFeatures).toEqual(['table', 'formula', 'footnote', 'reference']);
    expect(summary.highestSupportRisk).toBe('review-recommended');
    expect(summary.recommendation).toBe('prefer-html-fallback');
    expect(summary.items).toEqual([
      expect.objectContaining({ feature: 'table', count: 1, detected: true, supportLevel: 'basic-import' }),
      expect.objectContaining({ feature: 'formula', count: 1, detected: true, supportLevel: 'review-recommended' }),
      expect.objectContaining({ feature: 'footnote', count: 1, detected: true, supportLevel: 'review-recommended' }),
      expect.objectContaining({ feature: 'reference', count: 1, detected: true, supportLevel: 'basic-import' }),
    ]);
    expect(summaryText.shortLabel).toBe('建议切回 HTML 回退');
    expect(summaryText.recommendationLabel).toContain('HTML 回退');
    expect(summaryText.featureLabels).toEqual(['表格 x1', '公式 x1', '脚注 x1', '引用 x1']);
  });

  it('表格与引用场景应给出可在 SuperDoc 继续但需复核的建议', () => {
    const markdown = [
      '# 表格引用',
      '',
      '| 名称 | 值 |',
      '| --- | --- |',
      '| A | 1 |',
      '',
      '已有研究表明这种结构可行[1]。',
    ].join('\n');

    const summary = analyzeSuperDocStructure(markdown);
    const summaryText = buildSuperDocStructureSummaryText(summary, 'zh');

    expect(summary.hasDetectedStructures).toBe(true);
    expect(summary.highestSupportRisk).toBe('basic-import');
    expect(summary.recommendation).toBe('review-in-superdoc');
    expect(summary.detectedFeatures).toEqual(['table', 'reference']);
    expect(summary.items.find((item) => item.feature === 'table')?.count).toBe(1);
    expect(summary.items.find((item) => item.feature === 'reference')?.count).toBe(1);
    expect(summaryText.shortLabel).toBe('可在 SuperDoc 继续，但需复核');
    expect(summaryText.recommendationLabel).toContain('导出前复核');
  });

  it('表格结构应给出更具体的数量、支持级别与复核说明', () => {
    const markdown = [
      '# 表格详情',
      '',
      '| 名称 | 值 |',
      '| --- | --- |',
      '| A | 1 |',
    ].join('\n');

    const summary = analyzeSuperDocStructure(markdown);
    const summaryText = buildSuperDocStructureSummaryText(summary, 'zh');
    const guidanceItems = buildSuperDocStructureGuidanceItems(summary, 'zh');
    const tableGuidance = guidanceItems.find((item) => item.feature === 'table');

    expect(summaryText.detailLabel).toContain('表格共 1 处');
    expect(summaryText.detailLabel).toContain('合并单元格');
    expect(tableGuidance).toEqual(
      expect.objectContaining({
        count: 1,
        supportLabel: '基础导入',
        description: expect.stringContaining('表格共 1 处'),
        recommendedAction: expect.stringContaining('HTML 回退'),
      })
    );
  });

  it('未检测到复杂结构时应给出可直接继续使用 SuperDoc 的摘要', () => {
    const summary = analyzeSuperDocStructure('# 普通文档\n\n这是一段普通正文。');
    const summaryText = buildSuperDocStructureSummaryText(summary, 'zh');

    expect(summary.hasDetectedStructures).toBe(false);
    expect(summary.highestSupportRisk).toBeNull();
    expect(summary.recommendation).toBe('safe-in-superdoc');
    expect(summary.detectedFeatures).toEqual([]);
    expect(summaryText.shortLabel).toBe('未检测到复杂结构');
    expect(summaryText.recommendationLabel).toBe('可直接继续使用 SuperDoc');
  });

  it('脚注应按唯一标识去重，不应把同一脚注引用和定义重复计数', () => {
    const markdown = [
      '# 脚注去重',
      '',
      '第一处脚注[^note]，第二处脚注[^note]。',
      '',
      '[^note]: 同一个脚注定义。',
    ].join('\n');

    const summary = analyzeSuperDocStructure(markdown);
    expect(summary.items.find((item) => item.feature === 'footnote')?.count).toBe(1);
  });

  it('应识别作者-年份形式的引用', () => {
    const markdown = '研究已被证明有效（Smith, 2024）。\n\n另一个结论（Wang et al., 2023）。';
    const summary = analyzeSuperDocStructure(markdown);
    const referenceItem = summary.items.find((item) => item.feature === 'reference');

    expect(referenceItem).toEqual(
      expect.objectContaining({
        detected: true,
        count: 2,
      })
    );
  });

  it('应统计多个 Markdown 表格块', () => {
    const markdown = [
      '| A | B |',
      '| --- | --- |',
      '| 1 | 2 |',
      '',
      '正文',
      '',
      '| C | D |',
      '| --- | --- |',
      '| 3 | 4 |',
    ].join('\n');

    const summary = analyzeSuperDocStructure(markdown);
    expect(summary.items.find((item) => item.feature === 'table')?.count).toBe(2);
  });

  it('组件 smoke 建议：表格与公式场景当前应提示切回 HTML 回退', () => {
    const markdown = [
      '# 结构 smoke',
      '',
      '## 表格区',
      '',
      '| 列一 | 列二 |',
      '| --- | --- |',
      '| A | B |',
      '',
      '## 公式区',
      '',
      '$$',
      'E = mc^2',
      '$$',
    ].join('\n');
    const summaryText = buildSuperDocStructureSummaryText(analyzeSuperDocStructure(markdown), 'zh');

    expect(summaryText.recommendationLabel).toContain('HTML 回退');
  });

  it('组件 smoke 建议：脚注与引用场景当前应提示切回 HTML 回退', () => {
    const markdown = [
      '# 脚注引用 smoke',
      '',
      '这里有一个脚注[^1]，以及一个引用[1]。',
      '',
      '[^1]: 这是脚注内容。',
      '',
      '[1]: 这是引用来源。',
    ].join('\n');
    const summaryText = buildSuperDocStructureSummaryText(analyzeSuperDocStructure(markdown), 'zh');

    expect(summaryText.recommendationLabel).toContain('HTML 回退');
  });

  it('复杂结构建议回退时不应优先走 SuperDoc DOCX 导出', () => {
    const summary = analyzeSuperDocStructure(
      ['# 公式文档', '', '$$', 'E = mc^2', '$$'].join('\n')
    );

    expect(summary.recommendation).toBe('prefer-html-fallback');
    expect(shouldPreferSuperDocDocxExport(summary)).toBe(false);
  });

  it('基础导入级结构仍可优先走 SuperDoc DOCX 导出', () => {
    const summary = analyzeSuperDocStructure(
      ['# 表格文档', '', '| A | B |', '| --- | --- |', '| 1 | 2 |'].join('\n')
    );

    expect(summary.recommendation).toBe('review-in-superdoc');
    expect(shouldPreferSuperDocDocxExport(summary)).toBe(true);
  });
  it('ӦΪ���ӽṹ�������ɵĸ���ָ����', () => {
    const summary = analyzeSuperDocStructure(
      ['# ���ӽṹ', '', '| A | B |', '| --- | --- |', '| 1 | 2 |', '', '$$', 'E = mc^2', '$$'].join('\n')
    );
    const guidanceItems = buildSuperDocStructureGuidanceItems(summary, 'zh');

    expect(guidanceItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          feature: 'table',
          supportLevel: 'basic-import',
        }),
        expect.objectContaining({
          feature: 'formula',
          supportLevel: 'review-recommended',
        }),
      ])
    );
    expect(guidanceItems.find((item) => item.feature === 'formula')?.recommendedAction).toContain('DOCX');
  });

  it('应为复杂结构生成逐项复核清单', () => {
    const summary = analyzeSuperDocStructure(
      [
        '# 复杂结构',
        '',
        '| A | B |',
        '| --- | --- |',
        '| 1 | 2 |',
        '',
        '$$',
        'E = mc^2',
        '$$',
        '',
        '这里有一个脚注[^note]和引用[1]。',
        '',
        '[^note]: 脚注内容',
        '[1]: 引用来源',
      ].join('\n')
    );
    const checklist = buildSuperDocStructureReviewChecklist(summary, 'zh');

    const tableItem = checklist.find((item) => item.feature === 'table');
    const formulaItem = checklist.find((item) => item.feature === 'formula');
    const footnoteItem = checklist.find((item) => item.feature === 'footnote');
    const referenceItem = checklist.find((item) => item.feature === 'reference');

    expect(tableItem?.tone).toBe('info');
    expect(tableItem?.label).toContain('表格');
    expect(formulaItem?.tone).toBe('warning');
    expect(formulaItem?.detail).toContain('版式');
    expect(footnoteItem?.tone).toBe('warning');
    expect(footnoteItem?.detail).toContain('锚点');
    expect(referenceItem?.tone).toBe('info');
    expect(referenceItem?.label).toContain('引用');
  });
});
