package com.polaris.common.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("全局异常处理器 HTTP 状态测试")
class GlobalExceptionHandlerHttpStatusTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders
                .standaloneSetup(new TestExceptionController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    @DisplayName("业务异常应返回 401")
    void shouldReturn401ForUnauthorizedBusinessException() throws Exception {
        mockMvc.perform(get("/test/business/unauthorized"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(ErrorCode.UNAUTHORIZED.getCode()))
                .andExpect(jsonPath("$.message").value(ErrorCode.UNAUTHORIZED.getMessage()));
    }

    @Test
    @DisplayName("业务异常应返回 403")
    void shouldReturn403ForForbiddenBusinessException() throws Exception {
        mockMvc.perform(get("/test/business/forbidden"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(ErrorCode.USER_DISABLED.getCode()));
    }

    @Test
    @DisplayName("业务异常应返回 404")
    void shouldReturn404ForNotFoundBusinessException() throws Exception {
        mockMvc.perform(get("/test/business/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(ErrorCode.USER_NOT_FOUND.getCode()));
    }

    @Test
    @DisplayName("业务异常应返回 409")
    void shouldReturn409ForConflictBusinessException() throws Exception {
        mockMvc.perform(get("/test/business/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(ErrorCode.EMAIL_EXISTS.getCode()));
    }

    @Test
    @DisplayName("参数校验异常应返回 400")
    void shouldReturn400ForValidationException() throws Exception {
        mockMvc.perform(post("/test/validation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_PARAMETER.getCode()))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("唯一约束冲突应返回 409")
    void shouldReturn409ForDuplicateKeyException() throws Exception {
        mockMvc.perform(get("/test/duplicate")
                        .param("type", "email"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(ErrorCode.EMAIL_EXISTS.getCode()));
    }

    @Test
    @DisplayName("系统异常应返回 500")
    void shouldReturn500ForUnexpectedException() throws Exception {
        mockMvc.perform(get("/test/system-error"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value(ErrorCode.INTERNAL_ERROR.getCode()));
    }

    @RestController
    static class TestExceptionController {

        @GetMapping("/test/business/unauthorized")
        String unauthorized() {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        @GetMapping("/test/business/forbidden")
        String forbidden() {
            throw new BusinessException(ErrorCode.USER_DISABLED);
        }

        @GetMapping("/test/business/not-found")
        String notFound() {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }

        @GetMapping("/test/business/conflict")
        String conflict() {
            throw new BusinessException(ErrorCode.EMAIL_EXISTS);
        }

        @PostMapping("/test/validation")
        String validate(@Valid @RequestBody TestRequest request) {
            return request.name();
        }

        @GetMapping("/test/duplicate")
        String duplicate(@RequestParam String type) {
            throw new DuplicateKeyException("duplicate " + type);
        }

        @GetMapping("/test/system-error")
        String systemError() {
            throw new IllegalStateException("boom");
        }
    }

    record TestRequest(@NotBlank(message = "name 不能为空") String name) {
    }
}
