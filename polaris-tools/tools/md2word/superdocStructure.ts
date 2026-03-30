export type SuperDocStructureFeature =
  | 'table'
  | 'formula'
  | 'footnote'
  | 'reference';

export type SuperDocStructureSupportLevel =
  | 'well-supported'
  | 'basic-import'
  | 'review-recommended';

export interface SuperDocStructureStatusItem {
  feature: SuperDocStructureFeature;
  count: number;
  detected: boolean;
  supportLevel: SuperDocStructureSupportLevel;
}

export type SuperDocStructureRecommendation =
  | 'safe-in-superdoc'
  | 'review-in-superdoc'
  | 'prefer-html-fallback';

export interface SuperDocStructureSummary {
  hasDetectedStructures: boolean;
  highestSupportRisk: SuperDocStructureSupportLevel | null;
  recommendation: SuperDocStructureRecommendation;
  detectedFeatures: SuperDocStructureFeature[];
  items: SuperDocStructureStatusItem[];
}

export interface SuperDocStructureSummaryText {
  shortLabel: string;
  detailLabel: string;
  recommendationLabel: string;
  featureLabels: string[];
}

export interface SuperDocStructureGuidanceItem {
  feature: SuperDocStructureFeature;
  count: number;
  label: string;
  supportLevel: SuperDocStructureSupportLevel;
  supportLabel: string;
  supportBadgeClass: string;
  description: string;
  recommendedAction: string;
}

export interface SuperDocStructureReviewChecklistItem {
  id: string;
  feature: SuperDocStructureFeature;
  tone: 'info' | 'warning';
  label: string;
  detail: string;
}

const TABLE_SEPARATOR_PATTERN = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/m;
const TABLE_ROW_LINE_PATTERN = /^\s*\|.+\|\s*$/;
const BLOCK_FORMULA_PATTERN = /\$\$[\s\S]+?\$\$/g;
const INLINE_FORMULA_PATTERN = /(^|[^$])\$(?!\$)([^$\n]+?)\$(?!\$)/g;
const FOOTNOTE_REF_PATTERN = /\[\^([^\]\n]+)\]/g;
const FOOTNOTE_DEF_PATTERN = /^\[\^([^\]\n]+)\]:/gm;
const REFERENCE_DEF_PATTERN = /^\[(\d+)\]:/gm;
const REFERENCE_INLINE_PATTERN = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
const AUTHOR_YEAR_REFERENCE_PATTERN =
  /[（(]([A-Z][A-Za-z.'-]+(?:\s+et al\.)?,\s*\d{4}[a-z]?)[)）]/g;

const FEATURE_LABELS: Record<'zh' | 'en', Record<SuperDocStructureFeature, string>> = {
  zh: {
    table: '表格',
    formula: '公式',
    footnote: '脚注',
    reference: '引用',
  },
  en: {
    table: 'Tables',
    formula: 'Formulas',
    footnote: 'Footnotes',
    reference: 'References',
  },
};

const countMatches = (pattern: RegExp, value: string): number => {
  const matches = value.match(new RegExp(pattern.source, pattern.flags));
  return matches ? matches.length : 0;
};

const detectTables = (markdown: string): number => {
  const lines = markdown.split(/\r?\n/);
  let tableCount = 0;

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!TABLE_ROW_LINE_PATTERN.test(lines[index])) {
      continue;
    }

    if (!TABLE_SEPARATOR_PATTERN.test(lines[index + 1])) {
      continue;
    }

    tableCount += 1;
    index += 1;
    while (index + 1 < lines.length && TABLE_ROW_LINE_PATTERN.test(lines[index + 1])) {
      index += 1;
    }
  }

  return tableCount;
};

const collectUniqueMatches = (pattern: RegExp, markdown: string): Set<string> => {
  const values = new Set<string>();
  const iterablePattern = new RegExp(pattern.source, pattern.flags);
  for (const match of markdown.matchAll(iterablePattern)) {
    const value = (match[1] ?? match[0]).trim();
    if (value) {
      values.add(value);
    }
  }
  return values;
};

const detectFootnotes = (markdown: string): number => {
  const values = new Set<string>();
  collectUniqueMatches(FOOTNOTE_REF_PATTERN, markdown).forEach((value) => values.add(value));
  collectUniqueMatches(FOOTNOTE_DEF_PATTERN, markdown).forEach((value) => values.add(value));
  return values.size;
};

const detectReferences = (markdown: string): number => {
  const referenceValues = new Set<string>();

  collectUniqueMatches(REFERENCE_DEF_PATTERN, markdown).forEach((value) => {
    referenceValues.add(value);
  });

  for (const match of markdown.matchAll(new RegExp(REFERENCE_INLINE_PATTERN.source, REFERENCE_INLINE_PATTERN.flags))) {
    const token = match[0];
    if (/^\[\^[^\]]+/.test(token)) {
      continue;
    }
    const referenceLine = markdown.slice(0, match.index).split(/\r?\n/).pop() ?? '';
    if (/^\[\d+\]:/.test(`${referenceLine}${markdown.slice(match.index, match.index + token.length)}`)) {
      continue;
    }
    match[1]
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => referenceValues.add(value));
  }

  collectUniqueMatches(AUTHOR_YEAR_REFERENCE_PATTERN, markdown).forEach((value) => {
    referenceValues.add(value);
  });

  return referenceValues.size;
};

const resolveHighestSupportRisk = (
  items: SuperDocStructureStatusItem[]
): SuperDocStructureSupportLevel | null => {
  if (!items.some((item) => item.detected)) {
    return null;
  }

  if (items.some((item) => item.detected && item.supportLevel === 'review-recommended')) {
    return 'review-recommended';
  }

  if (items.some((item) => item.detected && item.supportLevel === 'basic-import')) {
    return 'basic-import';
  }

  return 'well-supported';
};

const resolveRecommendation = (
  highestSupportRisk: SuperDocStructureSupportLevel | null
): SuperDocStructureRecommendation => {
  if (highestSupportRisk === 'review-recommended') {
    return 'prefer-html-fallback';
  }

  if (highestSupportRisk === 'basic-import') {
    return 'review-in-superdoc';
  }

  return 'safe-in-superdoc';
};

const formatDetectedFeatureLabels = (
  items: SuperDocStructureStatusItem[],
  locale: 'zh' | 'en'
): string[] =>
  items
    .filter((item) => item.detected)
    .map((item) => `${FEATURE_LABELS[locale][item.feature]} x${item.count}`);

const buildTableDetailSnippet = (count: number, locale: 'zh' | 'en'): string =>
  locale === 'zh'
    ? `表格共 ${count} 处，走基础导入链路，导出前请复核合并单元格、嵌套表格和复杂边框。`
    : `Tables (${count}) use the basic import path. Review merged cells, nested tables, and complex borders before export.`;

export const analyzeSuperDocStructure = (markdown: string): SuperDocStructureSummary => {
  const tableCount = detectTables(markdown);
  const formulaCount =
    countMatches(BLOCK_FORMULA_PATTERN, markdown) + countMatches(INLINE_FORMULA_PATTERN, markdown);
  const footnoteCount = detectFootnotes(markdown);
  const referenceCount = detectReferences(markdown);

  const items: SuperDocStructureStatusItem[] = [
    {
      feature: 'table',
      count: tableCount,
      detected: tableCount > 0,
      supportLevel: 'basic-import',
    },
    {
      feature: 'formula',
      count: formulaCount,
      detected: formulaCount > 0,
      supportLevel: 'review-recommended',
    },
    {
      feature: 'footnote',
      count: footnoteCount,
      detected: footnoteCount > 0,
      supportLevel: 'review-recommended',
    },
    {
      feature: 'reference',
      count: referenceCount,
      detected: referenceCount > 0,
      supportLevel: 'basic-import',
    },
  ];

  const highestSupportRisk = resolveHighestSupportRisk(items);

  return {
    hasDetectedStructures: items.some((item) => item.detected),
    highestSupportRisk,
    recommendation: resolveRecommendation(highestSupportRisk),
    detectedFeatures: items.filter((item) => item.detected).map((item) => item.feature),
    items,
  };
};

export const buildSuperDocStructureSummaryText = (
  summary: SuperDocStructureSummary,
  locale: 'zh' | 'en' = 'zh'
): SuperDocStructureSummaryText => {
  const featureLabels = formatDetectedFeatureLabels(summary.items, locale);

  if (!summary.hasDetectedStructures) {
    return locale === 'zh'
      ? {
          shortLabel: '未检测到复杂结构',
          detailLabel: '当前 Markdown 未检测到表格、公式、脚注或引用，可直接继续使用 SuperDoc。',
          recommendationLabel: '可直接继续使用 SuperDoc',
          featureLabels: [],
        }
      : {
          shortLabel: 'No complex structures detected',
          detailLabel: 'No tables, formulas, footnotes, or references were detected. SuperDoc is safe to use directly.',
          recommendationLabel: 'Safe to continue in SuperDoc',
          featureLabels: [],
        };
  }

  const featuresText =
    featureLabels.length > 0
      ? featureLabels.join(locale === 'zh' ? '、' : ', ')
      : locale === 'zh'
        ? '已检测到复杂结构'
        : 'Complex structures detected';

  if (summary.recommendation === 'prefer-html-fallback') {
    const tableItem = summary.items.find((item) => item.detected && item.feature === 'table');
    const tableSnippet = tableItem ? buildTableDetailSnippet(tableItem.count, locale) : '';
    const extraNote =
      locale === 'zh'
        ? '其中至少一类复杂结构建议先在 HTML 回退中复核。'
        : 'At least one complex structure should be reviewed in the HTML fallback path first.';
    return locale === 'zh'
      ? {
          shortLabel: '建议切回 HTML 回退',
          detailLabel: tableSnippet
            ? `检测到 ${featuresText}；${tableSnippet}`
            : `检测到 ${featuresText}，${extraNote}`,
          recommendationLabel: '建议切回 HTML 回退后再做精细编辑',
          featureLabels,
        }
      : {
          shortLabel: 'Prefer HTML fallback',
          detailLabel: tableSnippet
            ? `${featuresText} detected. ${tableSnippet}`
            : `${featuresText} detected. ${extraNote}`,
          recommendationLabel: 'Switch to the HTML fallback for careful review',
          featureLabels,
        };
  }

  if (summary.recommendation === 'review-in-superdoc') {
    const tableItem = summary.items.find((item) => item.detected && item.feature === 'table');
    const tableSnippet = tableItem ? buildTableDetailSnippet(tableItem.count, locale) : '';
    return locale === 'zh'
      ? {
          shortLabel: '可在 SuperDoc 继续，但需复核',
          detailLabel: tableSnippet
            ? `检测到 ${featuresText}；${tableSnippet}`
            : `检测到 ${featuresText}，建议在 SuperDoc 中继续编辑，但导出前复核结构表现。`,
          recommendationLabel: '继续使用 SuperDoc，并在导出前复核',
          featureLabels,
        }
      : {
          shortLabel: 'Continue in SuperDoc with review',
          detailLabel: tableSnippet
            ? `${featuresText} detected. ${tableSnippet}`
            : `${featuresText} detected. Continue in SuperDoc, but review the structure before export.`,
          recommendationLabel: 'Stay in SuperDoc and review before export',
          featureLabels,
        };
  }

  return locale === 'zh'
    ? {
        shortLabel: '结构兼容良好',
        detailLabel: `检测到 ${featuresText}，当前结构与 SuperDoc 兼容性较好。`,
        recommendationLabel: '可继续使用 SuperDoc',
        featureLabels,
      }
    : {
        shortLabel: 'Structure is compatible',
        detailLabel: `${featuresText} detected and the structure is compatible with SuperDoc.`,
      recommendationLabel: 'Safe to continue in SuperDoc',
      featureLabels,
    };
};

export const shouldPreferSuperDocDocxExport = (
  summary: SuperDocStructureSummary
): boolean => summary.recommendation !== 'prefer-html-fallback';

export const buildSuperDocStructureGuidanceItems = (
  summary: SuperDocStructureSummary,
  locale: 'zh' | 'en' = 'zh'
): SuperDocStructureGuidanceItem[] =>
  summary.items
    .filter((item) => item.detected)
    .map((item) => {
      const label = FEATURE_LABELS[locale][item.feature];
      const supportLabel =
        item.supportLevel === 'basic-import'
          ? locale === 'zh'
            ? '基础导入'
            : 'Basic import'
          : item.supportLevel === 'well-supported'
            ? locale === 'zh'
              ? '支持较好'
              : 'Well supported'
            : locale === 'zh'
              ? '建议复核'
              : 'Review recommended';
      const supportBadgeClass =
        item.supportLevel === 'basic-import'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200'
          : item.supportLevel === 'well-supported'
            ? 'bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200';

      if (item.feature === 'table') {
        return {
          feature: item.feature,
          count: item.count,
          label,
          supportLevel: item.supportLevel,
          supportLabel,
          supportBadgeClass,
          description:
            locale === 'zh'
              ? `表格共 ${item.count} 处，会走 SuperDoc 基础导入链路，普通表格可继续编辑。`
              : `Tables (${item.count}) use the SuperDoc basic import path and standard tables stay editable.`,
          recommendedAction:
            locale === 'zh'
              ? '如果有合并单元格、嵌套表格或复杂边框，导出前切到 HTML 回退复核。'
              : 'Switch to the HTML fallback before export when merged cells, nested tables, or complex borders are present.',
        };
      }

      if (item.feature === 'formula') {
        return {
          feature: item.feature,
          count: item.count,
          label,
          supportLevel: item.supportLevel,
          supportLabel,
          supportBadgeClass,
          description:
            locale === 'zh'
              ? '公式仍建议在 HTML 回退里复核版式、换行和显示范围。'
              : 'Formulas should still be reviewed in the HTML fallback for layout, wrapping, and display range.',
          recommendedAction:
            locale === 'zh'
              ? 'DOCX 导出会优先走本地 HTML 路径，以降低公式排版偏移。'
              : 'DOCX export will prefer the local HTML path to reduce formula layout drift.',
        };
      }

      if (item.feature === 'footnote') {
        return {
          feature: item.feature,
          count: item.count,
          label,
          supportLevel: item.supportLevel,
          supportLabel,
          supportBadgeClass,
          description:
            locale === 'zh'
              ? '脚注需要复核编号、锚点与文末落位。'
              : 'Footnotes should be reviewed for numbering, anchors, and end-of-document placement.',
          recommendedAction:
            locale === 'zh'
              ? '复杂脚注导出会优先走本地 HTML 路径，导出后建议在 Word 再检查一次。'
              : 'Complex footnotes prefer the local HTML export path; review them once more in Word after export.',
        };
      }

      return {
        feature: item.feature,
        count: item.count,
        label,
        supportLevel: item.supportLevel,
        supportLabel,
        supportBadgeClass,
        description:
          locale === 'zh'
            ? '引用会随 SuperDoc 一起导入并保留可编辑性。'
            : 'References stay editable after import into SuperDoc.',
        recommendedAction:
          locale === 'zh'
            ? '复杂引用样式建议在导出后复核，但一般不需要强制切回 HTML。'
            : 'Review complex citation styling after export, but an HTML fallback is not usually required.',
      };
    });

export const buildSuperDocStructureReviewChecklist = (
  summary: SuperDocStructureSummary,
  locale: 'zh' | 'en' = 'zh'
): SuperDocStructureReviewChecklistItem[] =>
  summary.items
    .filter((item) => item.detected)
    .map((item) => {
      if (item.feature === 'table') {
        return {
          id: `table-${item.count}`,
          feature: item.feature,
          tone: 'info',
          label:
            locale === 'zh'
              ? `复核 ${item.count} 处表格的合并与边框`
              : `Review merged cells and borders for ${item.count} table(s)`,
          detail:
            locale === 'zh'
              ? '重点检查合并单元格、嵌套表格、复杂边框和宽度是否与预期一致。'
              : 'Check merged cells, nested tables, complex borders, and width consistency.',
        };
      }

      if (item.feature === 'formula') {
        return {
          id: `formula-${item.count}`,
          feature: item.feature,
          tone: 'warning',
          label:
            locale === 'zh'
              ? `复核 ${item.count} 处公式的排版与换行`
              : `Review layout and wrapping for ${item.count} formula(s)`,
          detail:
            locale === 'zh'
              ? '重点检查公式排版、显示范围、断行、行高和导出后的版式偏移。'
              : 'Review formula range, wrapping, line height, and layout drift after export.',
        };
      }

      if (item.feature === 'footnote') {
        return {
          id: `footnote-${item.count}`,
          feature: item.feature,
          tone: 'warning',
          label:
            locale === 'zh'
              ? `复核 ${item.count} 处脚注的编号与锚点`
              : `Review numbering and anchors for ${item.count} footnote(s)`,
          detail:
            locale === 'zh'
              ? '重点检查脚注编号、正文锚点、文末位置以及导出后的顺序。'
              : 'Check numbering, body anchors, endnote placement, and exported ordering.',
        };
      }

      return {
        id: `reference-${item.count}`,
        feature: item.feature,
        tone: 'info',
        label:
          locale === 'zh'
            ? `复核 ${item.count} 处引用的样式一致性`
            : `Review citation styling for ${item.count} reference(s)`,
        detail:
          locale === 'zh'
            ? '重点检查引用编号、作者年份格式以及导出后是否仍保持可读性。'
            : 'Check numbering, author-year formatting, and readability after export.',
      };
    });
