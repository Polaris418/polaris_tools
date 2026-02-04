/**
 * GuestUsageManager - 管理游客使用次数限制
 * 
 * 功能：
 * - 记录游客工具使用次数
 * - 检查是否达到使用限制
 * - 每日自动重置使用次数
 * - 提供剩余次数查询
 */

import { monitoringService, MonitoringEventType } from './monitoringService';

interface GuestUsage {
  count: number;
  limit: number;
  lastResetDate: string;
}

class GuestUsageManager {
  private readonly STORAGE_KEY = 'guest_usage';
  private readonly DEFAULT_LIMIT = 10;
  private readonly WARNING_THRESHOLD = 7; // 剩余3次时提醒
  
  /**
   * 获取游客使用信息
   */
  getUsage(): GuestUsage {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const usage = JSON.parse(stored) as GuestUsage;
        // 检查是否需要重置（每天重置）
        if (this.shouldReset(usage.lastResetDate)) {
          return this.resetUsage();
        }
        return usage;
      } catch (error) {
        console.error('Failed to parse guest usage:', error);
      }
    }
    return this.initUsage();
  }
  
  /**
   * 初始化使用信息
   */
  private initUsage(): GuestUsage {
    const usage: GuestUsage = {
      count: 0,
      limit: this.DEFAULT_LIMIT,
      lastResetDate: new Date().toISOString(),
    };
    this.saveUsage(usage);
    return usage;
  }
  
  /**
   * 重置使用次数（每天重置）
   */
  private resetUsage(): GuestUsage {
    const usage: GuestUsage = {
      count: 0,
      limit: this.DEFAULT_LIMIT,
      lastResetDate: new Date().toISOString(),
    };
    this.saveUsage(usage);
    return usage;
  }
  
  /**
   * 判断是否需要重置（每天重置）
   * 比较上次重置日期和当前日期，如果不是同一天则需要重置
   */
  private shouldReset(lastResetDate: string): boolean {
    try {
      const lastReset = new Date(lastResetDate);
      const today = new Date();
      
      // 比较日期字符串（YYYY-MM-DD）
      const lastResetDay = lastReset.toISOString().split('T')[0];
      const todayDay = today.toISOString().split('T')[0];
      
      return lastResetDay !== todayDay;
    } catch (error) {
      console.error('Failed to parse lastResetDate:', error);
      // 如果日期解析失败，重置使用次数
      return true;
    }
  }
  
  /**
   * 保存使用信息
   */
  private saveUsage(usage: GuestUsage): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usage));
  }
  
  /**
   * 增加使用次数
   */
  incrementUsage(): GuestUsage {
    const usage = this.getUsage();
    usage.count += 1;
    this.saveUsage(usage);
    
    // 监控：记录游客工具使用
    monitoringService.trackEvent(MonitoringEventType.GUEST_TOOL_USAGE, {
      count: usage.count,
      limit: usage.limit,
      remaining: usage.limit - usage.count,
    });
    
    // 检查是否需要显示警告
    if (this.shouldShowWarning() && usage.count === this.WARNING_THRESHOLD) {
      // 监控：记录警告显示（只在第一次达到阈值时记录）
      monitoringService.trackEvent(MonitoringEventType.GUEST_LIMIT_WARNING_SHOWN, {
        count: usage.count,
        remaining: usage.limit - usage.count,
      });
    }
    
    // 检查是否达到限制
    if (this.isLimitReached()) {
      // 监控：记录达到限制
      monitoringService.trackEvent(MonitoringEventType.GUEST_LIMIT_REACHED, {
        count: usage.count,
        limit: usage.limit,
      });
    }
    
    return usage;
  }
  
  /**
   * 检查是否可以继续使用
   */
  canUse(): boolean {
    const usage = this.getUsage();
    return usage.count < usage.limit;
  }
  
  /**
   * 获取剩余使用次数
   */
  getRemainingCount(): number {
    const usage = this.getUsage();
    return Math.max(0, usage.limit - usage.count);
  }
  
  /**
   * 是否需要显示警告
   */
  shouldShowWarning(): boolean {
    const usage = this.getUsage();
    return usage.count >= this.WARNING_THRESHOLD && usage.count < usage.limit;
  }
  
  /**
   * 是否已达到限制
   */
  isLimitReached(): boolean {
    const usage = this.getUsage();
    return usage.count >= usage.limit;
  }
  
  /**
   * 清除使用记录（登录后调用）
   */
  clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    
    // 监控：记录游客转化为用户
    monitoringService.trackEvent(MonitoringEventType.GUEST_CONVERTED_TO_USER);
  }
  
  /**
   * 记录游客关闭登录提示（用于监控）
   */
  trackLoginDismissal(): void {
    // 监控：记录游客关闭登录提示
    monitoringService.trackEvent(MonitoringEventType.GUEST_DISMISSED_LOGIN, {
      currentUsage: this.getUsage().count,
      remaining: this.getRemainingCount(),
    });
  }
  
  /**
   * 获取下次重置时间（明天 00:00）
   */
  getNextResetTime(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
  
  /**
   * 获取距离下次重置的时间（毫秒）
   */
  getTimeUntilReset(): number {
    const nextReset = this.getNextResetTime();
    return nextReset.getTime() - Date.now();
  }
}

export const guestUsageManager = new GuestUsageManager();
