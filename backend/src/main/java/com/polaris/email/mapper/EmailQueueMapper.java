package com.polaris.email.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.email.entity.EmailQueue;
import com.polaris.email.entity.EmailQueueStatus;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 邮件队列 Mapper
 */
@Mapper
public interface EmailQueueMapper extends BaseMapper<EmailQueue> {
    
    /**
     * 获取待发送的邮件（按优先级和计划时间排序）
     * 
     * @param limit 限制数量
     * @param now 当前时间
     * @return 待发送的邮件列表
     */
    @Select("SELECT * FROM email_queue " +
            "WHERE status = 'PENDING' " +
            "AND deleted = 0 " +
            "AND scheduled_at <= #{now} " +
            "ORDER BY priority DESC, scheduled_at ASC " +
            "LIMIT #{limit}")
    List<EmailQueue> getPendingEmails(@Param("limit") int limit, @Param("now") LocalDateTime now);
    
    /**
     * 统计队列长度（按状态）
     * 
     * @param status 队列状态
     * @return 队列长度
     */
    @Select("SELECT COUNT(*) FROM email_queue " +
            "WHERE status = #{status} " +
            "AND deleted = 0")
    long countByStatus(@Param("status") EmailQueueStatus status);
    
    /**
     * 统计失败率（最近N小时）
     * 只计算已处理的邮件（SENT 和 FAILED），不包括 PENDING 状态
     * 
     * @param hours 小时数
     * @return 失败率（0-1之间的小数）
     */
    @Select("SELECT " +
            "CASE " +
            "  WHEN COUNT(*) = 0 THEN 0 " +
            "  ELSE CAST(SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS DECIMAL) / CAST(COUNT(*) AS DECIMAL) " +
            "END " +
            "FROM email_queue " +
            "WHERE deleted = 0 " +
            "AND status IN ('SENT', 'FAILED') " +
            "AND created_at >= DATE_SUB(NOW(), INTERVAL #{hours} HOUR)")
    Double getFailureRate(@Param("hours") int hours);
}
