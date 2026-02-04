package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.polaris.entity.Notification;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

/**
 * 通知 Mapper 接口
 */
@Mapper
public interface NotificationMapper extends BaseMapper<Notification> {
    
    /**
     * 分页查询用户通知（包括全站通知）
     * @param page 分页参数
     * @param userId 用户ID
     * @param type 通知类型（可选）
     * @param isRead 是否已读（可选）
     * @return 通知分页数据
     */
    @Select({
        "<script>",
        "SELECT * FROM t_notification ",
        "WHERE (user_id = #{userId} OR user_id = 0) ",
        "AND deleted = 0 ",
        "<if test='type != null and type != \"\"'>AND type = #{type}</if>",
        "<if test='isRead != null'>AND is_read = #{isRead}</if>",
        "ORDER BY created_at DESC",
        "</script>"
    })
    IPage<Notification> selectUserNotifications(
        Page<Notification> page,
        @Param("userId") Long userId,
        @Param("type") String type,
        @Param("isRead") Integer isRead
    );
    
    /**
     * 获取用户未读通知数量
     * @param userId 用户ID
     * @return 未读通知数量
     */
    @Select("SELECT COUNT(*) FROM t_notification " +
            "WHERE (user_id = #{userId} OR user_id = 0) " +
            "AND is_read = 0 AND deleted = 0")
    Long countUnreadByUserId(@Param("userId") Long userId);
    
    /**
     * 标记用户所有通知为已读
     * @param userId 用户ID
     * @return 更新的记录数
     */
    @Update("UPDATE t_notification SET is_read = 1, read_at = NOW() " +
            "WHERE (user_id = #{userId} OR user_id = 0) " +
            "AND is_read = 0 AND deleted = 0")
    int markAllAsReadByUserId(@Param("userId") Long userId);
    
    /**
     * 分页查询所有通知（管理端）
     * @param page 分页参数
     * @param type 通知类型（可选）
     * @param userId 用户ID（可选，0表示全站通知）
     * @param includeDeleted 是否只显示已删除（可选）
     * @return 通知分页数据
     */
    @Select({
        "<script>",
        "SELECT * FROM t_notification WHERE 1=1 ",
        "<if test='includeDeleted != null and includeDeleted == true'>AND deleted = 1 </if>",
        "<if test='includeDeleted == null or includeDeleted == false'>AND deleted = 0 </if>",
        "<if test='type != null and type != \"\"'>AND type = #{type}</if>",
        "<if test='userId != null'>AND user_id = #{userId}</if>",
        "ORDER BY created_at DESC",
        "</script>"
    })
    IPage<Notification> selectAllNotifications(
        Page<Notification> page,
        @Param("type") String type,
        @Param("userId") Long userId,
        @Param("includeDeleted") Boolean includeDeleted
    );
    
    /**
     * 查询通知（包括已删除的）
     */
    @Select("SELECT * FROM t_notification WHERE id = #{id}")
    Notification selectByIdWithDeleted(@Param("id") Long id);
    
    /**
     * 查询所有相同标题和类型的通知（包括已删除的）
     */
    @Select("SELECT * FROM t_notification WHERE title = #{title} AND type = #{type}")
    List<Notification> selectByTitleAndTypeWithDeleted(@Param("title") String title, @Param("type") String type);
    
    /**
     * 恢复已删除的通知
     */
    @Update("UPDATE t_notification SET deleted = 0 WHERE id = #{id} AND deleted = 1")
    int restoreById(@Param("id") Long id);
}
