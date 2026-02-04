/**
 * Unit Tests: Email API Client
 * Task 15.2 - API 客户端测试
 * 
 * Tests for email-related API endpoints:
 * - Email logs management
 * - Email templates
 * - Email queue
 * - Monitoring
 * - Suppression list
 * - Subscriptions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { adminApi } from '../api/adminClient';
import { apiClient } from '../api/client';

// Mock the apiClient
vi.mock('../api/client', () => ({
  apiClient: {
    request: vi.fn(),
    setToken: vi.fn(),
    auth: {
      login: vi.fn(),
      logout: vi.fn(),
    },
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, public code: number) {
      super(message);
    }
  },
}));

describe('Email API Client Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Email Logs Management', () => {
    it('should fetch email logs list', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          items: [
            {
              id: 1,
              recipient: 'test@example.com',
              subject: 'Test Email',
              emailType: 'VERIFICATION',
              status: 'SENT',
              messageId: 'msg-123',
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          size: 10,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.emails.list({ page: 1, pageSize: 10 });

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/v1/admin/emails/logs?page=1&pageSize=10'
      );
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].recipient).toBe('test@example.com');
    });

    it('should fetch email log by ID', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          id: 1,
          recipient: 'test@example.com',
          subject: 'Test Email',
          emailType: 'VERIFICATION',
          status: 'SENT',
          messageId: 'msg-123',
          htmlContent: '<p>Test</p>',
          textContent: 'Test',
          createdAt: '2024-01-01T00:00:00Z',
        },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.emails.get(1);

      expect(apiClient.request).toHaveBeenCalledWith('/api/v1/admin/emails/logs/1');
      expect(result.data.id).toBe(1);
      expect(result.data.htmlContent).toBe('<p>Test</p>');
    });

    it('should get email statistics', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          totalSent: 1000,
          totalFailed: 50,
          successRate: 95.0,
          bounceRate: 2.5,
          complaintRate: 0.1,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.emails.statistics();

      expect(apiClient.request).toHaveBeenCalledWith('/api/v1/admin/emails/statistics');
      expect(result.data.totalSent).toBe(1000);
      expect(result.data.successRate).toBe(95.0);
    });

    it('should retry failed email', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: { success: true, message: 'Email queued for retry' },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.emails.retry(1);

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/v1/admin/email/queue/retry/1',
        { method: 'POST' }
      );
      expect(result.data.success).toBe(true);
    });

    it('should batch delete email logs', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: { deletedCount: 5, message: '5 logs deleted' },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.emails.batchDelete([1, 2, 3, 4, 5]);

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/v1/admin/emails/logs/batch-delete',
        {
          method: 'DELETE',
          body: JSON.stringify({ ids: [1, 2, 3, 4, 5] }),
        }
      );
      expect(result.data.deletedCount).toBe(5);
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(apiClient.request).mockRejectedValue(new Error('Network error'));

      await expect(adminApi.emails.list()).rejects.toThrow('Network error');
    });
  });

  describe('Email Templates Management', () => {
    it('should fetch templates list', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          items: [
            {
              id: 1,
              code: 'WELCOME',
              name: '欢迎邮件',
              language: 'zh-CN',
              subject: '欢迎加入',
              htmlContent: '<p>Welcome</p>',
              textContent: 'Welcome',
              enabled: true,
            },
          ],
          total: 1,
          page: 1,
          size: 10,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.templates.list({ language: 'zh-CN' });

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/v1/admin/email/templates?language=zh-CN'
      );
      expect(result.data.items).toHaveLength(1);
    });

    it('should create new template', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          id: 1,
          code: 'CUSTOM',
          name: 'Custom Template',
          language: 'en-US',
          subject: 'Custom Subject',
          htmlContent: '<p>Custom</p>',
          textContent: 'Custom',
          enabled: true,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const templateData = {
        code: 'CUSTOM',
        language: 'en-US',
        name: 'Custom Template',
        subject: 'Custom Subject',
        htmlContent: '<p>Custom</p>',
        textContent: 'Custom',
        enabled: true,
      };

      const result = await adminApi.templates.create(templateData);

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/v1/admin/email/templates',
        {
          method: 'POST',
          body: JSON.stringify(templateData),
        }
      );
      expect(result.data.code).toBe('CUSTOM');
    });

    it('should update template', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          id: 1,
          code: 'WELCOME',
          name: 'Updated Welcome',
          subject: 'Updated Subject',
        },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const updateData = {
        name: 'Updated Welcome',
        subject: 'Updated Subject',
      };

      const result = await adminApi.templates.update(1, updateData);

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/v1/admin/email/templates/1',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      );
      expect(result.data.name).toBe('Updated Welcome');
    });

    it('should preview template', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          htmlPreview: '<p>Hello John</p>',
          textPreview: 'Hello John',
          subject: 'Welcome John',
        },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const previewRequest = {
        templateId: 1,
        variables: { username: 'John' },
      };

      const result = await adminApi.templates.preview(previewRequest);

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/v1/admin/email/templates/preview',
        {
          method: 'POST',
          body: JSON.stringify(previewRequest),
        }
      );
      expect(result.data.htmlPreview).toContain('John');
    });

    it('should send test email', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: { success: true, message: 'Test email sent' },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.templates.sendTest(1, 'test@example.com', {
        username: 'Test User',
      });

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/v1/admin/email/templates/test',
        {
          method: 'POST',
          body: JSON.stringify({
            templateId: 1,
            email: 'test@example.com',
            variables: { username: 'Test User' },
          }),
        }
      );
      expect(result.data.success).toBe(true);
    });
  });

  describe('Email Queue Management', () => {
    it('should fetch queue statistics', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          queueLength: 50,
          processingSpeed: 10.5,
          failureRate: 2.3,
          averageWaitTime: 5.2,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.queue.stats();

      expect(apiClient.request).toHaveBeenCalledWith('/api/v1/admin/email/queue/stats');
      expect(result.data.queueLength).toBe(50);
    });

    it('should fetch queue items list', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          items: [
            {
              id: 1,
              recipient: 'test@example.com',
              subject: 'Test',
              status: 'PENDING',
              priority: 'HIGH',
              retryCount: 0,
            },
          ],
          total: 1,
          page: 1,
          size: 10,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.queue.list({ status: 'PENDING' });

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/v1/admin/email/queue?status=PENDING'
      );
      expect(result.data.items[0].status).toBe('PENDING');
    });

    it('should update email priority', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: { success: true, message: 'Priority updated' },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.queue.updatePriority(1, 'HIGH');

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/v1/admin/email/queue/1/priority',
        {
          method: 'PUT',
          body: JSON.stringify({ priority: 'HIGH' }),
        }
      );
      expect(result.data.success).toBe(true);
    });

    it('should pause queue processing', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: { success: true, message: 'Queue paused' },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.queue.pause();

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/v1/admin/email/queue/pause',
        { method: 'POST' }
      );
      expect(result.data.success).toBe(true);
    });

    it('should resume queue processing', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: { success: true, message: 'Queue resumed' },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.queue.resume();

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/v1/admin/email/queue/resume',
        { method: 'POST' }
      );
      expect(result.data.success).toBe(true);
    });
  });

  describe('Monitoring Management', () => {
    it('should fetch monitoring dashboard data', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          currentMetrics: {
            totalSent: 100,
            successCount: 95,
            failureCount: 5,
            bounceCount: 2,
            complaintCount: 0,
          },
          recentMetrics: [],
          queueStats: {
            queueLength: 10,
            processingSpeed: 5.0,
          },
        },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.monitoring.dashboard();

      expect(apiClient.request).toHaveBeenCalledWith('/api/monitoring/dashboard');
      expect(result.data.currentMetrics.totalSent).toBe(100);
    });

    it('should fetch metrics by time range', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: [
          {
            hour: '2024-01-01T00:00:00Z',
            totalSent: 50,
            successCount: 48,
            failureCount: 2,
          },
        ],
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.monitoring.range(
        '2024-01-01T00:00:00Z',
        '2024-01-01T23:59:59Z'
      );

      expect(apiClient.request).toHaveBeenCalledWith(
        expect.stringContaining('/api/monitoring/range?startTime=')
      );
      expect(result.data).toHaveLength(1);
    });

    it('should configure alerts', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: undefined,
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const alertConfig = {
        successRateThreshold: 95,
        bounceRateThreshold: 5,
        complaintRateThreshold: 0.1,
        enabled: true,
      };

      await adminApi.monitoring.configureAlerts(alertConfig);

      expect(apiClient.request).toHaveBeenCalledWith('/api/monitoring/alerts/config', {
        method: 'PUT',
        body: JSON.stringify(alertConfig),
      });
    });
  });

  describe('Suppression List Management', () => {
    it('should fetch suppression list', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          items: [
            {
              id: 1,
              email: 'bounced@example.com',
              reason: 'HARD_BOUNCE',
              source: 'AWS_SES',
              softBounceCount: 0,
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          size: 10,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.suppression.list({ reason: 'HARD_BOUNCE' });

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/admin/suppression?reason=HARD_BOUNCE'
      );
      expect(result.data.items[0].reason).toBe('HARD_BOUNCE');
    });

    it('should add email to suppression list', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          id: 1,
          email: 'spam@example.com',
          reason: 'COMPLAINT',
          source: 'MANUAL',
        },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const suppressionData = {
        email: 'spam@example.com',
        reason: 'COMPLAINT' as const,
        source: 'MANUAL',
        notes: 'User reported spam',
      };

      const result = await adminApi.suppression.add(suppressionData);

      expect(apiClient.request).toHaveBeenCalledWith('/api/admin/suppression', {
        method: 'POST',
        body: JSON.stringify(suppressionData),
      });
      expect(result.data.email).toBe('spam@example.com');
    });

    it('should remove email from suppression list', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: undefined,
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      await adminApi.suppression.remove('test@example.com');

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/admin/suppression/test%40example.com',
        { method: 'DELETE' }
      );
    });

    it('should check if email is in suppression list', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          id: 1,
          email: 'test@example.com',
          reason: 'SOFT_BOUNCE',
          softBounceCount: 2,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.suppression.check('test@example.com');

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/admin/suppression/check/test%40example.com'
      );
      expect(result.data.email).toBe('test@example.com');
    });
  });

  describe('Subscriptions Management', () => {
    it('should fetch subscription statistics', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          totalUsers: 1000,
          subscribedUsers: 850,
          unsubscribedUsers: 150,
          subscriptionRate: 85.0,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.subscriptions.stats();

      expect(apiClient.request).toHaveBeenCalledWith('/api/admin/subscriptions/stats');
      expect(result.data.totalUsers).toBe(1000);
      expect(result.data.subscriptionRate).toBe(85.0);
    });

    it('should fetch user subscriptions list', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          items: [
            {
              userId: 1,
              username: 'testuser',
              email: 'test@example.com',
              systemNotifications: true,
              marketingEmails: false,
              productUpdates: true,
            },
          ],
          total: 1,
          page: 1,
          size: 10,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.subscriptions.list({ keyword: 'test' });

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/admin/subscriptions?keyword=test'
      );
      expect(result.data.items[0].username).toBe('testuser');
    });

    it('should update user subscription preferences', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: undefined,
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const preferences = {
        systemNotifications: true,
        marketingEmails: false,
        productUpdates: true,
      };

      await adminApi.subscriptions.update(1, preferences);

      expect(apiClient.request).toHaveBeenCalledWith('/api/admin/subscriptions/1', {
        method: 'PUT',
        body: JSON.stringify(preferences),
      });
    });

    it('should fetch unsubscribe analytics', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          totalUnsubscribes: 150,
          unsubscribeRate: 15.0,
          reasonBreakdown: {
            'Too many emails': 50,
            'Not interested': 60,
            'Other': 40,
          },
        },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.subscriptions.analytics();

      expect(apiClient.request).toHaveBeenCalledWith(
        '/api/admin/subscriptions/analytics'
      );
      expect(result.data.totalUnsubscribes).toBe(150);
    });
  });

  describe('Error Handling and Data Transformation', () => {
    it('should handle 404 errors', async () => {
      vi.mocked(apiClient.request).mockRejectedValue({
        code: 404,
        message: 'Not found',
      });

      await expect(adminApi.emails.get(999)).rejects.toMatchObject({
        code: 404,
        message: 'Not found',
      });
    });

    it('should handle 500 errors', async () => {
      vi.mocked(apiClient.request).mockRejectedValue({
        code: 500,
        message: 'Internal server error',
      });

      await expect(adminApi.templates.list()).rejects.toMatchObject({
        code: 500,
        message: 'Internal server error',
      });
    });

    it('should properly encode URL parameters', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: { items: [], total: 0, page: 1, size: 10 },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      await adminApi.emails.list({
        recipient: 'test+tag@example.com',
        startDate: '2024-01-01T00:00:00Z',
      });

      expect(apiClient.request).toHaveBeenCalledWith(
        expect.stringContaining('recipient=test%2Btag%40example.com')
      );
    });

    it('should handle empty response data', async () => {
      const mockResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: { items: [], total: 0, page: 1, size: 10 },
      };

      vi.mocked(apiClient.request).mockResolvedValue(mockResponse);

      const result = await adminApi.emails.list();

      expect(result.data.items).toEqual([]);
      expect(result.data.total).toBe(0);
    });
  });
});
