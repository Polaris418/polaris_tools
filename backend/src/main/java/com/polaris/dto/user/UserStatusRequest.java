package com.polaris.dto.user;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 用户状态请求 DTO
 */
@Data
public class UserStatusRequest {
    
    /**
     * 状态：0-禁用，1-启用
     */
    @NotNull(message = "状态不能为空")
    @Min(value = 0, message = "状态必须为0或1")
    @Max(value = 1, message = "状态必须为0或1")
    private Integer status;
}
