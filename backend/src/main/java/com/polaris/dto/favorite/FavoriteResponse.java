package com.polaris.dto.favorite;

import com.polaris.common.base.BaseResponse;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 收藏响应
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class FavoriteResponse extends BaseResponse {
    /**
     * 用户 ID
     */
    private Long userId;
    
    /**
     * 工具 ID
     */
    private Long toolId;
}
