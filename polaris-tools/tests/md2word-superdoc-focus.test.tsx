import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import { Editor } from '../tools/md2word/Editor';
import { DEFAULT_DOCUMENT_PRESENTATION_STATE } from '../tools/md2word/types';
import type { AppliedAiFormattingSummaryDetail } from '../tools/md2word/formatting/aiReview';

const superDocPreviewMocks = vi.hoisted(() => ({
  lastProps: null as Record<string, unknown> | null,
}));

vi.mock('../tools/md2word/SuperDocPreview', () => ({
  SuperDocPreview: (props: Record<string, unknown>) => {
    superDocPreviewMocks.lastProps = props;
    return <div data-testid="superdoc-preview-mock" />;
  },
}));

const renderEditorWithDetail = (detail: AppliedAiFormattingSummaryDetail) =>
  render(
    <AppProvider>
      <Editor
        content="# 标题\n\n正文内容"
        onChange={() => undefined}
        documentPresentation={DEFAULT_DOCUMENT_PRESENTATION_STATE}
        documentName="demo.md"
        previewEngine="superdoc"
        activeAppliedSummaryDetail={detail}
      />
    </AppProvider>
  );

describe('SuperDoc 聚焦反馈接线', () => {
  beforeEach(() => {
    superDocPreviewMocks.lastProps = null;
  });

  it('应将块级摘要映射为标题、块类型与块级标签', () => {
    renderEditorWithDetail({
      id: 'paragraph-style-1',
      title: '将正文段落调整为宋体小四两端对齐',
      description: '正文：字体、字号、对齐',
      changeCount: 3,
      revertAction: {
        kind: 'scoped-patch',
        patchId: 'paragraph-style-1',
      },
      previewTarget: {
        kind: 'block',
        targetId: 'paragraph-1',
        fallbackBlockType: 'paragraph',
      },
    });

    expect(superDocPreviewMocks.lastProps).toMatchObject({
      focusState: {
        title: '将正文段落调整为宋体小四两端对齐',
        description: '正文：字体、字号、对齐',
        kind: 'block',
        badge: '块级',
        targetTypeLabel: '段落块',
      },
    });
  });

  it('应将复杂结构摘要一并透传给 SuperDoc 预览', () => {
    render(
      <AppProvider>
        <Editor
          content={[
            '# 结构复核',
            '',
            '| 列一 | 列二 |',
            '| --- | --- |',
            '| A | B |',
            '',
            '$$',
            'E = mc^2',
            '$$',
            '',
            '这里有脚注[^1]和引用[1]。',
            '',
            '[^1]: 脚注内容',
            '[1]: 引用来源',
          ].join('\n')}
          onChange={() => undefined}
          documentPresentation={DEFAULT_DOCUMENT_PRESENTATION_STATE}
          documentName="demo.md"
          previewEngine="superdoc"
        />
      </AppProvider>
    );

    expect(superDocPreviewMocks.lastProps).toMatchObject({
      structureSummaryText: {
        shortLabel: '建议切回 HTML 回退',
        recommendationLabel: expect.stringContaining('HTML 回退'),
        featureLabels: expect.arrayContaining(['表格 x1', '公式 x1', '脚注 x1', '引用 x1']),
      },
    });
  });

  it('应将文档级摘要映射为整篇文档与文档级标签', () => {
    renderEditorWithDetail({
      id: 'document-level',
      title: '整篇文档级设置',
      description: '文档：纸张大小、页码',
      changeCount: 2,
      revertAction: {
        kind: 'document-patch',
      },
      previewTarget: {
        kind: 'document',
      },
    });

    expect(superDocPreviewMocks.lastProps).toMatchObject({
      focusState: {
        title: '整篇文档级设置',
        kind: 'document',
        badge: '文档级',
        targetTypeLabel: '整篇文档',
      },
    });
  });

  it('应将选区级摘要映射为当前选区文本与选区级标签', () => {
    renderEditorWithDetail({
      id: 'selection-style-1',
      title: '将当前选区改成红色加粗',
      description: '正文：颜色、加粗',
      changeCount: 2,
      revertAction: {
        kind: 'scoped-patch',
        patchId: 'selection-style-1',
      },
      previewTarget: {
        kind: 'selection',
        targetId: 'selection-style-1',
      },
    });

    expect(superDocPreviewMocks.lastProps).toMatchObject({
      focusState: {
        title: '将当前选区改成红色加粗',
        kind: 'selection',
        badge: '选区级',
        targetTypeLabel: '当前选区文本',
      },
    });
  });
});
