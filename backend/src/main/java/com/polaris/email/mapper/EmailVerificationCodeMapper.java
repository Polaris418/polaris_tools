package com.polaris.email.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.email.entity.EmailVerificationCode;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 邮件验证码 Mapper 接口
 */
@Mapper
public interface EmailVerificationCodeMapper extends BaseMapper<EmailVerificationCode> {
    
    /**
     * 按邮箱和用途查询最新验证码
     * 
     * @param email 邮箱地址
     * @param purpose 用途
     * @return 最新的验证码实体
     */
    @Select("SELECT * FROM email_verification_code " +
            "WHERE email = #{email} AND purpose = #{purpose} AND deleted = 0 " +
            "ORDER BY created_at DESC LIMIT 1")
    EmailVerificationCode findLatestByEmailAndPurpose(
        @Param("email") String email, 
        @Param("purpose") String purpose
    );
    
    /**
     * 查询有效的验证码（未使用、未过期、失败次数未超限）
     * 
     * @param email 邮箱地址
     * @param purpose 用途
     * @param now 当前时间
     * @param maxFailCount 最大失败次数
     * @return 有效的验证码实体
     */
    @Select("SELECT * FROM email_verification_code " +
            "WHERE email = #{email} AND purpose = #{purpose} " +
            "AND deleted = 0 AND used = 0 " +
            "AND expires_at > #{now} " +
            "AND fail_count < #{maxFailCount} " +
            "ORDER BY created_at DESC LIMIT 1")
    EmailVerificationCode findValidByEmailAndPurpose(
        @Param("email") String email,
        @Param("purpose") String purpose,
        @Param("now") LocalDateTime now,
        @Param("maxFailCount") Integer maxFailCount
    );
    
    /**
     * 根据邮箱和用途查询所有验证码
     * 
     * @param email 邮箱地址
     * @param purpose 用途
     * @return 验证码列表
     */
    @Select("SELECT * FROM email_verification_code " +
            "WHERE email = #{email} AND purpose = #{purpose} AND deleted = 0 " +
            "ORDER BY created_at DESC")
    List<EmailVerificationCode> findByEmailAndPurpose(
        @Param("email") String email,
        @Param("purpose") String purpose
    );
    
    /**
     * 统计指定时间范围内的验证码数量
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 验证码数量
     */
    @Select("SELECT COUNT(*) FROM email_verification_code " +
            "WHERE created_at >= #{startDate} AND created_at <= #{endDate} AND deleted = 0")
    Long countByDateRange(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    /**
     * 统计指定邮箱在指定时间范围内的验证码数量
     * 
     * @param email 邮箱地址
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 验证码数量
     */
    @Select("SELECT COUNT(*) FROM email_verification_code " +
            "WHERE email = #{email} " +
            "AND created_at >= #{startDate} AND created_at <= #{endDate} AND deleted = 0")
    Long countByEmailAndDateRange(
        @Param("email") String email,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
}
