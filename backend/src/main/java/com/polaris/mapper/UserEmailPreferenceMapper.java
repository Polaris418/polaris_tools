package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.entity.UserEmailPreference;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 用户邮件订阅偏好 Mapper
 */
@Mapper
public interface UserEmailPreferenceMapper extends BaseMapper<UserEmailPreference> {
    
    /**
     * 根据用户 ID 和邮件类型查询订阅偏好
     */
    @Select("SELECT * FROM t_user_email_preference WHERE user_id = #{userId} AND email_type = #{emailType} AND deleted = 0")
    UserEmailPreference findByUserIdAndEmailType(@Param("userId") Long userId, @Param("emailType") String emailType);
    
    /**
     * 根据用户 ID 查询所有订阅偏好
     */
    @Select("SELECT * FROM t_user_email_preference WHERE user_id = #{userId} AND deleted = 0")
    List<UserEmailPreference> findByUserId(@Param("userId") Long userId);
    
    /**
     * 根据退订令牌查询订阅偏好
     */
    @Select("SELECT * FROM t_user_email_preference WHERE unsubscribe_token = #{token} AND deleted = 0")
    UserEmailPreference findByUnsubscribeToken(@Param("token") String token);
}
