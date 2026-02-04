package com.polaris.dto;

import com.polaris.common.base.BaseResponse;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

/**
 * 文档响应 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class DocumentResponse extends BaseResponse {
    
    /**
     * 用户 ID
     */
    private Long userId;
    
    /**
     * 文档标题
     */
    private String title;
    
    /**
     * 文档内容（Markdown 格式）
     */
    private String content;
    
    /**
     * 文档格式
     */
    private String format;
    
    /**
     * 文件夹 ID
     */
    private Long folderId;
    
    /**
     * 标签（逗号分隔）
     */
    private String tags;
    
    /**
     * 是否为模板：0-否，1-是
     */
    private Integer isTemplate;
    
    /**
     * 浏览次数
     */
    private Long viewCount;
    
    /**
     * 导出次数
     */
    private Long exportCount;
    
    /**
     * 字数
     */
    private Long wordCount;
    
    /**
     * 字符数
     */
    private Long charCount;
    
    /**
     * 阅读时间（分钟）
     */
    private Long readingTime;
    
    /**
     * 过期时间
     */
    private LocalDateTime expireAt;
}
