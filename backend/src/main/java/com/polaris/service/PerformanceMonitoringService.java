package com.polaris.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.LongAdder;

/**
 * Performance monitoring service
 * Tracks key performance metrics for the verification code system
 */
@Slf4j
@Service
public class PerformanceMonitoringService {
    
    // Metrics storage
    private final ConcurrentHashMap<String, LongAdder> counters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicLong> gauges = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ResponseTimeTracker> timers = new ConcurrentHashMap<>();
    
    /**
     * Record a counter increment
     */
    public void incrementCounter(String name) {
        counters.computeIfAbsent(name, k -> new LongAdder()).increment();
    }
    
    /**
     * Record a gauge value
     */
    public void recordGauge(String name, long value) {
        gauges.computeIfAbsent(name, k -> new AtomicLong()).set(value);
    }
    
    /**
     * Record response time
     */
    public void recordResponseTime(String operation, long timeMs) {
        timers.computeIfAbsent(operation, k -> new ResponseTimeTracker()).record(timeMs);
    }
    
    /**
     * Get counter value
     */
    public long getCounter(String name) {
        LongAdder counter = counters.get(name);
        return counter != null ? counter.sum() : 0;
    }
    
    /**
     * Get gauge value
     */
    public long getGauge(String name) {
        AtomicLong gauge = gauges.get(name);
        return gauge != null ? gauge.get() : 0;
    }
    
    /**
     * Get response time statistics
     */
    public ResponseTimeStats getResponseTimeStats(String operation) {
        ResponseTimeTracker tracker = timers.get(operation);
        return tracker != null ? tracker.getStats() : new ResponseTimeStats();
    }
    
    /**
     * Log performance summary
     */
    public void logPerformanceSummary() {
        log.info("========== Performance Summary ==========");
        log.info("Verification Code Generated: {}", getCounter("verification.code.generated"));
        log.info("Verification Code Verified: {}", getCounter("verification.code.verified"));
        log.info("Verification Success: {}", getCounter("verification.success"));
        log.info("Verification Failure: {}", getCounter("verification.failure"));
        log.info("Cache Hits: {}", getCounter("cache.hit"));
        log.info("Cache Misses: {}", getCounter("cache.miss"));
        
        double cacheHitRate = calculateCacheHitRate();
        log.info("Cache Hit Rate: {:.2f}%", cacheHitRate * 100);
        
        ResponseTimeStats generateStats = getResponseTimeStats("generate.code");
        log.info("Generate Code - Avg: {}ms, P95: {}ms", 
                generateStats.getAverage(), generateStats.getP95());
        
        ResponseTimeStats verifyStats = getResponseTimeStats("verify.code");
        log.info("Verify Code - Avg: {}ms, P95: {}ms", 
                verifyStats.getAverage(), verifyStats.getP95());
        
        log.info("========================================");
    }
    
    /**
     * Calculate cache hit rate
     */
    private double calculateCacheHitRate() {
        long hits = getCounter("cache.hit");
        long misses = getCounter("cache.miss");
        long total = hits + misses;
        return total > 0 ? (double) hits / total : 0.0;
    }
    
    /**
     * Response time tracker
     */
    private static class ResponseTimeTracker {
        private final LongAdder count = new LongAdder();
        private final LongAdder sum = new LongAdder();
        private final AtomicLong min = new AtomicLong(Long.MAX_VALUE);
        private final AtomicLong max = new AtomicLong(Long.MIN_VALUE);
        
        public void record(long timeMs) {
            count.increment();
            sum.add(timeMs);
            
            // Update min
            long currentMin = min.get();
            while (timeMs < currentMin) {
                if (min.compareAndSet(currentMin, timeMs)) {
                    break;
                }
                currentMin = min.get();
            }
            
            // Update max
            long currentMax = max.get();
            while (timeMs > currentMax) {
                if (max.compareAndSet(currentMax, timeMs)) {
                    break;
                }
                currentMax = max.get();
            }
        }
        
        public ResponseTimeStats getStats() {
            long totalCount = count.sum();
            if (totalCount == 0) {
                return new ResponseTimeStats();
            }
            
            long average = sum.sum() / totalCount;
            return new ResponseTimeStats(
                    totalCount,
                    average,
                    min.get(),
                    max.get(),
                    average // Simplified P95 (actual implementation would need histogram)
            );
        }
    }
    
    /**
     * Response time statistics
     */
    public static class ResponseTimeStats {
        private final long count;
        private final long average;
        private final long min;
        private final long max;
        private final long p95;
        
        public ResponseTimeStats() {
            this(0, 0, 0, 0, 0);
        }
        
        public ResponseTimeStats(long count, long average, long min, long max, long p95) {
            this.count = count;
            this.average = average;
            this.min = min;
            this.max = max;
            this.p95 = p95;
        }
        
        public long getCount() { return count; }
        public long getAverage() { return average; }
        public long getMin() { return min; }
        public long getMax() { return max; }
        public long getP95() { return p95; }
    }
}
