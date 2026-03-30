export const mockCategory = {
  id: 1,
  name: '文本工具',
  description: '文本处理相关工具',
  icon: 'description',
  sortOrder: 1,
};

export const mockTool = {
  id: 101,
  name: 'Markdown 转 Word',
  description: '将 Markdown 文本导出为 Word 文档',
  icon: 'article',
  route: '/tool/md2word',
  categoryId: 1,
  usageCount: 120,
  favoriteCount: 35,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

export const mockToolList = [mockTool];
