package com.polaris.dto.notification;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * 创建通知请求 DTO
 */
@Data
public class NotificationCreateRequest {
    
    /**
     * 接收用户ID (0表示全站通知，null表示发送给所有用户)
     */
    private Long userId;
    
    /**
     * 是否全站通知
     */
    @NotNull(message = "必须指定是否为全站通知")
    private Boolean isGlobal;
    
    /**
     * 通知类型
     */
    @NotBlank(message = "通知类型不能为空")
    private String type;
    
    /**
     * 通知标题
     */
    @NotBlank(message = "通知标题不能为空")
    private String title;
    
    /**
     * 通知内容
     */
    private String content;
    
    /**
     * 链接地址
     */
    private String linkUrl;
}
