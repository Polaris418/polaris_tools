package com.polaris.service;

import com.polaris.dto.LoginResponse;
import com.polaris.dto.UserLoginRequest;
import com.polaris.dto.UserRegisterRequest;
import com.polaris.dto.UserResponse;
import com.polaris.dto.UserUpdateRequest;
import com.polaris.dto.verification.RegisterWithCodeRequest;
import com.polaris.dto.verification.SendVerificationCodeRequest;
import com.polaris.dto.verification.SendVerificationCodeResponse;

/**
 * 认证服务接口
 */
public interface AuthService {
    
    /**
     * 用户注册
     * @param request 注册请求
     * @return 用户响应
     */
    UserResponse register(UserRegisterRequest request);
    
    /**
     * 用户登录
     * @param request 登录请求
     * @return 登录响应（包含 Token）
     */
    LoginResponse login(UserLoginRequest request);
    
    /**
     * 用户登出
     */
    void logout();
    
    /**
     * 刷新 Token
     * @param refreshToken 刷新令牌
     * @return 新的访问令牌
     */
    String refreshToken(String refreshToken);
    
    /**
     * 获取当前用户信息
     * @return 用户响应
     */
    UserResponse getCurrentUser();
    
    /**
     * 更新用户资料
     * @param request 更新请求
     * @return 用户响应
     */
    UserResponse updateProfile(UserUpdateRequest request);
    
    /**
     * 修改邮箱地址
     * @param newEmail 新邮箱地址
     * @param password 密码（用于确认身份）
     */
    void updateEmail(String newEmail, String password);
    
    /**
     * 发送注册验证码
     * @param request 发送验证码请求
     * @return 发送验证码响应
     */
    SendVerificationCodeResponse sendRegisterCode(SendVerificationCodeRequest request);
    
    /**
     * 使用验证码注册
     * @param request 注册请求
     * @return 登录响应（包含 Token）
     */
    LoginResponse registerWithCode(RegisterWithCodeRequest request);
    
    /**
     * 发送登录验证码
     * @param request 发送验证码请求
     * @return 发送验证码响应
     */
    SendVerificationCodeResponse sendLoginCode(SendVerificationCodeRequest request);
    
    /**
     * 使用验证码登录
     * @param request 登录请求
     * @return 登录响应（包含 Token）
     */
    LoginResponse loginWithCode(com.polaris.dto.verification.LoginWithCodeRequest request);
    
    /**
     * 发送密码重置验证码
     * @param request 发送验证码请求
     * @return 发送验证码响应
     */
    SendVerificationCodeResponse sendResetPasswordCode(SendVerificationCodeRequest request);
    
    /**
     * 验证密码重置验证码
     * @param request 验证码请求
     * @return 包含重置令牌和过期时间的响应
     */
    java.util.Map<String, Object> verifyResetPasswordCode(com.polaris.dto.verification.VerifyCodeRequest request);
    
    /**
     * 重置密码
     * @param request 重置密码请求
     */
    void resetPassword(com.polaris.dto.verification.ResetPasswordRequest request);
    
    /**
     * 发送修改密码验证码
     * @param request 发送验证码请求
     * @return 发送验证码响应
     */
    SendVerificationCodeResponse sendChangePasswordCode(SendVerificationCodeRequest request);
    
    /**
     * 修改密码（需要验证码和旧密码）
     * @param request 修改密码请求
     */
    void changePassword(com.polaris.dto.verification.ChangePasswordRequest request);
    
    /**
     * 检查邮箱是否可用
     * @param email 邮箱地址
     * @return true 表示可用，false 表示已被占用
     */
    boolean checkEmailAvailable(String email);
    
    /**
     * 检查用户名是否可用
     * @param username 用户名
     * @return true 表示可用，false 表示已被占用
     */
    boolean checkUsernameAvailable(String username);
}
