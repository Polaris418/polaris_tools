/** 工具与使用记录相关类型 */

export interface Tool {
  id: string;
  numericId?: number;
  title: string;
  title_zh?: string;
  description: string;
  description_zh?: string;
  icon: string;
  category?: string;
  category_zh?: string;
  lastUsed?: string;
  lastUsed_zh?: string;
  path?: string;
  colorClass?: string;
  bgHoverClass?: string;
  accentColor?: string;
}

export interface ToolCreateRequest {
  categoryId: number;
  name: string;
  nameZh?: string;
  description?: string;
  descriptionZh?: string;
  icon: string;
  url?: string;
  colorClass?: string;
  bgHoverClass?: string;
  toolType?: number;
  isFeatured?: number;
  sortOrder?: number;
}

export interface ToolUpdateRequest {
  categoryId?: number;
  name?: string;
  nameZh?: string;
  description?: string;
  descriptionZh?: string;
  icon?: string;
  url?: string;
  colorClass?: string;
  bgHoverClass?: string;
  toolType?: number;
  isFeatured?: number;
  sortOrder?: number;
  status?: number;
}

export interface ToolQueryRequest {
  keyword?: string;
  categoryId?: number;
  toolType?: number;
  isFeatured?: number;
  sortBy?: 'sortOrder' | 'viewCount' | 'useCount' | 'createdAt' | 'rating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface ToolResponse {
  id: number;
  categoryId: number;
  categoryName?: string;
  categoryNameZh?: string;
  name: string;
  nameZh?: string;
  description?: string;
  descriptionZh?: string;
  icon: string;
  url?: string;
  colorClass?: string;
  bgHoverClass?: string;
  toolType: number;
  isFeatured: number;
  viewCount: number;
  useCount: number;
  ratingScore: number;
  ratingCount: number;
  reviewCount: number;
  isFavorited?: boolean;
  sortOrder: number;
  status: number;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface ToolUsageResponse {
  id: number;
  toolId: number;
  toolName: string;
  toolNameZh?: string;
  toolIcon: string;
  usedAt: string;
  duration?: number;
}
