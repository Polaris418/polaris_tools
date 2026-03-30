package com.polaris.dto.document;

import com.polaris.common.base.BaseResponse;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

/**
 * 版本响应 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class VersionResponse extends BaseResponse {
    
    /**
     * 文档 ID
     */
    private Long documentId;
    
    /**
     * 版本内容
     */
    private String content;
    
    /**
     * 版本号
     */
    private Integer versionNumber;
    
    /**
     * 过期时间
     */
    private LocalDateTime expireAt;
}
