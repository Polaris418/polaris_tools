package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.polaris.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 用户 Mapper 接口
 */
@Mapper
public interface UserMapper extends BaseMapper<User> {
    
    /**
     * 根据用户名查找用户
     * @param username 用户名
     * @return 用户实体
     */
    @Select("SELECT * FROM t_user WHERE username = #{username} AND deleted = 0")
    User findByUsername(String username);
    
    /**
     * 根据邮箱查找用户
     * @param email 邮箱
     * @return 用户实体
     */
    @Select("SELECT * FROM t_user WHERE email = #{email} AND deleted = 0")
    User findByEmail(String email);
    
    /**
     * 统计活跃用户数（指定时间后有登录）
     * @param since 起始时间
     * @return 活跃用户数
     */
    @Select("SELECT COUNT(*) FROM t_user WHERE last_login_at >= #{since} AND deleted = 0")
    Long countActiveUsers(@Param("since") LocalDateTime since);
    
    /**
     * 统计新增用户数（指定时间后注册）
     * @param since 起始时间
     * @return 新增用户数
     */
    @Select("SELECT COUNT(*) FROM t_user WHERE created_at >= #{since} AND deleted = 0")
    Long countNewUsers(@Param("since") LocalDateTime since);
    
    /**
     * 获取每日注册量
     * @param startDate 起始日期
     * @return 每日注册量列表
     */
    @Select("SELECT DATE(created_at) as date, COUNT(*) as count " +
            "FROM t_user " +
            "WHERE created_at >= #{startDate} AND deleted = 0 " +
            "GROUP BY DATE(created_at) " +
            "ORDER BY date")
    List<Map<String, Object>> getDailyRegistrationCount(@Param("startDate") LocalDateTime startDate);
    
    /**
     * 分页查询用户（包含已删除）
     * @param page 分页参数
     * @param keyword 关键词
     * @param status 状态
     * @param planType 套餐类型
     * @param includeDeleted 是否包含已删除
     * @return 用户分页数据
     */
    @Select({
        "<script>",
        "SELECT * FROM t_user WHERE 1=1 ",
        "<if test='!includeDeleted'>AND deleted = 0</if>",
        "<if test='includeDeleted'>AND deleted = 1</if>",
        "<if test='keyword != null and keyword != \"\"'>",
        "  AND (username LIKE CONCAT('%', #{keyword}, '%') OR email LIKE CONCAT('%', #{keyword}, '%'))",
        "</if>",
        "<if test='status != null'>AND status = #{status}</if>",
        "<if test='planType != null'>AND plan_type = #{planType}</if>",
        "ORDER BY created_at DESC",
        "</script>"
    })
    IPage<User> selectUsersIncludeDeleted(
        Page<User> page,
        @Param("keyword") String keyword,
        @Param("status") Integer status,
        @Param("planType") Integer planType,
        @Param("includeDeleted") boolean includeDeleted
    );
    
    /**
     * 根据ID查询用户（包含已删除）
     * @param id 用户ID
     * @return 用户实体
     */
    @Select("SELECT * FROM t_user WHERE id = #{id}")
    User selectByIdIncludeDeleted(@Param("id") Long id);
    
    /**
     * 检查用户名是否存在（排除指定deleted状态）
     * @param username 用户名
     * @param excludeDeleted 排除的deleted值
     * @return 存在的数量
     */
    @Select("SELECT COUNT(*) FROM t_user WHERE username = #{username} AND deleted != #{excludeDeleted}")
    int existsByUsernameAndDeletedNot(@Param("username") String username, @Param("excludeDeleted") Integer excludeDeleted);
    
    /**
     * 检查邮箱是否存在（排除指定deleted状态）
     * @param email 邮箱
     * @param excludeDeleted 排除的deleted值
     * @return 存在的数量
     */
    @Select("SELECT COUNT(*) FROM t_user WHERE email = #{email} AND deleted != #{excludeDeleted}")
    int existsByEmailAndDeletedNot(@Param("email") String email, @Param("excludeDeleted") Integer excludeDeleted);
    
    /**
     * 更新用户（包含已删除的数据）
     * 注意：此方法绕过 MyBatis-Plus 的逻辑删除机制
     * @param id 用户ID
     * @param username 用户名
     * @param password 密码
     * @param email 邮箱
     * @param nickname 昵称
     * @param avatar 头像
     * @param avatarConfig 头像配置
     * @param bio 个人简介
     * @param planType 套餐类型
     * @param planExpiredAt 套餐过期时间
     * @param status 状态
     * @param lastLoginAt 最后登录时间
     * @param lastLoginIp 最后登录IP
     * @param updatedAt 更新时间
     * @return 影响行数
     */
    @org.apache.ibatis.annotations.Update({
        "UPDATE t_user SET ",
        "username = #{username}, ",
        "password = #{password}, ",
        "email = #{email}, ",
        "nickname = #{nickname}, ",
        "avatar = #{avatar}, ",
        "avatar_config = #{avatarConfig}, ",
        "bio = #{bio}, ",
        "plan_type = #{planType}, ",
        "plan_expired_at = #{planExpiredAt}, ",
        "status = #{status}, ",
        "last_login_at = #{lastLoginAt}, ",
        "last_login_ip = #{lastLoginIp}, ",
        "updated_at = #{updatedAt} ",
        "WHERE id = #{id}"
    })
    int updateByIdIncludeDeleted(
        @Param("id") Long id,
        @Param("username") String username,
        @Param("password") String password,
        @Param("email") String email,
        @Param("nickname") String nickname,
        @Param("avatar") String avatar,
        @Param("avatarConfig") String avatarConfig,
        @Param("bio") String bio,
        @Param("planType") Integer planType,
        @Param("planExpiredAt") LocalDateTime planExpiredAt,
        @Param("status") Integer status,
        @Param("lastLoginAt") LocalDateTime lastLoginAt,
        @Param("lastLoginIp") String lastLoginIp,
        @Param("updatedAt") LocalDateTime updatedAt
    );
    
    /**
     * 恢复用户（设置 deleted = 0）
     * @param id 用户ID
     * @return 影响行数
     */
    @org.apache.ibatis.annotations.Update("UPDATE t_user SET deleted = 0, updated_at = NOW() WHERE id = #{id}")
    int restoreById(@Param("id") Long id);
    
    /**
     * 永久删除用户（物理删除）
     * @param id 用户ID
     * @return 影响行数
     */
    @org.apache.ibatis.annotations.Delete("DELETE FROM t_user WHERE id = #{id}")
    int hardDeleteById(@Param("id") Long id);
}
