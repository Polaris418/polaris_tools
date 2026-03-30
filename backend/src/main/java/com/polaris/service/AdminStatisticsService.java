package com.polaris.service;

import com.polaris.common.dto.PopularToolData;
import com.polaris.common.dto.TrendDataPoint;

import java.util.List;

/**
 * 管理员统计服务接口
 */
public interface AdminStatisticsService {
    
    /**
     * 获取使用趋势数据
     * 
     * @param days 天数（查询最近N天的数据）
     * @return 趋势数据点列表
     */
    List<TrendDataPoint> getUsageTrend(Integer days);
    
    /**
     * 获取用户增长趋势
     * 
     * @param days 天数（查询最近N天的数据）
     * @return 趋势数据点列表
     */
    List<TrendDataPoint> getUserTrend(Integer days);
    
    /**
     * 获取热门工具
     * 
     * @param limit 限制数量（返回前N个热门工具）
     * @return 热门工具数据列表
     */
    List<PopularToolData> getPopularTools(Integer limit);
}
