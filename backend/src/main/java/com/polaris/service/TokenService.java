package com.polaris.service;

import com.polaris.entity.EmailToken;

/**
 * Token 服务接口
 * 用于邮箱验证和密码重置的 Token 管理
 */
public interface TokenService {
    
    /**
     * 生成 Token
     * 生成 32 字节随机 Token，存储 SHA-256 哈希值
     * 同一用户同一用途只保留最新的 Token（作废旧 Token）
     * 
     * @param userId 用户 ID
     * @param purpose Token 用途（verify-邮箱验证，reset-密码重置）
     * @param validityHours Token 有效期（小时）
     * @return Token 明文（仅此时返回，不再存储）
     */
    String generateToken(Long userId, String purpose, int validityHours);
    
    /**
     * 验证并使用 Token
     * 验证 Token 是否有效（存在、未过期、未使用）
     * 如果有效，标记为已使用并返回关联的用户 ID
     * 
     * @param token Token 明文
     * @param purpose Token 用途
     * @return 关联的用户 ID，如果 Token 无效则返回 null
     */
    Long validateAndUseToken(String token, String purpose);
    
    /**
     * 验证 Token（不标记为已使用）
     * 仅验证 Token 是否有效，不改变其状态
     * 
     * @param token Token 明文
     * @param purpose Token 用途
     * @return Token 实体，如果 Token 无效则返回 null
     */
    EmailToken validateToken(String token, String purpose);
    
    /**
     * 作废指定用户和用途的所有未使用 Token
     * 
     * @param userId 用户 ID
     * @param purpose Token 用途
     */
    void invalidateUserTokens(Long userId, String purpose);
}
