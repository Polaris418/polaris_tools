package com.polaris.dto;

import com.polaris.common.base.BaseRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 版本更新请求 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class VersionUpdateRequest extends BaseRequest {
    
    /**
     * 版本内容
     */
    private String content;
    
    /**
     * 版本备注
     */
    private String comment;
}
