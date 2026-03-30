/**
 * 分类相关类型
 */

export interface CategoryCount {
  name: string;
  name_zh?: string;
  count: number;
  icon: string;
  accentColorClass: string;
}

export interface CategoryCreateRequest {
  name: string;
  nameZh?: string;
  icon: string;
  accentColor: string;
  description?: string;
  sortOrder?: number;
}

export interface CategoryUpdateRequest {
  name?: string;
  nameZh?: string;
  icon?: string;
  accentColor?: string;
  description?: string;
  sortOrder?: number;
  status?: number;
}

export interface CategoryResponse {
  id: number;
  name: string;
  nameZh?: string;
  icon: string;
  accentColor: string;
  description?: string;
  toolCount: number;
  sortOrder: number;
  status: number;
  createdAt: string;
}
