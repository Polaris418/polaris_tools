package com.polaris.dto;

import com.polaris.common.base.BaseRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 文件夹查询请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class FolderQueryRequest extends BaseRequest {
    
    /**
     * 父文件夹 ID（可选，用于查询指定目录下的子文件夹）
     */
    private Long parentId;
    
    /**
     * 是否只查询根目录文件夹
     */
    private Boolean rootOnly;
}
