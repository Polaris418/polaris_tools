package com.polaris.dto.email;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 管理员发送邮件请求 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSendEmailRequest {
    
    /**
     * 收件人邮箱地址（单个或多个）
     */
    @NotEmpty(message = "收件人邮箱不能为空")
    @Size(max = 50, message = "收件人数量不能超过50个")
    private List<@Email(message = "邮箱格式不正确") String> to;
    
    /**
     * 邮件主题
     */
    @NotBlank(message = "邮件主题不能为空")
    @Size(max = 256, message = "邮件主题不能超过256个字符")
    private String subject;
    
    /**
     * 邮件 HTML 内容
     */
    @NotBlank(message = "邮件内容不能为空")
    private String html;
    
    /**
     * 抄送地址
     */
    private List<@Email(message = "抄送邮箱格式不正确") String> cc;
    
    /**
     * 密送地址
     */
    private List<@Email(message = "密送邮箱格式不正确") String> bcc;
}
