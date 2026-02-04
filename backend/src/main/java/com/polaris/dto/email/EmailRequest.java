package com.polaris.dto.email;

import lombok.Builder;
import lombok.Data;
import java.util.List;

/**
 * 邮件请求类
 * 用于内部传递邮件请求
 */
@Data
@Builder
public class EmailRequest {
    
    /**
     * 发件人地址（可选，如果未指定则使用默认地址）
     */
    private String fromEmail;
    
    /**
     * 收件人地址列表
     */
    private List<String> to;
    
    /**
     * 抄送地址列表
     */
    private List<String> cc;
    
    /**
     * 密送地址列表
     */
    private List<String> bcc;
    
    /**
     * 回复地址列表
     */
    private List<String> replyTo;
    
    /**
     * 邮件主题
     */
    private String subject;
    
    /**
     * HTML 格式内容
     */
    private String html;
    
    /**
     * 纯文本格式内容
     */
    private String text;
    
    /**
     * 邮件类型（用于自动选择发件人）
     */
    private String emailType;
}
