package com.polaris.service;

import com.polaris.entity.EmailTemplate;

import java.util.List;
import java.util.Map;

/**
 * 邮件模板服务接口
 */
public interface TemplateService {
    
    /**
     * 渲染模板
     * 
     * @param code 模板代码
     * @param language 语言代码
     * @param variables 变量映射
     * @return 渲染后的模板内容（包含 subject 和 htmlContent）
     */
    RenderedTemplate renderTemplate(String code, String language, Map<String, Object> variables);
    
    /**
     * 根据代码和语言获取模板
     * 
     * @param code 模板代码
     * @param language 语言代码
     * @return 模板对象，如果找不到则返回 null
     */
    EmailTemplate getTemplate(String code, String language);
    
    /**
     * 根据代码和语言获取模板（包括禁用的）
     * 用于管理后台查看模板详情
     * 
     * @param code 模板代码
     * @param language 语言代码
     * @return 模板对象，如果找不到则返回 null
     */
    EmailTemplate getTemplateIncludeDisabled(String code, String language);
    
    /**
     * 根据 ID 获取模板
     * 
     * @param id 模板 ID
     * @return 模板对象，如果找不到则返回 null
     */
    EmailTemplate getTemplateById(Long id);
    
    /**
     * 创建或更新模板
     * 
     * @param template 模板对象
     * @return 保存后的模板对象
     */
    EmailTemplate saveTemplate(EmailTemplate template);
    
    /**
     * 查询所有启用的模板
     * 
     * @return 模板列表
     */
    List<EmailTemplate> getAllEnabledTemplates();
    
    /**
     * 根据筛选条件查询模板
     * 
     * @param language 语言代码（可选）
     * @param code 模板代码（可选）
     * @param enabled 是否启用（可选）
     * @return 模板列表
     */
    List<EmailTemplate> getTemplatesWithFilters(String language, String code, Boolean enabled);
    
    /**
     * 根据代码查询所有语言的模板
     * 
     * @param code 模板代码
     * @return 模板列表
     */
    List<EmailTemplate> getTemplatesByCode(String code);
    
    /**
     * 删除模板
     * 
     * @param id 模板 ID
     */
    void deleteTemplate(Long id);
    
    /**
     * 清除模板缓存
     */
    void clearCache();
    
    /**
     * 渲染后的模板内容
     */
    class RenderedTemplate {
        private String subject;
        private String htmlContent;
        private String textContent;
        
        public RenderedTemplate(String subject, String htmlContent, String textContent) {
            this.subject = subject;
            this.htmlContent = htmlContent;
            this.textContent = textContent;
        }
        
        public String getSubject() {
            return subject;
        }
        
        public String getHtmlContent() {
            return htmlContent;
        }
        
        public String getTextContent() {
            return textContent;
        }
    }
}
