package com.polaris.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

/**
 * 通知更新请求 DTO
 */
@Data
public class NotificationUpdateRequest {
    
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
    
    /**
     * 是否批量更新全站通知（相同的全站通知）
     */
    private Boolean updateAll;
}
