package com.polaris.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 用户收藏实体
 * 对应表：t_user_favorite
 * 继承 BaseEntity，包含 id、createdAt、updatedAt、deleted 字段
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_user_favorite")
public class UserFavorite extends BaseEntity {
    
    /**
     * 用户 ID
     */
    private Long userId;
    
    /**
     * 工具 ID
     */
    private Long toolId;
}
