package com.polaris.controller;

import com.polaris.common.result.Result;
import com.polaris.dto.LoginResponse;
import com.polaris.dto.UserLoginRequest;
import com.polaris.dto.UserRegisterRequest;
import com.polaris.dto.UserResponse;
import com.polaris.dto.UserUpdateRequest;
import com.polaris.dto.verification.RegisterWithCodeRequest;
import com.polaris.dto.verification.SendVerificationCodeRequest;
import com.polaris.dto.verification.SendVerificationCodeResponse;
import com.polaris.service.AuthService;
import com.polaris.service.RateLimiterService;
import com.polaris.mapper.EmailTemplateMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 认证控制器
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "用户认证 API")
public class AuthController {
    
    private final AuthService authService;
    private final RateLimiterService rateLimiterService;
    private final EmailTemplateMapper emailTemplateMapper;
    
    /**
     * 用户注册（已废弃 - 请使用验证码注册）
     * @deprecated 使用 /auth/register/verify 替代，需要先通过 /auth/register/send-code 获取验证码
     */
    @Deprecated
    @PostMapping("/auth/register")
    @Operation(summary = "用户注册（已废弃）", description = "此接口已废弃，请使用验证码注册")
    public Result<UserResponse> register(@Valid @RequestBody UserRegisterRequest request) {
        // 返回错误，提示使用验证码注册
        return Result.error(400, "此注册方式已停用，请使用邮箱验证码注册。请先调用 /api/v1/auth/register/send-code 获取验证码");
    }
    
    /**
     * 用户登录
     */
    @PostMapping("/auth/login")
    @Operation(summary = "用户登录", description = "用户登录并获取 JWT Token")
    public Result<LoginResponse> login(@Valid @RequestBody UserLoginRequest request) {
        LoginResponse response = authService.login(request);
        return Result.success(response);
    }
    
    /**
     * 用户登出
     */
    @PostMapping("/auth/logout")
    @Operation(summary = "用户登出", description = "用户登出系统")
    public Result<Void> logout() {
        authService.logout();
        return Result.success(null);
    }
    
    /**
     * 刷新 Token
     */
    @PostMapping("/auth/refresh")
    @Operation(summary = "刷新 Token", description = "使用 Refresh Token 获取新的 Access Token")
    public Result<Map<String, String>> refreshToken(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        String newToken = authService.refreshToken(refreshToken);
        return Result.success(Map.of("token", newToken));
    }
    
    /**
     * 获取当前用户信息
     */
    @GetMapping("/auth/me")
    @Operation(summary = "获取当前用户", description = "获取当前登录用户的信息")
    public Result<UserResponse> getCurrentUser() {
        UserResponse response = authService.getCurrentUser();
        return Result.success(response);
    }
    
    /**
     * 更新用户资料
     */
    @PutMapping("/user/profile")
    @Operation(summary = "更新用户资料", description = "更新当前登录用户的个人资料")
    public Result<UserResponse> updateProfile(@RequestBody UserUpdateRequest request) {
        UserResponse response = authService.updateProfile(request);
        return Result.success(response);
    }
    
    /**
     * 修改邮箱地址
     */
    @PutMapping("/user/email")
    @Operation(summary = "修改邮箱", description = "修改当前用户的邮箱地址（需要密码确认）")
    public Result<Void> updateEmail(@RequestBody Map<String, String> request) {
        String newEmail = request.get("newEmail");
        String password = request.get("password");
        authService.updateEmail(newEmail, password);
        return Result.success("邮箱修改成功，验证邮件已发送", null);
    }
    
    /**
     * 发送注册验证码
     */
    @PostMapping("/auth/register/send-code")
    @Operation(summary = "发送注册验证码", description = "向邮箱发送注册验证码")
    public Result<SendVerificationCodeResponse> sendRegisterCode(@Valid @RequestBody SendVerificationCodeRequest request) {
        SendVerificationCodeResponse response = authService.sendRegisterCode(request);
        return Result.success(response);
    }
    
    /**
     * 使用验证码注册
     */
    @PostMapping("/auth/register/verify")
    @Operation(summary = "验证码注册", description = "使用验证码完成用户注册")
    public Result<LoginResponse> registerWithCode(@Valid @RequestBody RegisterWithCodeRequest request) {
        LoginResponse response = authService.registerWithCode(request);
        return Result.success(response);
    }
    
    /**
     * 发送登录验证码
     */
    @PostMapping("/auth/login/send-code")
    @Operation(summary = "发送登录验证码", description = "向邮箱发送登录验证码")
    public Result<SendVerificationCodeResponse> sendLoginCode(@Valid @RequestBody SendVerificationCodeRequest request) {
        SendVerificationCodeResponse response = authService.sendLoginCode(request);
        return Result.success(response);
    }
    
    /**
     * 使用验证码登录
     */
    @PostMapping("/auth/login/verify-code")
    @Operation(summary = "验证码登录", description = "使用验证码完成用户登录")
    public Result<LoginResponse> loginWithCode(@Valid @RequestBody com.polaris.dto.verification.LoginWithCodeRequest request) {
        LoginResponse response = authService.loginWithCode(request);
        return Result.success(response);
    }
    
    /**
     * 发送密码重置验证码
     */
    @PostMapping("/auth/password/send-reset-code")
    @Operation(summary = "发送密码重置验证码", description = "向邮箱发送密码重置验证码")
    public Result<SendVerificationCodeResponse> sendResetPasswordCode(@Valid @RequestBody SendVerificationCodeRequest request) {
        SendVerificationCodeResponse response = authService.sendResetPasswordCode(request);
        return Result.success(response);
    }
    
    /**
     * 验证密码重置验证码
     */
    @PostMapping("/auth/password/verify-code")
    @Operation(summary = "验证密码重置验证码", description = "验证密码重置验证码并返回临时重置令牌")
    public Result<Map<String, Object>> verifyResetPasswordCode(@Valid @RequestBody com.polaris.dto.verification.VerifyCodeRequest request) {
        Map<String, Object> response = authService.verifyResetPasswordCode(request);
        return Result.success(response);
    }
    
    /**
     * 重置密码
     */
    @PostMapping("/auth/password/reset")
    @Operation(summary = "重置密码", description = "使用重置令牌重置密码")
    public Result<Void> resetPassword(@Valid @RequestBody com.polaris.dto.verification.ResetPasswordRequest request) {
        authService.resetPassword(request);
        return Result.success("密码重置成功", null);
    }
    
    /**
     * 发送修改密码验证码
     */
    @PostMapping("/auth/password/send-change-code")
    @Operation(summary = "发送修改密码验证码", description = "向当前用户邮箱发送修改密码验证码")
    public Result<SendVerificationCodeResponse> sendChangePasswordCode(@Valid @RequestBody SendVerificationCodeRequest request) {
        SendVerificationCodeResponse response = authService.sendChangePasswordCode(request);
        return Result.success(response);
    }
    
    /**
     * 修改密码（需要验证码和旧密码）
     */
    @PostMapping("/auth/password/change")
    @Operation(summary = "修改密码", description = "使用验证码和旧密码修改密码")
    public Result<Void> changePassword(@Valid @RequestBody com.polaris.dto.verification.ChangePasswordRequest request) {
        authService.changePassword(request);
        return Result.success("密码修改成功", null);
    }
    
    /**
     * 检查邮箱是否可用
     */
    @GetMapping("/auth/check-email")
    @Operation(summary = "检查邮箱可用性", description = "检查邮箱是否已被注册")
    public Result<Map<String, Boolean>> checkEmailAvailable(@RequestParam String email) {
        boolean available = authService.checkEmailAvailable(email);
        return Result.success(Map.of("available", available));
    }
    
    /**
     * 检查用户名是否可用
     */
    @GetMapping("/auth/check-username")
    @Operation(summary = "检查用户名可用性", description = "检查用户名是否已被占用")
    public Result<Map<String, Boolean>> checkUsernameAvailable(@RequestParam String username) {
        boolean available = authService.checkUsernameAvailable(username);
        return Result.success(Map.of("available", available));
    }
    
    /**
     * 临时重置IP限流接口（仅用于开发环境）
     * TODO: 生产环境应删除此接口
     */
    @PostMapping("/dev/reset-ip-limit")
    @Operation(summary = "重置IP限流(DEV)", description = "开发环境专用 - 重置指定IP的限流")
    public Result<Void> resetIpLimit(@RequestBody Map<String, String> request) {
        String ipAddress = request.get("ipAddress");
        if (ipAddress == null || ipAddress.isEmpty()) {
            return Result.error(400, "IP地址不能为空");
        }
        rateLimiterService.resetIpRateLimit(ipAddress);
        return Result.success("IP限流已重置: " + ipAddress, null);
    }
    
    /**
     * 临时启用所有邮件模板接口（仅用于开发环境）
     * TODO: 生产环境应删除此接口
     */
    @PostMapping("/dev/enable-all-templates")
    @Operation(summary = "启用所有模板(DEV)", description = "开发环境专用 - 启用所有被禁用的邮件模板")
    public Result<Map<String, Object>> enableAllTemplates() {
        int count = emailTemplateMapper.updateAllEnabled();
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("updatedCount", count);
        result.put("message", "已启用 " + count + " 个模板");
        return Result.success(result);
    }
}
