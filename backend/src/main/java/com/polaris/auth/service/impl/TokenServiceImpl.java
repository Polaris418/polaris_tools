package com.polaris.auth.service.impl;

import com.polaris.email.entity.EmailToken;
import com.polaris.email.mapper.EmailTokenMapper;
import com.polaris.auth.service.TokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

/**
 * Token 服务实现类
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TokenServiceImpl implements TokenService {
    
    private final EmailTokenMapper emailTokenMapper;
    private final SecureRandom secureRandom = new SecureRandom();
    
    @Override
    @Transactional
    public String generateToken(Long userId, String purpose, int validityHours) {
        log.info("生成 Token: userId={}, purpose={}, validityHours={}", userId, purpose, validityHours);
        
        // 1. 作废该用户该用途的所有旧 Token
        int invalidatedCount = emailTokenMapper.invalidateUnusedTokens(userId, purpose);
        if (invalidatedCount > 0) {
            log.info("作废旧 Token: userId={}, purpose={}, count={}", userId, purpose, invalidatedCount);
        }
        
        // 2. 生成 32 字节随机 Token
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        
        // 3. 计算 SHA-256 哈希值
        String tokenHash = hashToken(token);
        
        // 4. 计算过期时间
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(validityHours);
        
        // 5. 保存 Token 记录
        EmailToken emailToken = new EmailToken();
        emailToken.setTokenHash(tokenHash);
        emailToken.setUserId(userId);
        emailToken.setPurpose(purpose);
        emailToken.setExpiresAt(expiresAt);
        emailToken.setUsed(0);
        
        emailTokenMapper.insert(emailToken);
        
        log.info("Token 生成成功: userId={}, purpose={}, tokenId={}, expiresAt={}", 
                userId, purpose, emailToken.getId(), expiresAt);
        
        // 6. 返回 Token 明文（仅此时返回）
        return token;
    }
    
    @Override
    @Transactional
    public Long validateAndUseToken(String token, String purpose) {
        log.info("验证并使用 Token: purpose={}", purpose);
        
        // 1. 验证 Token
        EmailToken emailToken = validateToken(token, purpose);
        if (emailToken == null) {
            log.warn("Token 验证失败: purpose={}", purpose);
            return null;
        }
        
        // 2. 标记为已使用
        int updated = emailTokenMapper.markAsUsed(emailToken.getId(), LocalDateTime.now());
        if (updated == 0) {
            log.error("标记 Token 为已使用失败: tokenId={}", emailToken.getId());
            return null;
        }
        
        log.info("Token 验证并使用成功: tokenId={}, userId={}, purpose={}", 
                emailToken.getId(), emailToken.getUserId(), purpose);
        
        return emailToken.getUserId();
    }
    
    @Override
    public EmailToken validateToken(String token, String purpose) {
        // 1. 计算 Token 哈希值
        String tokenHash = hashToken(token);
        
        // 2. 查找 Token 记录
        EmailToken emailToken = emailTokenMapper.findByTokenHash(tokenHash);
        if (emailToken == null) {
            log.warn("Token 不存在: purpose={}", purpose);
            return null;
        }
        
        // 3. 验证用途
        if (!purpose.equals(emailToken.getPurpose())) {
            log.warn("Token 用途不匹配: expected={}, actual={}", purpose, emailToken.getPurpose());
            return null;
        }
        
        // 4. 验证是否已使用
        if (emailToken.getUsed() == 1) {
            log.warn("Token 已被使用: tokenId={}, usedAt={}", emailToken.getId(), emailToken.getUsedAt());
            return null;
        }
        
        // 5. 验证是否过期
        if (LocalDateTime.now().isAfter(emailToken.getExpiresAt())) {
            log.warn("Token 已过期: tokenId={}, expiresAt={}", emailToken.getId(), emailToken.getExpiresAt());
            return null;
        }
        
        log.debug("Token 验证通过: tokenId={}, userId={}, purpose={}", 
                emailToken.getId(), emailToken.getUserId(), purpose);
        
        return emailToken;
    }
    
    @Override
    @Transactional
    public void invalidateUserTokens(Long userId, String purpose) {
        log.info("作废用户 Token: userId={}, purpose={}", userId, purpose);
        
        int invalidatedCount = emailTokenMapper.invalidateUnusedTokens(userId, purpose);
        
        log.info("作废用户 Token 完成: userId={}, purpose={}, count={}", 
                userId, purpose, invalidatedCount);
    }
    
    /**
     * 计算 Token 的 SHA-256 哈希值
     * 
     * @param token Token 明文
     * @return 哈希值（十六进制字符串）
     */
    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            
            // 转换为十六进制字符串
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            log.error("SHA-256 算法不可用", e);
            throw new RuntimeException("SHA-256 算法不可用", e);
        }
    }
}
