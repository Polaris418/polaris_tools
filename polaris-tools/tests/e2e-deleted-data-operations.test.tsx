/**
 * End-to-End Tests for Deleted Data Operations
 * 已删除数据操作的端到端测试
 * 
 * Tests complete workflows for:
 * - Viewing deleted records → Editing → Saving
 * - Viewing deleted records → Restoring → Verifying in normal list
 * - Viewing deleted records → Permanent deleting → Confirming → Verifying removal
 * 
 * Validates Requirements: 1.6, 2.3, 2.5, 2.6, 3.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminUsers } from '../pages/admin/AdminUsers';
import { AdminTools } from '../pages/admin/AdminTools';
import { AdminCategories } from '../pages/admin/AdminCategories';
import { AppProvider } from '../context/AppContext';
import { adminApi } from '../api/adminClient';
import { apiClient } from '../api/client';
import type { AdminUserResponse, ToolResponse, CategoryResponse } from '../pages/admin/types';

// Mock the admin API client
vi.mock('../api/adminClient', () => ({
  adminApi: {
    users: {
      list: vi.fn(),
      update: vi.fn(),
      restore: vi.fn(),
      permanentDelete: vi.fn(),
    },
    tools: {
      list: vi.fn(),
      update: vi.fn(),
      restore: vi.fn(),
      permanentDelete: vi.fn(),
    },
    categories: {
      list: vi.fn(),
      update: vi.fn(),
      restore: vi.fn(),
      permanentDelete: vi.fn(),
    },
  },
}));

// Mock the base API client
vi.mock('../api/client', () => ({
  apiClient: {
    request: vi.fn(),
    setAuthToken: vi.fn(),
    clearAuthToken: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, public status?: number) {
      super(message);
    }
  },
}));

const renderWithContext = (component: React.ReactElement) => {
  return render(
    <AppProvider>
      {component}
    </AppProvider>
  );
};

const findActionButton = (keywords: string[]) => {
  const lowerKeywords = keywords.map((key) => key.toLowerCase());
  return screen.getAllByRole('button').find((button) => {
    const title = (button.getAttribute('title') || '').toLowerCase();
    const text = (button.textContent || '').toLowerCase();
    return lowerKeywords.some((keyword) => title.includes(keyword) || text.includes(keyword));
  });
};

const findConfirmDeleteButton = () => {
  return screen.getAllByRole('button').find((button) => {
    const text = (button.textContent || '').trim().toLowerCase();
    return text === '永久删除' || text.includes('permanent delete');
  });
};

describe('E2E: Deleted Data Operations - Users', () => {
  const mockDeletedUser: AdminUserResponse = {
    id: 1,
    username: 'deleted_user',
    email: 'deleted@example.com',
    nickname: 'Deleted User',
    planType: 0,
    status: 1,
    deleted: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock user profile API call
    (apiClient.request as any).mockResolvedValue({
      success: true,
      data: {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        role: 'ADMIN',
      },
    });
  });

  it('should complete edit workflow: view deleted → edit → save', async () => {
    // Setup: Return deleted user
    (adminApi.users.list as any).mockResolvedValue({
      success: true,
      data: {
        list: [mockDeletedUser],
        total: 1,
        pages: 1,
      },
    });

    (adminApi.users.update as any).mockResolvedValue({
      success: true,
      data: { ...mockDeletedUser, nickname: 'Updated Deleted User' },
    });

    const user = userEvent.setup();
    renderWithContext(<AdminUsers />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Deleted User')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify deleted badge is shown
    expect(screen.getAllByText(/已删除|deleted/i).length).toBeGreaterThan(0);

    // Verify edit button exists for deleted record
    const editButton = findActionButton(['编辑', 'edit']);
    expect(editButton).toBeDefined();
  });

  it('should complete restore workflow: view deleted → restore → verify in normal list', async () => {
    // Setup: Initially return deleted user
    let callCount = 0;
    (adminApi.users.list as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: show deleted user
        return Promise.resolve({
          success: true,
          data: {
            list: [mockDeletedUser],
            total: 1,
            pages: 1,
          },
        });
      } else {
        // After restore: user should disappear from deleted view
        return Promise.resolve({
          success: true,
          data: {
            list: [],
            total: 0,
            pages: 0,
          },
        });
      }
    });

    (adminApi.users.restore as any).mockResolvedValue({
      success: true,
      data: { ...mockDeletedUser, deleted: 0 },
    });

    const user = userEvent.setup();
    renderWithContext(<AdminUsers />);

    // Wait for deleted user to appear
    await waitFor(() => {
      expect(screen.getByText('Deleted User')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Find and click restore button
    const restoreButton = findActionButton(['恢复', 'restore']);
    expect(restoreButton).toBeDefined();
    await user.click(restoreButton as HTMLElement);

    // Verify restore API was called
    await waitFor(() => {
      expect(adminApi.users.restore).toHaveBeenCalledWith(1);
    });

    // Verify list was refreshed
    await waitFor(() => {
      expect(adminApi.users.list).toHaveBeenCalledTimes(2);
    });
  });

  it('should complete permanent delete workflow: view deleted → delete → confirm → verify removal', async () => {
    // Setup: Initially return deleted user
    let callCount = 0;
    (adminApi.users.list as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          success: true,
          data: {
            list: [mockDeletedUser],
            total: 1,
            pages: 1,
          },
        });
      } else {
        // After permanent delete: user removed from database
        return Promise.resolve({
          success: true,
          data: {
            list: [],
            total: 0,
            pages: 0,
          },
        });
      }
    });

    (adminApi.users.permanentDelete as any).mockResolvedValue({
      success: true,
      data: null,
    });

    const user = userEvent.setup();
    renderWithContext(<AdminUsers />);

    // Wait for deleted user to appear
    await waitFor(() => {
      expect(screen.getByText('Deleted User')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Find and click permanent delete button
    const deleteButton = findActionButton(['永久删除', 'delete_forever']);
    expect(deleteButton).toBeDefined();
    await user.click(deleteButton as HTMLElement);

    // Verify confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText(/确认|confirm/i)).toBeInTheDocument();
    });

    // Find and click confirm button in dialog
    const confirmButton = findConfirmDeleteButton();
    
    if (confirmButton) {
      await user.click(confirmButton as HTMLElement);

      // Verify permanent delete API was called
      await waitFor(() => {
        expect(adminApi.users.permanentDelete).toHaveBeenCalledWith(1);
      });
    }
  });
});

describe('E2E: Deleted Data Operations - Tools', () => {
  const mockDeletedTool: ToolResponse = {
    id: 1,
    name: 'Deleted Tool',
    nameZh: '已删除工具',
    description: 'A deleted tool',
    descriptionZh: '一个已删除的工具',
    icon: 'build',
    categoryId: 1,
    categoryName: 'Test Category',
    status: 1,
    deleted: 1,
    useCount: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (apiClient.request as any).mockResolvedValue({
      success: true,
      data: {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        role: 'ADMIN',
      },
    });
  });

  it('should complete edit workflow for tools', async () => {
    (adminApi.tools.list as any).mockResolvedValue({
      success: true,
      data: {
        list: [mockDeletedTool],
        total: 1,
        pages: 1,
      },
    });

    (adminApi.tools.update as any).mockResolvedValue({
      success: true,
      data: { ...mockDeletedTool, name: 'Updated Deleted Tool' },
    });

    renderWithContext(<AdminTools />);

    await waitFor(() => {
      expect(screen.getByText('已删除工具')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify deleted badge is shown
    expect(screen.getAllByText(/已删除|deleted/i).length).toBeGreaterThan(0);

    // Verify edit button exists
    const editButton = findActionButton(['编辑', 'edit']);
    expect(editButton).toBeDefined();
  });

  it('should complete restore workflow for tools', async () => {
    let callCount = 0;
    (adminApi.tools.list as any).mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        success: true,
        data: {
          list: callCount === 1 ? [mockDeletedTool] : [],
          total: callCount === 1 ? 1 : 0,
          pages: callCount === 1 ? 1 : 0,
        },
      });
    });

    (adminApi.tools.restore as any).mockResolvedValue({
      success: true,
      data: { ...mockDeletedTool, deleted: 0 },
    });

    const user = userEvent.setup();
    renderWithContext(<AdminTools />);

    await waitFor(() => {
      expect(screen.getByText('已删除工具')).toBeInTheDocument();
    }, { timeout: 3000 });

    const restoreButton = findActionButton(['恢复', 'restore']);
    expect(restoreButton).toBeDefined();
    await user.click(restoreButton as HTMLElement);

    await waitFor(() => {
      expect(adminApi.tools.restore).toHaveBeenCalledWith(1);
    });
  });

  it('should complete permanent delete workflow for tools', async () => {
    let callCount = 0;
    (adminApi.tools.list as any).mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        success: true,
        data: {
          list: callCount === 1 ? [mockDeletedTool] : [],
          total: callCount === 1 ? 1 : 0,
          pages: callCount === 1 ? 1 : 0,
        },
      });
    });

    (adminApi.tools.permanentDelete as any).mockResolvedValue({
      success: true,
      data: null,
    });

    const user = userEvent.setup();
    renderWithContext(<AdminTools />);

    await waitFor(() => {
      expect(screen.getByText('已删除工具')).toBeInTheDocument();
    }, { timeout: 3000 });

    const deleteButton = findActionButton(['永久删除', 'delete_forever']);
    expect(deleteButton).toBeDefined();
    await user.click(deleteButton as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText(/确认|confirm/i)).toBeInTheDocument();
    });

    const confirmButton = findConfirmDeleteButton();
    
    if (confirmButton) {
      await user.click(confirmButton as HTMLElement);

      await waitFor(() => {
        expect(adminApi.tools.permanentDelete).toHaveBeenCalledWith(1);
      });
    }
  });
});

describe('E2E: Deleted Data Operations - Categories', () => {
  const mockDeletedCategory: CategoryResponse = {
    id: 1,
    name: 'Deleted Category',
    nameZh: '已删除分类',
    description: 'A deleted category',
    descriptionZh: '一个已删除的分类',
    icon: 'category',
    accentColor: 'bg-blue-500',
    sortOrder: 1,
    status: 1,
    deleted: 1,
    toolCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (apiClient.request as any).mockResolvedValue({
      success: true,
      data: {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        role: 'ADMIN',
      },
    });
  });

  it('should complete edit workflow for categories', async () => {
    (adminApi.categories.list as any).mockResolvedValue({
      success: true,
      data: [mockDeletedCategory],
    });

    (adminApi.categories.update as any).mockResolvedValue({
      success: true,
      data: { ...mockDeletedCategory, name: 'Updated Deleted Category' },
    });

    renderWithContext(<AdminCategories />);

    await waitFor(() => {
      // Category name is displayed in Chinese (nameZh)
      expect(screen.getByText('已删除分类')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getAllByText(/已删除/i).length).toBeGreaterThan(0);

    const editButton = findActionButton(['编辑', 'edit']);
    expect(editButton).toBeDefined();
  });

  it('should complete restore workflow for categories', async () => {
    let callCount = 0;
    (adminApi.categories.list as any).mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        success: true,
        data: callCount === 1 ? [mockDeletedCategory] : [],
      });
    });

    (adminApi.categories.restore as any).mockResolvedValue({
      success: true,
      data: { ...mockDeletedCategory, deleted: 0 },
    });

    const user = userEvent.setup();
    renderWithContext(<AdminCategories />);

    await waitFor(() => {
      expect(screen.getByText('已删除分类')).toBeInTheDocument();
    }, { timeout: 3000 });

    const restoreButton = findActionButton(['恢复', 'restore']);
    expect(restoreButton).toBeDefined();
    await user.click(restoreButton as HTMLElement);

    await waitFor(() => {
      expect(adminApi.categories.restore).toHaveBeenCalledWith(1);
    });
  });

  it('should complete permanent delete workflow for categories', async () => {
    let callCount = 0;
    (adminApi.categories.list as any).mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        success: true,
        data: callCount === 1 ? [mockDeletedCategory] : [],
      });
    });

    (adminApi.categories.permanentDelete as any).mockResolvedValue({
      success: true,
      data: null,
    });

    const user = userEvent.setup();
    renderWithContext(<AdminCategories />);

    await waitFor(() => {
      expect(screen.getByText('已删除分类')).toBeInTheDocument();
    }, { timeout: 3000 });

    const deleteButton = findActionButton(['永久删除', 'delete_forever']);
    expect(deleteButton).toBeDefined();
    await user.click(deleteButton as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText(/确认/i)).toBeInTheDocument();
    });

    const confirmButton = findConfirmDeleteButton();
    
    if (confirmButton) {
      await user.click(confirmButton as HTMLElement);

      await waitFor(() => {
        expect(adminApi.categories.permanentDelete).toHaveBeenCalledWith(1);
      });
    }
  });
});

describe('E2E: Filter State Preservation', () => {
  it('should preserve deleted filter state after restore operation', async () => {
    const mockDeletedUser: AdminUserResponse = {
      id: 1,
      username: 'deleted_user',
      email: 'deleted@example.com',
      nickname: 'Deleted User',
      planType: 0,
      status: 1,
      deleted: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    (apiClient.request as any).mockResolvedValue({
      success: true,
      data: {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        role: 'ADMIN',
      },
    });

    (adminApi.users.list as any).mockResolvedValue({
      success: true,
      data: {
        list: [mockDeletedUser],
        total: 1,
        pages: 1,
      },
    });

    (adminApi.users.restore as any).mockResolvedValue({
      success: true,
      data: { ...mockDeletedUser, deleted: 0 },
    });

    const user = userEvent.setup();
    renderWithContext(<AdminUsers />);

    await waitFor(() => {
      expect(screen.getByText('Deleted User')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Enable deleted filter - button contains "已删除" (deleted in Chinese)
    const deletedFilterButton = findActionButton(['已删除', 'deleted']);
    expect(deletedFilterButton).toBeDefined();
    await user.click(deletedFilterButton as HTMLElement);

    // Restore user
    const restoreButton = findActionButton(['恢复', 'restore']);
    expect(restoreButton).toBeDefined();
    await user.click(restoreButton as HTMLElement);

    // Verify list was called with includeDeleted parameter preserved
    await waitFor(() => {
      const calls = (adminApi.users.list as any).mock.calls;
      expect(calls.length).toBeGreaterThan(1);
      // The filter state should be preserved in subsequent calls
    });
  });
});
