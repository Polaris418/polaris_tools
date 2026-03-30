package com.polaris.controller;

import com.polaris.ai.dto.AiProviderMonitoringDashboardResponse;
import com.polaris.ai.service.AiProviderConfigService;
import com.polaris.ai.service.AiProviderMonitoringService;
import com.polaris.auth.security.JwtAuthenticationFilter;
import com.polaris.auth.security.JwtTokenProvider;
import com.polaris.config.SecurityConfig;
import com.polaris.config.SecurityHeadersFilter;
import com.polaris.common.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AiProviderAdminController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class, JwtAuthenticationFilter.class, SecurityHeadersFilter.class})
@DisplayName("AI 提供商后台接口测试")
class AiProviderAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AiProviderConfigService aiProviderConfigService;

    @MockBean
    private AiProviderMonitoringService aiProviderMonitoringService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("管理员可获取 AI 提供商监控视图")
    void shouldReturnMonitoringDashboardForAdmin() throws Exception {
        when(jwtTokenProvider.validateToken("admin-token")).thenReturn(true);
        when(jwtTokenProvider.getUserId("admin-token")).thenReturn(1L);
        when(jwtTokenProvider.getUsername("admin-token")).thenReturn("admin");

        AiProviderMonitoringDashboardResponse response = AiProviderMonitoringDashboardResponse.builder()
                .generatedAt(LocalDateTime.now())
                .rangeHours(24)
                .trendBucketHours(1)
                .retentionDays(30)
                .selectedProviderId(2L)
                .summary(AiProviderMonitoringDashboardResponse.Summary.builder()
                        .totalProviders(2)
                        .enabledProviders(2)
                        .availableProviders(2)
                        .healthyProviders(1)
                        .degradedProviders(1)
                        .totalChatRequests(3)
                        .successCount(2)
                        .failureCount(1)
                        .fallbackCount(1)
                        .lastFallbackAt(LocalDateTime.now())
                        .build())
                .providers(List.of(
                        AiProviderMonitoringDashboardResponse.ProviderHealthSnapshot.builder()
                                .id(1L)
                                .name("NVIDIA 主用")
                                .healthStatus("degraded")
                                .build()
                ))
                .recentEvents(List.of(
                        AiProviderMonitoringDashboardResponse.RecentEvent.builder()
                                .eventType("fallback")
                                .providerName("兼容备用")
                                .relatedProviderName("NVIDIA 主用")
                                .success(true)
                                .message("timeout")
                                .occurredAt(LocalDateTime.now())
                                .build()
                ))
                .trendPoints(List.of(
                        AiProviderMonitoringDashboardResponse.TrendPoint.builder()
                                .metricHour(LocalDateTime.now().minusHours(1))
                                .successCount(1)
                                .failureCount(1)
                                .fallbackCount(1)
                                .avgLatencyMs(220D)
                                .build()
                ))
                .build();

        when(aiProviderMonitoringService.getDashboard(24, 2L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/admin/ai-providers/monitoring")
                        .param("hours", "24")
                        .param("providerId", "2")
                        .header("Authorization", "Bearer admin-token"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.rangeHours").value(24))
                .andExpect(jsonPath("$.data.trendBucketHours").value(1))
                .andExpect(jsonPath("$.data.retentionDays").value(30))
                .andExpect(jsonPath("$.data.selectedProviderId").value(2))
                .andExpect(jsonPath("$.data.summary.totalProviders").value(2))
                .andExpect(jsonPath("$.data.summary.fallbackCount").value(1))
                .andExpect(jsonPath("$.data.providers[0].healthStatus").value("degraded"))
                .andExpect(jsonPath("$.data.recentEvents[0].eventType").value("fallback"))
                .andExpect(jsonPath("$.data.trendPoints[0].fallbackCount").value(1));
    }
}
