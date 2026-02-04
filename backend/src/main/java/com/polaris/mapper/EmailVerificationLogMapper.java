package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.polaris.entity.EmailVerificationLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 邮件验证日志 Mapper 接口
 */
@Mapper
public interface EmailVerificationLogMapper extends BaseMapper<EmailVerificationLog> {
    
    /**
     * 根据邮箱查询验证日志
     * 
     * @param email 邮箱地址
     * @return 验证日志列表
     */
    @Select("SELECT * FROM email_verification_log " +
            "WHERE email = #{email} " +
            "ORDER BY created_at DESC")
    List<EmailVerificationLog> findByEmail(@Param("email") String email);
    
    /**
     * 根据邮箱和用途查询验证日志
     * 
     * @param email 邮箱地址
     * @param purpose 用途
     * @return 验证日志列表
     */
    @Select("SELECT * FROM email_verification_log " +
            "WHERE email = #{email} AND purpose = #{purpose} " +
            "ORDER BY created_at DESC")
    List<EmailVerificationLog> findByEmailAndPurpose(
        @Param("email") String email,
        @Param("purpose") String purpose
    );
    
    /**
     * 根据IP地址查询验证日志
     * 
     * @param ipAddress IP地址
     * @return 验证日志列表
     */
    @Select("SELECT * FROM email_verification_log " +
            "WHERE ip_address = #{ipAddress} " +
            "ORDER BY created_at DESC")
    List<EmailVerificationLog> findByIpAddress(@Param("ipAddress") String ipAddress);
    
    /**
     * 根据时间范围查询验证日志
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 验证日志列表
     */
    @Select("SELECT * FROM email_verification_log " +
            "WHERE created_at >= #{startDate} AND created_at <= #{endDate} " +
            "ORDER BY created_at DESC")
    List<EmailVerificationLog> findByDateRange(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    /**
     * 根据查询条件分页查询验证日志
     * 
     * @param page 分页参数
     * @param email 邮箱地址（可选）
     * @param purpose 用途（可选）
     * @param action 操作（可选）
     * @param success 是否成功（可选）
     * @param startDate 开始时间（可选）
     * @param endDate 结束时间（可选）
     * @return 验证日志分页数据
     */
    @Select({
        "<script>",
        "SELECT * FROM email_verification_log WHERE 1=1 ",
        "<if test='email != null and email != \"\"'>AND email = #{email}</if>",
        "<if test='purpose != null and purpose != \"\"'>AND purpose = #{purpose}</if>",
        "<if test='action != null and action != \"\"'>AND action = #{action}</if>",
        "<if test='success != null'>AND success = #{success}</if>",
        "<if test='startDate != null'>AND created_at &gt;= #{startDate}</if>",
        "<if test='endDate != null'>AND created_at &lt;= #{endDate}</if>",
        "ORDER BY created_at DESC",
        "</script>"
    })
    IPage<EmailVerificationLog> findByQuery(
        Page<EmailVerificationLog> page,
        @Param("email") String email,
        @Param("purpose") String purpose,
        @Param("action") String action,
        @Param("success") Integer success,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    /**
     * 统计指定时间范围内的验证日志数量
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 日志数量
     */
    @Select("SELECT COUNT(*) FROM email_verification_log " +
            "WHERE created_at >= #{startDate} AND created_at <= #{endDate}")
    Long countByDateRange(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    /**
     * 统计指定时间范围内成功的验证日志数量
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 成功的日志数量
     */
    @Select("SELECT COUNT(*) FROM email_verification_log " +
            "WHERE created_at >= #{startDate} AND created_at <= #{endDate} AND success = 1")
    Long countSuccessByDateRange(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    /**
     * 统计指定时间范围内各操作的日志数量
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 各操作的日志数量
     */
    @Select("SELECT action, COUNT(*) as count FROM email_verification_log " +
            "WHERE created_at >= #{startDate} AND created_at <= #{endDate} " +
            "GROUP BY action")
    List<Map<String, Object>> countByActionInDateRange(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    /**
     * 统计指定时间范围内各用途的日志数量
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 各用途的日志数量
     */
    @Select("SELECT purpose, COUNT(*) as count FROM email_verification_log " +
            "WHERE created_at >= #{startDate} AND created_at <= #{endDate} " +
            "GROUP BY purpose")
    List<Map<String, Object>> countByPurposeInDateRange(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    /**
     * 统计指定时间范围内各用途的成功率
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 各用途的成功率统计
     */
    @Select("SELECT purpose, " +
            "COUNT(*) as total, " +
            "SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count, " +
            "ROUND(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate " +
            "FROM email_verification_log " +
            "WHERE created_at >= #{startDate} AND created_at <= #{endDate} " +
            "GROUP BY purpose")
    List<Map<String, Object>> countSuccessRateByPurpose(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    /**
     * 按小时分组统计验证日志
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 按小时分组的统计数据
     */
    @Select("SELECT " +
            "DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as time, " +
            "SUM(CASE WHEN action = 'send' THEN 1 ELSE 0 END) as sent, " +
            "SUM(CASE WHEN action = 'verify' AND success = 1 THEN 1 ELSE 0 END) as verified, " +
            "SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed, " +
            "ROUND(SUM(CASE WHEN action = 'verify' AND success = 1 THEN 1 ELSE 0 END) * 100.0 / " +
            "NULLIF(SUM(CASE WHEN action = 'verify' THEN 1 ELSE 0 END), 0), 2) as success_rate " +
            "FROM email_verification_log " +
            "WHERE created_at >= #{startDate} AND created_at <= #{endDate} " +
            "GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') " +
            "ORDER BY time")
    List<Map<String, Object>> countByHourlyInterval(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    /**
     * 计算平均验证时间（从发送到验证成功的时间）
     * 注意：这个查询假设同一邮箱和用途的 send 和 verify 操作是配对的
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 平均验证时间（秒）
     */
    @Select("SELECT AVG(TIMESTAMPDIFF(SECOND, send_log.created_at, verify_log.created_at)) as avg_time " +
            "FROM email_verification_log send_log " +
            "INNER JOIN email_verification_log verify_log " +
            "ON send_log.email = verify_log.email " +
            "AND send_log.purpose = verify_log.purpose " +
            "AND send_log.action = 'send' " +
            "AND verify_log.action = 'verify' " +
            "AND verify_log.success = 1 " +
            "AND verify_log.created_at > send_log.created_at " +
            "AND verify_log.created_at <= DATE_ADD(send_log.created_at, INTERVAL 10 MINUTE) " +
            "WHERE send_log.created_at >= #{startDate} AND send_log.created_at <= #{endDate}")
    Double calculateAvgVerificationTime(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
}
