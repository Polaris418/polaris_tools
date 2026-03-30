package com.polaris.email.controller;

import com.polaris.common.result.Result;
import com.polaris.dto.verification.ChangeEmailRequest;
import com.polaris.dto.verification.SendVerificationCodeResponse;
import com.polaris.dto.verification.VerifyEmailChangeRequest;
import com.polaris.email.service.EmailManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 邮箱管理控制器
 * 处理邮箱修改相关的请求
 */
@RestController
@RequestMapping("/api/v1/user/email")
@RequiredArgsConstructor
@Tag(name = "Email Management", description = "邮箱管理 API")
public class EmailManagementController {
    
    private final EmailManagementService emailManagementService;
    
    /**
     * 发送邮箱修改验证码
     * 需要用户认证，并验证当前密码
     */
    @PostMapping("/send-change-code")
    @Operation(summary = "发送邮箱修改验证码", description = "向新邮箱发送验证码以完成邮箱修改")
    public Result<SendVerificationCodeResponse> sendChangeCode(@Valid @RequestBody ChangeEmailRequest request) {
        SendVerificationCodeResponse response = emailManagementService.sendChangeEmailCode(request);
        return Result.success(response);
    }
    
    /**
     * 验证邮箱修改
     * 验证验证码并完成邮箱修改
     */
    @PostMapping("/verify-change")
    @Operation(summary = "验证邮箱修改", description = "使用验证码完成邮箱修改")
    public Result<Void> verifyChange(@Valid @RequestBody VerifyEmailChangeRequest request) {
        emailManagementService.verifyEmailChange(request);
        return Result.success("邮箱修改成功", null);
    }
}
