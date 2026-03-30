package com.polaris.email.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.polaris.email.entity.EmailTemplate;
import com.polaris.email.mapper.EmailTemplateMapper;
import com.polaris.email.service.TemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 邮件模板服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TemplateServiceImpl implements TemplateService {
    
    private final EmailTemplateMapper emailTemplateMapper;
    
    // 模板变量替换的正则表达式：支持 ${variableName} 和 {{variableName}} 两种格式
    private static final Pattern VARIABLE_PATTERN = Pattern.compile("\\$\\{([^}]+)\\}|\\{\\{([^}]+)\\}\\}");
    
    // 默认语言（回退语言）
    private static final String DEFAULT_LANGUAGE = "zh-CN";
    
    @Override
    public RenderedTemplate renderTemplate(String code, String language, Map<String, Object> variables) {
        // 获取模板
        EmailTemplate template = getTemplateWithFallback(code, language);
        
        if (template == null) {
            log.error("找不到模板: code={}, language={}", code, language);
            throw new RuntimeException("找不到邮件模板: " + code);
        }
        
        // 渲染主题
        String renderedSubject = replaceVariables(template.getSubject(), variables);
        
        // 渲染 HTML 内容
        String renderedHtmlContent = replaceVariables(template.getHtmlContent(), variables);
        
        // 渲染纯文本内容（如果存在）
        String renderedTextContent = null;
        if (template.getTextContent() != null && !template.getTextContent().isEmpty()) {
            renderedTextContent = replaceVariables(template.getTextContent(), variables);
        }
        
        log.debug("模板渲染成功: code={}, language={}", code, language);
        
        return new RenderedTemplate(renderedSubject, renderedHtmlContent, renderedTextContent);
    }
    
    @Override
    @Cacheable(value = "emailTemplates", key = "#code + '_' + #language", unless = "#result == null")
    public EmailTemplate getTemplate(String code, String language) {
        return emailTemplateMapper.findByCodeAndLanguage(code, language);
    }
    
    @Override
    public EmailTemplate getTemplateIncludeDisabled(String code, String language) {
        return emailTemplateMapper.findByCodeAndLanguageIncludeDisabled(code, language);
    }
    
    @Override
    @CacheEvict(value = "emailTemplates", allEntries = true)
    public EmailTemplate saveTemplate(EmailTemplate template) {
        if (template.getId() == null) {
            // 新建模板
            emailTemplateMapper.insert(template);
        } else {
            // 更新模板
            emailTemplateMapper.updateById(template);
        }
        log.info("模板保存成功: id={}, code={}, language={}", 
                template.getId(), template.getCode(), template.getLanguage());
        return template;
    }
    
    @Override
    public List<EmailTemplate> getAllEnabledTemplates() {
        return emailTemplateMapper.findAllEnabled();
    }
    
    @Override
    public List<EmailTemplate> getTemplatesWithFilters(String language, String code, Boolean enabled) {
        LambdaQueryWrapper<EmailTemplate> wrapper = new LambdaQueryWrapper<>();
        
        // 添加语言筛选
        if (language != null && !language.isEmpty()) {
            wrapper.eq(EmailTemplate::getLanguage, language);
        }
        
        // 添加代码筛选
        if (code != null && !code.isEmpty()) {
            wrapper.eq(EmailTemplate::getCode, code);
        }
        
        // 添加启用状态筛选
        if (enabled != null) {
            wrapper.eq(EmailTemplate::getEnabled, enabled);
        }
        
        // 按更新时间倒序排列
        wrapper.orderByDesc(EmailTemplate::getUpdatedAt);
        
        return emailTemplateMapper.selectList(wrapper);
    }
    
    @Override
    public List<EmailTemplate> getTemplatesByCode(String code) {
        return emailTemplateMapper.findByCode(code);
    }
    
    @Override
    public EmailTemplate getTemplateById(Long id) {
        return emailTemplateMapper.selectById(id);
    }
    
    @Override
    @CacheEvict(value = "emailTemplates", allEntries = true)
    public void deleteTemplate(Long id) {
        emailTemplateMapper.deleteById(id);
        log.info("模板删除成功: id={}", id);
    }
    
    @Override
    @CacheEvict(value = "emailTemplates", allEntries = true)
    public void clearCache() {
        log.info("邮件模板缓存已清除");
    }
    
    /**
     * 获取模板，如果找不到指定语言的模板，则回退到默认语言
     */
    private EmailTemplate getTemplateWithFallback(String code, String language) {
        // 首先尝试获取指定语言的模板
        EmailTemplate template = getTemplate(code, language);
        
        // 如果找不到，且请求的不是默认语言，则回退到默认语言
        if (template == null && !DEFAULT_LANGUAGE.equals(language)) {
            log.warn("找不到模板 {}（语言：{}），回退到默认语言 {}", code, language, DEFAULT_LANGUAGE);
            template = getTemplate(code, DEFAULT_LANGUAGE);
        }
        
        return template;
    }
    
    /**
     * 替换模板中的变量
     * 支持 ${variableName} 和 {{variableName}} 两种格式
     * 
     * @param template 模板字符串
     * @param variables 变量映射
     * @return 替换后的字符串
     */
    private String replaceVariables(String template, Map<String, Object> variables) {
        if (template == null || template.isEmpty()) {
            return template;
        }
        
        if (variables == null || variables.isEmpty()) {
            return template;
        }
        
        StringBuffer result = new StringBuffer();
        Matcher matcher = VARIABLE_PATTERN.matcher(template);
        
        while (matcher.find()) {
            // 支持两种格式：${variableName} 或 {{variableName}}
            String variableName = matcher.group(1) != null ? matcher.group(1) : matcher.group(2);
            Object value = variables.get(variableName);
            
            // 如果变量不存在，保留原始占位符
            String replacement = value != null ? value.toString() : matcher.group(0);
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
        }
        
        matcher.appendTail(result);
        return result.toString();
    }
}
