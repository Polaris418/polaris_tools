package com.polaris.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 文档导出记录实体
 * 对应表：t_document_export
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_document_export")
public class DocumentExport extends BaseEntity {
    
    /**
     * 文档 ID
     */
    private Long documentId;
    
    /**
     * 用户 ID
     */
    private Long userId;
    
    /**
     * 导出格式（docx、pdf、html、markdown、latex）
     */
    private String format;
    
    /**
     * 文件大小（字节）
     */
    private Long fileSize;
    
    /**
     * 文件 URL
     */
    private String fileUrl;
    
    /**
     * 批量导出 ID
     */
    private String batchId;
}
