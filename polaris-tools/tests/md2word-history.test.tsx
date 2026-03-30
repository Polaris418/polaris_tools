import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiClient } from '../api/client';
import { SidebarLeft } from '../tools/md2word/SidebarLeft';
import {
  formatMd2WordHistoryTime,
  isSubscribedHistoryUser,
  type Md2WordHistoryEntry,
} from '../tools/md2word/history';

vi.mock('../api/client', () => ({
  apiClient: {
    documents: {
      getMd2WordHistory: vi.fn(),
      saveMd2WordHistory: vi.fn(),
      renameMd2WordHistory: vi.fn(),
      deleteMd2WordHistory: vi.fn(),
    },
  },
}));

const appContextState = vi.hoisted(() => ({
  language: 'zh' as 'zh' | 'en',
  isAuthenticated: false,
  user: null as { planType?: number } | null,
  promptLogin: vi.fn(),
}));

vi.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    t: (key: string) => key,
    language: appContextState.language,
    isAuthenticated: appContextState.isAuthenticated,
    user: appContextState.user,
    promptLogin: appContextState.promptLogin,
  }),
}));

const mockDocumentsApi = apiClient.documents as {
  getMd2WordHistory: ReturnType<typeof vi.fn>;
  saveMd2WordHistory: ReturnType<typeof vi.fn>;
  renameMd2WordHistory: ReturnType<typeof vi.fn>;
  deleteMd2WordHistory: ReturnType<typeof vi.fn>;
};

const makeHistoryItem = (overrides: Partial<Md2WordHistoryEntry> & Pick<Md2WordHistoryEntry, 'id' | 'clientFileId' | 'documentName'>): Md2WordHistoryEntry => ({
  content: '# 标题\n\n正文',
  previewText: '标题 正文',
  wordCount: 12,
  charCount: 48,
  updatedAt: '2026-03-30T10:00:00.000Z',
  ...overrides,
});

const renderSidebar = (props?: Partial<React.ComponentProps<typeof SidebarLeft>>) =>
  render(
    <SidebarLeft
      files={props?.files ?? []}
      historyItems={props?.historyItems ?? []}
      activeFileId={props?.activeFileId ?? ''}
      onFileSelect={props?.onFileSelect ?? vi.fn()}
      onHistorySelect={props?.onHistorySelect ?? vi.fn()}
      onHistoryRename={props?.onHistoryRename}
      onHistoryDelete={props?.onHistoryDelete}
      onHistorySearchChange={props?.onHistorySearchChange}
      onNewFile={props?.onNewFile ?? vi.fn()}
      onFileUpload={props?.onFileUpload}
      selectedTemplate={props?.selectedTemplate}
      onTemplateSelect={props?.onTemplateSelect}
    />
  );

describe('md2word 历史记录', () => {
  beforeEach(() => {
    appContextState.language = 'zh';
    appContextState.isAuthenticated = false;
    appContextState.user = null;
    appContextState.promptLogin.mockReset();
    mockDocumentsApi.getMd2WordHistory.mockReset();
    mockDocumentsApi.saveMd2WordHistory.mockReset();
    mockDocumentsApi.renameMd2WordHistory.mockReset();
    mockDocumentsApi.deleteMd2WordHistory.mockReset();
    vi.useRealTimers();
  });

  it('游客态应展示登录限制并触发 promptLogin', () => {
    renderSidebar();

    expect(screen.getByText('历史记录仅对登录用户开放')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '登录后使用' }));
    expect(appContextState.promptLogin).toHaveBeenCalledTimes(1);
    expect(appContextState.promptLogin).toHaveBeenCalledWith('登录后即可使用 Markdown 转 Word 的历史记录功能');
  });

  it('应展示搜索框，并在变更时触发搜索回调', () => {
    appContextState.isAuthenticated = true;
    appContextState.user = { planType: 1 };
    const onHistorySearchChange = vi.fn();

    renderSidebar({
      historyItems: [
        makeHistoryItem({
          id: 1,
          clientFileId: 'server-1',
          documentName: '服务端文档.md',
          content: '# 标题一',
          previewText: '标题一',
        }),
        makeHistoryItem({
          id: 2,
          clientFileId: 'server-2',
          documentName: '另一个文档.md',
          content: '# 标题二',
          previewText: '标题二',
        }),
      ],
      onHistorySearchChange,
    });

    const searchBox = screen.getByPlaceholderText('搜索最近历史');
    expect(searchBox).toBeInTheDocument();

    fireEvent.change(searchBox, { target: { value: '标题一' } });
    expect(onHistorySearchChange).toHaveBeenCalledWith('标题一');
    expect(screen.getByText('服务端文档.md')).toBeInTheDocument();
    expect(screen.queryByText('另一个文档.md')).not.toBeInTheDocument();
  });

  it('应支持重命名提交回调', () => {
    appContextState.isAuthenticated = true;
    appContextState.user = { planType: 1 };
    const onHistoryRename = vi.fn();

    renderSidebar({
      historyItems: [
        makeHistoryItem({
          id: 11,
          clientFileId: 'server-11',
          documentName: '服务端文档.md',
          content: '# 标题一',
          previewText: '标题一',
        }),
      ],
      onHistoryRename,
    });

    fireEvent.click(screen.getByLabelText('重命名历史记录'));
    fireEvent.change(screen.getAllByRole('textbox')[1], {
      target: { value: '重命名后的文档.md' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(onHistoryRename).toHaveBeenCalledWith('server-11', '重命名后的文档.md');
  });

  it('应支持删除回调', () => {
    appContextState.isAuthenticated = true;
    appContextState.user = { planType: 1 };
    const onHistoryDelete = vi.fn();

    renderSidebar({
      historyItems: [
        makeHistoryItem({
          id: 11,
          clientFileId: 'server-11',
          documentName: '服务端文档.md',
          content: '# 标题一',
          previewText: '标题一',
        }),
      ],
      onHistoryDelete,
    });

    fireEvent.click(screen.getByLabelText('删除历史记录'));
    expect(onHistoryDelete).toHaveBeenCalledWith('server-11');
  });

  it('登录后应通过服务端接口拉取历史记录，并保留保存/删除/重命名契约', async () => {
    appContextState.isAuthenticated = true;
    appContextState.user = { planType: 1 };
    mockDocumentsApi.getMd2WordHistory.mockResolvedValue({
      code: 0,
      message: 'ok',
      data: [
        makeHistoryItem({
          id: 11,
          clientFileId: 'server-1',
          documentName: '服务端文档.md',
          content: '# 标题一',
          previewText: '标题一',
        }),
      ],
      timestamp: Date.now(),
    });

    const payload = {
      clientFileId: 'client-file-1',
      documentName: '当前文档.md',
      content: '# 标题\n\n正文',
    };
    mockDocumentsApi.saveMd2WordHistory.mockResolvedValue({
      code: 0,
      message: 'ok',
      data: {
        id: 99,
        ...payload,
        updatedAt: '2026-03-30T10:10:00.000Z',
      },
      timestamp: Date.now(),
    });
    mockDocumentsApi.renameMd2WordHistory.mockResolvedValue({
      code: 0,
      message: 'ok',
      data: null,
      timestamp: Date.now(),
    });
    mockDocumentsApi.deleteMd2WordHistory.mockResolvedValue({
      code: 0,
      message: 'ok',
      data: null,
      timestamp: Date.now(),
    });

    const ServerHistoryHarness: React.FC<{ search?: string }> = ({ search }) => {
      const [items, setItems] = React.useState<Md2WordHistoryEntry[]>([]);

      React.useEffect(() => {
        void apiClient.documents.getMd2WordHistory(search).then((result) => {
          setItems(result.data ?? []);
        });
      }, [search]);

      return <div data-testid="server-history-count">{items.length}</div>;
    };

    const { rerender } = render(<ServerHistoryHarness />);

    await waitFor(() => {
      expect(mockDocumentsApi.getMd2WordHistory).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId('server-history-count')).toHaveTextContent('1');

    rerender(<ServerHistoryHarness search="标题" />);
    await waitFor(() => {
      expect(mockDocumentsApi.getMd2WordHistory).toHaveBeenCalledWith('标题');
    });

    await mockDocumentsApi.saveMd2WordHistory(payload);
    await mockDocumentsApi.renameMd2WordHistory(99, '重命名后的文档.md');
    await mockDocumentsApi.deleteMd2WordHistory(99);

    expect(mockDocumentsApi.saveMd2WordHistory).toHaveBeenCalledWith(payload);
    expect(mockDocumentsApi.renameMd2WordHistory).toHaveBeenCalledWith(99, '重命名后的文档.md');
    expect(mockDocumentsApi.deleteMd2WordHistory).toHaveBeenCalledWith(99);
  });

  it('应格式化历史时间', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T12:00:00+08:00'));

    expect(formatMd2WordHistoryTime(new Date(Date.now() - 10_000).toISOString(), 'zh')).toBe('刚刚');
    expect(formatMd2WordHistoryTime(new Date(Date.now() - 5 * 60_000).toISOString(), 'zh')).toBe('5 分钟前');
    expect(formatMd2WordHistoryTime(new Date(Date.now() - 2 * 60 * 60_000).toISOString(), 'en')).toBe('2h ago');
  });

  it('应正确区分订阅用户与普通用户', () => {
    expect(isSubscribedHistoryUser(0)).toBe(false);
    expect(isSubscribedHistoryUser(1)).toBe(true);
    expect(isSubscribedHistoryUser(undefined)).toBe(false);
  });
});
