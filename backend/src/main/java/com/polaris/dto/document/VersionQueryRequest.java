package com.polaris.dto.document;

import com.polaris.common.base.BaseRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 版本查询请求 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class VersionQueryRequest extends BaseRequest {
    
    /**
     * 文档 ID
     */
    private Long documentId;
    
    /**
     * 版本号
     */
    private Integer versionNumber;
}
