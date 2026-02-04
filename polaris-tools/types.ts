// ============================================================================
// Existing Frontend Types (for UI components)
// ============================================================================

export interface Tool {
  id: string;
  numericId?: number; // 数字ID，用于收藏等需要数字ID的功能
  title: string;
  title_zh?: string;
  description: string;
  description_zh?: string;
  icon: string;
  category?: string;
  category_zh?: string; // 分类中文名
  lastUsed?: string;
  lastUsed_zh?: string; // For "2 hours ago" vs "2小时前"
  path?: string; // 路由标识，用于插件化系统
  // Visual styling props for the icon container
  colorClass?: string;
  bgHoverClass?: string;
  accentColor?: string; // Hex for the dot indicator
}

export interface CategoryCount {
  name: string;
  name_zh?: string;
  count: number;
  icon: string;
  accentColorClass: string;
}

export interface User {
  name: string;
  plan: string;
  plan_zh?: string;
  avatarUrl: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface Result<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

/**
 * Paginated API response wrapper
 */
export interface PageResult<T> {
  list: T[];
  total: number;
  pages: number;
  pageNum: number;
  pageSize: number;
}

// ============================================================================
// User & Authentication Types
// ============================================================================

/**
 * User registration request
 */
export interface UserRegisterRequest {
  username: string;
  password: string;
  email: string;
  nickname?: string;
}

/**
 * User login request
 */
export interface UserLoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * User response from API
 */
export interface UserResponse {
  id: number;
  username: string;
  email: string;
  nickname?: string;
  avatar?: string;
  avatarConfig?: string; // JSON string of avatar configuration
  bio?: string; // Personal bio/description
  language?: string; // User language preference: zh-CN or en-US
  planType: number; // 0: Free, 1: Pro, 2: Enterprise, 999: Admin
  planExpiredAt?: string;
  status: number;
  lastLoginAt?: string;
  passwordUpdatedAt?: string; // Password last updated timestamp
  emailVerified?: boolean; // Email verification status
  emailVerifiedAt?: string; // Email verification timestamp
  createdAt: string;
}

/**
 * Login response with token
 */
export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: UserResponse;
}

/**
 * Update profile request
 */
export interface UpdateProfileRequest {
  nickname?: string;
  email?: string;
  bio?: string;
  language?: string; // User language preference: zh-CN or en-US
  avatarStyle?: string;
  avatarConfig?: string; // JSON string of avatar configuration
}

// ============================================================================
// Tool Types
// ============================================================================

/**
 * Tool creation request
 */
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
  toolType?: number; // 0: External link, 1: Internal tool
  isFeatured?: number; // 0: No, 1: Yes
  sortOrder?: number;
}

/**
 * Tool update request
 */
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

/**
 * Tool query request with filters and pagination
 */
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

/**
 * Tool response from API
 */
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
  /** 最后使用时间（用于最近使用列表） */
  lastUsedAt?: string;
}

// ============================================================================
// Category Types
// ============================================================================

/**
 * Category creation request
 */
export interface CategoryCreateRequest {
  name: string;
  nameZh?: string;
  icon: string;
  accentColor: string;
  description?: string;
  sortOrder?: number;
}

/**
 * Category update request
 */
export interface CategoryUpdateRequest {
  name?: string;
  nameZh?: string;
  icon?: string;
  accentColor?: string;
  description?: string;
  sortOrder?: number;
  status?: number;
}

/**
 * Category response from API
 */
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

// ============================================================================
// Usage Statistics Types
// ============================================================================

/**
 * Tool usage record response
 */
export interface ToolUsageResponse {
  id: number;
  toolId: number;
  toolName: string;
  toolNameZh?: string;
  toolIcon: string;
  usedAt: string;
  duration?: number;
}

// ============================================================================
// Notification Types
// ============================================================================

/**
 * 通知响应
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

/**
 * 通知查询请求
 */
export interface NotificationQueryRequest {
  page?: number;
  size?: number;
  type?: string;
  isRead?: number;
  includeDeleted?: boolean;
}

/**
 * 创建通知请求
 */
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

// ============================================================================
// Email Subscription Types
// ============================================================================

/**
 * 订阅偏好响应
 */
export interface SubscriptionPreferenceResponse {
  id: number;
  userId: number;
  emailType: string;
  subscribed: boolean;
  updatedAt: string;
  createdAt: string;
}

// ============================================================================
// Email Verification Code Types
// ============================================================================

/**
 * 验证码用途枚举
 */
export type VerificationPurpose = 'REGISTER' | 'LOGIN' | 'RESET' | 'VERIFY' | 'CHANGE';

/**
 * 发送验证码请求
 */
export interface SendVerificationCodeRequest {
  email: string;
  purpose: VerificationPurpose;
}

/**
 * 发送验证码响应
 */
export interface SendVerificationCodeResponse {
  cooldownSeconds: number;
  expiresIn: number;
}

/**
 * 验证码注册请求
 */
export interface RegisterWithCodeRequest {
  email: string;
  code: string;
  username: string;
  password: string;
  nickname?: string;
}

/**
 * 修改密码请求
 */
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  code: string;
}

/**
 * 验证码登录请求
 */
export interface LoginWithCodeRequest {
  email: string;
  code: string;
  rememberMe?: boolean;
}

/**
 * 验证重置验证码请求
 */
export interface VerifyResetCodeRequest {
  email: string;
  code: string;
}

/**
 * 验证重置验证码响应
 */
export interface VerifyResetCodeResponse {
  resetToken: string;
  expiresIn: number;
}

/**
 * 重置密码请求（使用验证码方式）
 */
export interface ResetPasswordWithTokenRequest {
  resetToken: string;
  newPassword: string;
}

/**
 * 发送邮箱修改验证码请求
 */
export interface SendChangeEmailCodeRequest {
  newEmail: string;
  password: string;
}

/**
 * 验证邮箱修改请求
 */
export interface VerifyChangeEmailRequest {
  newEmail: string;
  code: string;
}
