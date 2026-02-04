/**
 * 认证相关配置
 */

export const AUTH_CONFIG = {
  // Token 刷新配置
  REFRESH_BEFORE_EXPIRY_PERCENTAGE: 0.15,  // 剩余 15% 生命周期时刷新
  TOKEN_CHECK_INTERVAL: 60 * 1000,         // 1 分钟检查一次
  
  // 会话超时提醒
  SESSION_TIMEOUT_WARNING: 2 * 60 * 1000,  // 提前 2 分钟提醒
  SESSION_TIMEOUT_CHECK_INTERVAL: 10 * 1000, // 10 秒检查一次
  
  // Token 有效期（由后端控制，前端仅用于显示）
  REMEMBER_ME_DURATION: 30 * 24 * 60 * 60,  // 30 天（秒）
  NORMAL_DURATION: 24 * 60 * 60,            // 1 天（秒）
  
  // 游客使用限制
  GUEST_USAGE_LIMIT: 10,                    // 游客最多使用 10 次
  GUEST_USAGE_WARNING_THRESHOLD: 7,         // 使用 7 次后开始提醒（剩余 3 次）
  GUEST_USAGE_RESET_DAILY: false,           // 是否每天重置使用次数（false = 永久限制）
  
  // 重试配置
  MAX_REFRESH_RETRIES: 3,                   // Token 刷新最大重试次数
  RETRY_DELAY: 1000,                        // 重试延迟（毫秒）
} as const;

export type AuthConfig = typeof AUTH_CONFIG;
