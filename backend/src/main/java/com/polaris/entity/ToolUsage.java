package com.polaris.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

/**
 * 工具使用记录实体
 * 对应表：t_tool_usage
 * 
 * 继承 BaseEntity 提供标准字段：id, createdAt, updatedAt, deleted
 * 保留 usedAt 作为特殊字段，表示工具实际使用时间（业务时间戳）
 * 
 * 字段语义说明：
 * - usedAt: 工具使用时间（业务时间戳）
 * - createdAt: 记录创建时间（技术时间戳）
 * - updatedAt: 记录更新时间
 * - deleted: 软删除标记
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_tool_usage")
public class ToolUsage extends BaseEntity {
    
    /**
     * 用户 ID
     */
    private Long userId;
    
    /**
     * 工具 ID
     */
    private Long toolId;
    
    /**
     * 使用时间（业务时间戳）
     * 表示工具实际被使用的时间，与 createdAt（记录创建时间）语义不同
     */
    private LocalDateTime usedAt;
    
    /**
     * 使用时长（秒）
     */
    private Integer duration;
    
    /**
     * IP 地址
     */
    private String ipAddress;
    
    /**
     * User-Agent
     */
    private String userAgent;
    
    /**
     * 工具名称（英文）- 临时字段，用于关联查询
     */
    @TableField(exist = false)
    private String toolName;
    
    /**
     * 工具名称（中文）- 临时字段，用于关联查询
     */
    @TableField(exist = false)
    private String toolNameZh;
    
    /**
     * 工具图标 - 临时字段，用于关联查询
     */
    @TableField(exist = false)
    private String toolIcon;
}
