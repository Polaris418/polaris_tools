package com.polaris.service.impl;

import com.polaris.dto.PopularToolData;
import com.polaris.dto.TrendDataPoint;
import com.polaris.mapper.ToolMapper;
import com.polaris.mapper.ToolUsageMapper;
import com.polaris.mapper.UserMapper;
import com.polaris.service.AdminStatisticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 管理员统计服务实现类
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminStatisticsServiceImpl implements AdminStatisticsService {
    
    private final ToolUsageMapper toolUsageMapper;
    private final UserMapper userMapper;
    private final ToolMapper toolMapper;
    
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    
    @Override
    public List<TrendDataPoint> getUsageTrend(Integer days) {
        log.info("获取使用趋势数据开始: days={}", days);
        
        try {
            LocalDateTime startDate = LocalDateTime.now().minusDays(days);
            
            // 查询每日使用量
            List<Map<String, Object>> dailyUsage = toolUsageMapper.getDailyUsageCount(startDate);
            
            // 转换为Map以便快速查找
            Map<String, Integer> usageMap = dailyUsage.stream()
                .collect(Collectors.toMap(
                    map -> map.get("date").toString(),
                    map -> ((Number) map.get("count")).intValue()
                ));
            
            // 填充缺失日期的零值
            List<TrendDataPoint> result = fillMissingDates(usageMap, days);
            
            log.info("使用趋势数据获取成功: days={}, dataPoints={}, totalUsage={}", 
                     days, result.size(), result.stream().mapToInt(TrendDataPoint::getCount).sum());
            return result;
        } catch (Exception e) {
            log.error("获取使用趋势数据失败: days={}, error={}", days, e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    public List<TrendDataPoint> getUserTrend(Integer days) {
        log.info("获取用户增长趋势数据开始: days={}", days);
        
        try {
            LocalDateTime startDate = LocalDateTime.now().minusDays(days);
            
            // 查询每日注册量
            List<Map<String, Object>> dailyRegistrations = userMapper.getDailyRegistrationCount(startDate);
            
            // 转换为Map以便快速查找
            Map<String, Integer> registrationMap = dailyRegistrations.stream()
                .collect(Collectors.toMap(
                    map -> map.get("date").toString(),
                    map -> ((Number) map.get("count")).intValue()
                ));
            
            // 填充缺失日期的零值
            List<TrendDataPoint> result = fillMissingDates(registrationMap, days);
            
            log.info("用户增长趋势数据获取成功: days={}, dataPoints={}, totalNewUsers={}", 
                     days, result.size(), result.stream().mapToInt(TrendDataPoint::getCount).sum());
            return result;
        } catch (Exception e) {
            log.error("获取用户增长趋势数据失败: days={}, error={}", days, e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    public List<PopularToolData> getPopularTools(Integer limit) {
        log.info("获取热门工具开始: limit={}", limit);
        
        try {
            // 查询使用次数最多的工具
            List<Map<String, Object>> popularTools = toolUsageMapper.getPopularTools(limit);
            
            // 转换为响应格式
            List<PopularToolData> result = popularTools.stream()
                .map(map -> {
                    PopularToolData data = new PopularToolData();
                    data.setToolId(((Number) map.get("tool_id")).longValue());
                    data.setToolName(map.get("tool_name").toString());
                    data.setCount(((Number) map.get("count")).intValue());
                    return data;
                })
                .collect(Collectors.toList());
            
            log.info("热门工具数据获取成功: limit={}, returned={}, topTool={}", 
                     limit, result.size(), 
                     result.isEmpty() ? "none" : result.get(0).getToolName() + "(" + result.get(0).getCount() + ")");
            return result;
        } catch (Exception e) {
            log.error("获取热门工具数据失败: limit={}, error={}", limit, e.getMessage(), e);
            throw e;
        }
    }
    
    /**
     * 填充缺失日期的零值
     * 
     * @param dataMap 日期到数量的映射
     * @param days 天数
     * @return 完整的趋势数据点列表
     */
    private List<TrendDataPoint> fillMissingDates(Map<String, Integer> dataMap, Integer days) {
        List<TrendDataPoint> result = new ArrayList<>();
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days - 1);
        
        // 遍历日期范围，填充数据
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            String dateStr = date.format(DATE_FORMATTER);
            
            TrendDataPoint point = new TrendDataPoint();
            point.setDate(dateStr);
            point.setCount(dataMap.getOrDefault(dateStr, 0));
            
            result.add(point);
        }
        
        return result;
    }
}
