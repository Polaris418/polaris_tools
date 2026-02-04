package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.entity.EmailAuditLog;
import com.polaris.entity.EmailStatus;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 邮件审计日志 Mapper 接口
 */
@Mapper
public interface EmailAuditLogMapper extends BaseMapper<EmailAuditLog> {
    
    /**
     * 根据收件人查询审计日志
     * 
     * @param recipient 收件人邮箱地址
     * @return 审计日志列表
     */
    @Select("SELECT * FROM email_audit_log WHERE recipient = #{recipient} AND deleted = 0 ORDER BY created_at DESC")
    List<EmailAuditLog> findByRecipient(@Param("recipient") String recipient);
    
    /**
     * 根据状态查询审计日志
     * 
     * @param status 发送状态
     * @return 审计日志列表
     */
    @Select("SELECT * FROM email_audit_log WHERE status = #{status} AND deleted = 0 ORDER BY created_at DESC")
    List<EmailAuditLog> findByStatus(@Param("status") EmailStatus status);
    
    /**
     * 根据邮件类型查询审计日志
     * 
     * @param emailType 邮件类型
     * @return 审计日志列表
     */
    @Select("SELECT * FROM email_audit_log WHERE email_type = #{emailType} AND deleted = 0 ORDER BY created_at DESC")
    List<EmailAuditLog> findByEmailType(@Param("emailType") String emailType);
    
    /**
     * 根据时间范围查询审计日志
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 审计日志列表
     */
    @Select("SELECT * FROM email_audit_log WHERE created_at >= #{startDate} AND created_at <= #{endDate} AND deleted = 0 ORDER BY created_at DESC")
    List<EmailAuditLog> findByDateRange(@Param("startDate") LocalDateTime startDate, 
                                         @Param("endDate") LocalDateTime endDate);
    
    /**
     * 根据查询条件分页查询审计日志
     * 
     * @param page 分页参数
     * @param recipient 收件人邮箱地址（可选）
     * @param status 发送状态（可选）
     * @param emailType 邮件类型（可选）
     * @param startDate 开始时间（可选）
     * @param endDate 结束时间（可选）
     * @return 审计日志分页数据
     */
    com.baomidou.mybatisplus.core.metadata.IPage<EmailAuditLog> findByQuery(
        com.baomidou.mybatisplus.extension.plugins.pagination.Page<EmailAuditLog> page,
        @Param("recipient") String recipient,
        @Param("status") EmailStatus status,
        @Param("emailType") String emailType,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    /**
     * 统计指定时间范围内的邮件发送数量
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 邮件发送数量
     */
    @Select("SELECT COUNT(*) FROM email_audit_log WHERE created_at >= #{startDate} AND created_at <= #{endDate} AND deleted = 0")
    Long countByDateRange(@Param("startDate") LocalDateTime startDate, 
                          @Param("endDate") LocalDateTime endDate);
    
    /**
     * 统计指定状态的邮件数量
     * 
     * @param status 发送状态
     * @return 邮件数量
     */
    @Select("SELECT COUNT(*) FROM email_audit_log WHERE status = #{status} AND deleted = 0")
    Long countByStatus(@Param("status") EmailStatus status);
    
    /**
     * 统计指定时间范围内各状态的邮件数量
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 各状态的邮件数量
     */
    @Select("SELECT status, COUNT(*) as count FROM email_audit_log " +
            "WHERE created_at >= #{startDate} AND created_at <= #{endDate} AND deleted = 0 " +
            "GROUP BY status")
    List<java.util.Map<String, Object>> countByStatusInDateRange(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
}
