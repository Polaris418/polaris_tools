/**
 * MonitoringService - 监控认证系统的关键指标
 * 
 * 功能：
 * - Token 刷新监控（成功率、失败原因、刷新频率）
 * - 会话超时监控（超时次数、用户响应）
 * - 游客转化率监控（游客使用、转化率、限制触发）
 */

// 监控事件类型
export enum MonitoringEventType {
  // Token 刷新事件
  TOKEN_REFRESH_SUCCESS = 'token_refresh_success',
  TOKEN_REFRESH_FAILURE = 'token_refresh_failure',
  TOKEN_REFRESH_ATTEMPT = 'token_refresh_attempt',
  TOKEN_EXPIRED = 'token_expired',
  
  // 会话超时事件
  SESSION_TIMEOUT_WARNING_SHOWN = 'session_timeout_warning_shown',
  SESSION_TIMEOUT_CONTINUE = 'session_timeout_continue',
  SESSION_TIMEOUT_LOGOUT = 'session_timeout_logout',
  SESSION_TIMEOUT_AUTO_LOGOUT = 'session_timeout_auto_logout',
  
  // 游客转化事件
  GUEST_TOOL_USAGE = 'guest_tool_usage',
  GUEST_LIMIT_WARNING_SHOWN = 'guest_limit_warning_shown',
  GUEST_LIMIT_REACHED = 'guest_limit_reached',
  GUEST_CONVERTED_TO_USER = 'guest_converted_to_user',
  GUEST_DISMISSED_LOGIN = 'guest_dismissed_login',
}

// 监控事件数据
interface MonitoringEvent {
  type: MonitoringEventType;
  timestamp: number;
  data?: Record<string, any>;
}

// Token 刷新统计
interface TokenRefreshStats {
  totalAttempts: number;
  successCount: number;
  failureCount: number;
  lastRefreshTime: number | null;
  averageRefreshInterval: number;
  failureReasons: Record<string, number>;
}

// 会话超时统计
interface SessionTimeoutStats {
  warningShownCount: number;
  continueCount: number;
  logoutCount: number;
  autoLogoutCount: number;
  averageResponseTime: number;
}

// 游客转化统计
interface GuestConversionStats {
  totalGuestUsage: number;
  warningShownCount: number;
  limitReachedCount: number;
  conversionCount: number;
  dismissalCount: number;
  conversionRate: number;
}

class MonitoringService {
  private events: MonitoringEvent[] = [];
  private readonly MAX_EVENTS = 1000; // 最多保存1000个事件
  private readonly STORAGE_KEY = 'monitoring_events';
  private readonly STATS_STORAGE_KEY = 'monitoring_stats';
  
  constructor() {
    this.loadEvents();
  }
  
  /**
   * 记录监控事件
   */
  trackEvent(type: MonitoringEventType, data?: Record<string, any>): void {
    const event: MonitoringEvent = {
      type,
      timestamp: Date.now(),
      data,
    };
    
    this.events.push(event);
    
    // 限制事件数量，保留最新的事件
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }
    
    this.saveEvents();
  }
  
  /**
   * 获取 Token 刷新统计
   */
  getTokenRefreshStats(): TokenRefreshStats {
    const refreshEvents = this.events.filter(e => 
      e.type === MonitoringEventType.TOKEN_REFRESH_ATTEMPT ||
      e.type === MonitoringEventType.TOKEN_REFRESH_SUCCESS ||
      e.type === MonitoringEventType.TOKEN_REFRESH_FAILURE
    );
    
    const successEvents = refreshEvents.filter(e => e.type === MonitoringEventType.TOKEN_REFRESH_SUCCESS);
    const failureEvents = refreshEvents.filter(e => e.type === MonitoringEventType.TOKEN_REFRESH_FAILURE);
    
    // 计算平均刷新间隔
    let averageRefreshInterval = 0;
    if (successEvents.length > 1) {
      const intervals: number[] = [];
      for (let i = 1; i < successEvents.length; i++) {
        intervals.push(successEvents[i].timestamp - successEvents[i - 1].timestamp);
      }
      averageRefreshInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }
    
    // 统计失败原因
    const failureReasons: Record<string, number> = {};
    failureEvents.forEach(event => {
      const reason = event.data?.reason || 'unknown';
      failureReasons[reason] = (failureReasons[reason] || 0) + 1;
    });
    
    return {
      totalAttempts: refreshEvents.length,
      successCount: successEvents.length,
      failureCount: failureEvents.length,
      lastRefreshTime: successEvents.length > 0 ? successEvents[successEvents.length - 1].timestamp : null,
      averageRefreshInterval,
      failureReasons,
    };
  }
  
  /**
   * 获取会话超时统计
   */
  getSessionTimeoutStats(): SessionTimeoutStats {
    const warningEvents = this.events.filter(e => e.type === MonitoringEventType.SESSION_TIMEOUT_WARNING_SHOWN);
    const continueEvents = this.events.filter(e => e.type === MonitoringEventType.SESSION_TIMEOUT_CONTINUE);
    const logoutEvents = this.events.filter(e => e.type === MonitoringEventType.SESSION_TIMEOUT_LOGOUT);
    const autoLogoutEvents = this.events.filter(e => e.type === MonitoringEventType.SESSION_TIMEOUT_AUTO_LOGOUT);
    
    // 计算平均响应时间（从显示警告到用户操作的时间）
    let averageResponseTime = 0;
    const responseTimes: number[] = [];
    
    warningEvents.forEach(warningEvent => {
      // 查找对应的响应事件（continue 或 logout）
      const responseEvent = [...continueEvents, ...logoutEvents].find(e => 
        e.timestamp > warningEvent.timestamp && 
        e.timestamp - warningEvent.timestamp < 2 * 60 * 1000 // 2分钟内
      );
      
      if (responseEvent) {
        responseTimes.push(responseEvent.timestamp - warningEvent.timestamp);
      }
    });
    
    if (responseTimes.length > 0) {
      averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }
    
    return {
      warningShownCount: warningEvents.length,
      continueCount: continueEvents.length,
      logoutCount: logoutEvents.length,
      autoLogoutCount: autoLogoutEvents.length,
      averageResponseTime,
    };
  }
  
  /**
   * 获取游客转化统计
   */
  getGuestConversionStats(): GuestConversionStats {
    const usageEvents = this.events.filter(e => e.type === MonitoringEventType.GUEST_TOOL_USAGE);
    const warningEvents = this.events.filter(e => e.type === MonitoringEventType.GUEST_LIMIT_WARNING_SHOWN);
    const limitEvents = this.events.filter(e => e.type === MonitoringEventType.GUEST_LIMIT_REACHED);
    const conversionEvents = this.events.filter(e => e.type === MonitoringEventType.GUEST_CONVERTED_TO_USER);
    const dismissalEvents = this.events.filter(e => e.type === MonitoringEventType.GUEST_DISMISSED_LOGIN);
    
    // 计算转化率（转化数 / 达到限制数）
    const conversionRate = limitEvents.length > 0 
      ? (conversionEvents.length / limitEvents.length) * 100 
      : 0;
    
    return {
      totalGuestUsage: usageEvents.length,
      warningShownCount: warningEvents.length,
      limitReachedCount: limitEvents.length,
      conversionCount: conversionEvents.length,
      dismissalCount: dismissalEvents.length,
      conversionRate,
    };
  }
  
  /**
   * 获取所有统计数据
   */
  getAllStats() {
    return {
      tokenRefresh: this.getTokenRefreshStats(),
      sessionTimeout: this.getSessionTimeoutStats(),
      guestConversion: this.getGuestConversionStats(),
    };
  }
  
  /**
   * 导出统计报告（用于分析）
   */
  exportReport(): string {
    const stats = this.getAllStats();
    
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalEvents: this.events.length,
        dateRange: {
          from: this.events.length > 0 ? new Date(this.events[0].timestamp).toISOString() : null,
          to: this.events.length > 0 ? new Date(this.events[this.events.length - 1].timestamp).toISOString() : null,
        },
      },
      tokenRefresh: {
        ...stats.tokenRefresh,
        successRate: stats.tokenRefresh.totalAttempts > 0 
          ? ((stats.tokenRefresh.successCount / stats.tokenRefresh.totalAttempts) * 100).toFixed(2) + '%'
          : 'N/A',
        averageRefreshIntervalMinutes: (stats.tokenRefresh.averageRefreshInterval / 60000).toFixed(2),
      },
      sessionTimeout: {
        ...stats.sessionTimeout,
        userEngagementRate: stats.sessionTimeout.warningShownCount > 0
          ? ((stats.sessionTimeout.continueCount / stats.sessionTimeout.warningShownCount) * 100).toFixed(2) + '%'
          : 'N/A',
        averageResponseTimeSeconds: (stats.sessionTimeout.averageResponseTime / 1000).toFixed(2),
      },
      guestConversion: {
        ...stats.guestConversion,
        conversionRate: stats.guestConversion.conversionRate.toFixed(2) + '%',
        averageUsageBeforeLimit: stats.guestConversion.limitReachedCount > 0
          ? (stats.guestConversion.totalGuestUsage / stats.guestConversion.limitReachedCount).toFixed(2)
          : 'N/A',
      },
    };
    
    return JSON.stringify(report, null, 2);
  }
  
  /**
   * 清除所有事件
   */
  clearEvents(): void {
    this.events = [];
    this.saveEvents();
  }
  
  /**
   * 清除旧事件（保留最近N天的数据）
   */
  clearOldEvents(daysToKeep: number = 7): void {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    this.events = this.events.filter(e => e.timestamp >= cutoffTime);
    this.saveEvents();
  }
  
  /**
   * 保存事件到 localStorage
   */
  private saveEvents(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.events));
    } catch (error) {
      console.error('[Monitoring] Failed to save events:', error);
    }
  }
  
  /**
   * 从 localStorage 加载事件
   */
  private loadEvents(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.events = JSON.parse(stored);
        // 自动清理超过30天的旧数据
        this.clearOldEvents(30);
      }
    } catch (error) {
      console.error('[Monitoring] Failed to load events:', error);
      this.events = [];
    }
  }
  
  /**
   * 获取最近的事件（用于调试）
   */
  getRecentEvents(count: number = 50): MonitoringEvent[] {
    return this.events.slice(-count);
  }
  
  /**
   * 按类型获取事件
   */
  getEventsByType(type: MonitoringEventType): MonitoringEvent[] {
    return this.events.filter(e => e.type === type);
  }
  
  /**
   * 获取时间范围内的事件
   */
  getEventsByTimeRange(startTime: number, endTime: number): MonitoringEvent[] {
    return this.events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
  }
}

// 导出单例
export const monitoringService = new MonitoringService();
