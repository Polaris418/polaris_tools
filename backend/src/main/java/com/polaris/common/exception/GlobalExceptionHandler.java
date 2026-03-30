package com.polaris.common.exception;

import com.polaris.common.result.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 处理业务异常
     * 根据错误码返回相应的HTTP状态码
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Result<?>> handleBusinessException(BusinessException e) {
        log.warn("业务异常: code={}, message={}", e.getCode(), e.getMessage());

        HttpStatus status = getHttpStatusFromErrorCode(e.getCode());
        return ResponseEntity.status(status)
                .body(Result.error(e.getCode(), e.getMessage()));
    }

    /**
     * 处理参数验证异常（@Valid 注解触发）
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<?> handleValidException(MethodArgumentNotValidException e) {
        // 收集所有验证错误信息
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining("; "));
        
        log.warn("参数验证失败: {}", message);
        return Result.error(ErrorCode.INVALID_PARAMETER.getCode(), message);
    }

    /**
     * 处理参数绑定异常
     */
    @ExceptionHandler(BindException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<?> handleBindException(BindException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining("; "));
        
        log.warn("参数绑定失败: {}", message);
        return Result.error(ErrorCode.INVALID_PARAMETER.getCode(), message);
    }

    /**
     * 处理非法参数异常
     */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<?> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn("非法参数: {}", e.getMessage());
        return Result.error(ErrorCode.INVALID_PARAMETER.getCode(), e.getMessage());
    }

    /**     * 处理数据库唯一约束冲突异常
     */
    @ExceptionHandler(org.springframework.dao.DuplicateKeyException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Result<?> handleDuplicateKeyException(org.springframework.dao.DuplicateKeyException e) {
        log.warn("数据库唯一约束冲突: {}", e.getMessage());
        
        // 解析具体的约束冲突
        String message = e.getMessage();
        if (message != null && message.contains("uk_user_tool")) {
            return Result.error(ErrorCode.ALREADY_FAVORITED.getCode(), ErrorCode.ALREADY_FAVORITED.getMessage());
        } else if (message != null && message.contains("username")) {
            return Result.error(ErrorCode.USERNAME_EXISTS.getCode(), ErrorCode.USERNAME_EXISTS.getMessage());
        } else if (message != null && message.contains("email")) {
            return Result.error(ErrorCode.EMAIL_EXISTS.getCode(), ErrorCode.EMAIL_EXISTS.getMessage());
        }
        
        return Result.error(ErrorCode.BAD_REQUEST.getCode(), "数据已存在");
    }
    
    /**     * 处理系统异常
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Result<?> handleException(Exception e) {
        log.error("系统异常: ", e);
        return Result.error(ErrorCode.INTERNAL_ERROR.getCode(), "服务器内部错误，请稍后重试");
    }
    
    /**
     * 根据错误码获取HTTP状态码
     */
    private HttpStatus getHttpStatusFromErrorCode(Integer errorCode) {
        if (errorCode == null) {
            return HttpStatus.INTERNAL_SERVER_ERROR;
        }

        if (errorCode >= 400 && errorCode < 600) {
            return HttpStatus.valueOf(errorCode);
        }
        
        // 2xxx 用户相关错误
        if (errorCode >= 2000 && errorCode < 3000) {
            if (errorCode == 2001) return HttpStatus.NOT_FOUND; // USER_NOT_FOUND
            if (errorCode == 2002 || errorCode == 2003) return HttpStatus.CONFLICT; // EXISTS
            if (errorCode == 2004) return HttpStatus.UNAUTHORIZED; // INVALID_CREDENTIALS
            if (errorCode == 2005 || errorCode == 2006) return HttpStatus.UNAUTHORIZED; // TOKEN
            if (errorCode == 2007) return HttpStatus.FORBIDDEN; // USER_DISABLED
            if (errorCode == 2008) return HttpStatus.BAD_REQUEST; // CANNOT_DELETE_SELF
            return HttpStatus.BAD_REQUEST;
        }
        
        // 3xxx 工具相关错误
        if (errorCode >= 3000 && errorCode < 4000) {
            if (errorCode == 3001) return HttpStatus.NOT_FOUND; // TOOL_NOT_FOUND
            if (errorCode == 3002) return HttpStatus.CONFLICT; // TOOL_NAME_EXISTS
            return HttpStatus.BAD_REQUEST;
        }
        
        // 4xxx 分类相关错误
        if (errorCode >= 4000 && errorCode < 5000) {
            if (errorCode == 4001) return HttpStatus.NOT_FOUND; // CATEGORY_NOT_FOUND
            if (errorCode == 4002) return HttpStatus.CONFLICT; // CATEGORY_NAME_EXISTS
            if (errorCode == 4003) return HttpStatus.BAD_REQUEST; // CATEGORY_HAS_TOOLS
            return HttpStatus.BAD_REQUEST;
        }
        
        // 5xxx 收藏相关错误
        if (errorCode >= 5000 && errorCode < 6000) {
            if (errorCode == 5002) return HttpStatus.NOT_FOUND; // FAVORITE_NOT_FOUND
            return HttpStatus.BAD_REQUEST;
        }
        
        // 6xxx 参数验证错误
        if (errorCode >= 6000 && errorCode < 7000) {
            return HttpStatus.BAD_REQUEST;
        }
        
        // 7xxx 文档相关错误
        if (errorCode >= 7000 && errorCode < 8000) {
            if (errorCode == 7001 || errorCode == 7002) return HttpStatus.NOT_FOUND;
            return HttpStatus.BAD_REQUEST;
        }

        // 8xxx 验证码与限流相关错误
        if (errorCode >= 8000 && errorCode < 9000) {
            if (errorCode == 8006 || errorCode == 8007 || errorCode == 8008) return HttpStatus.TOO_MANY_REQUESTS;
            if (errorCode == 8009) return HttpStatus.FORBIDDEN;
            return HttpStatus.BAD_REQUEST;
        }

        // 9xxx AI 相关错误
        if (errorCode >= 9000 && errorCode < 10000) {
            if (errorCode == 9001) return HttpStatus.TOO_MANY_REQUESTS;
            if (errorCode == 9002 || errorCode == 9003) return HttpStatus.BAD_GATEWAY;
            return HttpStatus.BAD_REQUEST;
        }
        
        // 默认返回 500
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
}
