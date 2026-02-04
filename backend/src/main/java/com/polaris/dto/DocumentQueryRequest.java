package com.polaris.dto;

import com.polaris.common.base.BaseRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 文档查询请求 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class DocumentQueryRequest extends BaseRequest {
    
    /**
     * 文件夹 ID
     */
    private Long folderId;
    
    /**
     * 标签（逗号分隔，用于过滤）
     */
    private String tags;
    
    /**
     * 关键词（用于搜索标题和内容）
     */
    private String keyword;
    
    /**
     * 是否只查询模板（0-否，1-是）
     */
    private Integer isTemplate;
}
