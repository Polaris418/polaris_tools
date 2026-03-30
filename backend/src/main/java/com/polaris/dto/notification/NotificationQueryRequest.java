package com.polaris.dto.notification;

import com.polaris.common.base.BaseRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 通知查询请求 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class NotificationQueryRequest extends BaseRequest {
    
    /**
     * 通知类型
     */
    private String type;
    
    /**
     * 是否已读：0-未读，1-已读，null-全部
     */
    private Integer isRead;
    
    /**
     * 是否包含已删除的记录（仅管理员）
     */
    private Boolean includeDeleted;
}
