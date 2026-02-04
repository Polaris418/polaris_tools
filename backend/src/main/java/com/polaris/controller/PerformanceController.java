package com.polaris.controller;

import com.polaris.common.result.Result;
import com.polaris.service.PerformanceMonitoringService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Performance monitoring controller
 * Provides endpoints to view performance metrics
 */
@Slf4j
@RestController
@RequestMapping("/api/performance")
@RequiredArgsConstructor
public class PerformanceController {
    
    private final PerformanceMonitoringService performanceMonitoringService;
    
    /**
     * Get performance metrics
     */
    @GetMapping("/metrics")
    public Result<Map<String, Object>> getMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        
        // Counters
        metrics.put("codeGenerated", performanceMonitoringService.getCounter("verification.code.generated"));
        metrics.put("codeVerified", performanceMonitoringService.getCounter("verification.code.verified"));
        metrics.put("verificationSuccess", performanceMonitoringService.getCounter("verification.success"));
        metrics.put("verificationFailure", performanceMonitoringService.getCounter("verification.failure"));
        metrics.put("cacheHits", performanceMonitoringService.getCounter("cache.hit"));
        metrics.put("cacheMisses", performanceMonitoringService.getCounter("cache.miss"));
        
        // Calculate rates
        long hits = performanceMonitoringService.getCounter("cache.hit");
        long misses = performanceMonitoringService.getCounter("cache.miss");
        long total = hits + misses;
        double cacheHitRate = total > 0 ? (double) hits / total : 0.0;
        metrics.put("cacheHitRate", String.format("%.2f%%", cacheHitRate * 100));
        
        long success = performanceMonitoringService.getCounter("verification.success");
        long failure = performanceMonitoringService.getCounter("verification.failure");
        long totalVerifications = success + failure;
        double successRate = totalVerifications > 0 ? (double) success / totalVerifications : 0.0;
        metrics.put("verificationSuccessRate", String.format("%.2f%%", successRate * 100));
        
        // Response times
        PerformanceMonitoringService.ResponseTimeStats generateStats = 
                performanceMonitoringService.getResponseTimeStats("generate.code");
        Map<String, Object> generateMetrics = new HashMap<>();
        generateMetrics.put("count", generateStats.getCount());
        generateMetrics.put("average", generateStats.getAverage() + "ms");
        generateMetrics.put("min", generateStats.getMin() + "ms");
        generateMetrics.put("max", generateStats.getMax() + "ms");
        generateMetrics.put("p95", generateStats.getP95() + "ms");
        metrics.put("generateCodeStats", generateMetrics);
        
        PerformanceMonitoringService.ResponseTimeStats verifyStats = 
                performanceMonitoringService.getResponseTimeStats("verify.code");
        Map<String, Object> verifyMetrics = new HashMap<>();
        verifyMetrics.put("count", verifyStats.getCount());
        verifyMetrics.put("average", verifyStats.getAverage() + "ms");
        verifyMetrics.put("min", verifyStats.getMin() + "ms");
        verifyMetrics.put("max", verifyStats.getMax() + "ms");
        verifyMetrics.put("p95", verifyStats.getP95() + "ms");
        metrics.put("verifyCodeStats", verifyMetrics);
        
        return Result.success(metrics);
    }
    
    /**
     * Get performance summary
     */
    @GetMapping("/summary")
    public Result<String> getSummary() {
        performanceMonitoringService.logPerformanceSummary();
        return Result.success("Performance summary logged to console");
    }
    
    /**
     * Health check with performance indicators
     */
    @GetMapping("/health")
    public Result<Map<String, Object>> getHealth() {
        Map<String, Object> health = new HashMap<>();
        
        // Check cache hit rate
        long hits = performanceMonitoringService.getCounter("cache.hit");
        long misses = performanceMonitoringService.getCounter("cache.miss");
        long total = hits + misses;
        double cacheHitRate = total > 0 ? (double) hits / total : 0.0;
        
        boolean cacheHealthy = cacheHitRate >= 0.5; // 50% threshold
        health.put("cacheHealthy", cacheHealthy);
        health.put("cacheHitRate", cacheHitRate);
        
        // Check verification success rate
        long success = performanceMonitoringService.getCounter("verification.success");
        long failure = performanceMonitoringService.getCounter("verification.failure");
        long totalVerifications = success + failure;
        double successRate = totalVerifications > 0 ? (double) success / totalVerifications : 1.0;
        
        boolean verificationHealthy = successRate >= 0.9; // 90% threshold
        health.put("verificationHealthy", verificationHealthy);
        health.put("verificationSuccessRate", successRate);
        
        // Check response times
        PerformanceMonitoringService.ResponseTimeStats generateStats = 
                performanceMonitoringService.getResponseTimeStats("generate.code");
        boolean generateHealthy = generateStats.getP95() < 500; // 500ms threshold
        health.put("generateCodeHealthy", generateHealthy);
        health.put("generateCodeP95", generateStats.getP95());
        
        PerformanceMonitoringService.ResponseTimeStats verifyStats = 
                performanceMonitoringService.getResponseTimeStats("verify.code");
        boolean verifyHealthy = verifyStats.getP95() < 200; // 200ms threshold
        health.put("verifyCodeHealthy", verifyHealthy);
        health.put("verifyCodeP95", verifyStats.getP95());
        
        // Overall health
        boolean healthy = cacheHealthy && verificationHealthy && generateHealthy && verifyHealthy;
        health.put("healthy", healthy);
        health.put("status", healthy ? "UP" : "DEGRADED");
        
        return Result.success(health);
    }
}
