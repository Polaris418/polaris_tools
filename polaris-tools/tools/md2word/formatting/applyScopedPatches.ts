import type { MarkdownBlock } from './scopeTypes';
import type { ResolvedFormatConfig, ScopedFormatPatch } from './types';

const applyTextPatch = <T extends Record<string, unknown>>(
  base: T,
  patch: Partial<T> | undefined
): T => ({
  ...base,
  ...(patch ?? {}),
});

export const resolveScopedFormatConfig = (
  baseConfig: ResolvedFormatConfig,
  scopedPatches: ScopedFormatPatch[],
  blockId?: string
): ResolvedFormatConfig => {
  if (!blockId) {
    return baseConfig;
  }

  return scopedPatches.reduce((current, scopedPatch) => {
    if (scopedPatch.scope.scopeType !== 'block' || scopedPatch.scope.blockId !== blockId) {
      return current;
    }

    return {
      ...current,
      h1: applyTextPatch(current.h1, scopedPatch.patch.h1),
      h2: applyTextPatch(current.h2, scopedPatch.patch.h2),
      h3: applyTextPatch(current.h3, scopedPatch.patch.h3),
      body: applyTextPatch(current.body, scopedPatch.patch.body),
      code: applyTextPatch(current.code, scopedPatch.patch.code),
      document: applyTextPatch(current.document, scopedPatch.patch.document),
    };
  }, baseConfig);
};

const styleEntriesToCss = (entries: Record<string, string | number | undefined>): string =>
  Object.entries(entries)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');

const buildBlockStyleCss = (block: MarkdownBlock, formatConfig: ResolvedFormatConfig): string => {
  switch (block.blockType) {
    case 'heading1':
      return styleEntriesToCss({
        'font-family': formatConfig.h1.fontFamily,
        'font-size': `${formatConfig.h1.fontSizePt}pt`,
        color: formatConfig.h1.color,
        'text-align': formatConfig.h1.align,
        'font-weight': formatConfig.h1.bold ? 'bold' : 'normal',
        'font-style': formatConfig.h1.italic ? 'italic' : 'normal',
        'line-height': formatConfig.h1.lineSpacing,
      });
    case 'heading2':
      return styleEntriesToCss({
        'font-family': formatConfig.h2.fontFamily,
        'font-size': `${formatConfig.h2.fontSizePt}pt`,
        color: formatConfig.h2.color,
        'text-align': formatConfig.h2.align,
        'font-weight': formatConfig.h2.bold ? 'bold' : 'normal',
        'font-style': formatConfig.h2.italic ? 'italic' : 'normal',
        'line-height': formatConfig.h2.lineSpacing,
      });
    case 'heading3':
      return styleEntriesToCss({
        'font-family': formatConfig.h3.fontFamily,
        'font-size': `${formatConfig.h3.fontSizePt}pt`,
        color: formatConfig.h3.color,
        'text-align': formatConfig.h3.align,
        'font-weight': formatConfig.h3.bold ? 'bold' : 'normal',
        'font-style': formatConfig.h3.italic ? 'italic' : 'normal',
        'line-height': formatConfig.h3.lineSpacing,
      });
    case 'code':
      return styleEntriesToCss({
        'font-family': formatConfig.code.fontFamily,
        'font-size': `${formatConfig.code.fontSizePt}pt`,
        color: formatConfig.code.color,
        'line-height': formatConfig.code.lineSpacing,
        'background-color': formatConfig.code.backgroundColor,
      });
    case 'paragraph':
    case 'blockquote':
    case 'list':
    default:
      return styleEntriesToCss({
        'font-family': formatConfig.body.fontFamily,
        'font-size': `${formatConfig.body.fontSizePt}pt`,
        color: formatConfig.body.color,
        'text-align': formatConfig.body.align,
        'font-weight': formatConfig.body.bold ? 'bold' : 'normal',
        'font-style': formatConfig.body.italic ? 'italic' : 'normal',
        'line-height': formatConfig.body.lineSpacing,
      });
  }
};

export const buildScopedBlockCss = (
  blocks: MarkdownBlock[],
  baseConfig: ResolvedFormatConfig,
  scopedPatches: ScopedFormatPatch[]
): string =>
  blocks
    .filter((block) =>
      scopedPatches.some(
        (patch) => patch.scope.scopeType === 'block' && patch.scope.blockId === block.blockId
      )
    )
    .map((block) => {
      const resolved = resolveScopedFormatConfig(baseConfig, scopedPatches, block.blockId);
      const blockCss = buildBlockStyleCss(block, resolved);

      if (!blockCss) {
        return '';
      }

      if (block.blockType === 'code') {
        return `
      [data-block-id="${block.blockId}"] {
        ${blockCss}
      }
      [data-block-id="${block.blockId}"] code {
        font-family: ${resolved.code.fontFamily};
        font-size: ${resolved.code.fontSizePt}pt;
        color: ${resolved.code.color};
      }`;
      }

      return `
      [data-block-id="${block.blockId}"] {
        ${blockCss}
      }`;
    })
    .join('\n');
