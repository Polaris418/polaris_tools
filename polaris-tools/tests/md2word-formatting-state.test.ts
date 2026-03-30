import { describe, expect, it } from 'vitest';
import { createDefaultFormatState } from '../tools/md2word/formatting/defaults';
import { mergeDocumentFormatPatch } from '../tools/md2word/formatting/mergePatch';
import { resolveFormatConfig } from '../tools/md2word/formatting/resolveFormatConfig';
import type { FormatState } from '../tools/md2word/formatting/types';

describe('md2word 格式状态模型', () => {
  it('应从基础模板生成默认格式', () => {
    const state = createDefaultFormatState('academic');
    const resolved = resolveFormatConfig(state);

    expect(resolved.templateId).toBe('academic');
    expect(resolved.h1.fontFamily).toContain('SimSun');
    expect(resolved.document.includeTableOfContents).toBe(true);
  });

  it('应只覆盖文档级 patch 中提到的字段', () => {
    const state: FormatState = {
      ...createDefaultFormatState('corporate'),
      documentPatch: mergeDocumentFormatPatch({}, {
        body: {
          fontFamily: 'SimSun, serif',
        },
        document: {
          pageNumbers: false,
        },
      }),
    };

    const resolved = resolveFormatConfig(state);

    expect(resolved.body.fontFamily).toBe('SimSun, serif');
    expect(resolved.body.fontSizePt).toBe(11);
    expect(resolved.document.pageNumbers).toBe(false);
    expect(resolved.document.includeTableOfContents).toBe(true);
  });

  it('块级 patch 应覆盖文档级 patch，但只影响命中的作用域', () => {
    const state: FormatState = {
      ...createDefaultFormatState('corporate'),
      documentPatch: {
        body: {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSizePt: 11,
        },
      },
      scopedPatches: [
        {
          id: 'block-override',
          scope: {
            scopeType: 'block',
            blockId: 'paragraph-1',
          },
          patch: {
            body: {
              fontFamily: 'FangSong, serif',
              lineSpacing: 1.5,
            },
          },
          source: 'ai',
        },
      ],
      legacyPreviewStyles: [],
    };

    const matched = resolveFormatConfig(state, {
      scopeType: 'block',
      blockId: 'paragraph-1',
    });
    const unmatched = resolveFormatConfig(state, {
      scopeType: 'block',
      blockId: 'paragraph-2',
    });

    expect(matched.body.fontFamily).toBe('FangSong, serif');
    expect(matched.body.fontSizePt).toBe(11);
    expect(matched.body.lineSpacing).toBe(1.5);
    expect(unmatched.body.fontFamily).toBe('Microsoft YaHei, sans-serif');
  });
});
