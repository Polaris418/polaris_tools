import { HttpClient, ApiError } from './http';
import { createAuthApi, createUserApi } from './authApi';
import { createEmailApi, createPreferencesApi } from './emailApi';
import {
  createToolsApi,
  createCategoriesApi,
  createFavoritesApi,
  createUsageApi,
} from './toolApi';
import { createDocumentsApi } from './documentApi';
import { createNotificationsApi } from './notificationApi';
import { createAiFormattingApi } from './aiFormattingApi';

const httpClient = new HttpClient();

export const apiClient = {
  request: httpClient.request.bind(httpClient),
  setToken: httpClient.setToken.bind(httpClient),
  clearToken: httpClient.clearToken.bind(httpClient),
  getToken: httpClient.getToken.bind(httpClient),
  getBaseURL: httpClient.getBaseURL.bind(httpClient),

  auth: createAuthApi(httpClient),
  user: createUserApi(httpClient),
  email: createEmailApi(httpClient),
  preferences: createPreferencesApi(httpClient),

  tools: createToolsApi(httpClient),
  categories: createCategoriesApi(httpClient),
  favorites: createFavoritesApi(httpClient),
  usage: createUsageApi(httpClient),

  documents: createDocumentsApi(httpClient),
  notifications: createNotificationsApi(httpClient),
  aiFormatting: createAiFormattingApi(httpClient),
};

export { ApiError };
