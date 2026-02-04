package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.entity.EmailSuppression;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * 邮件抑制列表 Mapper
 */
@Mapper
public interface EmailSuppressionMapper extends BaseMapper<EmailSuppression> {
    
    /**
     * 根据邮箱地址查询抑制记录
     * 
     * @param email 邮箱地址
     * @return 抑制记录，如果不存在返回 null
     */
    EmailSuppression findByEmail(@Param("email") String email);
}
