package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.polaris.entity.Category;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface CategoryMapper extends BaseMapper<Category> {
    
    /**
     * 查询分类列表及每个分类下的工具数量
     * 只返回启用状态（status=1）且未删除（deleted=0）的分类
     * @return 分类列表（包含工具数量）
     */
    @Select("SELECT c.*, COUNT(t.id) as tool_count " +
            "FROM t_category c " +
            "LEFT JOIN t_tool t ON c.id = t.category_id AND t.deleted = 0 AND t.status = 1 " +
            "WHERE c.deleted = 0 AND c.status = 1 " +
            "GROUP BY c.id " +
            "ORDER BY c.sort_order ASC")
    List<Category> listCategoriesWithToolCount();
    
    /**
     * 分页查询分类（包含已删除）
     * @param page 分页参数
     * @param keyword 关键词
     * @param status 状态
     * @param includeDeleted 是否包含已删除
     * @return 分类分页数据
     */
    @Select({
        "<script>",
        "SELECT c.*, COUNT(t.id) as tool_count ",
        "FROM t_category c ",
        "LEFT JOIN t_tool t ON c.id = t.category_id AND t.deleted = 0 AND t.status = 1 ",
        "WHERE 1=1 ",
        "<if test='!includeDeleted'>AND c.deleted = 0</if>",
        "<if test='includeDeleted'>AND c.deleted = 1</if>",
        "<if test='keyword != null and keyword != \"\"'>",
        "  AND (c.name LIKE CONCAT('%', #{keyword}, '%') OR c.name_zh LIKE CONCAT('%', #{keyword}, '%'))",
        "</if>",
        "<if test='status != null'>AND c.status = #{status}</if>",
        "GROUP BY c.id ",
        "ORDER BY c.sort_order ASC",
        "</script>"
    })
    IPage<Category> selectCategoriesIncludeDeleted(
        Page<Category> page,
        @Param("keyword") String keyword,
        @Param("status") Integer status,
        @Param("includeDeleted") boolean includeDeleted
    );
    
    /**
     * 根据ID查询分类（包含已删除）
     * @param id 分类ID
     * @return 分类实体
     */
    @Select("SELECT * FROM t_category WHERE id = #{id}")
    Category selectByIdIncludeDeleted(@Param("id") Long id);
    
    /**
     * 更新分类（包含已删除的数据）
     * 注意：此方法绕过 MyBatis-Plus 的逻辑删除机制
     * @return 影响行数
     */
    @org.apache.ibatis.annotations.Update({
        "UPDATE t_category SET ",
        "name = #{name}, ",
        "name_zh = #{nameZh}, ",
        "icon = #{icon}, ",
        "accent_color = #{accentColor}, ",
        "description = #{description}, ",
        "sort_order = #{sortOrder}, ",
        "status = #{status}, ",
        "updated_at = #{updatedAt} ",
        "WHERE id = #{id}"
    })
    int updateByIdIncludeDeleted(
        @Param("id") Long id,
        @Param("name") String name,
        @Param("nameZh") String nameZh,
        @Param("icon") String icon,
        @Param("accentColor") String accentColor,
        @Param("description") String description,
        @Param("sortOrder") Integer sortOrder,
        @Param("status") Integer status,
        @Param("updatedAt") java.time.LocalDateTime updatedAt
    );
    
    /**
     * 恢复分类（设置 deleted = 0）
     * @param id 分类ID
     * @return 影响行数
     */
    @org.apache.ibatis.annotations.Update("UPDATE t_category SET deleted = 0, updated_at = NOW() WHERE id = #{id}")
    int restoreById(@Param("id") Long id);
    
    /**
     * 永久删除分类（物理删除）
     * @param id 分类ID
     * @return 影响行数
     */
    @org.apache.ibatis.annotations.Delete("DELETE FROM t_category WHERE id = #{id}")
    int hardDeleteById(@Param("id") Long id);
    
    /**
     * 更新分类排序值
     * @param id 分类ID
     * @param sortOrder 新的排序值
     * @param updatedAt 更新时间
     * @return 影响行数
     */
    @org.apache.ibatis.annotations.Update("UPDATE t_category SET sort_order = #{sortOrder}, updated_at = #{updatedAt} WHERE id = #{id}")
    int updateSortOrderById(@Param("id") Long id, @Param("sortOrder") Integer sortOrder, @Param("updatedAt") java.time.LocalDateTime updatedAt);
}
