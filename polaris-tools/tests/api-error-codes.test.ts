import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client';

describe('ApiError 错误码识别', () => {
  it('应识别验证码错误码范围 8001-8011', () => {
    expect(new ApiError(8001, 'x').isVerificationError()).toBe(true);
    expect(new ApiError(8011, 'x').isVerificationError()).toBe(true);
    expect(new ApiError(4001, 'x').isVerificationError()).toBe(false);
  });

  it('应识别限流错误码 8006/8007/8008', () => {
    expect(new ApiError(8006, 'x').isRateLimitError()).toBe(true);
    expect(new ApiError(8007, 'x').isRateLimitError()).toBe(true);
    expect(new ApiError(8008, 'x').isRateLimitError()).toBe(true);
    expect(new ApiError(4291, 'x').isRateLimitError()).toBe(false);
  });

  it('应识别认证错误码 2001-2005 与 HTTP 401/403', () => {
    expect(new ApiError(2001, 'x').isAuthError()).toBe(true);
    expect(new ApiError(2005, 'x').isAuthError()).toBe(true);
    expect(new ApiError(401, 'x').isAuthError()).toBe(true);
    expect(new ApiError(403, 'x').isAuthError()).toBe(true);
    expect(new ApiError(2006, 'x').isAuthError()).toBe(false);
  });

  it('应返回验证码友好提示', () => {
    expect(new ApiError(8002, 'ignored').getUserMessage()).toBe('验证码已过期');
    expect(new ApiError(8010, 'ignored').getUserMessage()).toBe('邮件发送失败');
  });

  it('应返回限流友好提示（包含秒数）', () => {
    const err = new ApiError(8006, 'ignored', { seconds: 30 });
    expect(err.getUserMessage()).toBe('发送过于频繁，请30秒后再试');
  });

  it('应返回认证友好提示', () => {
    expect(new ApiError(2004, 'ignored').getUserMessage()).toBe('用户名或密码错误');
    expect(new ApiError(2005, 'ignored').getUserMessage()).toBe('登录已过期，请重新登录');
  });
});
