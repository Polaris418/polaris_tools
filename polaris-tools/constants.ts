import type { CategoryCount } from './types';

export const CATEGORIES: CategoryCount[] = [
  { name: 'PDF Tools', name_zh: 'PDF 工具', count: 4, icon: 'picture_as_pdf', accentColorClass: 'bg-rose-500' },
  { name: 'Text Tools', name_zh: '文本工具', count: 8, icon: 'title', accentColorClass: 'bg-indigo-500' },
  { name: 'Image Tools', name_zh: '图片工具', count: 3, icon: 'image', accentColorClass: 'bg-purple-500' },
  { name: 'Dev Tools', name_zh: '开发工具', count: 12, icon: 'terminal', accentColorClass: 'bg-emerald-500' },
];

export { TOOL_REGISTRY, getToolRegistryItem } from './toolRegistry';
export type { ToolRegistryItem } from './toolRegistry';
