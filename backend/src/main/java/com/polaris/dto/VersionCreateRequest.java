package com.polaris.dto;

import com.polaris.common.base.BaseRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 版本创建请求 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class VersionCreateRequest extends BaseRequest {
    
    /**
     * 文档 ID
     */
    private Long documentId;
    
    /**
     * 版本内容
     */
    private String content;
    
    /**
     * 版本备注
     */
    private String comment;
}
