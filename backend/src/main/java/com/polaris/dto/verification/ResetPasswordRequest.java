package com.polaris.dto.verification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 重置密码请求 DTO
 */
@Data
public class ResetPasswordRequest {
    
    /**
     * 重置令牌
     * 通过验证验证码后获得的临时令牌
     */
    @NotBlank(message = "重置令牌不能为空")
    private String resetToken;
    
    /**
     * 新密码
     * 要求：至少8个字符，包含大小写字母、数字
     */
    @NotBlank(message = "新密码不能为空")
    @Size(min = 8, max = 50, message = "密码长度必须在 8-50 之间")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$",
        message = "密码必须包含大小写字母和数字，且长度至少为8位"
    )
    private String newPassword;
}
