package com.polaris.ai.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.ai.entity.AiProviderConfig;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

/**
 * AI 提供商配置 Mapper
 */
@Mapper
public interface AiProviderConfigMapper extends BaseMapper<AiProviderConfig> {

    @Select("""
            SELECT * FROM ai_provider_config
            WHERE enabled = 1 AND deleted = 0
            ORDER BY is_primary DESC, priority ASC, id ASC
            """)
    List<AiProviderConfig> selectActiveOrdered();

    @Select("""
            SELECT * FROM ai_provider_config
            WHERE deleted = 0
            ORDER BY is_primary DESC, priority ASC, id ASC
            """)
    List<AiProviderConfig> selectAllOrdered();

    @Select("""
            SELECT COUNT(1) FROM ai_provider_config
            WHERE name = #{name} AND deleted = 0
            """)
    int countByName(String name);

    @Select("""
            SELECT COUNT(1) FROM ai_provider_config
            WHERE name = #{name} AND id <> #{excludeId} AND deleted = 0
            """)
    int countByNameExcludingId(String name, Long excludeId);

    @Update("""
            UPDATE ai_provider_config
            SET is_primary = 0, updated_at = CURRENT_TIMESTAMP
            WHERE deleted = 0
            """)
    int clearPrimaryFlag();
}
