package com.polaris.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.polaris.entity.EmailVerificationLog;
import com.polaris.entity.VerificationPurpose;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 验证日志服务接口
 * 负责记录和查询验证码相关的日志
 */
public interface VerificationLogService {
    
    /**
     * 记录验证码发送日志
     * 
     * @param email 邮箱地址
     * @param purpose 验证码用途
     * @param ipAddress IP地址
     * @param userAgent 用户代理
     * @param success 是否成功
     * @param errorMessage 错误信息（如果失败）
     */
    void logSend(String email, VerificationPurpose purpose, String ipAddress, 
                 String userAgent, boolean success, String errorMessage);
    
    /**
     * 记录验证码验证日志
     * 
     * @param email 邮箱地址
     * @param purpose 验证码用途
     * @param ipAddress IP地址
     * @param userAgent 用户代理
     * @param success 是否成功
     * @param errorMessage 错误信息（如果失败）
     */
    void logVerify(String email, VerificationPurpose purpose, String ipAddress, 
                   String userAgent, boolean success, String errorMessage);
    
    /**
     * 记录验证失败日志
     * 
     * @param email 邮箱地址
     * @param purpose 验证码用途
     * @param ipAddress IP地址
     * @param userAgent 用户代理
     * @param errorMessage 错误信息
     */
    void logFail(String email, VerificationPurpose purpose, String ipAddress, 
                 String userAgent, String errorMessage);
    
    /**
     * 根据邮箱查询验证日志
     * 
     * @param email 邮箱地址
     * @return 验证日志列表
     */
    List<EmailVerificationLog> findByEmail(String email);
    
    /**
     * 根据邮箱和用途查询验证日志
     * 
     * @param email 邮箱地址
     * @param purpose 用途
     * @return 验证日志列表
     */
    List<EmailVerificationLog> findByEmailAndPurpose(String email, VerificationPurpose purpose);
    
    /**
     * 根据IP地址查询验证日志
     * 
     * @param ipAddress IP地址
     * @return 验证日志列表
     */
    List<EmailVerificationLog> findByIpAddress(String ipAddress);
    
    /**
     * 根据查询条件分页查询验证日志（管理员功能）
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
    IPage<EmailVerificationLog> findByQuery(Page<EmailVerificationLog> page,
                                            String email,
                                            String purpose,
                                            String action,
                                            Integer success,
                                            LocalDateTime startDate,
                                            LocalDateTime endDate);
    
    /**
     * 统计指定时间范围内的验证日志数量
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 日志数量
     */
    Long countByDateRange(LocalDateTime startDate, LocalDateTime endDate);
    
    /**
     * 统计指定时间范围内成功的验证日志数量
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 成功的日志数量
     */
    Long countSuccessByDateRange(LocalDateTime startDate, LocalDateTime endDate);
    
    /**
     * 统计指定时间范围内各操作的日志数量
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 各操作的日志数量
     */
    List<Map<String, Object>> countByActionInDateRange(LocalDateTime startDate, LocalDateTime endDate);
    
    /**
     * 统计指定时间范围内各用途的日志数量
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 各用途的日志数量
     */
    List<Map<String, Object>> countByPurposeInDateRange(LocalDateTime startDate, LocalDateTime endDate);
    
    /**
     * 统计指定时间范围内各用途的成功率
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 各用途的成功率统计
     */
    List<Map<String, Object>> countSuccessRateByPurpose(LocalDateTime startDate, LocalDateTime endDate);
    
    /**
     * 按小时分组统计验证日志
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 按小时分组的统计数据
     */
    List<Map<String, Object>> countByHourlyInterval(LocalDateTime startDate, LocalDateTime endDate);
    
    /**
     * 计算平均验证时间（从发送到验证成功的时间）
     * 
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 平均验证时间（秒）
     */
    Double calculateAvgVerificationTime(LocalDateTime startDate, LocalDateTime endDate);
}
