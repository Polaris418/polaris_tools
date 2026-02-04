package com.polaris.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 文档文件夹实体
 * 对应表：t_document_folder
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_document_folder")
public class DocumentFolder extends BaseEntity {
    
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
}
