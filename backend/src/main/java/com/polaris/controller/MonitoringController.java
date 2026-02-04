package com.polaris.controller;

import com.polaris.common.result.Result;
import com.polaris.converter.EmailMetricsConverter;
import com.polaris.dto.email.EmailMetricsResponse;
import com.polaris.dto.email.MonitoringDashboardResponse;
import com.polaris.entity.EmailMetrics;
import com.polaris.security.RequireAdmin;
import com.polaris.service.AlertRuleEngine;
import com.polaris.service.MonitoringService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 邮件监控控制器
 */
@Tag(name = "邮件监控", description = "邮件监控相关接口")
@RestController
@RequestMapping("/api/monitoring")
@RequiredArgsConstructor
public class MonitoringController {
    
    private final MonitoringService monitoringService;
    private final AlertRuleEngine alertRuleEngine;
    private final EmailMetricsConverter emailMetricsConverter;
    
    @Operation(summary = "获取监控仪表板数据")
    @GetMapping("/dashboard")
    @RequireAdmin
    public Result<MonitoringDashboardResponse> getDashboard() {
        // 获取当前小时指标
        EmailMetrics currentMetrics = monitoringService.getCurrentHourMetrics();
        
        // 获取最近24小时指标（从数据库）
        List<EmailMetrics> recentMetrics = monitoringService.getRecentMetrics(24);
        
        // 将当前小时的实时数据也加入到列表中（用于计算平均值）
        List<EmailMetrics> allMetrics = new ArrayList<>(recentMetrics);
        if (currentMetrics.getSentCount() > 0 || currentMetrics.getFailedCount() > 0) {
            allMetrics.add(currentMetrics);
        }
        
        // 构建响应
        MonitoringDashboardResponse response = new MonitoringDashboardResponse();
        response.setCurrentHourMetrics(emailMetricsConverter.toResponse(currentMetrics));
        response.setRecentMetrics(recentMetrics.stream()
            .map(emailMetricsConverter::toResponse)
            .collect(Collectors.toList()));
        
        // 计算汇总统计（包括当前小时）
        int totalSent = allMetrics.stream().mapToInt(EmailMetrics::getSentCount).sum();
        int totalFailed = allMetrics.stream().mapToInt(EmailMetrics::getFailedCount).sum();
        int totalBounce = allMetrics.stream().mapToInt(EmailMetrics::getBounceCount).sum();
        int totalComplaint = allMetrics.stream().mapToInt(EmailMetrics::getComplaintCount).sum();
        
        response.setTotalSent(totalSent);
        response.setTotalFailed(totalFailed);
        response.setTotalBounce(totalBounce);
        response.setTotalComplaint(totalComplaint);
        
        // 计算平均率（包括当前小时）
        if (!allMetrics.isEmpty()) {
            double avgSuccessRate = allMetrics.stream()
                .mapToDouble(EmailMetrics::getSuccessRate)
                .average()
                .orElse(0.0);
            double avgBounceRate = allMetrics.stream()
                .mapToDouble(EmailMetrics::getBounceRate)
                .average()
                .orElse(0.0);
            double avgComplaintRate = allMetrics.stream()
                .mapToDouble(EmailMetrics::getComplaintRate)
                .average()
                .orElse(0.0);
            
            response.setAvgSuccessRate(avgSuccessRate);
            response.setAvgBounceRate(avgBounceRate);
            response.setAvgComplaintRate(avgComplaintRate);
        } else {
            // 如果没有任何数据，设置为0
            response.setAvgSuccessRate(0.0);
            response.setAvgBounceRate(0.0);
            response.setAvgComplaintRate(0.0);
        }
        
        // 检查邮件发送状态
        response.setEmailSendingPaused(alertRuleEngine.isEmailSendingPaused());
        
        // 生成告警列表
        response.setAlerts(generateAlerts(currentMetrics));
        
        return Result.success(response);
    }
    
    @Operation(summary = "获取当前小时指标")
    @GetMapping("/current")
    @RequireAdmin
    public Result<EmailMetricsResponse> getCurrentMetrics() {
        EmailMetrics metrics = monitoringService.getCurrentHourMetrics();
        return Result.success(emailMetricsConverter.toResponse(metrics));
    }
    
    @Operation(summary = "获取指定时间范围的指标")
    @GetMapping("/range")
    @RequireAdmin
    public Result<List<EmailMetricsResponse>> getMetricsByRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        
        List<EmailMetrics> metrics = monitoringService.getMetricsByTimeRange(startTime, endTime);
        List<EmailMetricsResponse> responses = metrics.stream()
            .map(emailMetricsConverter::toResponse)
            .collect(Collectors.toList());
        
        return Result.success(responses);
    }
    
    @Operation(summary = "获取最近N小时的指标")
    @GetMapping("/recent/{hours}")
    @RequireAdmin
    public Result<List<EmailMetricsResponse>> getRecentMetrics(@PathVariable int hours) {
        List<EmailMetrics> metrics = monitoringService.getRecentMetrics(hours);
        List<EmailMetricsResponse> responses = metrics.stream()
            .map(emailMetricsConverter::toResponse)
            .collect(Collectors.toList());
        
        return Result.success(responses);
    }
    
    @Operation(summary = "手动刷新当前指标")
    @PostMapping("/flush")
    @RequireAdmin
    public Result<Void> flushMetrics() {
        monitoringService.flushCurrentMetrics();
        return Result.success();
    }
    
    @Operation(summary = "恢复邮件发送")
    @PostMapping("/resume")
    @RequireAdmin
    public Result<String> resumeEmailSending() {
        alertRuleEngine.resumeEmailSending();
        return Result.success("邮件发送已恢复");
    }
    
    @Operation(summary = "暂停邮件发送")
    @PostMapping("/pause")
    @RequireAdmin
    public Result<String> pauseEmailSending() {
        alertRuleEngine.pauseEmailSending();
        return Result.success("邮件发送已暂停");
    }
    
    /**
     * 生成告警列表
     */
    private List<MonitoringDashboardResponse.AlertInfo> generateAlerts(EmailMetrics metrics) {
        List<MonitoringDashboardResponse.AlertInfo> alerts = new ArrayList<>();
        
        if (metrics == null) {
            return alerts;
        }
        
        // 检查成功率
        if (alertRuleEngine.shouldAlertLowSuccessRate(metrics.getSuccessRate())) {
            MonitoringDashboardResponse.AlertInfo alert = new MonitoringDashboardResponse.AlertInfo();
            alert.setType("LOW_SUCCESS_RATE");
            alert.setLevel("WARNING");
            alert.setMessage("邮件发送成功率过低");
            alert.setCurrentValue(metrics.getSuccessRate());
            alert.setThreshold(95.0);
            alerts.add(alert);
        }
        
        // 检查退信率
        if (alertRuleEngine.shouldAlertHighBounceRate(metrics.getBounceRate())) {
            MonitoringDashboardResponse.AlertInfo alert = new MonitoringDashboardResponse.AlertInfo();
            alert.setType("HIGH_BOUNCE_RATE");
            alert.setLevel("WARNING");
            alert.setMessage("邮件退信率过高");
            alert.setCurrentValue(metrics.getBounceRate());
            alert.setThreshold(5.0);
            alerts.add(alert);
        }
        
        // 检查投诉率
        if (alertRuleEngine.shouldAlertHighComplaintRate(metrics.getComplaintRate())) {
            MonitoringDashboardResponse.AlertInfo alert = new MonitoringDashboardResponse.AlertInfo();
            alert.setType("HIGH_COMPLAINT_RATE");
            alert.setLevel("CRITICAL");
            alert.setMessage("邮件投诉率过高，已自动暂停发送");
            alert.setCurrentValue(metrics.getComplaintRate());
            alert.setThreshold(0.1);
            alerts.add(alert);
        }
        
        return alerts;
    }
}
