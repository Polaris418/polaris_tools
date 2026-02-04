package com.polaris.dto;

import lombok.Data;

/**
 * 添加收藏请求
 */
@Data
public class FavoriteCreateRequest {
    /**
     * 工具 ID
     */
    private Long toolId;
}
