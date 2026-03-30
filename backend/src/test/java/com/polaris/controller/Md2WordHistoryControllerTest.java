package com.polaris.controller;

import com.polaris.auth.security.JwtAuthenticationFilter;
import com.polaris.auth.security.JwtTokenProvider;
import com.polaris.common.exception.GlobalExceptionHandler;
import com.polaris.config.SecurityConfig;
import com.polaris.config.SecurityHeadersFilter;
import com.polaris.dto.document.Md2WordHistoryResponse;
import com.polaris.service.Md2WordHistoryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = Md2WordHistoryController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class, JwtAuthenticationFilter.class, SecurityHeadersFilter.class})
@DisplayName("md2word 历史记录接口测试")
class Md2WordHistoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private Md2WordHistoryService md2WordHistoryService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("登录用户可以获取历史记录列表")
    void shouldListHistoryForAuthenticatedUser() throws Exception {
        mockJwt();
        Md2WordHistoryResponse response = new Md2WordHistoryResponse();
        response.setId(1L);
        response.setClientFileId("file-1");
        response.setDocumentName("Untitled.md");
        response.setContent("# 标题");
        response.setUpdatedAt(LocalDateTime.of(2026, 3, 30, 10, 0));

        when(md2WordHistoryService.listCurrentUserHistory("设计")).thenReturn(List.of(response));

        mockMvc.perform(get("/api/v1/md2word/history")
                        .param("search", "设计")
                        .header("Authorization", "Bearer valid-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].clientFileId").value("file-1"))
                .andExpect(jsonPath("$.data[0].documentName").value("Untitled.md"));

        verify(md2WordHistoryService).listCurrentUserHistory("设计");
    }

    @Test
    @DisplayName("登录用户可以保存历史记录")
    void shouldSaveHistoryForAuthenticatedUser() throws Exception {
        mockJwt();
        Md2WordHistoryResponse response = new Md2WordHistoryResponse();
        response.setId(1L);
        response.setClientFileId("file-1");
        response.setDocumentName("Untitled.md");

        when(md2WordHistoryService.saveCurrentUserHistory(any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/md2word/history")
                        .header("Authorization", "Bearer valid-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "clientFileId": "file-1",
                                  "documentName": "Untitled.md",
                                  "content": "# 标题"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.clientFileId").value("file-1"));

        verify(md2WordHistoryService).saveCurrentUserHistory(any());
    }

    @Test
    @DisplayName("匿名用户不能访问历史记录接口")
    void shouldRejectAnonymousAccess() throws Exception {
        mockMvc.perform(get("/api/v1/md2word/history"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("登录用户可以删除历史记录")
    void shouldDeleteHistoryForAuthenticatedUser() throws Exception {
        mockJwt();

        mockMvc.perform(delete("/api/v1/md2word/history/1")
                        .header("Authorization", "Bearer valid-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(md2WordHistoryService).deleteCurrentUserHistory(1L);
    }

    @Test
    @DisplayName("登录用户可以重命名历史记录")
    void shouldRenameHistoryForAuthenticatedUser() throws Exception {
        mockJwt();
        Md2WordHistoryResponse response = new Md2WordHistoryResponse();
        response.setId(1L);
        response.setClientFileId("file-1");
        response.setDocumentName("New Name.md");

        when(md2WordHistoryService.renameCurrentUserHistory(eq(1L), any())).thenReturn(response);

        mockMvc.perform(patch("/api/v1/md2word/history/1")
                        .header("Authorization", "Bearer valid-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "documentName": "New Name.md"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.documentName").value("New Name.md"));

        verify(md2WordHistoryService).renameCurrentUserHistory(eq(1L), any());
    }

    private void mockJwt() {
        when(jwtTokenProvider.validateToken("valid-token")).thenReturn(true);
        when(jwtTokenProvider.getUserId("valid-token")).thenReturn(1L);
        when(jwtTokenProvider.getUsername("valid-token")).thenReturn("tester");
    }
}
