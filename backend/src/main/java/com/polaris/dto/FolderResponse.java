package com.polaris.dto;

import com.polaris.common.base.BaseResponse;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.util.List;

/**
 * 文件夹响应 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class FolderResponse extends BaseResponse {
    
    /**
     * 用户 ID
     */
    private Long userId;
    
    /**
     * 文件夹名称
     */
    private String name;
    
    /**
     * 父文件夹 ID
     */
    private Long parentId;
    
    /**
     * 排序顺序
     */
    private Integer sortOrder;
    
    /**
     * 文档数量
     */
    private Long documentCount;
    
    /**
     * 子文件夹列表（用于树形结构）
     */
    private List<FolderResponse> children;
}
