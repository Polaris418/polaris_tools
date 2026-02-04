package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.entity.VerificationAlertHistory;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 验证码告警历史 Mapper
 * 
 * Requirements: 需求13 - 监控和日志
 */
@Mapper
public interface VerificationAlertHistoryMapper extends BaseMapper<VerificationAlertHistory> {
    
    /**
     * 查询指定时间范围内的告警历史
     * 
     * @param startTime 开始时间
     * @param endTime 结束时间
     * @return 告警历史列表
     */
    @Select("SELECT * FROM verification_alert_history " +
            "WHERE alert_time >= #{startTime} AND alert_time <= #{endTime} " +
            "AND deleted = 0 " +
            "ORDER BY alert_time DESC")
    List<VerificationAlertHistory> findByTimeRange(
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );
    
    /**
     * 查询指定类型的告警历史
     * 
     * @param alertType 告警类型
     * @param limit 限制数量
     * @return 告警历史列表
     */
    @Select("SELECT * FROM verification_alert_history " +
            "WHERE alert_type = #{alertType} " +
            "AND deleted = 0 " +
            "ORDER BY alert_time DESC " +
            "LIMIT #{limit}")
    List<VerificationAlertHistory> findByAlertType(
        @Param("alertType") String alertType,
        @Param("limit") int limit
    );
    
    /**
     * 查询未处理的告警
     * 
     * @return 未处理的告警列表
     */
    @Select("SELECT * FROM verification_alert_history " +
            "WHERE resolved = 0 " +
            "AND deleted = 0 " +
            "ORDER BY alert_time DESC")
    List<VerificationAlertHistory> findUnresolved();
    
    /**
     * 统计指定时间范围内的告警数量
     * 
     * @param startTime 开始时间
     * @param endTime 结束时间
     * @return 告警数量
     */
    @Select("SELECT COUNT(*) FROM verification_alert_history " +
            "WHERE alert_time >= #{startTime} AND alert_time <= #{endTime} " +
            "AND deleted = 0")
    long countByTimeRange(
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );
    
    /**
     * 统计指定级别的告警数量
     * 
     * @param level 告警级别
     * @param startTime 开始时间
     * @param endTime 结束时间
     * @return 告警数量
     */
    @Select("SELECT COUNT(*) FROM verification_alert_history " +
            "WHERE level = #{level} " +
            "AND alert_time >= #{startTime} AND alert_time <= #{endTime} " +
            "AND deleted = 0")
    long countByLevel(
        @Param("level") String level,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );
}
