package com.polaris.common.exception;

import lombok.Getter;

/**
 * 业务异常类
 * 用于抛出业务逻辑相关的异常
 */
@Getter
public class BusinessException extends RuntimeException {
    private final Integer code;

    /**
     * 使用默认错误码 400 创建异常
     * @param message 错误信息
     */
    public BusinessException(String message) {
        super(message);
        this.code = 400;
    }

    /**
     * 使用指定错误码创建异常
     * @param code 错误码
     * @param message 错误信息
     */
    public BusinessException(Integer code, String message) {
        super(message);
        this.code = code;
    }

    /**
     * 使用 ErrorCode 枚举创建异常
     * @param errorCode 错误码枚举
     */
    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.code = errorCode.getCode();
    }

    /**
     * 使用 ErrorCode 枚举创建异常，并自定义错误信息
     * @param errorCode 错误码枚举
     * @param customMessage 自定义错误信息
     */
    public BusinessException(ErrorCode errorCode, String customMessage) {
        super(customMessage);
        this.code = errorCode.getCode();
    }
}
