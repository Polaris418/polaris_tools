package com.polaris.controller;

import com.polaris.ai.dto.FormattingIntentResponse;
import com.polaris.ai.dto.FormattingScopeDto;
import com.polaris.ai.service.FormattingIntentService;
import com.polaris.auth.security.JwtAuthenticationFilter;
import com.polaris.auth.security.JwtTokenProvider;
import com.polaris.common.exception.ErrorCode;
import com.polaris.common.exception.GlobalExceptionHandler;
import com.polaris.config.SecurityConfig;
import com.polaris.config.SecurityHeadersFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = FormattingIntentController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class, JwtAuthenticationFilter.class, SecurityHeadersFilter.class})
@DisplayName("AI 格式解析接口测试")
class FormattingIntentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FormattingIntentService formattingIntentService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("匿名用户可以访问 AI 格式解析接口")
    void shouldAllowAnonymousFormattingIntentParse() throws Exception {
        FormattingIntentResponse response = new FormattingIntentResponse();
        response.setSummary("已调整当前段落");
        response.setRemainingCount(9);

        when(formattingIntentService.parseIntent(any(), eq("guest-1"), eq("127.0.0.1"))).thenReturn(response);

        mockMvc.perform(post("/api/v1/ai/formatting/parse")
                        .header("X-Guest-Id", "guest-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequestJson()))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.summary").value("已调整当前段落"))
                .andExpect(jsonPath("$.data.remainingCount").value(9));

        verify(formattingIntentService).parseIntent(any(), eq("guest-1"), eq("127.0.0.1"));
    }

    @Test
    @DisplayName("游客超出当日限额时应返回 429")
    void shouldReturn429WhenGuestQuotaExceeded() throws Exception {
        when(formattingIntentService.parseIntent(any(), eq("guest-1"), eq("127.0.0.1")))
                .thenThrow(new com.polaris.common.exception.BusinessException(ErrorCode.AI_FORMAT_QUOTA_EXCEEDED));

        mockMvc.perform(post("/api/v1/ai/formatting/parse")
                        .header("X-Guest-Id", "guest-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequestJson()))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value(9001));
    }

    @Test
    @DisplayName("已登录用户也可以访问 AI 格式解析接口")
    void shouldAllowAuthenticatedFormattingIntentParse() throws Exception {
        when(jwtTokenProvider.validateToken("valid-token")).thenReturn(true);
        when(jwtTokenProvider.getUserId("valid-token")).thenReturn(42L);
        when(jwtTokenProvider.getUsername("valid-token")).thenReturn("tester");

        FormattingIntentResponse response = new FormattingIntentResponse();
        response.setSummary("已为正文生成格式补丁");
        response.setRemainingCount(99);
        FormattingIntentResponse.ScopedPatchDto scopedPatch = new FormattingIntentResponse.ScopedPatchDto();
        FormattingScopeDto scope = new FormattingScopeDto();
        scope.setScopeType("block");
        scope.setBlockId("paragraph-18-a1b2c3");
        scopedPatch.setScope(scope);
        response.getScopedPatches().add(scopedPatch);

        when(formattingIntentService.parseIntent(any(), eq(null), eq("127.0.0.1"))).thenReturn(response);

        mockMvc.perform(post("/api/v1/ai/formatting/parse")
                        .header("Authorization", "Bearer valid-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequestJson()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.remainingCount").value(99))
                .andExpect(jsonPath("$.data.scopedPatches[0].scope.blockId").value("paragraph-18-a1b2c3"));

        verify(formattingIntentService).parseIntent(any(), eq(null), eq("127.0.0.1"));
    }

    private String validRequestJson() {
        return """
                {
                  "instruction": "把这一段改成仿宋四号，1.5 倍行距",
                  "mode": "merge",
                  "scope": {
                    "scopeType": "block",
                    "blockId": "paragraph-18-a1b2c3"
                  },
                  "currentBlock": {
                    "blockId": "paragraph-18-a1b2c3",
                    "blockType": "paragraph",
                    "text": "这是当前段落",
                    "textPreview": "这是当前段落"
                  },
                  "currentResolvedFormat": {
                    "body": {
                      "fontFamily": "Microsoft YaHei",
                      "fontSizePt": 11
                    }
                  },
                  "supportedProperties": ["fontFamily", "fontSizePt", "lineSpacing"]
                }
                """;
    }
}
