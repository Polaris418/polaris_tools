package com.polaris.service.impl;

import com.polaris.dto.DashboardStatsResponse;
import com.polaris.mapper.CategoryMapper;
import com.polaris.mapper.ToolMapper;
import com.polaris.mapper.ToolUsageMapper;
import com.polaris.mapper.UserMapper;
import com.polaris.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * 管理员服务实现类
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminServiceImpl implements AdminService {
    
    private final UserMapper userMapper;
    private final ToolMapper toolMapper;
    private final CategoryMapper categoryMapper;
    private final ToolUsageMapper toolUsageMapper;
    
    @Override
    public DashboardStatsResponse getDashboardStats() {
        log.info("获取仪表盘统计数据开始");
        
        try {
            DashboardStatsResponse stats = new DashboardStatsResponse();
            
            // 总用户数
            stats.setTotalUsers(userMapper.selectCount(null));
            
            // 活跃用户数（最近30天有登录）
            LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
            stats.setActiveUsers(userMapper.countActiveUsers(thirtyDaysAgo));
            
            // 工具总数
            stats.setTotalTools(toolMapper.selectCount(null));
            
            // 分类总数
            stats.setTotalCategories(categoryMapper.selectCount(null));
            
            // 总使用次数
            stats.setTotalUsage(toolUsageMapper.selectCount(null));
            
            // 今日新增用户
            LocalDateTime todayStart = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
            stats.setNewUsersToday(userMapper.countNewUsers(todayStart));
            
            // 本周新增用户
            LocalDateTime weekStart = LocalDateTime.now().minusDays(7);
            stats.setNewUsersThisWeek(userMapper.countNewUsers(weekStart));
            
            // 今日使用次数
            stats.setUsageToday(toolUsageMapper.countUsageAfter(todayStart));
            
            log.info("仪表盘统计数据获取成功: totalUsers={}, activeUsers={}, totalTools={}, totalCategories={}, totalUsage={}, newUsersToday={}, newUsersThisWeek={}, usageToday={}",
                    stats.getTotalUsers(), stats.getActiveUsers(), stats.getTotalTools(), stats.getTotalCategories(),
                    stats.getTotalUsage(), stats.getNewUsersToday(), stats.getNewUsersThisWeek(), stats.getUsageToday());
            
            return stats;
        } catch (Exception e) {
            log.error("获取仪表盘统计数据失败: error={}", e.getMessage(), e);
            throw e;
        }
    }
}
