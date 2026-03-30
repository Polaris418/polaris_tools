import { describe, expect, it } from 'vitest';
import { parseMarkdownBlocks } from '../tools/md2word/formatting/parseMarkdownBlocks';
import {
  annotatePreviewSegments,
  buildPreviewSegments,
  resolvePreviewSelection,
} from '../tools/md2word/formatting/previewSelection';

describe('md2word 预览选区映射', () => {
  it('部分拖选时不应把选区前面的正文自动卷入', () => {
    const content = '第一段内容包含一个引用[^1]和后续正文。\n\n[^1]: 参考文献';
    const blocks = parseMarkdownBlocks(content);
    const segments = buildPreviewSegments(blocks);

    const root = document.createElement('div');
    root.innerHTML = `
      <p data-block-id="${blocks[0].blockId}" data-block-type="paragraph">
        第一段内容包含一个引用<sup class="citation">[1]</sup>和后续正文。
      </p>
    `;
    document.body.appendChild(root);

    annotatePreviewSegments(root, segments);

    const segmentElement = root.querySelector('[data-segment-id]') as HTMLElement | null;
    expect(segmentElement).toBeTruthy();

    const trailingTextNode = Array.from(segmentElement!.childNodes).find(
      (node): node is Text => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').includes('和后续正文')
    );
    expect(trailingTextNode).toBeTruthy();

    const range = document.createRange();
    const targetText = trailingTextNode!.textContent ?? '';
    const startOffset = targetText.indexOf('后续');
    range.setStart(trailingTextNode!, startOffset);
    range.setEnd(trailingTextNode!, startOffset + '后续正文'.length);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const result = resolvePreviewSelection(root, selection, segments);
    expect(result).not.toBeNull();
    expect(result?.selectedText).toBe('后续正文');
    expect(result?.segments).toHaveLength(1);
    expect(result?.segments[0].selectedText).toBe('后续正文');
    expect(result?.segments[0].selectedStart).toBeGreaterThan(0);

    selection?.removeAllRanges();
    root.remove();
  });

  it('当浏览器把起点挂到更高层容器时，不应把前面的 segment 自动算进选区', () => {
    const content = '# 标题\n\n第一段正文。\n\n第二段正文。';
    const blocks = parseMarkdownBlocks(content);
    const segments = buildPreviewSegments(blocks);

    const root = document.createElement('div');
    root.innerHTML = `
      <h1 data-block-id="${blocks[0].blockId}" data-block-type="${blocks[0].blockType}">标题</h1>
      <p data-block-id="${blocks[1].blockId}" data-block-type="${blocks[1].blockType}">第一段正文。</p>
      <p data-block-id="${blocks[2].blockId}" data-block-type="${blocks[2].blockType}">第二段正文。</p>
    `;
    document.body.appendChild(root);
    annotatePreviewSegments(root, segments);

    const paragraphs = root.querySelectorAll<HTMLElement>('p [data-segment-id]');
    const targetSegment = paragraphs[1];
    expect(targetSegment).toBeTruthy();

    const targetTextNode = targetSegment.firstChild as Text;
    const startOffset = (targetTextNode.textContent ?? '').indexOf('正文');

    const range = document.createRange();
    range.setStart(root, 0);
    range.setEnd(targetTextNode, startOffset + '正文'.length);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const result = resolvePreviewSelection(root, selection, segments);
    expect(result).not.toBeNull();
    expect(result?.segments).toHaveLength(1);
    expect(result?.segments[0].selectedText).toBe('第二段正文');

    selection?.removeAllRanges();
    root.remove();
  });
});
