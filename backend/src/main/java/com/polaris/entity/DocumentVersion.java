package com.polaris.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

/**
 * 文档版本实体
 * 对应表：t_document_version
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_document_version")
public class DocumentVersion extends BaseEntity {
    
    /**
     * 文档 ID
     */
    private Long documentId;
    
    /**
     * 版本内容
     */
    @TableField(typeHandler = org.apache.ibatis.type.ClobTypeHandler.class)
    private String content;
    
    /**
     * 版本号
     */
    private Integer versionNumber;
    
    /**
     * 过期时间（会员：30天，免费：3天）
     */
    private LocalDateTime expireAt;
}
