import type { Result } from '../types';
import { ApiError } from './http';
import type { HttpRequester } from './http';

const buildAuthHeaders = (client: HttpRequester, contentType?: string): HeadersInit => {
  const token = client.getToken();
  return {
    ...(contentType ? { 'Content-Type': contentType } : {}),
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const fetchBlob = async (
  client: HttpRequester,
  endpoint: string,
  options: RequestInit
): Promise<Blob> => {
  const response = await fetch(`${client.getBaseURL()}${endpoint}`, options);

  if (!response.ok) {
    throw new ApiError(response.status, `Export failed: ${response.statusText}`);
  }

  return response.blob();
};

export const createDocumentsApi = (client: HttpRequester) => ({
  getMd2WordHistory: (search?: string): Promise<Result<any[]>> => {
    const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    return client.request<any[]>(`/api/v1/md2word/history${query}`);
  },

  saveMd2WordHistory: (payload: {
    clientFileId: string;
    documentName: string;
    content: string;
  }): Promise<Result<any>> => {
    return client.request<any>('/api/v1/md2word/history', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteMd2WordHistory: (id: number): Promise<Result<void>> => {
    return client.request<void>(`/api/v1/md2word/history/${id}`, {
      method: 'DELETE',
    });
  },

  renameMd2WordHistory: (id: number, documentName: string): Promise<Result<any>> => {
    return client.request<any>(`/api/v1/md2word/history/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ documentName }),
    });
  },

  export: async (
    documentId: number,
    format: 'docx' | 'pdf' | 'html',
    template: string = 'corporate'
  ): Promise<Blob> => {
    const endpoint = `/api/v1/documents/${documentId}/export?format=${format}&template=${template}`;
    return fetchBlob(client, endpoint, {
      method: 'POST',
      headers: buildAuthHeaders(client),
    });
  },

  exportMarkdown: async (
    markdown: string,
    format: 'docx' | 'pdf' | 'html',
    template: string = 'corporate',
    fileName: string = 'document'
  ): Promise<Blob> => {
    return fetchBlob(client, '/api/v1/documents/export-markdown', {
      method: 'POST',
      headers: buildAuthHeaders(client, 'application/json'),
      body: JSON.stringify({
        markdown,
        format,
        template,
        fileName,
      }),
    });
  },

  batchExport: async (
    documentIds: number[],
    format: 'docx' | 'pdf' | 'html',
    template: string = 'corporate'
  ): Promise<Result<any[]>> => {
    return client.request<any[]>('/api/v1/documents/batch-export', {
      method: 'POST',
      body: JSON.stringify({
        documentIds,
        format,
        template,
      }),
    });
  },

  batchExportDownload: async (
    documentIds: number[],
    format: 'docx' | 'pdf' | 'html',
    template: string = 'corporate'
  ): Promise<Blob> => {
    return fetchBlob(client, '/api/v1/documents/batch-export/download', {
      method: 'POST',
      headers: buildAuthHeaders(client, 'application/json'),
      body: JSON.stringify({
        documentIds,
        format,
        template,
      }),
    });
  },

  preview: (markdown: string): Promise<Result<string>> => {
    return client.request<string>('/api/v1/documents/preview', {
      method: 'POST',
      body: JSON.stringify(markdown),
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  },
});
