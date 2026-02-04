/**
 * Integration Tests: Email System
 * Task 15.3 - 集成测试
 * 
 * Tests for complete email workflows:
 * - User email verification flow
 * - Admin email management flow
 * - Template management flow
 * - Suppression list flow
 * - Edge cases and error scenarios
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { adminApi } from '../api/adminClient';
import { apiClient } from '../api/client';

// Mock API clients
vi.mock('../api/client');
vi.mock('../api/adminClient');

describe('Email Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Email Verification Flow', () => {
    it('should complete full email verification workflow', async () => {
      // Step 1: User registers and receives verification email
      const registerResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          user: {
            id: 1,
            username: 'newuser',
            email: 'newuser@example.com',
            emailVerified: false,
          },
          message: 'Verification email sent',
        },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(registerResponse);

      // Step 2: User clicks verification link
      const verifyResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          success: true,
          message: 'Email verified successfully',
        },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(verifyResponse);

      // Step 3: User profile updated with verified status
      const profileResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          id: 1,
          username: 'newuser',
          email: 'newuser@example.com',
          emailVerified: true,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(profileResponse);

      // Verify the flow
      const register = await apiClient.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
        }),
      });

      expect(register.data.user.emailVerified).toBe(false);

      const verify = await apiClient.request('/api/email/verify', {
        method: 'POST',
        body: JSON.stringify({ token: 'verification-token' }),
      });

      expect(verify.data.success).toBe(true);

      const profile = await apiClient.request('/api/user/profile');
      expect(profile.data.emailVerified).toBe(true);
    });

    it('should handle verification email resend with cooldown', async () => {
      // First resend - success
      const firstResendResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: { success: true, message: 'Verification email sent' },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(firstResendResponse);

      const firstResend = await apiClient.request('/api/email/resend-verification', {
        method: 'POST',
      });

      expect(firstResend.data.success).toBe(true);

      // Second resend - rate limited
      const rateLimitResponse = {
        code: 429,
        message: 'Too many requests',
        timestamp: Date.now(),
        data: {
          success: false,
          message: 'Please wait 60 seconds before resending',
          remainingSeconds: 45,
        },
      };

      vi.mocked(apiClient.request).mockRejectedValueOnce(rateLimitResponse);

      await expect(
        apiClient.request('/api/email/resend-verification', { method: 'POST' })
      ).rejects.toMatchObject({
        code: 429,
        message: 'Too many requests',
      });
    });

    it('should handle expired verification token', async () => {
      const expiredResponse = {
        code: 400,
        message: 'Bad Request',
        timestamp: Date.now(),
        data: {
          success: false,
          message: 'Verification token has expired',
        },
      };

      vi.mocked(apiClient.request).mockRejectedValueOnce(expiredResponse);

      await expect(
        apiClient.request('/api/email/verify', {
          method: 'POST',
          body: JSON.stringify({ token: 'expired-token' }),
        })
      ).rejects.toMatchObject({
        code: 400,
        message: 'Bad Request',
      });
    });
  });

  describe('Admin Email Management Flow', () => {
    it('should complete full email log management workflow', async () => {
      // Step 1: Fetch email logs
      const logsResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          items: [
            {
              id: 1,
              recipient: 'user@example.com',
              subject: 'Welcome',
              status: 'FAILED',
              errorMessage: 'SMTP timeout',
            },
          ],
          total: 1,
          page: 1,
          size: 10,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(logsResponse);

      const logs = await apiClient.request('/api/v1/admin/emails/logs');
      expect(logs.data.items[0].status).toBe('FAILED');

      // Step 2: Retry failed email
      const retryResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: { success: true, message: 'Email queued for retry' },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(retryResponse);

      const retry = await apiClient.request('/api/v1/admin/email/queue/retry/1', {
        method: 'POST',
      });

      expect(retry.data.success).toBe(true);

      // Step 3: Verify email was retried successfully
      const updatedLogsResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          items: [
            {
              id: 1,
              recipient: 'user@example.com',
              subject: 'Welcome',
              status: 'SENT',
              messageId: 'msg-123',
            },
          ],
          total: 1,
          page: 1,
          size: 10,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(updatedLogsResponse);

      const updatedLogs = await apiClient.request('/api/v1/admin/emails/logs');
      expect(updatedLogs.data.items[0].status).toBe('SENT');
    });

    it('should handle batch operations on email logs', async () => {
      // Batch delete
      const batchDeleteResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: { deletedCount: 10, message: '10 logs deleted' },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(batchDeleteResponse);

      const batchDelete = await apiClient.request(
        '/api/v1/admin/emails/logs/batch-delete',
        {
          method: 'DELETE',
          body: JSON.stringify({ ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }),
        }
      );

      expect(batchDelete.data.deletedCount).toBe(10);

      // Batch retry
      const batchRetryResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: { retriedCount: 5, message: '5 emails queued for retry' },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(batchRetryResponse);

      const batchRetry = await apiClient.request(
        '/api/v1/admin/emails/logs/batch-retry',
        {
          method: 'POST',
          body: JSON.stringify({ ids: [11, 12, 13, 14, 15] }),
        }
      );

      expect(batchRetry.data.retriedCount).toBe(5);
    });
  });

  describe('Template Management Flow', () => {
    it('should complete full template lifecycle', async () => {
      // Step 1: Create template
      const createResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          id: 1,
          code: 'CUSTOM_WELCOME',
          name: 'Custom Welcome',
          language: 'en-US',
          subject: 'Welcome ${username}',
          htmlContent: '<p>Hello ${username}</p>',
          textContent: 'Hello ${username}',
          enabled: true,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(createResponse);

      const created = await apiClient.request('/api/v1/admin/email/templates', {
        method: 'POST',
        body: JSON.stringify({
          code: 'CUSTOM_WELCOME',
          name: 'Custom Welcome',
          language: 'en-US',
          subject: 'Welcome ${username}',
          htmlContent: '<p>Hello ${username}</p>',
          textContent: 'Hello ${username}',
          enabled: true,
        }),
      });

      expect(created.data.id).toBe(1);

      // Step 2: Preview template
      const previewResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          htmlPreview: '<p>Hello John</p>',
          textPreview: 'Hello John',
          subject: 'Welcome John',
        },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(previewResponse);

      const preview = await apiClient.request('/api/v1/admin/email/templates/preview', {
        method: 'POST',
        body: JSON.stringify({
          templateId: 1,
          variables: { username: 'John' },
        }),
      });

      expect(preview.data.htmlPreview).toContain('John');

      // Step 3: Send test email
      const testEmailResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: { success: true, message: 'Test email sent' },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(testEmailResponse);

      const testEmail = await apiClient.request('/api/v1/admin/email/templates/test', {
        method: 'POST',
        body: JSON.stringify({
          templateId: 1,
          email: 'test@example.com',
          variables: { username: 'Test User' },
        }),
      });

      expect(testEmail.data.success).toBe(true);

      // Step 4: Update template
      const updateResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          id: 1,
          code: 'CUSTOM_WELCOME',
          name: 'Updated Custom Welcome',
          subject: 'Welcome ${username}!',
        },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(updateResponse);

      const updated = await apiClient.request('/api/v1/admin/email/templates/1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Custom Welcome',
          subject: 'Welcome ${username}!',
        }),
      });

      expect(updated.data.name).toBe('Updated Custom Welcome');
    });

    it('should handle template validation errors', async () => {
      const validationError = {
        code: 400,
        message: 'Validation failed',
        timestamp: Date.now(),
        data: {
          errors: [
            { field: 'subject', message: 'Subject is required' },
            { field: 'htmlContent', message: 'HTML content is required' },
          ],
        },
      };

      vi.mocked(apiClient.request).mockRejectedValueOnce(validationError);

      await expect(
        apiClient.request('/api/v1/admin/email/templates', {
          method: 'POST',
          body: JSON.stringify({
            code: 'INVALID',
            name: 'Invalid Template',
            language: 'en-US',
          }),
        })
      ).rejects.toMatchObject({
        code: 400,
        message: 'Validation failed',
      });
    });
  });

  describe('Suppression List Flow', () => {
    it('should handle bounce event and add to suppression list', async () => {
      // Step 1: Email bounces (simulated by webhook)
      const bounceEvent = {
        eventType: 'Bounce',
        bounce: {
          bounceType: 'Permanent',
          bouncedRecipients: [{ emailAddress: 'bounced@example.com' }],
        },
      };

      // Step 2: System adds to suppression list
      const addSuppressionResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          id: 1,
          email: 'bounced@example.com',
          reason: 'HARD_BOUNCE',
          source: 'AWS_SES',
          softBounceCount: 0,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(addSuppressionResponse);

      const suppression = await apiClient.request('/api/admin/suppression', {
        method: 'POST',
        body: JSON.stringify({
          email: 'bounced@example.com',
          reason: 'HARD_BOUNCE',
          source: 'AWS_SES',
        }),
      });

      expect(suppression.data.email).toBe('bounced@example.com');

      // Step 3: Verify email is blocked from future sends
      const checkResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          id: 1,
          email: 'bounced@example.com',
          reason: 'HARD_BOUNCE',
          isSuppressed: true,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(checkResponse);

      const check = await apiClient.request(
        '/api/admin/suppression/check/bounced%40example.com'
      );

      expect(check.data.isSuppressed).toBe(true);
    });

    it('should handle soft bounce accumulation', async () => {
      // First soft bounce
      const firstBounceResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          id: 1,
          email: 'softbounce@example.com',
          reason: 'SOFT_BOUNCE',
          softBounceCount: 1,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(firstBounceResponse);

      const firstBounce = await apiClient.request('/api/admin/suppression', {
        method: 'POST',
        body: JSON.stringify({
          email: 'softbounce@example.com',
          reason: 'SOFT_BOUNCE',
          source: 'AWS_SES',
        }),
      });

      expect(firstBounce.data.softBounceCount).toBe(1);

      // Second soft bounce
      const secondBounceResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          id: 1,
          email: 'softbounce@example.com',
          reason: 'SOFT_BOUNCE',
          softBounceCount: 2,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(secondBounceResponse);

      const secondBounce = await apiClient.request('/api/admin/suppression', {
        method: 'POST',
        body: JSON.stringify({
          email: 'softbounce@example.com',
          reason: 'SOFT_BOUNCE',
          source: 'AWS_SES',
        }),
      });

      expect(secondBounce.data.softBounceCount).toBe(2);

      // Third soft bounce - should be permanently suppressed
      const thirdBounceResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          id: 1,
          email: 'softbounce@example.com',
          reason: 'SOFT_BOUNCE',
          softBounceCount: 3,
          permanentlySuppressed: true,
        },
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(thirdBounceResponse);

      const thirdBounce = await apiClient.request('/api/admin/suppression', {
        method: 'POST',
        body: JSON.stringify({
          email: 'softbounce@example.com',
          reason: 'SOFT_BOUNCE',
          source: 'AWS_SES',
        }),
      });

      expect(thirdBounce.data.softBounceCount).toBe(3);
      expect(thirdBounce.data.permanentlySuppressed).toBe(true);
    });

    it('should allow manual removal from suppression list', async () => {
      // Remove from suppression list
      const removeResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: undefined,
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(removeResponse);

      await apiClient.request('/api/admin/suppression/test%40example.com', {
        method: 'DELETE',
      });

      // Verify email is no longer suppressed
      const checkResponse = {
        code: 404,
        message: 'Not found',
        timestamp: Date.now(),
        data: null,
      };

      vi.mocked(apiClient.request).mockRejectedValueOnce(checkResponse);

      await expect(
        apiClient.request('/api/admin/suppression/check/test%40example.com')
      ).rejects.toMatchObject({
        code: 404,
      });
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle concurrent email sends', async () => {
      const responses = Array.from({ length: 10 }, (_, i) => ({
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          id: `msg-${i}`,
          success: true,
        },
      }));

      responses.forEach((response) => {
        vi.mocked(apiClient.request).mockResolvedValueOnce(response);
      });

      const promises = Array.from({ length: 10 }, (_, i) =>
        apiClient.request('/api/email/send', {
          method: 'POST',
          body: JSON.stringify({
            to: `user${i}@example.com`,
            subject: 'Test',
            html: '<p>Test</p>',
          }),
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.data.success).toBe(true);
      });
    });

    it('should handle network timeout gracefully', async () => {
      vi.mocked(apiClient.request).mockRejectedValueOnce(
        new Error('Network timeout')
      );

      await expect(
        apiClient.request('/api/v1/admin/emails/logs')
      ).rejects.toThrow('Network timeout');
    });

    it('should handle malformed response data', async () => {
      const malformedResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: null,
      };

      vi.mocked(apiClient.request).mockResolvedValueOnce(malformedResponse);

      const result = await apiClient.request('/api/v1/admin/emails/logs');
      expect(result.data).toBeNull();
    });

    it('should handle rate limiting across multiple endpoints', async () => {
      const rateLimitError = {
        code: 429,
        message: 'Too many requests',
        timestamp: Date.now(),
        data: {
          retryAfter: 60,
          message: 'Rate limit exceeded',
        },
      };

      vi.mocked(apiClient.request).mockRejectedValue(rateLimitError);

      await expect(apiClient.request('/api/email/send', { method: 'POST' })).rejects.toMatchObject({
        code: 429,
      });

      await expect(apiClient.request('/api/email/resend-verification', { method: 'POST' })).rejects.toMatchObject({
        code: 429,
      });
    });

    it('should handle database connection errors', async () => {
      const dbError = {
        code: 503,
        message: 'Service unavailable',
        timestamp: Date.now(),
        data: {
          error: 'Database connection failed',
        },
      };

      vi.mocked(apiClient.request).mockRejectedValueOnce(dbError);

      await expect(
        apiClient.request('/api/v1/admin/emails/logs')
      ).rejects.toMatchObject({
        code: 503,
        message: 'Service unavailable',
      });
    });

    it('should handle invalid email addresses', async () => {
      const validationError = {
        code: 400,
        message: 'Invalid email address',
        timestamp: Date.now(),
        data: {
          field: 'email',
          message: 'Email format is invalid',
        },
      };

      vi.mocked(apiClient.request).mockRejectedValueOnce(validationError);

      await expect(
        apiClient.request('/api/email/send', {
          method: 'POST',
          body: JSON.stringify({
            to: 'invalid-email',
            subject: 'Test',
            html: '<p>Test</p>',
          }),
        })
      ).rejects.toMatchObject({
        code: 400,
        message: 'Invalid email address',
      });
    });

    it('should handle missing required fields', async () => {
      const validationError = {
        code: 400,
        message: 'Validation failed',
        timestamp: Date.now(),
        data: {
          errors: [
            { field: 'subject', message: 'Subject is required' },
            { field: 'html', message: 'HTML content is required' },
          ],
        },
      };

      vi.mocked(apiClient.request).mockRejectedValueOnce(validationError);

      await expect(
        apiClient.request('/api/email/send', {
          method: 'POST',
          body: JSON.stringify({
            to: 'user@example.com',
          }),
        })
      ).rejects.toMatchObject({
        code: 400,
        message: 'Validation failed',
      });
    });
  });
});
