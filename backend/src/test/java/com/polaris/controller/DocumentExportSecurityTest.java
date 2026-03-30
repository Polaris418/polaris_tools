package com.polaris.controller;

import com.polaris.auth.security.JwtAuthenticationFilter;
import com.polaris.auth.security.JwtTokenProvider;
import com.polaris.auth.security.UserContext;
import com.polaris.common.exception.GlobalExceptionHandler;
import com.polaris.config.SecurityConfig;
import com.polaris.config.SecurityHeadersFilter;
import com.polaris.mapper.DocumentMapper;
import com.polaris.service.DocumentExportService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = DocumentExportController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class, JwtAuthenticationFilter.class, SecurityHeadersFilter.class})
@DisplayName("文档导出接口访问控制测试")
class DocumentExportSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DocumentExportService exportService;

    @MockBean
    private DocumentMapper documentMapper;

    @MockBean
    private UserContext userContext;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("匿名用户可以访问 HTML 预览接口")
    void shouldAllowAnonymousPreview() throws Exception {
        when(exportService.markdownToHtml("# Hello")).thenReturn("<h1>Hello</h1>");

        mockMvc.perform(post("/api/v1/documents/preview")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("# Hello"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("<h1>Hello</h1>")));

        verify(exportService).markdownToHtml("# Hello");
    }

    @Test
    @DisplayName("匿名用户不能访问 Markdown 导出接口")
    void shouldRejectAnonymousExportMarkdown() throws Exception {
        mockMvc.perform(post("/api/v1/documents/export-markdown")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "markdown": "# Hello",
                                  "format": "pdf",
                                  "template": "corporate",
                                  "fileName": "hello"
                                }
                                """))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(exportService);
    }

    @Test
    @DisplayName("带有效 JWT 的用户可以导出 Markdown 文档")
    void shouldAllowAuthenticatedExportMarkdown() throws Exception {
        when(jwtTokenProvider.validateToken("valid-token")).thenReturn(true);
        when(jwtTokenProvider.getUserId("valid-token")).thenReturn(1L);
        when(jwtTokenProvider.getUsername("valid-token")).thenReturn("tester");
        when(exportService.markdownToPdf("# Hello", "corporate")).thenReturn("pdf-data".getBytes());

        mockMvc.perform(post("/api/v1/documents/export-markdown")
                        .header("Authorization", "Bearer valid-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "markdown": "# Hello",
                                  "format": "pdf",
                                  "template": "corporate",
                                  "fileName": "hello"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("hello.pdf")));

        verify(exportService).markdownToPdf("# Hello", "corporate");
        verify(exportService, never()).markdownToDocx(anyString(), anyString());
    }
}
