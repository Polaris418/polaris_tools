package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.entity.EmailToken;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.annotations.Delete;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 邮件 Token Mapper 接口
 */
@Mapper
public interface EmailTokenMapper extends BaseMapper<EmailToken> {
    
    /**
     * 根据 Token 哈希值查找 Token
     * 
     * @param tokenHash Token 哈希值
     * @return Token 实体
     */
    @Select("SELECT * FROM email_token WHERE token_hash = #{tokenHash} AND deleted = 0")
    EmailToken findByTokenHash(@Param("tokenHash") String tokenHash);
    
    /**
     * 根据用户 ID 和用途查找未使用的 Token
     * 
     * @param userId 用户 ID
     * @param purpose Token 用途
     * @return Token 列表
     */
    @Select("SELECT * FROM email_token WHERE user_id = #{userId} AND purpose = #{purpose} " +
            "AND used = 0 AND deleted = 0 ORDER BY created_at DESC")
    List<EmailToken> findUnusedByUserIdAndPurpose(@Param("userId") Long userId, 
                                                    @Param("purpose") String purpose);
    
    /**
     * 标记 Token 为已使用
     * 
     * @param id Token ID
     * @param usedAt 使用时间
     * @return 影响行数
     */
    @Update("UPDATE email_token SET used = 1, used_at = #{usedAt}, updated_at = NOW() " +
            "WHERE id = #{id}")
    int markAsUsed(@Param("id") Long id, @Param("usedAt") LocalDateTime usedAt);
    
    /**
     * 作废指定用户和用途的所有未使用 Token
     * 
     * @param userId 用户 ID
     * @param purpose Token 用途
     * @return 影响行数
     */
    @Update("UPDATE email_token SET deleted = 1, updated_at = NOW() " +
            "WHERE user_id = #{userId} AND purpose = #{purpose} AND used = 0 AND deleted = 0")
    int invalidateUnusedTokens(@Param("userId") Long userId, @Param("purpose") String purpose);
    
    /**
     * 删除过期的 Token（物理删除）
     * 
     * @param expiryDate 过期日期（删除此日期之前过期的 Token）
     * @return 影响行数
     */
    @Delete("DELETE FROM email_token WHERE expires_at < #{expiryDate}")
    int deleteExpiredTokens(@Param("expiryDate") LocalDateTime expiryDate);
    
    /**
     * 统计指定用户和用途在指定时间范围内创建的 Token 数量
     * 
     * @param userId 用户 ID
     * @param purpose Token 用途
     * @param startDate 开始时间
     * @return Token 数量
     */
    @Select("SELECT COUNT(*) FROM email_token " +
            "WHERE user_id = #{userId} AND purpose = #{purpose} " +
            "AND created_at >= #{startDate} AND deleted = 0")
    Long countByUserIdAndPurposeSince(@Param("userId") Long userId, 
                                       @Param("purpose") String purpose,
                                       @Param("startDate") LocalDateTime startDate);
}
