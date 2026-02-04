package com.polaris.dto.email;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 发送邮件请求 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendEmailRequest {
    
    /**
     * 收件人邮箱地址（单个或多个）
     */
    @NotBlank(message = "收件人邮箱不能为空")
    @Size(max = 50, message = "收件人数量不能超过50个")
    private List<@Email(message = "邮箱格式不正确") String> to;
    
    /**
     * 用户 ID（用于订阅检查，可选）
     */
    private Long userId;
    
    /**
     * 邮件主题
     */
    @NotBlank(message = "邮件主题不能为空")
    @Size(max = 256, message = "邮件主题不能超过256个字符")
    private String subject;
    
    /**
     * 邮件 HTML 内容
     */
    private String html;
    
    /**
     * 邮件纯文本内容
     */
    private String text;
    
    /**
     * 抄送地址
     */
    private List<@Email(message = "抄送邮箱格式不正确") String> cc;
    
    /**
     * 密送地址
     */
    private List<@Email(message = "密送邮箱格式不正确") String> bcc;
    
    /**
     * 回复地址
     */
    private List<@Email(message = "回复邮箱格式不正确") String> replyTo;
    
    /**
     * 定时发送时间 (ISO 8601 格式 或 自然语言如 "in 1 min")
     */
    private String scheduledAt;
}
