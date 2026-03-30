import type {
  Result,
  UserRegisterRequest,
  UserLoginRequest,
  UserResponse,
  LoginResponse,
  UpdateProfileRequest,
  SendVerificationCodeRequest,
  SendVerificationCodeResponse,
  RegisterWithCodeRequest,
  LoginWithCodeRequest,
  VerifyResetCodeRequest,
  VerifyResetCodeResponse,
  ResetPasswordWithTokenRequest,
  ChangePasswordRequest,
} from '../types';
import type { HttpRequester } from './http';

export const createAuthApi = (client: HttpRequester) => ({
  register: (data: UserRegisterRequest): Promise<Result<UserResponse>> => {
    return client.request<UserResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  sendRegisterCode: (data: SendVerificationCodeRequest): Promise<Result<SendVerificationCodeResponse>> => {
    return client.request<SendVerificationCodeResponse>('/api/v1/auth/register/send-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  verifyRegister: (data: RegisterWithCodeRequest): Promise<Result<LoginResponse>> => {
    return client.request<LoginResponse>('/api/v1/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login: (data: UserLoginRequest): Promise<Result<LoginResponse>> => {
    return client.request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  sendLoginCode: (data: SendVerificationCodeRequest): Promise<Result<SendVerificationCodeResponse>> => {
    return client.request<SendVerificationCodeResponse>('/api/v1/auth/login/send-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  verifyLoginCode: (data: LoginWithCodeRequest): Promise<Result<LoginResponse>> => {
    return client.request<LoginResponse>('/api/v1/auth/login/verify-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  logout: (): Promise<Result<void>> => {
    return client.request<void>('/api/v1/auth/logout', {
      method: 'POST',
    });
  },

  refreshToken: (refreshToken: string): Promise<Result<{ token: string }>> => {
    return client.request<{ token: string }>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  getCurrentUser: (): Promise<Result<UserResponse>> => {
    return client.request<UserResponse>('/api/v1/auth/me');
  },

  sendResetCode: (data: SendVerificationCodeRequest): Promise<Result<SendVerificationCodeResponse>> => {
    return client.request<SendVerificationCodeResponse>('/api/v1/auth/password/send-reset-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  verifyResetCode: (data: VerifyResetCodeRequest): Promise<Result<VerifyResetCodeResponse>> => {
    return client.request<VerifyResetCodeResponse>('/api/v1/auth/password/verify-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  resetPassword: (data: ResetPasswordWithTokenRequest): Promise<Result<void>> => {
    return client.request<void>('/api/v1/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  sendChangePasswordCode: (data: SendVerificationCodeRequest): Promise<Result<SendVerificationCodeResponse>> => {
    return client.request<SendVerificationCodeResponse>('/api/v1/auth/password/send-change-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  changePassword: (data: ChangePasswordRequest): Promise<Result<void>> => {
    return client.request<void>('/api/v1/auth/password/change', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  checkEmailAvailable: (email: string): Promise<Result<{ available: boolean }>> => {
    return client.request<{ available: boolean }>(
      `/api/v1/auth/check-email?email=${encodeURIComponent(email)}`
    );
  },

  checkUsernameAvailable: (username: string): Promise<Result<{ available: boolean }>> => {
    return client.request<{ available: boolean }>(
      `/api/v1/auth/check-username?username=${encodeURIComponent(username)}`
    );
  },
});

export const createUserApi = (client: HttpRequester) => ({
  updateProfile: (data: UpdateProfileRequest): Promise<Result<UserResponse>> => {
    return client.request<UserResponse>('/api/v1/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
});
