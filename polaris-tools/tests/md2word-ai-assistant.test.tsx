import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import Md2Word from '../tools/md2word';
import { SidebarRight } from '../tools/md2word/SidebarRight';
import { apiClient, ApiError } from '../api/client';
import { downloadFile, markdownToDocx } from '../utils/documentConverter';

const documentConverterMocks = vi.hoisted(() => ({
  markdownToDocx: vi.fn(
    async () =>
      new Blob(['docx'], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
  ),
  markdownToPdf: vi.fn(async () => new Blob(['pdf'], { type: 'application/pdf' })),
  markdownToHtml: vi.fn(() => '<html><body>exported</body></html>'),
  exportDocxWithPriority: vi.fn(async () => ({
    blob: new Blob(['docx'], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    strategy: 'native-docx' as const,
  })),
  downloadFile: vi.fn(),
}));

vi.mock('../utils/documentConverter', () => documentConverterMocks);

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

const AI_PLACEHOLDER = /例如：把一级标题改成黑体三号居中/;

const getAiSummaryElements = () =>
  screen.getAllByText((_, element) => {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    if (!['P', 'SPAN'].includes(element.tagName)) {
      return false;
    }

    const text = element.textContent ?? '';
    return text.includes('AI 作用范围') && text.includes('样式变化');
  });

const openExportTab = () => {
  fireEvent.click(screen.getByRole('button', { name: '导出' }));
};

const waitForHtmlPreview = async () => {
  const htmlEngineButton =
    screen.queryByRole('button', { name: /HTML 回退|HTML fallback|切到 HTML 回退|Switch to HTML fallback/i });
  if (htmlEngineButton) {
    fireEvent.click(htmlEngineButton);
  }

  const splitButton =
    screen.queryByRole('button', { name: '分栏' }) ?? screen.queryByRole('button', { name: 'Split' });
  if (splitButton) {
    fireEvent.click(splitButton);
  }

  await waitFor(() => {
    const htmlPreview = document.querySelector('[data-preview-engine="html"]');
    const markdownPreview = document.querySelector('.markdown-preview');
    expect(htmlPreview ?? markdownPreview).not.toBeNull();
  });
};

describe('md2word AI 格式助手', () => {
  let recordUseSpy: ReturnType<typeof vi.spyOn>;
  let updateDurationSpy: ReturnType<typeof vi.spyOn>;
  let parseIntentSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('md2word-preview-engine', 'html');
    vi.mocked(downloadFile).mockClear();
    vi.mocked(markdownToDocx).mockClear();
    documentConverterMocks.markdownToDocx.mockClear();
    documentConverterMocks.markdownToPdf.mockClear();
    documentConverterMocks.markdownToHtml.mockClear();
    documentConverterMocks.exportDocxWithPriority.mockClear();

    recordUseSpy = vi.spyOn(apiClient.tools, 'recordUseByUrl');
    updateDurationSpy = vi.spyOn(apiClient.tools, 'updateUsageDuration');
    parseIntentSpy = vi.spyOn(apiClient.aiFormatting, 'parseIntent');

    recordUseSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: 1,
    });
    updateDurationSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: undefined,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应提交当前作用域与格式上下文，并展示 AI 应用结果', async () => {
    parseIntentSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: {
        documentPatch: {
          body: {
            fontFamily: 'FangSong',
            fontSizePt: 12,
            lineSpacing: 1.5,
          },
        },
        scopedPatches: [
          {
            scope: {
              scopeType: 'block',
              blockId: 'heading1-0-sample',
            },
            patch: {
              h1: {
                align: 'center',
              },
            },
            summary: '将一级标题居中',
          },
        ],
        summary: '已按要求调整正文与标题',
        providerUsed: '备用兼容',
        remainingCount: 9,
      },
    });

    const { container } = render(
      <AppProvider>
        <Md2Word />
      </AppProvider>
    );

    const editorTextarea = await screen.findByPlaceholderText('在此输入 Markdown 内容...');
    await waitForHtmlPreview();
    fireEvent.click(editorTextarea);

    const aiTextarea = screen.getByPlaceholderText(AI_PLACEHOLDER);
    fireEvent.change(aiTextarea, {
      target: { value: '把一级标题改成黑体三号居中，正文改成仿宋四号，1.5 倍行距' },
    });

    fireEvent.click(screen.getByRole('button', { name: '应用 AI 格式' }));

    await waitFor(() => {
      expect(parseIntentSpy).toHaveBeenCalledTimes(1);
    });

    const [payload, guestId] = parseIntentSpy.mock.calls[0];
    expect(guestId).toMatch(/[a-z0-9-]+/i);
    expect(payload).toMatchObject({
      instruction: '把一级标题改成黑体三号居中，正文改成仿宋四号，1.5 倍行距',
      mode: 'merge',
      scope: {
        scopeType: expect.stringMatching(/document|block|selection/),
      },
      supportedProperties: expect.arrayContaining(['fontFamily', 'fontSizePt', 'lineSpacing']),
      currentResolvedFormat: {
        body: expect.objectContaining({
          fontFamily: expect.any(String),
          fontSizePt: expect.any(Number),
        }),
      },
    });

    await screen.findByText('已按要求调整正文与标题');
    expect(screen.getByText('提供商: 备用兼容')).toBeInTheDocument();
    expect(screen.getByText('今日剩余 9 次')).toBeInTheDocument();
    expect(container.querySelector('.markdown-preview')?.innerHTML).toContain('font-family: FangSong');

    openExportTab();
    expect(getAiSummaryElements()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /立即转换/ }));

    await waitFor(() => {
      expect(documentConverterMocks.exportDocxWithPriority).toHaveBeenCalledTimes(1);
      expect(downloadFile).toHaveBeenCalledTimes(1);
      expect(getAiSummaryElements()).toHaveLength(2);
    });

    fireEvent.click(screen.getByRole('button', { name: '查看本次已应用的 AI 修改' }));

    await waitFor(() => {
      expect(document.querySelector('[data-ai-export-summary-card="true"]')).toHaveAttribute(
        'data-highlighted',
        'true'
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /查看具体修改项/ }));
    expect(document.querySelector('[data-ai-export-summary-details="true"]')).not.toBeNull();
    expect(screen.getByText('整篇文档级设置')).toBeInTheDocument();
    expect(screen.getByText('将一级标题居中')).toBeInTheDocument();
    const blockDetailButton = screen.getByRole('button', { name: /将一级标题居中/ });
    fireEvent.mouseEnter(blockDetailButton);

    await waitFor(() => {
      expect(document.querySelector('[data-block-id][data-ai-applied-active="true"]')).not.toBeNull();
    });

    fireEvent.mouseLeave(blockDetailButton);
    fireEvent.click(blockDetailButton);

    await waitFor(() => {
      expect(document.querySelector('[data-block-id][data-ai-applied-active="true"]')).not.toBeNull();
    });
  });

  it('达到游客限额后应显示剩余 0 次并禁用按钮', async () => {
    parseIntentSpy.mockRejectedValue(new ApiError(9001, 'AI 格式助手今日使用次数已达上限'));

    render(
      <AppProvider>
        <Md2Word />
      </AppProvider>
    );

    const aiTextarea = await screen.findByPlaceholderText(AI_PLACEHOLDER);
    await waitForHtmlPreview();
    fireEvent.change(aiTextarea, {
      target: { value: '把正文改成仿宋四号' },
    });

    const applyButton = screen.getByRole('button', { name: '应用 AI 格式' });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText('今日剩余 0 次')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '应用 AI 格式' })).toBeDisabled();
    });
  });

  it('右侧栏应提供 AI、导出两标签，并保留导出设置入口', async () => {
    render(
      <AppProvider>
        <Md2Word />
      </AppProvider>
    );

    expect(screen.queryByRole('button', { name: '文档' })).toBeNull();
    expect(screen.getByRole('button', { name: 'AI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导出' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '导出' }));
    expect(screen.getByRole('button', { name: /立即转换/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'A4' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '显示页码' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '镜像页边距' })).toBeInTheDocument();
  });

  it('默认应进入 HTML 预览主链路', async () => {
    render(
      <AppProvider>
        <Md2Word />
      </AppProvider>
    );

    await screen.findByPlaceholderText('在此输入 Markdown 内容...');
    expect(document.querySelector('.markdown-preview')).not.toBeNull();
  });

  it('SuperDoc mock 应支持未来 AI 应用与确认态 props 而不影响当前 HTML 回退测试', async () => {
    const { SuperDocEditor } = await import('@superdoc-dev/react');
    const onApplyFormatting = vi.fn(async () => undefined);
    const onApproveReview = vi.fn();
    const onDismissReview = vi.fn();

    render(
      <SuperDocEditor
        onSelectionChange={() => undefined}
        onApplyFormatting={onApplyFormatting}
        onApproveReview={onApproveReview}
        onDismissReview={onDismissReview}
        reviewState={{
          status: 'review',
          selectedCount: 1,
          hasPendingChanges: true,
          summary: '准备应用到当前选区',
        }}
      />
    );

    expect(superDocMocks.lastRenderProps).toMatchObject({
      onSelectionChange: expect.any(Function),
      onApplyFormatting,
      onApproveReview,
      onDismissReview,
      reviewState: {
        status: 'review',
        selectedCount: 1,
        hasPendingChanges: true,
        summary: '准备应用到当前选区',
      },
    });
  });

  it('SuperDoc mock 应支持标题块级样式 review props 形状', async () => {
    const { SuperDocEditor } = await import('@superdoc-dev/react');
    const onApplyFormatting = vi.fn(async () => undefined);
    const onRevertFormatting = vi.fn();

    render(
      <SuperDocEditor
        onApplyFormatting={onApplyFormatting}
        onRevertFormatting={onRevertFormatting}
        reviewState={{
          status: 'review',
          selectedCount: 1,
          hasPendingChanges: true,
          changes: [
            {
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
            },
          ],
        }}
      />
    );

    expect(superDocMocks.lastRenderProps).toMatchObject({
      onApplyFormatting,
      onRevertFormatting,
      reviewState: {
        status: 'review',
        selectedCount: 1,
        hasPendingChanges: true,
        changes: [
          expect.objectContaining({
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
    });
  });

  it.each([
    {
      headingLevel: 1,
      blockId: 'heading1-0-sample',
      fontFamily: 'SimHei',
      fontSizePt: 16,
      align: 'center',
      summary: '将一级标题调整为黑体三号居中',
    },
    {
      headingLevel: 2,
      blockId: 'heading2-1-sample',
      fontFamily: 'KaiTi',
      fontSizePt: 14,
      align: 'left',
      summary: '将二级标题调整为楷体四号左对齐',
    },
    {
      headingLevel: 3,
      blockId: 'heading3-2-sample',
      fontFamily: 'FangSong',
      fontSizePt: 12,
      align: 'right',
      summary: '将三级标题调整为仿宋小四右对齐',
    },
  ])('SuperDoc mock 应支持 h$headingLevel 标题块级 review props', async ({
    headingLevel,
    blockId,
    fontFamily,
    fontSizePt,
    align,
    summary,
  }) => {
    const { SuperDocEditor } = await import('@superdoc-dev/react');
    const onApplyFormatting = vi.fn(async () => undefined);
    const onRevertFormatting = vi.fn();

    render(
      <SuperDocEditor
        onApplyFormatting={onApplyFormatting}
        onRevertFormatting={onRevertFormatting}
        reviewState={{
          status: 'review',
          selectedCount: 1,
          hasPendingChanges: true,
          changes: [
            {
              id: `${blockId}-review`,
              blockId,
              target: 'heading',
              headingLevel,
              style: {
                fontFamily,
                fontSizePt,
                align,
              },
              summary,
            },
          ],
        }}
      />
    );

    expect(superDocMocks.lastRenderProps).toMatchObject({
      onApplyFormatting,
      onRevertFormatting,
      reviewState: {
        status: 'review',
        selectedCount: 1,
        hasPendingChanges: true,
        changes: [
          expect.objectContaining({
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
  });

  it.each([
    {
      target: 'paragraph',
      blockId: 'paragraph-1-sample',
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
      style: {
        fontFamily: 'Consolas',
        fontSizePt: 10,
        align: 'left',
      },
      summary: '将代码块调整为 Consolas 10pt',
    },
  ])('SuperDoc mock 应支持 $target 块级 review props', async ({ target, blockId, style, summary }) => {
    const { SuperDocEditor } = await import('@superdoc-dev/react');
    const onApplyFormatting = vi.fn(async () => undefined);

    render(
      <SuperDocEditor
        onApplyFormatting={onApplyFormatting}
        reviewState={{
          status: 'review',
          selectedCount: 1,
          hasPendingChanges: true,
          changes: [
            {
              id: `${blockId}-review`,
              blockId,
              target,
              style,
              summary,
            },
          ],
        }}
      />
    );

    expect(superDocMocks.lastRenderProps).toMatchObject({
      onApplyFormatting,
      reviewState: {
        status: 'review',
        selectedCount: 1,
        hasPendingChanges: true,
        changes: [
          expect.objectContaining({
            blockId,
            target,
            style: expect.objectContaining(style),
          }),
        ],
      },
    });
  });

  it('预览区跨块选区应进入 AI 确认模式并在确认后应用', async () => {
    parseIntentSpy.mockImplementation(async (payload) => ({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: {
        documentPatch: {},
        scopedPatches: [],
        proposedChanges: payload.selectionSegments.map((segment, index) => ({
          segmentId: segment.segmentId,
          styleChanges: [
            index === 0
              ? {
                  target: 'body',
                  property: 'color',
                  value: '#FF0000',
                  label: '文字改为红色',
                }
              : {
                  target: 'body',
                  property: 'bold',
                  value: true,
                  label: '文字加粗',
                },
          ],
        })),
        summary: '已生成候选修改',
        providerUsed: 'NVIDIA',
        remainingCount: 5,
      },
    }));

    const { container } = render(
      <AppProvider>
        <Md2Word />
      </AppProvider>
    );

    await screen.findByPlaceholderText('在此输入 Markdown 内容...');
    await waitForHtmlPreview();
    const previewRoot = container.querySelector('.markdown-preview') as HTMLDivElement;
    expect(previewRoot).toBeTruthy();

    const headingNode = previewRoot.querySelector('h2 [data-segment-id]')?.firstChild;
    const paragraphNode = previewRoot.querySelector('p [data-segment-id]')?.firstChild;
    expect(headingNode).toBeTruthy();
    expect(paragraphNode).toBeTruthy();

    const selection = window.getSelection();
    selection?.removeAllRanges();
    const range = document.createRange();
    range.setStart(headingNode as Text, 0);
    range.setEnd(paragraphNode as Text, 4);
    selection?.addRange(range);
    fireEvent.mouseUp(previewRoot);
    await screen.findAllByText(/预览选区/);

    const aiTextarea = screen.getByPlaceholderText(AI_PLACEHOLDER);
    fireEvent.change(aiTextarea, {
      target: { value: '把选中的标题和正文分别调整一下' },
    });
    fireEvent.click(screen.getByRole('button', { name: '应用 AI 格式' }));

    await waitFor(() => {
      expect(parseIntentSpy).toHaveBeenCalledTimes(1);
    });

    const [payload] = parseIntentSpy.mock.calls[0];
    expect(payload.scope).toEqual({
      scopeType: 'preview-selection',
      segmentIds: expect.any(Array),
    });
    expect(payload.selectionSegments).toHaveLength(2);
    await screen.findByText('AI 确认模式');
    expect(screen.getByText('文字改为红色')).toBeInTheDocument();
    expect(screen.getByText('文字加粗')).toBeInTheDocument();
    expect(screen.getAllByText('文本样式').length).toBeGreaterThan(0);

    const segmentCard = document.querySelector('[data-review-segment-id]');
    expect(segmentCard).toBeTruthy();
    fireEvent.mouseEnter(segmentCard!);
    await waitFor(() => {
      expect(container.querySelector('[data-ai-review-active="true"]')).not.toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: '全部取消' }));
    await screen.findByText(/当前没有选中的修改项/);
    const styleLabel = screen.getByText('文字改为红色').closest('label');
    const styleCheckbox = styleLabel?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    expect(styleCheckbox).toBeTruthy();
    fireEvent.click(styleCheckbox!);

    await waitFor(() => {
      expect(screen.queryByText(/当前没有选中的修改项/)).toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: '应用选中修改' }));

    await waitFor(() => {
      expect(container.querySelector('.markdown-preview')?.innerHTML).toContain('data-selection-id=');
    });

    openExportTab();
    expect(getAiSummaryElements()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /立即转换/ }));

    await waitFor(() => {
      expect(documentConverterMocks.exportDocxWithPriority).toHaveBeenCalledTimes(1);
      expect(downloadFile).toHaveBeenCalledTimes(1);
      expect(getAiSummaryElements()).toHaveLength(2);
    });

    fireEvent.click(screen.getByRole('button', { name: /查看具体修改项/ }));
    expect(document.querySelector('[data-ai-export-summary-details="true"]')).not.toBeNull();
    expect(screen.getByText('文字改为红色')).toBeInTheDocument();
    const selectionDetailButton = screen.getByRole('button', { name: /文字改为红色/ });
    fireEvent.mouseEnter(selectionDetailButton);

    await waitFor(() => {
      expect(document.querySelector('[data-selection-id][data-ai-applied-active="true"]')).not.toBeNull();
    });

    fireEvent.mouseLeave(selectionDetailButton);
    fireEvent.click(selectionDetailButton);

    await waitFor(() => {
      expect(document.querySelector('[data-selection-id][data-ai-applied-active="true"]')).not.toBeNull();
    });
  });

  it('存在源码选区时应以 selection 作用域提交 AI 请求', async () => {
    parseIntentSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: {
        documentPatch: {},
        scopedPatches: [
          {
            scope: {
              scopeType: 'selection',
              start: 12,
              end: 16,
            },
            patch: {
              body: {
                color: '#c1121f',
                bold: true,
              },
            },
            summary: '将选中文本改为红色加粗',
          },
        ],
        summary: '已调整当前选中内容',
        providerUsed: 'NVIDIA',
        remainingCount: 8,
      },
    });

    render(
      <AppProvider>
        <Md2Word />
      </AppProvider>
    );

    const editorTextarea = (await screen.findByPlaceholderText(
      '在此输入 Markdown 内容...'
    )) as HTMLTextAreaElement;
    await waitForHtmlPreview();
    const selectionStart = editorTextarea.value.indexOf('人工智能');
    const selectionEnd = selectionStart + '人工智能'.length;
    editorTextarea.focus();
    editorTextarea.setSelectionRange(selectionStart, selectionEnd);
    fireEvent.select(editorTextarea);

    const aiTextarea = screen.getByPlaceholderText(AI_PLACEHOLDER);
    fireEvent.change(aiTextarea, {
      target: { value: '把选中的这几个字改成红色加粗' },
    });

    fireEvent.click(screen.getByRole('button', { name: '应用 AI 格式' }));

    await waitFor(() => {
      expect(parseIntentSpy).toHaveBeenCalledTimes(1);
    });

    const [payload] = parseIntentSpy.mock.calls[0];
    expect(payload.scope).toEqual({
      scopeType: 'selection',
      start: selectionStart,
      end: selectionEnd,
    });
    expect(payload.currentSelection).toEqual({
      start: selectionStart,
      end: selectionEnd,
      text: '人工智能',
    });

    await screen.findByText('已调整当前选中内容');
    const previewHtml = document.querySelector('.markdown-preview')?.innerHTML ?? '';
    expect(previewHtml).toContain('data-selection-id=');
    expect(previewHtml).toContain('color: #c1121f;');
    expect(previewHtml).toContain('font-weight: bold;');
  });

  it('仅依赖源码区鼠标抬起事件时也应识别为 selection 作用域', async () => {
    parseIntentSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: {
        documentPatch: {},
        scopedPatches: [
          {
            scope: {
              scopeType: 'selection',
              start: 12,
              end: 16,
            },
            patch: {
              body: {
                color: '#FF0000',
                bold: true,
              },
            },
            summary: '将选中文本改为红色加粗',
          },
        ],
        summary: '已调整当前选中内容',
        providerUsed: 'NVIDIA',
        remainingCount: 6,
      },
    });

    render(
      <AppProvider>
        <Md2Word />
      </AppProvider>
    );

    const editorTextarea = (await screen.findByPlaceholderText(
      '在此输入 Markdown 内容...'
    )) as HTMLTextAreaElement;
    await waitForHtmlPreview();
    const selectionStart = editorTextarea.value.indexOf('人工智能');
    const selectionEnd = selectionStart + '人工智能'.length;

    editorTextarea.focus();
    editorTextarea.setSelectionRange(selectionStart, selectionEnd);
    fireEvent.mouseUp(editorTextarea);

    const aiTextarea = screen.getByPlaceholderText(AI_PLACEHOLDER);
    fireEvent.change(aiTextarea, {
      target: { value: '把当前选中的这几个字改成红色加粗' },
    });

    fireEvent.click(screen.getByRole('button', { name: '应用 AI 格式' }));

    await waitFor(() => {
      expect(parseIntentSpy).toHaveBeenCalledTimes(1);
    });

    const [payload] = parseIntentSpy.mock.calls[0];
    expect(payload.scope).toEqual({
      scopeType: 'selection',
      start: selectionStart,
      end: selectionEnd,
    });
    expect(payload.currentSelection).toEqual({
      start: selectionStart,
      end: selectionEnd,
      text: '人工智能',
    });
  });

  it('标题选区应用后不应连带修改预览目录项', async () => {
    parseIntentSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: {
        documentPatch: {},
        scopedPatches: [
          {
            scope: {
              scopeType: 'selection',
              start: 15,
              end: 17,
            },
            patch: {
              body: {
                color: '#c1121f',
                bold: true,
              },
            },
            summary: '将标题改为红色加粗',
          },
        ],
        summary: '已调整当前标题',
        providerUsed: 'NVIDIA',
        remainingCount: 7,
      },
    });

    render(
      <AppProvider>
        <Md2Word />
      </AppProvider>
    );

    const editorTextarea = (await screen.findByPlaceholderText(
      '在此输入 Markdown 内容...'
    )) as HTMLTextAreaElement;
    await waitForHtmlPreview();
    const selectionStart = editorTextarea.value.indexOf('引言');
    const selectionEnd = selectionStart + '引言'.length;
    editorTextarea.focus();
    editorTextarea.setSelectionRange(selectionStart, selectionEnd);
    fireEvent.select(editorTextarea);

    const aiTextarea = screen.getByPlaceholderText(AI_PLACEHOLDER);
    fireEvent.change(aiTextarea, {
      target: { value: '把当前选中的这几个字改成红色加粗' },
    });

    fireEvent.click(screen.getByRole('button', { name: '应用 AI 格式' }));

    await screen.findByText('已调整当前标题');

    expect(document.querySelector('.markdown-preview h2 [data-selection-id]')?.textContent).toBe('引言');
    expect(document.querySelector('.markdown-preview .toc-item [data-selection-id]')).toBeNull();
  });

  it('点击推荐指令后应填充输入框并原样提交', async () => {
    parseIntentSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: {
        documentPatch: {
          document: {
            includeTableOfContents: true,
            pageNumbers: true,
            mirrorMargins: true,
          },
        },
        scopedPatches: [],
        summary: '已开启目录、页码和镜像页边距',
        providerUsed: 'NVIDIA',
        remainingCount: 7,
      },
    });

    render(
      <AppProvider>
        <Md2Word />
      </AppProvider>
    );

    const presetButton = await screen.findByRole('button', {
      name: '整篇文档开启目录和页码，页边距保持镜像',
    });
    await waitForHtmlPreview();
    fireEvent.click(presetButton);

    const aiTextarea = screen.getByPlaceholderText(AI_PLACEHOLDER) as HTMLTextAreaElement;
    expect(aiTextarea.value).toBe('整篇文档开启目录和页码，页边距保持镜像');

    fireEvent.click(screen.getByRole('button', { name: '应用 AI 格式' }));

    await waitFor(() => {
      expect(parseIntentSpy).toHaveBeenCalledTimes(1);
    });

    const [payload] = parseIntentSpy.mock.calls[0];
    expect(payload.instruction).toBe('整篇文档开启目录和页码，页边距保持镜像');
  });

  it('应将 AI 返回的 document 作用域 scopedPatch 归一化为整篇文档样式并即时预览', async () => {
    parseIntentSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: {
        documentPatch: {},
        scopedPatches: [
          {
            scope: {
              scopeType: 'document',
            },
            patch: {
              h1: {
                fontFamily: 'SimHei',
                fontSizePt: 16,
                align: 'center',
              },
              body: {
                fontFamily: 'FangSong',
                fontSizePt: 12,
                lineSpacing: 1.5,
              },
            },
            summary: '已完成格式调整建议',
          },
        ],
        summary: '已完成格式调整建议',
        providerUsed: 'nvidia',
        remainingCount: 7,
      },
    });

    const { container } = render(
      <AppProvider>
        <Md2Word />
      </AppProvider>
    );

    const aiTextarea = await screen.findByPlaceholderText(AI_PLACEHOLDER);
    await waitForHtmlPreview();
    fireEvent.change(aiTextarea, {
      target: { value: '把一级标题改成黑体三号居中，正文改成仿宋小四，1.5 倍行距' },
    });
    fireEvent.click(screen.getByRole('button', { name: '应用 AI 格式' }));

    await screen.findByText('已完成格式调整建议');

    const previewHtml = container.querySelector('.markdown-preview')?.innerHTML ?? '';
    expect(previewHtml).toContain('font-family: FangSong');
    expect(previewHtml).toContain('text-align: center');
    openExportTab();
    expect(screen.getByText(/本次导出将包含 1 个 AI 作用范围、6 条样式变化/)).toBeInTheDocument();
  });

  it('应支持撤销单个已应用的 AI 修改项', async () => {
    parseIntentSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: {
        documentPatch: {
          body: {
            fontFamily: 'FangSong',
          },
        },
        scopedPatches: [
          {
            scope: {
              scopeType: 'block',
              blockId: 'heading1-0-sample',
            },
            patch: {
              h1: {
                align: 'center',
              },
            },
            summary: '将一级标题居中',
          },
        ],
        summary: '已应用两项修改',
        providerUsed: 'NVIDIA',
        remainingCount: 7,
      },
    });

    render(
      <AppProvider>
        <Md2Word />
      </AppProvider>
    );

    const aiTextarea = await screen.findByPlaceholderText(AI_PLACEHOLDER);
    await waitForHtmlPreview();
    fireEvent.change(aiTextarea, {
      target: { value: '把一级标题居中并调整正文' },
    });
    fireEvent.click(screen.getByRole('button', { name: '应用 AI 格式' }));

    await screen.findByText('已应用两项修改');
    openExportTab();
    fireEvent.click(screen.getByRole('button', { name: /查看具体修改项/ }));
    expect(screen.getByText('整篇文档级设置')).toBeInTheDocument();
    expect(screen.getByText('将一级标题居中')).toBeInTheDocument();

    const revertButtons = screen.getAllByRole('button', { name: '撤销此项' });
    fireEvent.click(revertButtons[1]);

    await waitFor(() => {
      expect(screen.queryByText('将一级标题居中')).toBeNull();
    });
    expect(screen.getByText('整篇文档级设置')).toBeInTheDocument();
  });

  it('应支持撤销整篇文档级 AI 设置', async () => {
    parseIntentSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: {
        documentPatch: {
          document: {
            includeTableOfContents: true,
            pageNumbers: true,
          },
        },
        scopedPatches: [],
        summary: '已开启目录和页码',
        providerUsed: 'NVIDIA',
        remainingCount: 7,
      },
    });

    render(
      <AppProvider>
        <Md2Word />
      </AppProvider>
    );

    const aiTextarea = await screen.findByPlaceholderText(AI_PLACEHOLDER);
    await waitForHtmlPreview();
    fireEvent.change(aiTextarea, {
      target: { value: '整篇文档开启目录和页码' },
    });
    fireEvent.click(screen.getByRole('button', { name: '应用 AI 格式' }));

    await screen.findByText('已开启目录和页码');
    openExportTab();
    fireEvent.click(screen.getByRole('button', { name: /查看具体修改项/ }));
    expect(screen.getByText('整篇文档级设置')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '撤销此项' }));

    await waitFor(() => {
      expect(screen.queryByText('整篇文档级设置')).toBeNull();
    });
  });

  it('SuperDoc 导出区在公式和脚注场景下应提示 HTML 回退导出', async () => {
    const { container } = render(
      <AppProvider>
        <SidebarRight
          onExport={() => undefined}
          showToast={() => undefined}
          previewEngine="superdoc"
          superDocStructureSummary={{
            hasDetectedStructures: true,
            highestSupportRisk: 'prefer-html-fallback',
            recommendation: 'prefer-html-fallback',
            items: [
              {
                feature: 'formula',
                detected: true,
                count: 1,
                supportLevel: 'review-recommended',
                recommendation: 'prefer-html-fallback',
              },
              {
                feature: 'footnote',
                detected: true,
                count: 1,
                supportLevel: 'review-recommended',
                recommendation: 'prefer-html-fallback',
              },
            ],
          } as any}
          onSwitchToHtmlFallback={() => undefined}
          documentPresentation={{
            pageSettings: {
              pageSize: 'a4',
              showPageNumbers: true,
              mirrorMargins: false,
            },
          } as any}
          onDocumentPresentationChange={() => undefined}
        />
      </AppProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '导出' }));

    const guidanceCard = container.querySelector('[data-superdoc-export-guidance="true"]');
    expect(guidanceCard).not.toBeNull();
    expect(guidanceCard?.getAttribute('data-export-strategy')).toBe('html-fallback');
    expect(container.querySelector('[data-superdoc-export-guidance-detail="true"]')).not.toBeNull();
    expect(
      container.querySelector('[data-superdoc-export-guidance="true"][data-export-strategy="html-fallback"] button')
    ).not.toBeNull();
  });

  it('SuperDoc 导出区在表格场景下应保留 SuperDoc 导出优先级', async () => {
    const { container } = render(
      <AppProvider>
        <SidebarRight
          onExport={() => undefined}
          showToast={() => undefined}
          previewEngine="superdoc"
          superDocStructureSummary={{
            hasDetectedStructures: true,
            highestSupportRisk: 'review-recommended',
            recommendation: 'review-in-superdoc',
            items: [
              {
                feature: 'table',
                detected: true,
                count: 1,
                supportLevel: 'basic-import',
                recommendation: 'review-in-superdoc',
              },
            ],
          } as any}
          onSwitchToHtmlFallback={() => undefined}
          documentPresentation={{
            pageSettings: {
              pageSize: 'a4',
              showPageNumbers: true,
              mirrorMargins: false,
            },
          } as any}
          onDocumentPresentationChange={() => undefined}
        />
      </AppProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '导出' }));

    const guidanceCard = container.querySelector('[data-superdoc-export-guidance="true"]');
    expect(guidanceCard).not.toBeNull();
    expect(guidanceCard?.getAttribute('data-export-strategy')).toBe('superdoc');
    expect(container.querySelector('[data-superdoc-export-guidance-detail="true"]')).not.toBeNull();
  });

  it('SuperDoc AI 标签不应再展示复杂结构提示卡', async () => {
    const { container } = render(
      <AppProvider>
        <SidebarRight
          onExport={() => undefined}
          showToast={() => undefined}
          previewEngine="superdoc"
          superDocStructureSummary={{
            hasDetectedStructures: true,
            highestSupportRisk: 'review-recommended',
            recommendation: 'prefer-html-fallback',
            items: [
              {
                feature: 'table',
                detected: true,
                count: 1,
                supportLevel: 'basic-import',
              },
              {
                feature: 'formula',
                detected: true,
                count: 1,
                supportLevel: 'review-recommended',
              },
            ],
          } as any}
          onSwitchToHtmlFallback={() => undefined}
          documentPresentation={{
            pageSettings: {
              pageSize: 'a4',
              showPageNumbers: true,
              mirrorMargins: false,
            },
          } as any}
          onDocumentPresentationChange={() => undefined}
          onApplyAiFormatting={vi.fn(async () => undefined)}
          onUndoAi={() => undefined}
          onClearAi={() => undefined}
        />
      </AppProvider>
    );

    const warningCard = container.querySelector('[data-superdoc-structure-warning="true"]');
    expect(warningCard).toBeNull();
    expect(container.querySelector('[data-superdoc-structure-warning-detail="true"]')).toBeNull();
    expect(container.querySelector('[data-superdoc-structure-guidance-items="true"]')).toBeNull();
  });

});
