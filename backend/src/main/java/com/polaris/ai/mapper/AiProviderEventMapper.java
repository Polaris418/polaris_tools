package com.polaris.ai.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.ai.dto.AiProviderMetricsAggregate;
import com.polaris.ai.dto.AiProviderTrendPoint;
import com.polaris.ai.entity.AiProviderEvent;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;
import java.util.List;

/**
 * AI 提供商事件 Mapper
 */
@Mapper
public interface AiProviderEventMapper extends BaseMapper<AiProviderEvent> {

    @Select("""
            <script>
            SELECT *
            FROM ai_provider_event
            WHERE deleted = 0
              AND occurred_at <![CDATA[>=]]> #{startTime}
              AND occurred_at <![CDATA[<=]]> #{endTime}
            <if test="providerId != null">
              AND provider_id = #{providerId}
            </if>
            ORDER BY occurred_at DESC
            LIMIT #{limit}
            </script>
            """)
    List<AiProviderEvent> findRecentByTimeRange(
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            @Param("providerId") Long providerId,
            @Param("limit") int limit
    );

    @Select("""
            <script>
            SELECT
              provider_id AS providerId,
              MAX(provider_name) AS providerName,
              MAX(provider_type) AS providerType,
              SUM(CASE WHEN event_type = 'chat_success' THEN 1 ELSE 0 END) AS successCount,
              SUM(CASE WHEN event_type = 'chat_failure' THEN 1 ELSE 0 END) AS failureCount,
              SUM(CASE WHEN event_type = 'test_success' THEN 1 ELSE 0 END) AS testSuccessCount,
              SUM(CASE WHEN event_type = 'test_failure' THEN 1 ELSE 0 END) AS testFailureCount,
              SUM(CASE WHEN event_type = 'fallback' THEN 1 ELSE 0 END) AS fallbackCount,
              CAST(AVG(CASE WHEN event_type = 'chat_success' AND latency_ms IS NOT NULL THEN latency_ms END) AS SIGNED) AS avgLatencyMs,
              MAX(CASE WHEN latency_ms IS NOT NULL THEN latency_ms END) AS lastLatencyMs,
              MAX(CASE WHEN event_type IN ('chat_failure', 'test_failure') THEN message END) AS lastError,
              MAX(CASE WHEN event_type IN ('test_success', 'test_failure') THEN message END) AS lastConnectionMessage,
              MAX(CASE WHEN event_type IN ('chat_success', 'chat_failure') THEN occurred_at END) AS lastUsedAt,
              MAX(CASE WHEN event_type = 'chat_success' THEN occurred_at END) AS lastSuccessAt,
              MAX(CASE WHEN event_type = 'chat_failure' THEN occurred_at END) AS lastFailureAt,
              MAX(CASE WHEN event_type IN ('test_success', 'test_failure') THEN occurred_at END) AS lastTestedAt,
              MAX(CASE WHEN event_type = 'fallback' THEN occurred_at END) AS lastFallbackAt
            FROM ai_provider_event
            WHERE deleted = 0
              AND occurred_at <![CDATA[>=]]> #{startTime}
              AND occurred_at <![CDATA[<=]]> #{endTime}
            GROUP BY provider_id
            </script>
            """)
    List<AiProviderMetricsAggregate> aggregateByProvider(
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime
    );

    @Select("""
            <script>
            SELECT
              metric_hour AS metricHour,
              SUM(CASE WHEN event_type = 'chat_success' THEN 1 ELSE 0 END) AS successCount,
              SUM(CASE WHEN event_type = 'chat_failure' THEN 1 ELSE 0 END) AS failureCount,
              SUM(CASE WHEN event_type = 'fallback' THEN 1 ELSE 0 END) AS fallbackCount,
              AVG(CASE WHEN event_type = 'chat_success' AND latency_ms IS NOT NULL THEN latency_ms END) AS avgLatencyMs
            FROM ai_provider_event
            WHERE deleted = 0
              AND occurred_at <![CDATA[>=]]> #{startTime}
              AND occurred_at <![CDATA[<=]]> #{endTime}
            <if test="providerId != null">
              AND provider_id = #{providerId}
            </if>
            GROUP BY metric_hour
            ORDER BY metric_hour ASC
            </script>
            """)
    List<AiProviderTrendPoint> aggregateTrend(
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            @Param("providerId") Long providerId
    );

    @Update("""
            UPDATE ai_provider_event
            SET deleted = 1,
                updated_at = NOW()
            WHERE deleted = 0
              AND occurred_at <![CDATA[<]]> #{cutoff}
            """)
    int markExpiredAsDeleted(@Param("cutoff") LocalDateTime cutoff);
}
