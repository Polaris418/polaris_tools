package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.entity.EmailMetrics;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 邮件指标 Mapper
 */
@Mapper
public interface EmailMetricsMapper extends BaseMapper<EmailMetrics> {
    
    /**
     * 查询指定时间范围内的指标
     */
    @Select("SELECT * FROM email_metrics WHERE metric_hour >= #{startTime} AND metric_hour <= #{endTime} ORDER BY metric_hour DESC")
    List<EmailMetrics> findByTimeRange(@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);
    
    /**
     * 查询最近的指标记录
     */
    @Select("SELECT * FROM email_metrics ORDER BY metric_hour DESC LIMIT #{limit}")
    List<EmailMetrics> findRecent(@Param("limit") int limit);
    
    /**
     * 查询指定小时的指标
     */
    @Select("SELECT * FROM email_metrics WHERE metric_hour = #{metricHour}")
    EmailMetrics findByHour(@Param("metricHour") LocalDateTime metricHour);
}
