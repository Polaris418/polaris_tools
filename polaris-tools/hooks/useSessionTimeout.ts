import { useState, useEffect, useCallback, useRef } from 'react';
import { monitoringService, MonitoringEventType } from '../utils/monitoringService';

/**
 * useSessionTimeout Hook
 * 会话超时检测和管理
 * 
 * 功能：
 * - 检测 token 即将过期（提前 2 分钟）
 * - 提供继续使用（刷新 token）功能
 * - 提供退出登录功能
 * - 提供关闭提醒功能
 * - 自动在超时后退出登录
 * 
 * @param enabled - 是否启用会话超时检测
 * @param expiresAt - Token 过期时间戳（毫秒）
 * @param onRefresh - Token 刷新回调函数
 * @param onLogout - 退出登录回调函数
 * @returns Hook 状态和方法
 */
export const useSessionTimeout = (
  enabled: boolean,
  expiresAt: number | null,
  onRefresh: () => Promise<void>,
  onLogout: () => Promise<void>
) => {
  // 是否显示超时警告对话框
  const [showWarning, setShowWarning] = useState<boolean>(false);
  
  // 检查定时器引用
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 是否已经显示过警告（避免重复显示）
  const hasShownWarningRef = useRef<boolean>(false);
  
  // 警告显示时间（用于计算响应时间）
  const warningShownTimeRef = useRef<number | null>(null);
  
  // 配置常量
  const WARNING_THRESHOLD = 2 * 60 * 1000; // 提前 2 分钟警告
  const CHECK_INTERVAL = 10 * 1000; // 每 10 秒检查一次

  /**
   * 检查是否需要显示超时警告
   */
  const checkTimeout = useCallback(() => {
    if (!enabled || !expiresAt) {
      return;
    }

    const now = Date.now();
    const timeRemaining = expiresAt - now;

    // 如果剩余时间小于等于警告阈值，且还没有显示过警告
    if (timeRemaining <= WARNING_THRESHOLD && timeRemaining > 0 && !hasShownWarningRef.current) {
      setShowWarning(true);
      hasShownWarningRef.current = true;
      warningShownTimeRef.current = Date.now();
      
      // 监控：记录警告显示
      monitoringService.trackEvent(MonitoringEventType.SESSION_TIMEOUT_WARNING_SHOWN, {
        timeRemaining,
        expiresAt,
      });
    }

    // 如果已经过期，自动退出登录
    if (timeRemaining <= 0) {
      // 监控：记录自动退出
      monitoringService.trackEvent(MonitoringEventType.SESSION_TIMEOUT_AUTO_LOGOUT, {
        responseTime: warningShownTimeRef.current ? Date.now() - warningShownTimeRef.current : null,
      });
      
      handleLogout();
    }
  }, [enabled, expiresAt]);

  /**
   * 启动超时检测
   */
  useEffect(() => {
    if (!enabled || !expiresAt) {
      // 清理定时器
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
        checkTimerRef.current = null;
      }
      // 重置状态
      setShowWarning(false);
      hasShownWarningRef.current = false;
      return;
    }

    // 立即检查一次
    checkTimeout();

    // 启动定时检查
    checkTimerRef.current = setInterval(checkTimeout, CHECK_INTERVAL);

    // 清理函数
    return () => {
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
        checkTimerRef.current = null;
      }
    };
  }, [enabled, expiresAt, checkTimeout]);

  /**
   * 处理"继续使用"按钮点击
   * 刷新 token 并关闭警告对话框
   */
  const handleContinue = useCallback(async () => {
    // 监控：记录用户选择继续
    const responseTime = warningShownTimeRef.current ? Date.now() - warningShownTimeRef.current : null;
    monitoringService.trackEvent(MonitoringEventType.SESSION_TIMEOUT_CONTINUE, {
      responseTime,
    });
    
    try {
      // 调用刷新回调
      await onRefresh();
      
      // 关闭警告对话框
      setShowWarning(false);
      
      // 重置警告标志，允许下次再次显示
      hasShownWarningRef.current = false;
      warningShownTimeRef.current = null;
    } catch (error) {
      // 刷新失败，退出登录
      await handleLogout();
    }
  }, [onRefresh]);

  /**
   * 处理"退出登录"按钮点击
   * 执行退出登录并关闭警告对话框
   */
  const handleLogout = useCallback(async () => {
    // 监控：记录用户选择退出
    const responseTime = warningShownTimeRef.current ? Date.now() - warningShownTimeRef.current : null;
    monitoringService.trackEvent(MonitoringEventType.SESSION_TIMEOUT_LOGOUT, {
      responseTime,
    });
    
    // 关闭警告对话框
    setShowWarning(false);
    
    // 重置警告标志
    hasShownWarningRef.current = false;
    warningShownTimeRef.current = null;
    
    // 调用退出登录回调
    await onLogout();
  }, [onLogout]);

  /**
   * 处理关闭按钮点击
   * 关闭警告对话框但不刷新 token
   * 用户可以稍后再决定
   */
  const handleClose = useCallback(() => {
    // 关闭警告对话框
    setShowWarning(false);
    
    // 不重置 hasShownWarningRef，避免重复显示
    // 用户关闭后，如果 token 真的过期了，会自动退出登录
  }, []);

  return {
    showWarning,
    handleContinue,
    handleLogout,
    handleClose,
  };
};
