package com.polaris.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.polaris.entity.EmailSuppression;
import com.polaris.mapper.EmailSuppressionMapper;
import com.polaris.service.SuppressionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 邮件抑制列表服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SuppressionServiceImpl implements SuppressionService {
    
    private final EmailSuppressionMapper suppressionMapper;
    
    /**
     * 软退信阈值：超过此次数将加入抑制列表
     */
    private static final int SOFT_BOUNCE_THRESHOLD = 3;
    
    @Override
    public boolean isSuppressed(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        
        EmailSuppression suppression = suppressionMapper.findByEmail(email.toLowerCase());
        return suppression != null;
    }
    
    @Override
    @Transactional
    public EmailSuppression handleHardBounce(String email, String notes) {
        log.info("处理硬退信事件: email={}", email);
        
        // 检查是否已存在
        EmailSuppression existing = suppressionMapper.findByEmail(email.toLowerCase());
        if (existing != null) {
            log.info("邮箱已在抑制列表中: email={}", email);
            return existing;
        }
        
        // 创建新的抑制记录
        EmailSuppression suppression = new EmailSuppression();
        suppression.setEmail(email.toLowerCase());
        suppression.setReason("HARD_BOUNCE");
        suppression.setSource("AWS_SES");
        suppression.setSoftBounceCount(0);
        suppression.setNotes(notes);
        
        suppressionMapper.insert(suppression);
        log.info("邮箱已加入抑制列表（硬退信）: email={}, id={}", email, suppression.getId());
        
        return suppression;
    }
    
    @Override
    @Transactional
    public EmailSuppression handleSoftBounce(String email, String notes) {
        log.info("处理软退信事件: email={}", email);
        
        // 检查是否已存在
        EmailSuppression existing = suppressionMapper.findByEmail(email.toLowerCase());
        
        if (existing != null) {
            // 如果已经在抑制列表中，不再处理
            log.info("邮箱已在抑制列表中: email={}", email);
            return existing;
        }
        
        // 查找是否有软退信记录（可能已被删除但需要计数）
        LambdaQueryWrapper<EmailSuppression> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(EmailSuppression::getEmail, email.toLowerCase())
               .eq(EmailSuppression::getReason, "SOFT_BOUNCE");
        EmailSuppression softBounceRecord = suppressionMapper.selectOne(wrapper);
        
        if (softBounceRecord == null) {
            // 创建新的软退信记录
            softBounceRecord = new EmailSuppression();
            softBounceRecord.setEmail(email.toLowerCase());
            softBounceRecord.setReason("SOFT_BOUNCE");
            softBounceRecord.setSource("AWS_SES");
            softBounceRecord.setSoftBounceCount(1);
            softBounceRecord.setNotes(notes);
            suppressionMapper.insert(softBounceRecord);
            
            log.info("创建软退信记录: email={}, count=1", email);
            return null; // 未达到阈值
        } else {
            // 增加计数
            int newCount = softBounceRecord.getSoftBounceCount() + 1;
            softBounceRecord.setSoftBounceCount(newCount);
            softBounceRecord.setNotes(notes);
            suppressionMapper.updateById(softBounceRecord);
            
            log.info("更新软退信计数: email={}, count={}", email, newCount);
            
            // 检查是否达到阈值
            if (newCount >= SOFT_BOUNCE_THRESHOLD) {
                log.warn("软退信次数达到阈值，加入抑制列表: email={}, count={}", email, newCount);
                return softBounceRecord;
            }
            
            return null; // 未达到阈值
        }
    }
    
    @Override
    @Transactional
    public EmailSuppression handleComplaint(String email, String notes) {
        log.info("处理投诉事件: email={}", email);
        
        // 检查是否已存在
        EmailSuppression existing = suppressionMapper.findByEmail(email.toLowerCase());
        if (existing != null) {
            log.info("邮箱已在抑制列表中: email={}", email);
            return existing;
        }
        
        // 创建新的抑制记录
        EmailSuppression suppression = new EmailSuppression();
        suppression.setEmail(email.toLowerCase());
        suppression.setReason("COMPLAINT");
        suppression.setSource("AWS_SES");
        suppression.setSoftBounceCount(0);
        suppression.setNotes(notes);
        
        suppressionMapper.insert(suppression);
        log.info("邮箱已加入抑制列表（投诉）: email={}, id={}", email, suppression.getId());
        
        return suppression;
    }
    
    @Override
    @Transactional
    public EmailSuppression addToSuppressionList(String email, String reason, String notes) {
        log.info("手动添加邮箱到抑制列表: email={}, reason={}", email, reason);
        
        // 检查是否已存在
        EmailSuppression existing = suppressionMapper.findByEmail(email.toLowerCase());
        if (existing != null) {
            log.info("邮箱已在抑制列表中: email={}", email);
            return existing;
        }
        
        // 创建新的抑制记录
        EmailSuppression suppression = new EmailSuppression();
        suppression.setEmail(email.toLowerCase());
        suppression.setReason(reason);
        suppression.setSource("MANUAL");
        suppression.setSoftBounceCount(0);
        suppression.setNotes(notes);
        
        suppressionMapper.insert(suppression);
        log.info("邮箱已手动加入抑制列表: email={}, id={}", email, suppression.getId());
        
        return suppression;
    }
    
    @Override
    @Transactional
    public boolean removeFromSuppressionList(String email) {
        log.info("从抑制列表中移除邮箱: email={}", email);
        
        EmailSuppression existing = suppressionMapper.findByEmail(email.toLowerCase());
        if (existing == null) {
            log.warn("邮箱不在抑制列表中: email={}", email);
            return false;
        }
        
        // 使用逻辑删除
        int result = suppressionMapper.deleteById(existing.getId());
        
        if (result > 0) {
            log.info("邮箱已从抑制列表中移除: email={}", email);
            return true;
        } else {
            log.error("移除邮箱失败: email={}", email);
            return false;
        }
    }
    
    @Override
    public EmailSuppression getSuppressionRecord(String email) {
        if (email == null || email.trim().isEmpty()) {
            return null;
        }
        
        return suppressionMapper.findByEmail(email.toLowerCase());
    }
}
