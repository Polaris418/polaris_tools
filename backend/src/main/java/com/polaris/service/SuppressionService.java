package com.polaris.service;

import com.polaris.entity.EmailSuppression;

/**
 * 邮件抑制列表服务接口
 */
public interface SuppressionService {
    
    /**
     * 检查邮箱是否在抑制列表中
     * 
     * @param email 邮箱地址
     * @return true 如果在抑制列表中，false 否则
     */
    boolean isSuppressed(String email);
    
    /**
     * 处理硬退信事件
     * 立即将邮箱地址加入抑制列表
     * 
     * @param email 邮箱地址
     * @param notes 备注信息
     * @return 抑制记录
     */
    EmailSuppression handleHardBounce(String email, String notes);
    
    /**
     * 处理软退信事件
     * 计数，超过 3 次后加入抑制列表
     * 
     * @param email 邮箱地址
     * @param notes 备注信息
     * @return 抑制记录，如果未达到阈值返回 null
     */
    EmailSuppression handleSoftBounce(String email, String notes);
    
    /**
     * 处理投诉事件
     * 立即将邮箱地址加入抑制列表
     * 
     * @param email 邮箱地址
     * @param notes 备注信息
     * @return 抑制记录
     */
    EmailSuppression handleComplaint(String email, String notes);
    
    /**
     * 手动添加邮箱到抑制列表
     * 
     * @param email 邮箱地址
     * @param reason 抑制原因
     * @param notes 备注信息
     * @return 抑制记录
     */
    EmailSuppression addToSuppressionList(String email, String reason, String notes);
    
    /**
     * 从抑制列表中移除邮箱
     * 
     * @param email 邮箱地址
     * @return true 如果移除成功，false 否则
     */
    boolean removeFromSuppressionList(String email);
    
    /**
     * 获取抑制记录
     * 
     * @param email 邮箱地址
     * @return 抑制记录，如果不存在返回 null
     */
    EmailSuppression getSuppressionRecord(String email);
}
