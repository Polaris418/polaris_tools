import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import { Editor } from '../tools/md2word/Editor';
import { TEMPLATE_DEFAULTS } from '../tools/md2word/formatting/defaults';
import type { ScopedFormatPatch } from '../tools/md2word/formatting/types';

const SAMPLE_MARKDOWN = `# 标题

第一段正文内容。
`;

describe('md2word 选区格式预览', () => {
  it('应在预览中渲染 selectionPatch 对应的局部样式节点', () => {
    const start = SAMPLE_MARKDOWN.indexOf('正文');
    const end = start + '正文'.length;
    const scopedPatches: ScopedFormatPatch[] = [
      {
        id: 'selection-preview',
        scope: {
          scopeType: 'selection',
          start,
          end,
        },
        patch: {
          body: {
            color: '#b91c1c',
            fontFamily: 'FangSong, serif',
            bold: true,
          },
        },
        source: 'ai',
      },
    ];

    const { container } = render(
      <AppProvider>
        <Editor
          content={SAMPLE_MARKDOWN}
          onChange={() => {}}
          formatConfig={TEMPLATE_DEFAULTS.corporate}
          scopedPatches={scopedPatches}
        />
      </AppProvider>
    );

    const selectionNode = container.querySelector('[data-selection-id="selection-preview"]');

    expect(selectionNode).not.toBeNull();
    expect(selectionNode?.textContent).toBe('正文');
    expect(container.querySelector('.markdown-preview')?.innerHTML).toContain('font-family: FangSong, serif;');
    expect(container.querySelector('.markdown-preview')?.innerHTML).toContain('color: #b91c1c;');
  });
});
