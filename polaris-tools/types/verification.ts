/**
 * 验证码与邮箱验证相关类型
 */

export type VerificationPurpose = 'REGISTER' | 'LOGIN' | 'RESET' | 'VERIFY' | 'CHANGE';

export interface SendVerificationCodeRequest {
  email: string;
  purpose: VerificationPurpose;
}

export interface SendVerificationCodeResponse {
  cooldownSeconds: number;
  expiresIn: number;
}

export interface RegisterWithCodeRequest {
  email: string;
  code: string;
  username: string;
  password: string;
  nickname?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  code: string;
}

export interface LoginWithCodeRequest {
  email: string;
  code: string;
  rememberMe?: boolean;
}

export interface VerifyResetCodeRequest {
  email: string;
  code: string;
}

export interface VerifyResetCodeResponse {
  resetToken: string;
  expiresIn: number;
}

export interface ResetPasswordWithTokenRequest {
  resetToken: string;
  newPassword: string;
}

export interface SendChangeEmailCodeRequest {
  newEmail: string;
  password: string;
}

export interface VerifyChangeEmailRequest {
  newEmail: string;
  code: string;
}
