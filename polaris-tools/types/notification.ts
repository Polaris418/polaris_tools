/**
 * 通知相关类型
 */

export interface NotificationResponse {
  id: number;
  userId: number;
  isGlobal: number;
  globalNotificationId?: number;
  type: string;
  title: string;
  content?: string;
  linkUrl?: string;
  isRead: number;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  deleted: number;
}

export interface NotificationQueryRequest {
  page?: number;
  size?: number;
  type?: string;
  isRead?: number;
  includeDeleted?: boolean;
}

export interface NotificationCreateRequest {
  userId?: number;
  isGlobal: boolean;
  type: string;
  title: string;
  content?: string;
  linkUrl?: string;
}

export interface NotificationUpdateRequest {
  type: string;
  title: string;
  content?: string;
  linkUrl?: string;
  updateAll?: boolean;
}
