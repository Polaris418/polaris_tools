import { describe, expect, it } from 'vitest';
import { parseMarkdownBlocks } from '../tools/md2word/formatting/parseMarkdownBlocks';
import { detectEditorScope, resolvePreviewSelectionOffsets } from '../tools/md2word/formatting/scopeDetection';

const SAMPLE_MARKDOWN = `# 标题

第一段正文内容。

## 第二节

- 列表项一
- 列表项二

\`\`\`ts
const value = 1;
\`\`\`
`;

describe('md2word 作用域识别', () => {
  it('应解析出稳定的 Markdown block 列表', () => {
    const blocks = parseMarkdownBlocks(SAMPLE_MARKDOWN);

    expect(blocks.map((block) => block.blockType)).toEqual([
      'heading1',
      'paragraph',
      'heading2',
      'list',
      'code',
    ]);
    expect(blocks[0].blockId).toMatch(/^heading1-0-/);
    expect(blocks[1].lineStart).toBe(2);
  });

  it('光标落在标题块内时应识别为 block 作用域', () => {
    const blocks = parseMarkdownBlocks(SAMPLE_MARKDOWN);
    const headingOffset = SAMPLE_MARKDOWN.indexOf('第二节');
    const scopeInfo = detectEditorScope(SAMPLE_MARKDOWN, blocks, headingOffset, headingOffset);

    expect(scopeInfo.scope.scopeType).toBe('block');
    expect(scopeInfo.currentBlock?.blockType).toBe('heading2');
  });

  it('存在源码选区时应优先识别为 selection 作用域', () => {
    const blocks = parseMarkdownBlocks(SAMPLE_MARKDOWN);
    const start = SAMPLE_MARKDOWN.indexOf('第一段');
    const end = start + '第一段正文'.length;
    const scopeInfo = detectEditorScope(SAMPLE_MARKDOWN, blocks, start, end);

    expect(scopeInfo.scope.scopeType).toBe('selection');
    expect(scopeInfo.selectedText).toContain('第一段正文');
    expect(scopeInfo.currentBlock?.blockType).toBe('paragraph');
  });

  it('传入预览点击的 blockId 时应优先命中该块', () => {
    const blocks = parseMarkdownBlocks(SAMPLE_MARKDOWN);
    const codeBlock = blocks.find((block) => block.blockType === 'code');
    const scopeInfo = detectEditorScope(SAMPLE_MARKDOWN, blocks, 0, 0, codeBlock?.blockId);

    expect(scopeInfo.scope.scopeType).toBe('block');
    expect(scopeInfo.currentBlock?.blockId).toBe(codeBlock?.blockId);
    expect(scopeInfo.currentBlock?.blockType).toBe('code');
  });

  it('应能把预览区单块文本选区映射回源码偏移', () => {
    const blocks = parseMarkdownBlocks(SAMPLE_MARKDOWN);
    const paragraphBlock = blocks.find((block) => block.blockType === 'paragraph');
    const resolved = resolvePreviewSelectionOffsets(blocks, paragraphBlock?.blockId, '正文');

    expect(resolved).not.toBeNull();
    expect(resolved?.block?.blockId).toBe(paragraphBlock?.blockId);
    expect(SAMPLE_MARKDOWN.slice(resolved?.start ?? 0, resolved?.end ?? 0)).toBe('正文');
  });
});
