package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.polaris.entity.Tool;
import com.polaris.entity.ToolUsage;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 工具使用记录 Mapper 接口
 */
@Mapper
public interface ToolUsageMapper extends BaseMapper<ToolUsage> {
    
    /**
     * 获取用户最近使用的工具
     * 
     * @param userId 用户 ID
     * @param limit 限制数量
     * @return 工具列表
     */
    @Select({
        "SELECT t.*, c.name as category_name, c.name_zh as category_name_zh, MAX(tu.used_at) as last_used_at ",
        "FROM t_tool_usage tu ",
        "INNER JOIN t_tool t ON tu.tool_id = t.id ",
        "LEFT JOIN t_category c ON t.category_id = c.id ",
        "WHERE tu.user_id = #{userId} AND t.deleted = 0 AND t.status = 1 ",
        "GROUP BY t.id ",
        "ORDER BY last_used_at DESC ",
        "LIMIT #{limit}"
    })
    List<Tool> getRecentTools(@Param("userId") Long userId, 
                             @Param("limit") Integer limit);
    
    /**
     * 获取用户使用历史（分页）
     * 
     * @param userId 用户 ID
     * @param page 分页对象
     * @return 分页结果
     */
    @Select({
        "SELECT tu.*, t.name as tool_name, t.name_zh as tool_name_zh, t.icon as tool_icon ",
        "FROM t_tool_usage tu ",
        "INNER JOIN t_tool t ON tu.tool_id = t.id ",
        "WHERE tu.user_id = #{userId} AND t.deleted = 0 ",
        "ORDER BY tu.used_at DESC"
    })
    IPage<ToolUsage> getUserHistory(@Param("userId") Long userId, 
                                    Page<ToolUsage> page);
    
    /**
     * 统计指定时间后的使用次数
     * @param since 起始时间
     * @return 使用次数
     */
    @Select("SELECT COUNT(*) FROM t_tool_usage WHERE used_at >= #{since}")
    Long countUsageAfter(@Param("since") LocalDateTime since);
    
    /**
     * 获取每日使用量
     * @param startDate 起始日期
     * @return 每日使用量列表
     */
    @Select("SELECT DATE(used_at) as date, COUNT(*) as count " +
            "FROM t_tool_usage " +
            "WHERE used_at >= #{startDate} " +
            "GROUP BY DATE(used_at) " +
            "ORDER BY date")
    List<Map<String, Object>> getDailyUsageCount(@Param("startDate") LocalDateTime startDate);
    
    /**
     * 获取热门工具
     * @param limit 限制数量
     * @return 热门工具列表
     */
    @Select("SELECT t.id as tool_id, t.name as tool_name, COUNT(*) as count " +
            "FROM t_tool_usage u " +
            "JOIN t_tool t ON u.tool_id = t.id " +
            "WHERE t.deleted = 0 " +
            "GROUP BY u.tool_id " +
            "ORDER BY count DESC " +
            "LIMIT #{limit}")
    List<Map<String, Object>> getPopularTools(@Param("limit") Integer limit);
}
