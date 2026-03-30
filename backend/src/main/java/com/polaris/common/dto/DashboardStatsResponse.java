package com.polaris.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 仪表盘统计响应 DTO
 */
@Data
@Schema(description = "仪表盘统计数据")
public class DashboardStatsResponse {
    
    @Schema(description = "总用户数", example = "1000")
    private Long totalUsers;
    
    @Schema(description = "活跃用户数（最近30天有登录）", example = "500")
    private Long activeUsers;
    
    @Schema(description = "工具总数", example = "50")
    private Long totalTools;
    
    @Schema(description = "分类总数", example = "10")
    private Long totalCategories;
    
    @Schema(description = "总使用次数", example = "10000")
    private Long totalUsage;
    
    @Schema(description = "今日新增用户", example = "10")
    private Long newUsersToday;
    
    @Schema(description = "本周新增用户", example = "50")
    private Long newUsersThisWeek;
    
    @Schema(description = "今日使用次数", example = "200")
    private Long usageToday;
}
