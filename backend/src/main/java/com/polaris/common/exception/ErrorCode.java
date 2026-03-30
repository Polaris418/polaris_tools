package com.polaris.common.exception;

import lombok.Getter;

/**
 * 错误码枚举
 * 统一管理系统中的所有错误码和错误信息
 */
@Getter
public enum ErrorCode {
    // 通用错误 1xxx
    SUCCESS(200, "Success"),
    BAD_REQUEST(400, "Bad Request"),
    UNAUTHORIZED(401, "Unauthorized"),
    FORBIDDEN(403, "Forbidden"),
    NOT_FOUND(404, "Resource Not Found"),
    INTERNAL_ERROR(500, "Internal Server Error"),
    
    // 用户相关 2xxx
    USER_NOT_FOUND(2001, "用户不存在"),
    USERNAME_EXISTS(2002, "用户名已存在"),
    EMAIL_EXISTS(2003, "邮箱已存在"),
    INVALID_CREDENTIALS(2004, "用户名或密码错误"),
    TOKEN_EXPIRED(2005, "Token 已过期"),
    TOKEN_INVALID(2006, "Token 无效"),
    USER_DISABLED(2007, "用户已被禁用"),
    CANNOT_DELETE_SELF(2008, "不能删除自己的账户"),
    INVALID_EMAIL_FORMAT(2009, "邮箱格式不正确"),
    INVALID_PLAN_TYPE(2010, "套餐类型无效"),
    
    // 工具相关 3xxx
    TOOL_NOT_FOUND(3001, "工具不存在"),
    TOOL_NAME_EXISTS(3002, "工具名称已存在"),
    INVALID_TOOL_DATA(3003, "工具数据无效"),
    TOOL_DELETED(3004, "工具已被删除"),
    
    // 分类相关 4xxx
    CATEGORY_NOT_FOUND(4001, "分类不存在"),
    CATEGORY_NAME_EXISTS(4002, "分类名称已存在"),
    CATEGORY_HAS_TOOLS(4003, "分类下存在工具，无法删除"),
    CATEGORY_DISABLED(4004, "分类已被禁用"),
    
    // 收藏相关 5xxx
    ALREADY_FAVORITED(5001, "已收藏该工具"),
    FAVORITE_NOT_FOUND(5002, "收藏记录不存在"),
    
    // 参数验证相关 6xxx
    INVALID_PARAMETER(6001, "参数验证失败"),
    MISSING_REQUIRED_FIELD(6002, "缺少必填字段"),
    INVALID_PAGE_PARAMETER(6003, "分页参数无效"),
    INVALID_EMAIL(6004, "邮箱格式不正确"),
    INVALID_NUMERIC_RANGE(6005, "数值超出有效范围"),
    INVALID_STRING_LENGTH(6006, "字符串长度不符合要求"),
    INVALID_ENUM_VALUE(6007, "枚举值无效"),
    
    // 文档相关 7xxx
    DOCUMENT_NOT_FOUND(7001, "文档不存在"),
    VERSION_NOT_FOUND(7002, "版本不存在"),
    EXPORT_FAILED(7003, "导出失败"),
    BATCH_EXPORT_LIMIT_EXCEEDED(7004, "批量导出数量超出限制"),
    FEATURE_NOT_IMPLEMENTED(7005, "功能暂未实现"),
    
    // 验证码相关 8xxx
    CODE_INVALID(8001, "验证码无效"),
    CODE_EXPIRED(8002, "验证码已过期"),
    CODE_USED(8003, "验证码已使用"),
    CODE_FAILED_TOO_MANY(8004, "验证失败次数过多，验证码已失效"),
    CODE_PURPOSE_MISMATCH(8005, "验证码用途不匹配"),
    RATE_LIMIT_EMAIL(8006, "发送过于频繁，请稍后再试"),
    RATE_LIMIT_IP(8007, "请求过于频繁，请稍后再试"),
    RATE_LIMIT_DAILY(8008, "今日发送次数已达上限"),
    EMAIL_BLOCKED(8009, "该邮箱已被临时封禁"),
    EMAIL_SEND_FAILED(8010, "邮件发送失败"),
    CODE_GENERATE_FAILED(8011, "验证码生成失败"),

    // AI 相关 9xxx
    AI_FORMAT_QUOTA_EXCEEDED(9001, "AI 格式助手今日使用次数已达上限"),
    AI_FORMAT_INVALID_RESPONSE(9002, "AI 返回了无效的格式结果"),
    AI_PROVIDER_UNAVAILABLE(9003, "当前没有可用的 AI 提供商");
    
    private final Integer code;
    private final String message;
    
    ErrorCode(Integer code, String message) {
        this.code = code;
        this.message = message;
    }
}
