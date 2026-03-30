import type { Result } from '../../types';

export interface AdminRequester {
  request<T>(endpoint: string, options?: RequestInit): Promise<Result<T>>;
}

export const fetchBlobWithToken = async (endpoint: string): Promise<Blob> => {
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  return response.blob();
};
