package com.polaris.email.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.email.entity.EmailTemplate;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

/**
 * 邮件模板 Mapper
 */
@Mapper
public interface EmailTemplateMapper extends BaseMapper<EmailTemplate> {
    
    /**
     * 根据代码和语言查询模板
     */
    @Select("SELECT * FROM email_template WHERE code = #{code} AND language = #{language} AND enabled = 1 AND deleted = 0")
    EmailTemplate findByCodeAndLanguage(@Param("code") String code, @Param("language") String language);
    
    /**
     * 根据代码和语言查询模板（包括禁用的）
     * 用于管理后台查看模板详情
     */
    @Select("SELECT * FROM email_template WHERE code = #{code} AND language = #{language} AND deleted = 0")
    EmailTemplate findByCodeAndLanguageIncludeDisabled(@Param("code") String code, @Param("language") String language);
    
    /**
     * 根据代码查询所有语言的模板
     */
    @Select("SELECT * FROM email_template WHERE code = #{code} AND enabled = 1 AND deleted = 0")
    List<EmailTemplate> findByCode(@Param("code") String code);
    
    /**
     * 查询所有启用的模板
     */
    @Select("SELECT * FROM email_template WHERE enabled = 1 AND deleted = 0 ORDER BY code, language")
    List<EmailTemplate> findAllEnabled();
    
    /**
     * 启用所有模板（开发环境使用）
     */
    @Update("UPDATE email_template SET enabled = 1 WHERE deleted = 0")
    int updateAllEnabled();
}
