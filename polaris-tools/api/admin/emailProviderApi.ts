import type { Result } from '../../types';
import type { EmailProviderInfo, ProviderStatus } from '../../pages/admin/types';
import type { AdminRequester } from './shared';

export const createAdminEmailProviderApi = (requester: AdminRequester) => ({
  getCurrent: (): Promise<Result<EmailProviderInfo>> => {
    return requester.request<EmailProviderInfo>('/api/admin/email-provider/current');
  },

  switch: (provider: string): Promise<Result<string>> => {
    return requester.request<string>('/api/admin/email-provider/switch', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    });
  },

  getStatus: (): Promise<Result<Record<string, ProviderStatus>>> => {
    return requester.request<Record<string, ProviderStatus>>('/api/admin/email-provider/status');
  },
});
