package com.polaris.dto.suppression;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 添加抑制列表请求
 */
@Data
public class AddSuppressionRequest {
    
    /**
     * 邮箱地址
     */
    @NotBlank(message = "邮箱地址不能为空")
    @Email(message = "邮箱地址格式不正确")
    private String email;
    
    /**
     * 抑制原因
     */
    @NotBlank(message = "抑制原因不能为空")
    private String reason;
    
    /**
     * 备注
     */
    private String notes;
}
