package com.polaris.email.service;

import com.polaris.common.result.PageResult;
import com.polaris.email.dto.SendEmailResponse;
import com.polaris.email.entity.EmailPriority;
import com.polaris.email.entity.EmailQueue;

import java.util.List;

/**
 * 邮件队列服务接口
 */
public interface EmailQueueService {
    
    /**
     * 将邮件加入队列
     * 
     * @param recipient 收件人
     * @param subject 主题
     * @param htmlContent HTML 内容
     * @param textContent 纯文本内容
     * @param emailType 邮件类型
     * @param priority 优先级
     * @return 队列 ID
     */
    Long enqueue(String recipient, String subject, String htmlContent, String textContent, 
                 String emailType, EmailPriority priority);
    
    /**
     * 获取待发送的邮件（按优先级排序）
     * 
     * @param limit 限制数量
     * @return 待发送的邮件列表
     */
    List<EmailQueue> getPendingEmails(int limit);
    
    /**
     * 处理单个队列项
     * 
     * @param queueItem 队列项
     * @return 处理结果
     */
    SendEmailResponse processQueueItem(EmailQueue queueItem);
    
    /**
     * 获取队列长度
     * 
     * @return 队列长度
     */
    long getQueueLength();
    
    /**
     * 获取处理速度（最近1小时）
     * 
     * @return 处理速度（邮件数/小时）
     */
    double getProcessingSpeed();
    
    /**
     * 获取失败率（最近24小时）
     * 
     * @return 失败率
     */
    double getFailureRate();
    
    /**
     * 手动重试失败的邮件
     * 
     * @param queueId 队列 ID
     * @return 重试结果
     */
    SendEmailResponse retryFailedEmail(Long queueId);
    
    /**
     * 分页获取邮件队列列表
     * 
     * @param page 页码
     * @param size 每页大小
     * @param status 状态过滤
     * @param priority 优先级过滤
     * @param sortBy 排序字段
     * @param sortOrder 排序方向
     * @return 分页结果
     */
    PageResult<EmailQueue> getQueueList(Integer page, Integer size, String status, String priority, String sortBy, String sortOrder);
    
    /**
     * 检查队列是否启用
     * 
     * @return 是否启用
     */
    boolean isQueueEnabled();
    
    /**
     * 获取工作线程数
     * 
     * @return 工作线程数
     */
    int getWorkerThreads();
    
    /**
     * 获取批处理大小
     * 
     * @return 批处理大小
     */
    int getBatchSize();
    
    /**
     * 取消待发送邮件
     * 
     * @param queueId 队列ID
     * @return 是否成功
     */
    boolean cancelEmail(Long queueId);
    
    /**
     * 修改邮件优先级
     * 
     * @param queueId 队列ID
     * @param priority 新优先级
     * @return 是否成功
     */
    boolean updatePriority(Long queueId, EmailPriority priority);
    
    /**
     * 暂停队列处理
     */
    void pauseQueue();
    
    /**
     * 恢复队列处理
     */
    void resumeQueue();
    
    /**
     * 设置 Worker 线程数
     * 
     * @param threads 线程数
     */
    void setWorkerThreads(int threads);
    
    /**
     * 设置批处理大小
     * 
     * @param size 批处理大小
     */
    void setBatchSize(int size);
}
