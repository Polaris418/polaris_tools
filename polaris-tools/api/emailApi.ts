import type {
  Result,
  SubscriptionPreferenceResponse,
  SendVerificationCodeResponse,
  SendChangeEmailCodeRequest,
  VerifyChangeEmailRequest,
} from '../types';
import type { HttpRequester } from './http';

export const createEmailApi = (client: HttpRequester) => ({
  verify: (token: string): Promise<Result<number>> => {
    return client.request<number>(`/api/v1/email/verify?token=${encodeURIComponent(token)}`, {
      method: 'POST',
    });
  },

  getVerificationStatus: (): Promise<Result<{
    email: string;
    verified: boolean;
    verifiedAt: string | null;
    cooldownSeconds: number;
    dailyUsageCount: number;
  }>> => {
    return client.request('/api/v1/email/verification-status');
  },

  resendVerification: (): Promise<Result<void>> => {
    return client.request<void>('/api/v1/email/resend-verification', {
      method: 'POST',
    });
  },

  updateEmail: (newEmail: string, password: string): Promise<Result<void>> => {
    return client.request<void>('/api/v1/user/email', {
      method: 'PUT',
      body: JSON.stringify({ newEmail, password }),
    });
  },

  sendChangeEmailCode: (data: SendChangeEmailCodeRequest): Promise<Result<SendVerificationCodeResponse>> => {
    return client.request<SendVerificationCodeResponse>('/api/v1/user/email/send-change-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  verifyChangeEmail: (data: VerifyChangeEmailRequest): Promise<Result<void>> => {
    return client.request<void>('/api/v1/user/email/verify-change', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  verifyResetToken: (token: string): Promise<Result<number>> => {
    return client.request<number>(`/api/v1/email/verify-reset-token?token=${encodeURIComponent(token)}`, {
      method: 'POST',
    });
  },

  resetPassword: (token: string, newPassword: string): Promise<Result<void>> => {
    return client.request<void>(
      `/api/v1/email/reset-password?token=${encodeURIComponent(token)}&newPassword=${encodeURIComponent(newPassword)}`,
      { method: 'POST' }
    );
  },
});

export const createPreferencesApi = (client: HttpRequester) => ({
  get: (): Promise<Result<SubscriptionPreferenceResponse[]>> => {
    return client.request<SubscriptionPreferenceResponse[]>('/api/v1/subscription/preferences');
  },

  update: (preferences: Record<string, boolean>): Promise<Result<string>> => {
    return client.request<string>('/api/v1/subscription/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    });
  },

  unsubscribe: (token: string, reason?: string): Promise<Result<string>> => {
    return client.request<string>('/api/v1/subscription/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ token, reason }),
    });
  },

  unsubscribeByGet: (token: string, reason?: string): Promise<Result<string>> => {
    const params = new URLSearchParams({ token });
    if (reason) params.append('reason', reason);
    return client.request<string>(`/api/v1/subscription/unsubscribe?${params.toString()}`);
  },

  getHistory: (): Promise<Result<SubscriptionPreferenceResponse[]>> => {
    return client.request<SubscriptionPreferenceResponse[]>('/api/v1/subscription/history');
  },
});
