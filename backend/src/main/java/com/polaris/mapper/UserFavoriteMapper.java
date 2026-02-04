package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.entity.Tool;
import com.polaris.entity.UserFavorite;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 用户收藏 Mapper 接口
 */
@Mapper
public interface UserFavoriteMapper extends BaseMapper<UserFavorite> {
    
    /**
     * 查询用户收藏的工具列表（按时间降序）
     * 
     * @param userId 用户 ID
     * @return 工具列表
     */
    @Select({
        "SELECT t.*, c.name as category_name, c.name_zh as category_name_zh ",
        "FROM t_tool t ",
        "INNER JOIN t_user_favorite uf ON t.id = uf.tool_id ",
        "LEFT JOIN t_category c ON t.category_id = c.id ",
        "WHERE uf.user_id = #{userId} AND uf.deleted = 0 AND t.deleted = 0 ",
        "ORDER BY uf.created_at DESC"
    })
    List<Tool> listFavoriteTools(@Param("userId") Long userId);
    
    /**
     * 检查用户是否已收藏某个工具
     * 
     * @param userId 用户 ID
     * @param toolId 工具 ID
     * @return 是否已收藏
     */
    @Select({
        "SELECT COUNT(*) > 0 ",
        "FROM t_user_favorite ",
        "WHERE user_id = #{userId} AND tool_id = #{toolId} AND deleted = 0"
    })
    boolean isFavorited(@Param("userId") Long userId, @Param("toolId") Long toolId);
    
    /**
     * 查找用户的收藏记录（包括已删除的）
     * 
     * @param userId 用户 ID
     * @param toolId 工具 ID
     * @return 收藏记录，不存在返回 null
     */
    @Select({
        "SELECT * ",
        "FROM t_user_favorite ",
        "WHERE user_id = #{userId} AND tool_id = #{toolId}"
    })
    UserFavorite findByUserIdAndToolId(@Param("userId") Long userId, @Param("toolId") Long toolId);
    
    /**
     * 恢复已删除的收藏记录
     * 直接使用 SQL UPDATE，绕过 MyBatis Plus 的逻辑删除限制
     * 
     * @param userId 用户 ID
     * @param toolId 工具 ID
     * @return 更新的记录数
     */
    @org.apache.ibatis.annotations.Update({
        "UPDATE t_user_favorite ",
        "SET deleted = 0, updated_at = NOW() ",
        "WHERE user_id = #{userId} AND tool_id = #{toolId} AND deleted = 1"
    })
    int restoreFavorite(@Param("userId") Long userId, @Param("toolId") Long toolId);

    /**
     * 批量查询指定工具是否已收藏，返回已收藏的 toolId 集合
     */
    @Select({
        "<script>",
        "SELECT tool_id FROM t_user_favorite ",
        "WHERE user_id = #{userId} AND deleted = 0 ",
        "AND tool_id IN ",
        "<foreach item='id' collection='toolIds' open='(' separator=',' close=')'>",
        "  #{id}",
        "</foreach>",
        "</script>"
    })
    List<Long> listFavoritedToolIds(@Param("userId") Long userId, @Param("toolIds") List<Long> toolIds);
}
