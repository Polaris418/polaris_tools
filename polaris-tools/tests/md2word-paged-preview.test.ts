import { describe, expect, it } from 'vitest';
import { DEFAULT_DOCUMENT_PRESENTATION_STATE } from '../tools/md2word/types';
import { buildPagedPreview } from '../tools/md2word/formatting/pagedPreview';

describe('md2word 分页预览', () => {
  it('过长段落应按内容分片分页，并保留原始 segment 映射', () => {
    const longText = '人工智能正在快速改变我们的工作方式和知识组织方式。'.repeat(900);
    const html = `
      <p data-block-id="paragraph-1" data-block-type="paragraph">
        <span data-segment-id="paragraph-1-seg-0" data-segment-role="paragraph">${longText}</span>
      </p>
    `;

    const result = buildPagedPreview(html, {
      ...DEFAULT_DOCUMENT_PRESENTATION_STATE,
      previewMode: 'paged',
    });

    const bodyPageCount = (result.html.match(/data-page-kind="body"/g) ?? []).length;
    expect(bodyPageCount).toBeGreaterThan(1);
    expect(result.html).toContain('data-source-segment-id="paragraph-1-seg-0"');
    expect(result.html).toContain('data-segment-offset-base=');
    const linkedFragments = result.state.fragments.filter((fragment) =>
      fragment.segmentIds.includes('paragraph-1-seg-0')
    );
    expect(linkedFragments.length).toBeGreaterThan(1);
    expect(new Set(linkedFragments.map((fragment) => fragment.pageIndex)).size).toBeGreaterThan(1);
  });

  it('参考文献块过长时应按条目分页并重复标题壳', () => {
    const items = Array.from({ length: 80 }, (_, index) =>
      `<div class="reference-item" id="ref-${index + 1}"><span class="reference-id">[${index + 1}]</span> 这是一条很长的参考文献记录，用于验证参考文献分页稳定性。</div>`
    ).join('');

    const html = `
      <div class="references" data-doc-structure="references">
        <h2 class="references-title">参考文献 / References</h2>
        ${items}
      </div>
    `;

    const result = buildPagedPreview(html, {
      ...DEFAULT_DOCUMENT_PRESENTATION_STATE,
      previewMode: 'paged',
    });

    expect((result.html.match(/data-page-kind="body"/g) ?? []).length).toBeGreaterThan(1);
    expect((result.html.match(/参考文献 \/ References/g) ?? []).length).toBeGreaterThan(1);
    expect(result.html).toContain('data-fragment-continuation="true"');
  });

  it('分页页面应使用响应式页宽变量，避免在窄预览区被裁切', () => {
    const html = `
      <p data-block-id="paragraph-1" data-block-type="paragraph">
        <span data-segment-id="paragraph-1-seg-0" data-segment-role="paragraph">这是一个用于验证分页页宽输出的段落。</span>
      </p>
    `;

    const result = buildPagedPreview(html, {
      ...DEFAULT_DOCUMENT_PRESENTATION_STATE,
      previewMode: 'paged',
    });

    expect(result.html).toContain('--md2word-page-width:794px');
    expect(result.html).toContain('--md2word-page-height:1123px');
    expect(result.html).not.toContain('style="width:794px; min-height:1123px;"');
  });
});
