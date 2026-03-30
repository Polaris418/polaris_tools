package com.polaris.dto.favorite;

import com.polaris.common.base.BaseRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 收藏查询请求
 * 用于支持 BaseService 接口
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class FavoriteQueryRequest extends BaseRequest {
    // 继承 page, size 等分页参数
    // 收藏查询通常不需要额外的筛选条件
}
