import { describe, expect, it } from 'vitest';
import {
  buildAppliedAiFormattingSummary,
  buildPendingAiReview,
  compilePendingAiReviewToScopedPatches,
  countSelectedAiChanges,
} from '../tools/md2word/formatting/aiReview';
import type { AiFormattingParseResponse } from '../api/aiFormattingApi';
import type { PreviewSelectionInfo } from '../tools/md2word/formatting/scopeTypes';

const previewSelection: PreviewSelectionInfo = {
  segmentIds: ['heading-seg', 'paragraph-seg'],
  selectedText: '引言\n人工智能',
  segments: [
    {
      segmentId: 'heading-seg',
      blockId: 'heading-1',
      blockType: 'heading2',
      segmentRole: 'heading',
      text: '引言',
      textPreview: '引言',
      sourceStart: 3,
      sourceEnd: 5,
      selectedText: '引言',
      selectedStart: 0,
      selectedEnd: 2,
    },
    {
      segmentId: 'paragraph-seg',
      blockId: 'paragraph-1',
      blockType: 'paragraph',
      segmentRole: 'paragraph',
      text: '人工智能的发展已经改变了我们的生活方式。',
      textPreview: '人工智能的发展已经改变了我们的生活方式。',
      sourceStart: 8,
      sourceEnd: 12,
      selectedText: '人工智能',
      selectedStart: 0,
      selectedEnd: 4,
    },
  ],
};

describe('md2word AI 确认态编译', () => {
  it('应将 preview-selection 候选修改转换为待确认 review 状态', () => {
    const response: AiFormattingParseResponse = {
      documentPatch: {},
      scopedPatches: [],
      proposedChanges: [
        {
          segmentId: 'heading-seg',
          styleChanges: [
            { target: 'h2', property: 'align', value: 'center', label: '标题居中' },
            { target: 'body', property: 'color', value: '#FF0000', label: '文字改为红色' },
          ],
          summary: '调整标题样式',
        },
        {
          segmentId: 'paragraph-seg',
          styleChanges: [
            { target: 'body', property: 'bold', value: true, label: '文字加粗' },
          ],
        },
      ],
      summary: '已生成候选修改',
      providerUsed: 'NVIDIA',
      remainingCount: 7,
    };

    const review = buildPendingAiReview(response, previewSelection, '把选中的标题和正文改一下');

    expect(review).not.toBeNull();
    expect(review?.segments).toHaveLength(2);
    expect(review?.segments[0].styleChanges).toHaveLength(2);
    expect(review?.providerUsed).toBe('NVIDIA');
    expect(countSelectedAiChanges(review)).toBe(3);
  });

  it('应将勾选保留的候选修改编译为 selection scoped patches', () => {
    const review = buildPendingAiReview(
      {
        documentPatch: {},
        scopedPatches: [],
        proposedChanges: [
          {
            segmentId: 'heading-seg',
            styleChanges: [
              { target: 'h2', property: 'align', value: 'center', label: '标题居中' },
              { target: 'body', property: 'color', value: '#FF0000', label: '文字改为红色' },
            ],
          },
        ],
        summary: '已生成候选修改',
      },
      previewSelection,
      '把标题改一下'
    );

    expect(review).not.toBeNull();
    if (!review) {
      return;
    }

    review.segments[0].styleChanges[1].selected = false;

    const patches = compilePendingAiReviewToScopedPatches(review);

    expect(patches).toHaveLength(1);
    expect(patches[0].scope).toEqual({
      scopeType: 'selection',
      start: 3,
      end: 5,
    });
    expect(patches[0].patch.h2).toEqual({
      align: 'center',
    });
    expect(patches[0].patch.body).toBeUndefined();
  });

  it('块级摘要应为 list/blockquote/code/paragraph 提供更准确的 fallback block type', () => {
    const summary = buildAppliedAiFormattingSummary(
      {},
      [
        {
          id: 'ai-list',
          scope: { scopeType: 'block', blockId: 'list-1' },
          patch: { list: { indentLeftPt: 36 } },
          source: 'ai',
        },
        {
          id: 'ai-quote',
          scope: { scopeType: 'block', blockId: 'quote-1' },
          patch: { blockquote: { lineSpacing: 1.5 } },
          source: 'ai',
        },
        {
          id: 'ai-code',
          scope: { scopeType: 'block', blockId: 'code-1' },
          patch: { code: { fontFamily: 'Consolas' } },
          source: 'ai',
        },
        {
          id: 'ai-paragraph',
          scope: { scopeType: 'block', blockId: 'paragraph-1' },
          patch: { paragraph: { align: 'justify' } },
          source: 'ai',
        },
      ]
    );

    expect(summary.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'ai-list',
          previewTarget: expect.objectContaining({
            kind: 'block',
            fallbackBlockType: 'list',
          }),
        }),
        expect.objectContaining({
          id: 'ai-quote',
          previewTarget: expect.objectContaining({
            kind: 'block',
            fallbackBlockType: 'blockquote',
          }),
        }),
        expect.objectContaining({
          id: 'ai-code',
          previewTarget: expect.objectContaining({
            kind: 'block',
            fallbackBlockType: 'code',
          }),
        }),
        expect.objectContaining({
          id: 'ai-paragraph',
          previewTarget: expect.objectContaining({
            kind: 'block',
            fallbackBlockType: 'paragraph',
          }),
        }),
      ])
    );
  });
});
