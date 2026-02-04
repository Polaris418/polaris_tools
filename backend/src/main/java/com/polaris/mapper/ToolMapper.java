package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.polaris.entity.Tool;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 工具 Mapper 接口
 */
@Mapper
public interface ToolMapper extends BaseMapper<Tool> {
    
    /**
     * 全文搜索工具
     * 
     * @param keyword 搜索关键词
     * @param categoryId 分类 ID（可选）
     * @return 工具列表
     */
    @Select({
        "<script>",
        "SELECT t.*, c.name as category_name, c.name_zh as category_name_zh ",
        "FROM t_tool t ",
        "LEFT JOIN t_category c ON t.category_id = c.id ",
        "WHERE t.deleted = 0 ",
        "<if test='keyword != null and keyword != \"\"'>",
        "  AND MATCH(t.name, t.name_zh, t.description, t.description_zh) AGAINST(#{keyword} IN NATURAL LANGUAGE MODE) ",
        "</if>",
        "<if test='categoryId != null'>",
        "  AND t.category_id = #{categoryId} ",
        "</if>",
        "ORDER BY t.sort_order ASC, t.created_at DESC",
        "</script>"
    })
    List<Tool> searchTools(@Param("keyword") String keyword, 
                          @Param("categoryId") Long categoryId);
    
    /**
     * 获取热门工具
     * 
     * @param limit 限制数量
     * @return 工具列表
     */
    @Select({
        "SELECT t.*, c.name as category_name, c.name_zh as category_name_zh ",
        "FROM t_tool t ",
        "LEFT JOIN t_category c ON t.category_id = c.id ",
        "WHERE t.deleted = 0 AND t.status = 1 ",
        "ORDER BY t.use_count DESC, t.view_count DESC ",
        "LIMIT #{limit}"
    })
    List<Tool> getPopularTools(@Param("limit") Integer limit);
    
    /**
     * 原子性增加浏览计数
     * 
     * @param id 工具 ID
     * @return 影响行数
     */
    @Update("UPDATE t_tool SET view_count = view_count + 1 WHERE id = #{id} AND deleted = 0")
    int incrementViewCount(@Param("id") Long id);
    
    /**
     * 原子性增加使用计数
     * 
     * @param id 工具 ID
     * @return 影响行数
     */
    @Update("UPDATE t_tool SET use_count = use_count + 1 WHERE id = #{id} AND deleted = 0")
    int incrementUseCount(@Param("id") Long id);
    
    /**
     * 根据 ID 查询工具（包含分类信息）
     * 
     * @param id 工具 ID
     * @return 工具实体
     */
    @Select({
        "SELECT t.*, c.name as category_name, c.name_zh as category_name_zh ",
        "FROM t_tool t ",
        "LEFT JOIN t_category c ON t.category_id = c.id ",
        "WHERE t.id = #{id} AND t.deleted = 0"
    })
    Tool selectByIdWithCategory(@Param("id") Long id);
    
    /**
     * 根据 URL 查询工具
     * 支持完整路径（如 /tools/word-counter）或简短路径（如 word-counter）
     * 
     * @param url 工具 URL
     * @return 工具实体
     */
    @Select({
        "SELECT * FROM t_tool WHERE deleted = 0 AND status = 1 ",
        "AND (url = #{url} OR url = CONCAT('/tools/', #{url}) OR url LIKE CONCAT('%/', #{url})) ",
        "LIMIT 1"
    })
    Tool selectByUrl(@Param("url") String url);
    
    /**
     * 分页查询工具（包含已删除）
     * @param page 分页参数
     * @param keyword 关键词
     * @param categoryId 分类ID
     * @param status 状态
     * @param includeDeleted 是否包含已删除
     * @return 工具分页数据
     */
    @Select({
        "<script>",
        "SELECT t.*, c.name as category_name, c.name_zh as category_name_zh ",
        "FROM t_tool t ",
        "LEFT JOIN t_category c ON t.category_id = c.id ",
        "WHERE 1=1 ",
        "<if test='!includeDeleted'>AND t.deleted = 0</if>",
        "<if test='includeDeleted'>AND t.deleted = 1</if>",
        "<if test='keyword != null and keyword != \"\"'>",
        "  AND (t.name LIKE CONCAT('%', #{keyword}, '%') OR t.name_zh LIKE CONCAT('%', #{keyword}, '%'))",
        "</if>",
        "<if test='categoryId != null'>AND t.category_id = #{categoryId}</if>",
        "<if test='status != null'>AND t.status = #{status}</if>",
        "ORDER BY t.sort_order ASC, t.created_at DESC",
        "</script>"
    })
    IPage<Tool> selectToolsIncludeDeleted(
        Page<Tool> page,
        @Param("keyword") String keyword,
        @Param("categoryId") Long categoryId,
        @Param("status") Integer status,
        @Param("includeDeleted") boolean includeDeleted
    );
    
    /**
     * 根据ID查询工具（包含已删除）
     * @param id 工具ID
     * @return 工具实体
     */
    @Select({
        "SELECT t.*, c.name as category_name, c.name_zh as category_name_zh ",
        "FROM t_tool t ",
        "LEFT JOIN t_category c ON t.category_id = c.id ",
        "WHERE t.id = #{id}"
    })
    Tool selectByIdIncludeDeleted(@Param("id") Long id);
    
    /**
     * 更新工具（包含已删除的数据）
     * 注意：此方法绕过 MyBatis-Plus 的逻辑删除机制
     * @return 影响行数
     */
    @org.apache.ibatis.annotations.Update({
        "UPDATE t_tool SET ",
        "name = #{name}, ",
        "name_zh = #{nameZh}, ",
        "description = #{description}, ",
        "description_zh = #{descriptionZh}, ",
        "icon = #{icon}, ",
        "url = #{url}, ",
        "color_class = #{colorClass}, ",
        "bg_hover_class = #{bgHoverClass}, ",
        "category_id = #{categoryId}, ",
        "tool_type = #{toolType}, ",
        "status = #{status}, ",
        "is_featured = #{isFeatured}, ",
        "sort_order = #{sortOrder}, ",
        "view_count = #{viewCount}, ",
        "use_count = #{useCount}, ",
        "updated_at = #{updatedAt} ",
        "WHERE id = #{id}"
    })
    int updateByIdIncludeDeleted(
        @Param("id") Long id,
        @Param("name") String name,
        @Param("nameZh") String nameZh,
        @Param("description") String description,
        @Param("descriptionZh") String descriptionZh,
        @Param("icon") String icon,
        @Param("url") String url,
        @Param("colorClass") String colorClass,
        @Param("bgHoverClass") String bgHoverClass,
        @Param("categoryId") Long categoryId,
        @Param("toolType") Integer toolType,
        @Param("status") Integer status,
        @Param("isFeatured") Integer isFeatured,
        @Param("sortOrder") Integer sortOrder,
        @Param("viewCount") Long viewCount,
        @Param("useCount") Long useCount,
        @Param("updatedAt") LocalDateTime updatedAt
    );
    
    /**
     * 恢复工具（设置 deleted = 0）
     * @param id 工具ID
     * @return 影响行数
     */
    @org.apache.ibatis.annotations.Update("UPDATE t_tool SET deleted = 0, updated_at = NOW() WHERE id = #{id}")
    int restoreById(@Param("id") Long id);
    
    /**
     * 永久删除工具（物理删除）
     * @param id 工具ID
     * @return 影响行数
     */
    @org.apache.ibatis.annotations.Delete("DELETE FROM t_tool WHERE id = #{id}")
    int hardDeleteById(@Param("id") Long id);
}
