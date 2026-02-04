package com.polaris.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.polaris.common.result.Result;
import com.polaris.entity.EmailVerificationLog;
import com.polaris.security.RequireAdmin;
import com.polaris.service.VerificationLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 验证码监控控制器
 * 提供验证码系统的监控统计数据
 */
@Slf4j
@Tag(name = "验证码监控", description = "验证码监控相关接口")
@RestController
@RequestMapping("/api/admin/verification-monitoring")
@RequireAdmin
@RequiredArgsConstructor
public class VerificationMonitoringController {
    
    private final VerificationLogService verificationLogService;
    
    /**
     * 获取验证码统计数据
     */
    @Operation(summary = "获取验证码统计数据")
    @GetMapping("/stats")
    public Result<VerificationStats> getStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        // 如果没有指定时间范围，默认最近24小时
        if (startDate == null || endDate == null) {
            endDate = LocalDateTime.now();
            startDate = endDate.minusHours(24);
        }
        
        log.info("获取验证码统计数据: startDate={}, endDate={}", startDate, endDate);
        
        try {
            // 获取总数和成功数
            Long totalCount = verificationLogService.countByDateRange(startDate, endDate);
            Long successCount = verificationLogService.countSuccessByDateRange(startDate, endDate);
            
            // 计算统计数据
            VerificationStats stats = new VerificationStats();
            stats.setTotalSent(totalCount != null ? totalCount.intValue() : 0);
            stats.setTotalVerified(successCount != null ? successCount.intValue() : 0);
            stats.setTotalFailed(stats.getTotalSent() - stats.getTotalVerified());
            
            // 计算成功率
            if (stats.getTotalSent() > 0) {
                stats.setSuccessRate((double) stats.getTotalVerified() / stats.getTotalSent() * 100);
            } else {
                stats.setSuccessRate(0.0);
            }
            
            // 计算平均验证时间
            Double avgTime = verificationLogService.calculateAvgVerificationTime(startDate, endDate);
            stats.setAvgVerificationTime(avgTime != null ? avgTime : 0.0);
            
            return Result.success(stats);
        } catch (Exception e) {
            log.error("获取验证码统计数据失败", e);
            return Result.error(500, "获取统计数据失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取时间序列数据
     */
    @Operation(summary = "获取时间序列数据")
    @GetMapping("/time-series")
    public Result<List<TimeSeriesData>> getTimeSeries(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "1") int intervalHours) {
        
        // 如果没有指定时间范围，默认最近24小时
        if (startDate == null || endDate == null) {
            endDate = LocalDateTime.now();
            startDate = endDate.minusHours(24);
        }
        
        log.info("获取时间序列数据: startDate={}, endDate={}, intervalHours={}", 
                startDate, endDate, intervalHours);
        
        try {
            // 实现按小时分组的统计查询
            List<Map<String, Object>> hourlyData = 
                    verificationLogService.countByHourlyInterval(startDate, endDate);
            
            // 转换为响应格式
            List<TimeSeriesData> timeSeriesData = hourlyData.stream()
                    .map(map -> {
                        TimeSeriesData data = new TimeSeriesData();
                        data.setTime((String) map.get("time"));
                        data.setSent(((Number) map.get("sent")).intValue());
                        data.setVerified(((Number) map.get("verified")).intValue());
                        data.setFailed(((Number) map.get("failed")).intValue());
                        Object successRate = map.get("success_rate");
                        data.setSuccessRate(successRate != null ? ((Number) successRate).doubleValue() : 0.0);
                        return data;
                    })
                    .toList();
            
            return Result.success(timeSeriesData);
        } catch (Exception e) {
            log.error("获取时间序列数据失败", e);
            return Result.error(500, "获取时间序列数据失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取按用途统计的数据
     */
    @Operation(summary = "获取按用途统计的数据")
    @GetMapping("/purpose-stats")
    public Result<List<PurposeStats>> getPurposeStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        // 如果没有指定时间范围，默认最近24小时
        if (startDate == null || endDate == null) {
            endDate = LocalDateTime.now();
            startDate = endDate.minusHours(24);
        }
        
        log.info("获取按用途统计的数据: startDate={}, endDate={}", startDate, endDate);
        
        try {
            // 获取各用途的成功率统计
            List<Map<String, Object>> successRateData = 
                    verificationLogService.countSuccessRateByPurpose(startDate, endDate);
            
            // 转换为响应格式
            List<PurposeStats> stats = successRateData.stream()
                    .map(map -> {
                        PurposeStats stat = new PurposeStats();
                        stat.setPurpose((String) map.get("purpose"));
                        stat.setCount(((Number) map.get("total")).intValue());
                        Object successRate = map.get("success_rate");
                        stat.setSuccessRate(successRate != null ? ((Number) successRate).doubleValue() : 0.0);
                        return stat;
                    })
                    .toList();
            
            return Result.success(stats);
        } catch (Exception e) {
            log.error("获取按用途统计的数据失败", e);
            return Result.error(500, "获取按用途统计的数据失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取限流统计数据
     */
    @Operation(summary = "获取限流统计数据")
    @GetMapping("/rate-limit-stats")
    public Result<RateLimitStats> getRateLimitStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        log.info("获取限流统计数据: startDate={}, endDate={}", startDate, endDate);
        
        try {
            // 实现限流统计查询
            // 注意：限流数据存储在 Redis 中，这里返回模拟数据
            // 如果需要真实数据，需要在 RateLimiterService 中添加统计方法
            RateLimitStats stats = new RateLimitStats();
            stats.setEmailLimitTriggered(0);
            stats.setIpLimitTriggered(0);
            stats.setDailyLimitTriggered(0);
            
            return Result.success(stats);
        } catch (Exception e) {
            log.error("获取限流统计数据失败", e);
            return Result.error(500, "获取限流统计数据失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取验证日志列表
     */
    @Operation(summary = "获取验证日志列表")
    @GetMapping("/logs")
    public Result<IPage<EmailVerificationLog>> getLogs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String purpose,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Integer success,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        log.info("获取验证日志列表: page={}, size={}, email={}, purpose={}, action={}, success={}", 
                page, size, email, purpose, action, success);
        
        try {
            Page<EmailVerificationLog> pageParam = new Page<>(page, size);
            IPage<EmailVerificationLog> logs = verificationLogService.findByQuery(
                    pageParam, email, purpose, action, success, startDate, endDate);
            
            return Result.success(logs);
        } catch (Exception e) {
            log.error("获取验证日志列表失败", e);
            return Result.error(500, "获取验证日志列表失败: " + e.getMessage());
        }
    }
    
    /**
     * 导出验证日志
     */
    @Operation(summary = "导出验证日志")
    @GetMapping("/logs/export")
    public Result<List<EmailVerificationLog>> exportLogs(
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String purpose,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Integer success,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        log.info("导出验证日志: email={}, purpose={}, action={}, success={}", 
                email, purpose, action, success);
        
        try {
            // 导出时不分页，获取所有符合条件的记录（限制最多10000条）
            Page<EmailVerificationLog> pageParam = new Page<>(1, 10000);
            IPage<EmailVerificationLog> logs = verificationLogService.findByQuery(
                    pageParam, email, purpose, action, success, startDate, endDate);
            
            return Result.success(logs.getRecords());
        } catch (Exception e) {
            log.error("导出验证日志失败", e);
            return Result.error(500, "导出验证日志失败: " + e.getMessage());
        }
    }
    
    // DTO Classes
    
    @Data
    public static class VerificationStats {
        private int totalSent;
        private int totalVerified;
        private int totalFailed;
        private double successRate;
        private double avgVerificationTime;
    }
    
    @Data
    public static class TimeSeriesData {
        private String time;
        private int sent;
        private int verified;
        private int failed;
        private double successRate;
    }
    
    @Data
    public static class PurposeStats {
        private String purpose;
        private int count;
        private double successRate;
    }
    
    @Data
    public static class RateLimitStats {
        private int emailLimitTriggered;
        private int ipLimitTriggered;
        private int dailyLimitTriggered;
    }
}
