/**
 * 用户与认证相关类型
 */

export interface User {
  name: string;
  plan: string;
  plan_zh?: string;
  avatarUrl: string;
}

export interface UserRegisterRequest {
  username: string;
  password: string;
  email: string;
  nickname?: string;
}

export interface UserLoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  nickname?: string;
  avatar?: string;
  avatarConfig?: string;
  bio?: string;
  language?: string;
  planType: number;
  planExpiredAt?: string;
  status: number;
  lastLoginAt?: string;
  passwordUpdatedAt?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: UserResponse;
}

export interface UpdateProfileRequest {
  nickname?: string;
  email?: string;
  bio?: string;
  language?: string;
  avatarStyle?: string;
  avatarConfig?: string;
}
