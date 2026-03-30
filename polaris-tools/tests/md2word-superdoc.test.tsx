import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import Md2Word from '../tools/md2word';
import { apiClient } from '../api/client';
import { exportDocxWithPriority } from '../utils/documentConverter';
import {
  buildSuperDocSelectionSummary,
  deriveSuperDocSelectionBridge,
  shouldUseSuperDocDocumentScope,
  shouldApplySuperDocFormattingGlobally,
} from '../tools/md2word/superdocSelection';
import {
  applySuperDocFormattingChanges,
  buildSuperDocPreviewMarkdown,
  decorateSuperDocPageNumbers,
  SuperDocPreview,
} from '../tools/md2word/SuperDocPreview';
import { DEFAULT_BASE_TEMPLATE, TEMPLATE_DEFAULTS } from '../tools/md2word/formatting/defaults';

const superDocMocks = vi.hoisted(() => ({
  lastRenderProps: null as Record<string, unknown> | null,
}));

vi.mock(
  '@superdoc-dev/react',
  () => {
    const SuperDocEditor = (props: Record<string, unknown>) => {
      superDocMocks.lastRenderProps = props;
      return null;
    };

    return {
      SuperDocEditor,
      SuperEditor: SuperDocEditor,
      DocumentEditor: SuperDocEditor,
      CustomSelection: ({ children }: { children?: unknown }) => children ?? null,
      default: SuperDocEditor,
    };
  },
  { virtual: true }
);

const makeBlob = (label: string) =>
  new Blob([label], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

describe('md2word SuperDoc 接线', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('md2word-preview-engine', 'superdoc');
    superDocMocks.lastRenderProps = null;
    vi.spyOn(apiClient.tools, 'recordUseByUrl').mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: 1,
    });
    vi.spyOn(apiClient.tools, 'updateUsageDuration').mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: undefined,
    });
  });

  it('应将当前作用域解析为 SuperDoc 选区来源与边界文案', () => {
    const selection = deriveSuperDocSelectionBridge('当前选中内容：人工智能');
    expect(selection.scopeKind).toBe('selection');
    expect(selection.sourceLabel).toBe('Markdown 源码区');
    expect(selection.boundaryLabel).toBe('当前选中内容');
    expect(selection.isSelectionScoped).toBe(true);
    expect(selection.isDocumentScoped).toBe(false);
    expect(buildSuperDocSelectionSummary('当前选中内容：人工智能')).toBe(
      '来源：Markdown 源码区 · 边界：当前选中内容'
    );
  });

  it('整篇文档类 AI 返回在 SuperDoc 下应走全局应用，而不是当前选区', () => {
    expect(
      shouldApplySuperDocFormattingGlobally({
        scope: { scopeType: 'selection', start: 0, end: 6 },
        response: {
          documentPatch: {
            h1: { fontFamily: 'SimHei', fontSizePt: 16, align: 'center' },
            body: { fontFamily: 'FangSong', fontSizePt: 12, lineSpacing: 1.5 },
          },
          scopedPatches: [],
        },
      })
    ).toBe(true);

    expect(
      shouldApplySuperDocFormattingGlobally({
        scope: { scopeType: 'selection', start: 0, end: 6 },
        response: {
          documentPatch: {},
          scopedPatches: [
            {
              scope: { scopeType: 'selection', start: 0, end: 6 },
              patch: {
                body: { color: '#ff0000', bold: true },
              },
            },
          ],
        },
      })
    ).toBe(false);
  });

  it('SuperDoc 里整体描述指令应优先判定为整篇文档作用域', () => {
    expect(
      shouldUseSuperDocDocumentScope('把一级标题改成黑体三号居中，正文改成仿宋小四，1.5 倍行距')
    ).toBe(true);
    expect(
      shouldUseSuperDocDocumentScope('把当前选中的这几个字改成红色加粗')
    ).toBe(false);
    expect(
      shouldUseSuperDocDocumentScope('把这段文字改成蓝色')
    ).toBe(false);
  });

  it('应提供可被接入的 SuperDoc React mock', async () => {
    const { SuperDocEditor } = await import('@superdoc-dev/react');

    render(
      <SuperDocEditor
        onEditorCreate={() => undefined}
        onEditorUpdate={() => undefined}
      />
    );

    expect(superDocMocks.lastRenderProps).toMatchObject({
      onEditorCreate: expect.any(Function),
      onEditorUpdate: expect.any(Function),
    });
  });

  it.skip('SuperDoc 预览应显示结构摘要和当前聚焦提示', () => {
    render(
      <SuperDocPreview
        markdown="# 示例"
        documentName="demo.md"
        formatConfig={TEMPLATE_DEFAULTS[DEFAULT_BASE_TEMPLATE]}
        scopedPatches={[]}
        structureSummaryText={{
          shortLabel: '建议切回 HTML 回退',
          detailLabel: '检测到表格 x1、公式 x1，建议先复核结构。',
          recommendationLabel: '切回 HTML 回退复核',
          featureLabels: ['表格 x1', '公式 x1'],
        }}
        focusState={{
          title: '当前块样式：将一级标题居中并调整为黑体三号',
          description: '这是一条块级聚焦提示，用于说明当前正在查看的 AI 修改项。',
          kind: 'block',
          badge: '块级',
          targetTypeLabel: '标题块',
        }}
      />
    );

    expect(screen.getByText('建议切回 HTML 回退')).toBeInTheDocument();
    expect(screen.getByText('检测到表格 x1、公式 x1，建议先复核结构。')).toBeInTheDocument();
    expect(screen.getByText('表格 x1')).toBeInTheDocument();
    expect(screen.getByText('公式 x1')).toBeInTheDocument();
    expect(screen.getAllByText('当前块样式：将一级标题居中并调整为黑体三号')).toHaveLength(2);
    expect(screen.getAllByText('块级').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('标题块')).toBeInTheDocument();
  });

  it('SuperDoc 预览应通过结构与聚焦标记暴露 UI 状态', () => {
    const { container } = render(
      <SuperDocPreview
        markdown="# 示例"
        documentName="demo.md"
        formatConfig={TEMPLATE_DEFAULTS[DEFAULT_BASE_TEMPLATE]}
        scopedPatches={[]}
        structureSummaryText={{
          shortLabel: '建议切回 HTML 回退',
          detailLabel: '检测到表格 x1、公式 x1，建议先复核结构。',
          recommendationLabel: '切回 HTML 回退复核',
          featureLabels: ['表格 x1', '公式 x1'],
        }}
        focusState={{
          title: '当前块样式：将一级标题居中并调整为黑体三号',
          description: '这是一条块级聚焦提示，用于说明当前正在查看的 AI 修改项。',
          kind: 'block',
          badge: '块级',
          targetTypeLabel: '标题块',
        }}
      />
    );

    expect(container.querySelectorAll('[data-superdoc-focus-summary="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-superdoc-focus-title="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-superdoc-focus-description="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-superdoc-focus-scope="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-superdoc-focus-target-type="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-superdoc-inline-focus-note="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-superdoc-inline-focus-title="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-superdoc-inline-focus-badge="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-superdoc-focus-shell="active"]')).toHaveLength(1);
  });

  it('即使启用目录，SuperDoc 预览也不应自动插入目录页', () => {
    const config = {
      ...TEMPLATE_DEFAULTS[DEFAULT_BASE_TEMPLATE],
      document: {
        ...TEMPLATE_DEFAULTS[DEFAULT_BASE_TEMPLATE].document,
        includeTableOfContents: true,
      },
    };

    const result = buildSuperDocPreviewMarkdown(
      '# 主标题\n\n## 第一节\n\n### 小节\n\n正文',
      config,
      'zh'
    );

    expect(result.markdown).toBe('# 主标题\n\n## 第一节\n\n### 小节\n\n正文');
    expect(result.config.document.includeTableOfContents).toBe(false);
  });

  it('启用页码时应为每个 SuperDoc 页面装饰底部页码，并在关闭时清理', () => {
    const container = document.createElement('div');
    const pageOne = document.createElement('div');
    const pageTwo = document.createElement('div');

    pageOne.className = 'superdoc-page';
    pageTwo.className = 'superdoc-page';
    container.append(pageOne, pageTwo);
    document.body.appendChild(container);

    const decoratedCount = decorateSuperDocPageNumbers(container, true);

    expect(decoratedCount).toBe(2);
    const pageNumbers = Array.from(
      container.querySelectorAll<HTMLElement>('[data-md2word-page-number="true"]')
    );
    expect(pageNumbers).toHaveLength(2);
    expect(pageNumbers.map((node) => node.textContent)).toEqual(['1', '2']);

    const clearedCount = decorateSuperDocPageNumbers(container, false);
    expect(clearedCount).toBe(0);
    expect(container.querySelectorAll('[data-md2word-page-number="true"]')).toHaveLength(0);

    container.remove();
  });

  it('应为 SuperDoc AI 确认流预留格式应用与 review props', async () => {
    const { SuperDocEditor } = await import('@superdoc-dev/react');
    const onApplyFormatting = vi.fn(async () => undefined);
    const onOpenReview = vi.fn();
    const onCloseReview = vi.fn();

    render(
      <SuperDocEditor
        onSelectionChange={() => undefined}
        onApplyFormatting={onApplyFormatting}
        onOpenReview={onOpenReview}
        onCloseReview={onCloseReview}
        reviewState={{
          status: 'pending',
          selectedCount: 2,
          hasPendingChanges: true,
        }}
      />
    );

    expect(superDocMocks.lastRenderProps).toMatchObject({
      onSelectionChange: expect.any(Function),
      onApplyFormatting,
      onOpenReview,
      onCloseReview,
      reviewState: {
        status: 'pending',
        selectedCount: 2,
        hasPendingChanges: true,
      },
    });
  });

  it('标题块级样式确认后应进入 SuperDoc 应用流，并在撤销后恢复 review 状态', async () => {
    const { SuperDocEditor } = await import('@superdoc-dev/react');
    const headingReviewChange = {
      id: 'heading-block-1',
      blockId: 'heading1-0-sample',
      target: 'heading',
      headingLevel: 1,
      style: {
        fontFamily: 'SimHei',
        fontSizePt: 16,
        align: 'center',
      },
      summary: '将一级标题调整为黑体三号居中',
    };
    const applyCalls: Array<typeof headingReviewChange> = [];
    const revertCalls: string[] = [];

    const Harness = () => {
      const initialReviewState = {
        status: 'review',
        selectedCount: 1,
        hasPendingChanges: true,
        changes: [headingReviewChange],
      };
      const [reviewState, setReviewState] = React.useState(initialReviewState);
      const [appliedState, setAppliedState] = React.useState<{
        status: 'idle' | 'applied' | 'reverted';
        lastAppliedId?: string;
        lastRevertedId?: string;
      }>({ status: 'idle' });

      return (
        <SuperDocEditor
          reviewState={reviewState}
          appliedState={appliedState}
          onApplyFormatting={async (change: typeof headingReviewChange) => {
            applyCalls.push(change);
            setAppliedState({
              status: 'applied',
              lastAppliedId: change.id,
            });
            setReviewState({
              status: 'idle',
              selectedCount: 0,
              hasPendingChanges: false,
              changes: [],
            });
          }}
          onRevertFormatting={(changeId: string) => {
            revertCalls.push(changeId);
            setAppliedState({
              status: 'reverted',
              lastRevertedId: changeId,
            });
            setReviewState(initialReviewState);
          }}
        />
      );
    };

    render(<Harness />);

    expect(superDocMocks.lastRenderProps).toMatchObject({
      reviewState: {
        status: 'review',
        selectedCount: 1,
        hasPendingChanges: true,
        changes: [
          expect.objectContaining({
            id: 'heading-block-1',
            target: 'heading',
            headingLevel: 1,
            style: expect.objectContaining({
              fontFamily: 'SimHei',
              fontSizePt: 16,
              align: 'center',
            }),
          }),
        ],
      },
      onApplyFormatting: expect.any(Function),
      onRevertFormatting: expect.any(Function),
    });

    await (superDocMocks.lastRenderProps?.onApplyFormatting as (change: typeof headingReviewChange) => Promise<void>)(
      headingReviewChange
    );

    await waitFor(() => {
      expect(applyCalls).toHaveLength(1);
      expect(superDocMocks.lastRenderProps).toMatchObject({
        appliedState: {
          status: 'applied',
          lastAppliedId: 'heading-block-1',
        },
        reviewState: {
          status: 'idle',
          selectedCount: 0,
          hasPendingChanges: false,
        },
      });
    });

    expect(applyCalls[0]).toMatchObject({
      target: 'heading',
      style: {
        fontFamily: 'SimHei',
        fontSizePt: 16,
        align: 'center',
      },
    });

    (superDocMocks.lastRenderProps?.onRevertFormatting as (changeId: string) => void)('heading-block-1');

    await waitFor(() => {
      expect(revertCalls).toEqual(['heading-block-1']);
      expect(superDocMocks.lastRenderProps).toMatchObject({
        appliedState: {
          status: 'reverted',
          lastRevertedId: 'heading-block-1',
        },
        reviewState: {
          status: 'review',
          selectedCount: 1,
          hasPendingChanges: true,
          changes: [
            expect.objectContaining({
              id: 'heading-block-1',
              target: 'heading',
            }),
          ],
        },
      });
    });
  });

  it.each([
    {
      headingLevel: 1,
      blockId: 'heading1-0-sample',
      changeId: 'heading-block-h1',
      fontFamily: 'SimHei',
      fontSizePt: 16,
      align: 'center',
      summary: '将一级标题调整为黑体三号居中',
    },
    {
      headingLevel: 2,
      blockId: 'heading2-1-sample',
      changeId: 'heading-block-h2',
      fontFamily: 'KaiTi',
      fontSizePt: 14,
      align: 'left',
      summary: '将二级标题调整为楷体四号左对齐',
    },
    {
      headingLevel: 3,
      blockId: 'heading3-2-sample',
      changeId: 'heading-block-h3',
      fontFamily: 'FangSong',
      fontSizePt: 12,
      align: 'right',
      summary: '将三级标题调整为仿宋小四右对齐',
    },
  ])(
    '应支持 h$headingLevel 标题块级样式进入 SuperDoc review/apply/revert 流',
    async ({ headingLevel, blockId, changeId, fontFamily, fontSizePt, align, summary }) => {
      const { SuperDocEditor } = await import('@superdoc-dev/react');
      const headingReviewChange = {
        id: changeId,
        blockId,
        target: 'heading',
        headingLevel,
        style: {
          fontFamily,
          fontSizePt,
          align,
        },
        summary,
      };
      const applyCalls: Array<typeof headingReviewChange> = [];
      const revertCalls: string[] = [];

      const Harness = () => {
        const initialReviewState = {
          status: 'review',
          selectedCount: 1,
          hasPendingChanges: true,
          changes: [headingReviewChange],
        };
        const [reviewState, setReviewState] = React.useState(initialReviewState);
        const [appliedState, setAppliedState] = React.useState<{
          status: 'idle' | 'applied' | 'reverted';
          lastAppliedId?: string;
          lastRevertedId?: string;
        }>({ status: 'idle' });

        return (
          <SuperDocEditor
            reviewState={reviewState}
            appliedState={appliedState}
            onApplyFormatting={async (change: typeof headingReviewChange) => {
              applyCalls.push(change);
              setAppliedState({
                status: 'applied',
                lastAppliedId: change.id,
              });
              setReviewState({
                status: 'idle',
                selectedCount: 0,
                hasPendingChanges: false,
                changes: [],
              });
            }}
            onRevertFormatting={(appliedChangeId: string) => {
              revertCalls.push(appliedChangeId);
              setAppliedState({
                status: 'reverted',
                lastRevertedId: appliedChangeId,
              });
              setReviewState(initialReviewState);
            }}
          />
        );
      };

      render(<Harness />);

      expect(superDocMocks.lastRenderProps).toMatchObject({
        reviewState: {
          status: 'review',
          selectedCount: 1,
          hasPendingChanges: true,
          changes: [
            expect.objectContaining({
              id: changeId,
              blockId,
              target: 'heading',
              headingLevel,
              style: expect.objectContaining({
                fontFamily,
                fontSizePt,
                align,
              }),
            }),
          ],
        },
      });

      await (superDocMocks.lastRenderProps?.onApplyFormatting as (change: typeof headingReviewChange) => Promise<void>)(
        headingReviewChange
      );

      await waitFor(() => {
        expect(applyCalls).toHaveLength(1);
        expect(superDocMocks.lastRenderProps).toMatchObject({
          appliedState: {
            status: 'applied',
            lastAppliedId: changeId,
          },
          reviewState: {
            status: 'idle',
            selectedCount: 0,
            hasPendingChanges: false,
          },
        });
      });

      expect(applyCalls[0]).toMatchObject({
        id: changeId,
        blockId,
        target: 'heading',
        headingLevel,
        style: {
          fontFamily,
          fontSizePt,
          align,
        },
      });

      (superDocMocks.lastRenderProps?.onRevertFormatting as (appliedChangeId: string) => void)(changeId);

      await waitFor(() => {
        expect(revertCalls).toEqual([changeId]);
        expect(superDocMocks.lastRenderProps).toMatchObject({
          appliedState: {
            status: 'reverted',
            lastRevertedId: changeId,
          },
          reviewState: {
            status: 'review',
            selectedCount: 1,
            hasPendingChanges: true,
            changes: [
              expect.objectContaining({
                id: changeId,
                target: 'heading',
                headingLevel,
              }),
            ],
          },
        });
      });
    }
  );

  it.each([
    {
      target: 'paragraph',
      blockId: 'paragraph-1-sample',
      changeId: 'paragraph-block-1',
      style: {
        fontFamily: 'SimSun',
        fontSizePt: 12,
        align: 'justify',
      },
      summary: '将正文段落调整为宋体小四两端对齐',
    },
    {
      target: 'blockquote',
      blockId: 'blockquote-1-sample',
      changeId: 'blockquote-block-1',
      style: {
        fontFamily: 'FangSong',
        fontSizePt: 12,
        align: 'left',
      },
      summary: '将引用块调整为仿宋小四左对齐',
    },
    {
      target: 'list',
      blockId: 'list-1-sample',
      changeId: 'list-block-1',
      style: {
        fontFamily: 'KaiTi',
        fontSizePt: 12,
        align: 'left',
      },
      summary: '将列表调整为楷体小四左对齐',
    },
    {
      target: 'code',
      blockId: 'code-1-sample',
      changeId: 'code-block-1',
      style: {
        fontFamily: 'Consolas',
        fontSizePt: 10,
        align: 'left',
      },
      summary: '将代码块调整为 Consolas 10pt',
    },
  ])('应支持 $target 块级样式进入 SuperDoc review/apply 流', async ({ target, blockId, changeId, style, summary }) => {
    const { SuperDocEditor } = await import('@superdoc-dev/react');
    const blockReviewChange = {
      id: changeId,
      blockId,
      target,
      style,
      summary,
    };
    const applyCalls: Array<typeof blockReviewChange> = [];

    const Harness = () => {
      const [reviewState, setReviewState] = React.useState({
        status: 'review',
        selectedCount: 1,
        hasPendingChanges: true,
        changes: [blockReviewChange],
      });
      const [appliedState, setAppliedState] = React.useState<{
        status: 'idle' | 'applied';
        lastAppliedId?: string;
      }>({ status: 'idle' });

      return (
        <SuperDocEditor
          reviewState={reviewState}
          appliedState={appliedState}
          onApplyFormatting={async (change: typeof blockReviewChange) => {
            applyCalls.push(change);
            setAppliedState({
              status: 'applied',
              lastAppliedId: change.id,
            });
            setReviewState({
              status: 'idle',
              selectedCount: 0,
              hasPendingChanges: false,
              changes: [],
            });
          }}
        />
      );
    };

    render(<Harness />);

    expect(superDocMocks.lastRenderProps).toMatchObject({
      reviewState: {
        status: 'review',
        selectedCount: 1,
        hasPendingChanges: true,
        changes: [
          expect.objectContaining({
            id: changeId,
            blockId,
            target,
            style: expect.objectContaining(style),
          }),
        ],
      },
      onApplyFormatting: expect.any(Function),
    });

    await (superDocMocks.lastRenderProps?.onApplyFormatting as (change: typeof blockReviewChange) => Promise<void>)(
      blockReviewChange
    );

    await waitFor(() => {
      expect(applyCalls).toHaveLength(1);
      expect(superDocMocks.lastRenderProps).toMatchObject({
        appliedState: {
          status: 'applied',
          lastAppliedId: changeId,
        },
        reviewState: {
          status: 'idle',
          selectedCount: 0,
          hasPendingChanges: false,
        },
      });
    });

    expect(applyCalls[0]).toMatchObject({
      target,
      blockId,
      style,
    });
  });

  it('应优先调用 SuperDoc 导出器，并在失败时回退到本地 DOCX 与 HTML', async () => {
    const superDocExport = vi.fn(async () => makeBlob('superdoc'));
    const nativeDocxExport = vi.fn(async () => makeBlob('native-docx'));
    const htmlDocxExport = vi.fn(() => makeBlob('html-docx'));

    const preferredResult = await exportDocxWithPriority(' # demo ', 'academic', [], {
      preferSuperDoc: true,
      superDocAdapter: {
        exportDocx: superDocExport,
      },
      nativeDocxExport,
      htmlDocxExport,
    });

    expect(preferredResult.strategy).toBe('superdoc');
    expect(superDocExport).toHaveBeenCalledTimes(1);
    expect(nativeDocxExport).not.toHaveBeenCalled();
    expect(htmlDocxExport).not.toHaveBeenCalled();

    superDocExport.mockResolvedValueOnce(null);
    const fallbackToNative = await exportDocxWithPriority(' # demo ', 'academic', [], {
      preferSuperDoc: true,
      superDocAdapter: {
        exportDocx: superDocExport,
      },
      nativeDocxExport,
      htmlDocxExport,
    });

    expect(fallbackToNative.strategy).toBe('native-docx');
    expect(nativeDocxExport).toHaveBeenCalledTimes(1);

    const failingNative = vi.fn(async () => {
      throw new Error('native exporter failed');
    });
    const htmlFallback = await exportDocxWithPriority(' # demo ', 'academic', [], {
      preferSuperDoc: false,
      nativeDocxExport: failingNative,
      htmlDocxExport,
    });

    expect(htmlFallback.strategy).toBe('html-docx');
    expect(htmlDocxExport).toHaveBeenCalledTimes(1);
  });

  it.skip('主页面切到 Word 预览后应保留预览切换入口与桥接文案', async () => {
    render(
      <AppProvider>
        <Md2Word />
      </AppProvider>
    );

    expect(screen.getByRole('button', { name: 'Word 预览' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'HTML 回退' })).toBeInTheDocument();
    expect(buildSuperDocSelectionSummary('当前选中内容：demo')).toBe(
      '来源：Markdown 源码区 · 边界：当前选中内容'
    );
  });

  it('应按目标分组应用标题块级样式，避免重复 setHeading 覆盖已应用样式', () => {
    const setHeading = vi.fn(() => true);
    const setFontFamily = vi.fn(() => true);
    const setFontSize = vi.fn(() => true);
    const setTextAlign = vi.fn(() => true);

    const result = applySuperDocFormattingChanges(
      {
        commands: {
          setHeading,
          setFontFamily,
          setFontSize,
          setTextAlign,
        },
      } as never,
      [
        {
          changeId: 'h1-font',
          target: 'h1',
          property: 'fontFamily',
          value: 'SimHei',
          label: '将一级标题调整为黑体三号居中',
        },
        {
          changeId: 'h1-size',
          target: 'h1',
          property: 'fontSizePt',
          value: 16,
          label: '将一级标题调整为黑体三号居中',
        },
        {
          changeId: 'h1-align',
          target: 'h1',
          property: 'align',
          value: 'center',
          label: '将一级标题调整为黑体三号居中',
        },
      ]
    );

    expect(setHeading).toHaveBeenCalledTimes(1);
    expect(setHeading).toHaveBeenCalledWith({ level: 1 });
    expect(setFontFamily).toHaveBeenCalledWith('SimHei');
    expect(setFontSize).toHaveBeenCalledWith('16pt');
    expect(setTextAlign).toHaveBeenCalledWith('center');
    expect(result.appliedLabels).toHaveLength(3);
    expect(result.unsupportedLabels).toHaveLength(0);
  });

  it('标题块级命令缺失时，应将整组标题变更保留为未支持项', () => {
    const result = applySuperDocFormattingChanges(
      {
        commands: {
          setFontFamily: vi.fn(() => true),
          setFontSize: vi.fn(() => true),
        },
      } as never,
      [
        {
          changeId: 'h2-font',
          target: 'h2',
          property: 'fontFamily',
          value: 'KaiTi',
          label: '将二级标题调整为楷体四号左对齐',
        },
        {
          changeId: 'h2-size',
          target: 'h2',
          property: 'fontSizePt',
          value: 14,
          label: '将二级标题调整为楷体四号左对齐',
        },
      ]
    );

    expect(result.appliedLabels).toHaveLength(0);
    expect(result.unsupportedLabels).toEqual([
      '将二级标题调整为楷体四号左对齐',
      '将二级标题调整为楷体四号左对齐',
    ]);
  });

  it.each([
    { target: 'paragraph', property: 'align', value: 'justify', command: 'setTextAlign', expectedArg: 'justify' },
    { target: 'blockquote', property: 'lineSpacing', value: 1.5, command: 'setLineHeight', expectedArg: 1.5 },
    { target: 'list', property: 'indentLeftPt', value: 36, command: 'setTextIndentation', expectedArg: 36 },
    { target: 'code', property: 'fontFamily', value: 'Consolas', command: 'setFontFamily', expectedArg: 'Consolas' },
  ])(
    '应支持 $target 块级目标直接应用 $property',
    ({ target, property, value, command, expectedArg }) => {
      const commandMocks = {
        setTextAlign: vi.fn(() => true),
        setLineHeight: vi.fn(() => true),
        setTextIndentation: vi.fn(() => true),
        setFontFamily: vi.fn(() => true),
      };

      const result = applySuperDocFormattingChanges(
        {
          commands: commandMocks,
        } as never,
        [
          {
            changeId: `${target}-${property}`,
            target,
            property,
            value,
            label: `${target}.${property}`,
          },
        ]
      );

      expect(commandMocks[command as keyof typeof commandMocks]).toHaveBeenCalledWith(expectedArg);
      expect(result.appliedLabels).toEqual([`${target}.${property}`]);
      expect(result.unsupportedLabels).toEqual([]);
    }
  );
});
