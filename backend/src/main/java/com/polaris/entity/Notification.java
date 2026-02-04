package com.polaris.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

/**
 * 通知实体
 * 对应表：t_notification
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_notification")
public class Notification extends BaseEntity {
    
    /**
     * 接收用户ID
     */
    private Long userId;
    
    /**
     * 是否为全站通知：0-个人通知，1-全站通知
     */
    private Integer isGlobal;
    
    /**
     * 全站通知批次ID（同一批全站通知共享同一个ID）
     */
    private Long globalNotificationId;
    
    /**
     * 通知类型：system-系统通知，subscription-订阅通知，tool_update-工具更新，comment_reply-评论回复
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
     * 是否已读：0-未读，1-已读
     */
    private Integer isRead;
    
    /**
     * 阅读时间
     */
    private LocalDateTime readAt;
}
