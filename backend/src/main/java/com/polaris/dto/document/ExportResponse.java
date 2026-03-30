package com.polaris.dto.document;

import com.polaris.common.base.BaseResponse;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 导出响应 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ExportResponse extends BaseResponse {
    
    /**
     * 文档 ID
     */
    private Long documentId;
    
    /**
     * 用户 ID
     */
    private Long userId;
    
    /**
     * 导出格式
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
