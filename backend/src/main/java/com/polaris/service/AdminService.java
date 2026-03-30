package com.polaris.service;

import com.polaris.common.dto.DashboardStatsResponse;

/**
 * 管理员服务接口
 */
public interface AdminService {
    
    /**
     * 获取仪表盘统计数据
     * 
     * @return 仪表盘统计响应
     */
    DashboardStatsResponse getDashboardStats();
}
