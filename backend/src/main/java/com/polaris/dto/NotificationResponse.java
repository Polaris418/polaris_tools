package com.polaris.dto;

import com.polaris.common.base.BaseResponse;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 通知响应 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class NotificationResponse extends BaseResponse {
    
    /**
     * 接收用户ID
     */
    private Long userId;
    
    /**
     * 是否为全站通知：0-个人通知，1-全站通知
     */
    private Integer isGlobal;
    
    /**
     * 全站通知批次ID
     */
    private Long globalNotificationId;
    
    /**
     * 通知类型
     */
    private String type;
    
    /**
     * 通知标题
     */
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
     * 是否已读
     */
    private Integer isRead;
    
    /**
     * 阅读时间
     */
    private LocalDateTime readAt;
    
    /**
     * 是否已删除：0-未删除，1-已删除
     */
    private Integer deleted;
}
