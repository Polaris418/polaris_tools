package com.polaris.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 分类实体
 * 对应表：t_category
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_category")
public class Category extends BaseEntity {
    
    /**
     * 分类名称（英文）
     */
    private String name;
    
    /**
     * 分类名称（中文）
     */
    private String nameZh;
    
    /**
     * 图标
     */
    private String icon;
    
    /**
     * 强调色
     */
    private String accentColor;
    
    /**
     * 描述
     */
    private String description;
    
    /**
     * 排序顺序
     */
    private Integer sortOrder;
    
    /**
     * 状态：0-禁用，1-启用
     */
    private Integer status;
    
    /**
     * 工具数量 - 临时字段，用于关联查询
     */
    @TableField(exist = false)
    private Integer toolCount;
}
