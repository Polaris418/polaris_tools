import type { Result } from '../../types';
import type {
  EmailTemplateResponse,
  EmailTemplateQueryRequest,
  EmailTemplateUpdateRequest,
  EmailTemplatePreviewRequest,
  EmailTemplatePreviewResponse,
} from '../../pages/admin/types';
import type { AdminRequester } from './shared';

export const createAdminTemplatesApi = (requester: AdminRequester) => ({
  list: (params?: EmailTemplateQueryRequest): Promise<Result<EmailTemplateResponse[]>> => {
    const queryParams = new URLSearchParams();

    if (params) {
      if (params.language) queryParams.append('language', params.language);
      if (params.code) queryParams.append('code', params.code);
      if (params.enabled !== undefined) queryParams.append('enabled', params.enabled.toString());
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/v1/admin/email/templates?${queryString}` : '/api/v1/admin/email/templates';

    return requester.request<EmailTemplateResponse[]>(endpoint);
  },

  get: (code: string, language: string): Promise<Result<EmailTemplateResponse>> => {
    return requester.request<EmailTemplateResponse>(`/api/v1/admin/email/templates/${code}/${language}`);
  },

  create: (data: {
    code: string;
    name: string;
    language: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    enabled: boolean;
    version?: number;
  }): Promise<Result<EmailTemplateResponse>> => {
    return requester.request<EmailTemplateResponse>('/api/v1/admin/email/templates', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        version: data.version || 1,
      }),
    });
  },

  update: (id: number, data: EmailTemplateUpdateRequest & { code: string; language: string; version: number }): Promise<Result<EmailTemplateResponse>> => {
    return requester.request<EmailTemplateResponse>('/api/v1/admin/email/templates', {
      method: 'POST',
      body: JSON.stringify({
        id,
        ...data,
      }),
    });
  },

  delete: (id: number): Promise<Result<void>> => {
    return requester.request<void>(`/api/v1/admin/email/templates/${id}`, {
      method: 'DELETE',
    });
  },

  preview: (request: EmailTemplatePreviewRequest): Promise<Result<EmailTemplatePreviewResponse>> => {
    return requester.request<EmailTemplatePreviewResponse>('/api/v1/admin/email/templates/preview', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  sendTest: (templateId: number, email: string, variables: Record<string, string>): Promise<Result<{ success: boolean; message: string }>> => {
    return requester.request<{ success: boolean; message: string }>('/api/v1/admin/email/templates/test', {
      method: 'POST',
      body: JSON.stringify({ templateId, email, variables }),
    });
  },
});
