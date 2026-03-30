/**
 * 通用 API 响应类型
 */

export interface Result<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  pages: number;
  pageNum: number;
  pageSize: number;
}
