package com.polaris.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.polaris.ai.dto.AiChatRequest;
import com.polaris.ai.dto.AiChatResult;
import com.polaris.ai.dto.AiUsageLimitResult;
import com.polaris.ai.dto.FormattingIntentRequest;
import com.polaris.ai.dto.FormattingIntentResponse;
import com.polaris.ai.dto.FormattingScopeDto;
import com.polaris.ai.service.AiProviderManager;
import com.polaris.ai.service.AiUsageLimiter;
import com.polaris.ai.service.impl.FormattingIntentServiceImpl;
import com.polaris.auth.security.UserContext;
import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.math.BigDecimal;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AI 格式解析服务测试")
class FormattingIntentServiceImplTest {

    @Mock
    private AiProviderManager aiProviderManager;

    @Mock
    private AiUsageLimiter aiUsageLimiter;

    @Mock
    private UserContext userContext;

    private FormattingIntentServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new FormattingIntentServiceImpl(aiProviderManager, aiUsageLimiter, userContext, new ObjectMapper());
    }

    @Test
    @DisplayName("应解析带代码块包裹的 JSON 并过滤不支持属性")
    void shouldParseAndSanitizeAiResponse() {
        when(userContext.getCurrentUserId()).thenReturn(1L);
        when(aiUsageLimiter.consumeFormattingQuota(1L, "guest-1", "127.0.0.1"))
                .thenReturn(AiUsageLimitResult.builder().remainingCount(7).dailyLimit(100).authenticated(true).build());
        mockExecuteWithFallback(AiChatResult.builder()
                .providerName("备用兼容")
                .providerType("openai-compatible")
                .content("""
                        ```json
                        {
                          "documentPatch": {},
                          "scopedPatches": [
                            {
                              "patch": {
                                "body": {
                                  "fontFamily": "FangSong",
                                  "fontSizePt": 12,
                                  "unsupported": "drop-me"
                                }
                              }
                            }
                          ],
                          "summary": "已调整当前段落"
                        }
                        ```
                        """)
                .build());

        FormattingIntentResponse response = service.parseIntent(request(), "guest-1", "127.0.0.1");

        assertEquals("备用兼容", response.getProviderUsed());
        assertEquals(7, response.getRemainingCount());
        assertEquals("已调整当前段落", response.getSummary());
        assertEquals("block", response.getScopedPatches().get(0).getScope().getScopeType());
        assertEquals("paragraph-18-a1b2c3", response.getScopedPatches().get(0).getScope().getBlockId());
        assertEquals("FangSong", response.getScopedPatches().get(0).getPatch().getBody().get("fontFamily"));
        assertEquals(12, ((Number) response.getScopedPatches().get(0).getPatch().getBody().get("fontSizePt")).intValue());
        assertNull(response.getScopedPatches().get(0).getPatch().getBody().get("unsupported"));
    }

    @Test
    @DisplayName("AI 返回无效 JSON 时应抛出业务异常")
    void shouldThrowWhenAiReturnsInvalidJson() {
        when(userContext.getCurrentUserId()).thenReturn(null);
        when(aiUsageLimiter.consumeFormattingQuota(null, "guest-1", "127.0.0.1"))
                .thenReturn(AiUsageLimitResult.builder().remainingCount(9).dailyLimit(10).authenticated(false).build());
        mockExecuteWithFallback(AiChatResult.builder()
                .providerType("nvidia")
                .content("not-json")
                .build());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.parseIntent(request(), "guest-1", "127.0.0.1")
        );

        assertEquals(ErrorCode.AI_FORMAT_INVALID_RESPONSE.getCode(), exception.getCode());
    }

    @Test
    @DisplayName("应兼容中文排版值与目标别名，避免整篇样式指令被过滤为空")
    void shouldNormalizeChineseTypographyValuesAndTargetAliases() {
        when(userContext.getCurrentUserId()).thenReturn(null);
        when(aiUsageLimiter.consumeFormattingQuota(null, "guest-typography", "127.0.0.1"))
                .thenReturn(AiUsageLimitResult.builder().remainingCount(8).dailyLimit(10).authenticated(false).build());
        mockExecuteWithFallback(AiChatResult.builder()
                .providerType("nvidia")
                .providerName("NVIDIA")
                .content("""
                        {
                          "documentPatch": {
                            "heading1": {
                              "fontFamily": "黑体",
                              "fontSizePt": "三号",
                              "align": "居中"
                            },
                            "paragraph": {
                              "fontFamily": "仿宋",
                              "fontSizePt": "小四",
                              "lineSpacing": "1.5 倍行距"
                            }
                          },
                          "summary": "已生成整篇文档格式调整"
                        }
                        """)
                .build());

        FormattingIntentResponse response = service.parseIntent(documentRequest(), "guest-typography", "127.0.0.1");

        assertEquals("SimHei", response.getDocumentPatch().getH1().get("fontFamily"));
        assertEquals(16, ((Number) response.getDocumentPatch().getH1().get("fontSizePt")).intValue());
        assertEquals("center", response.getDocumentPatch().getH1().get("align"));
        assertEquals("FangSong", response.getDocumentPatch().getBody().get("fontFamily"));
        assertEquals(12, ((Number) response.getDocumentPatch().getBody().get("fontSizePt")).intValue());
        assertEquals(1.5, ((Number) response.getDocumentPatch().getBody().get("lineSpacing")).doubleValue(), 0.0001);
        assertEquals("已生成整篇文档格式调整", response.getSummary());
    }

    @Test
    @DisplayName("应从解释文字包裹的完整 JSON 中提取合法结果")
    void shouldExtractJsonFromNarrativeResponse() {
        when(userContext.getCurrentUserId()).thenReturn(null);
        when(aiUsageLimiter.consumeFormattingQuota(null, "guest-6", "127.0.0.1"))
                .thenReturn(AiUsageLimitResult.builder().remainingCount(8).dailyLimit(10).authenticated(false).build());
        mockExecuteWithFallback(AiChatResult.builder()
                .providerType("nvidia")
                .providerName("NVIDIA")
                .content("""
                        下面是最终结果，请直接使用：
                        {
                          "documentPatch": {},
                          "scopedPatches": [],
                          "proposedChanges": [
                            {
                              "segmentId": "heading-seg",
                              "summary": "标题居中",
                              "styleChanges": [
                                {
                                  "target": "h2",
                                  "property": "align",
                                  "value": "center",
                                  "label": "标题居中"
                                }
                              ]
                            }
                          ],
                          "summary": "已生成候选修改"
                        }
                        以上 JSON 即为最终答案。
                        """)
                .build());

        FormattingIntentResponse response = service.parseIntent(previewSelectionRequest(), "guest-6", "127.0.0.1");

        assertEquals(1, response.getProposedChanges().size());
        assertEquals("heading-seg", response.getProposedChanges().get(0).getSegmentId());
        assertEquals("center", response.getProposedChanges().get(0).getStyleChanges().get(0).getValue());
    }

    @Test
    @DisplayName("应在提示词中带上中文排版术语与作用域参考")
    void shouldIncludeTypographyReferenceInPrompt() {
        when(userContext.getCurrentUserId()).thenReturn(1L);
        when(aiUsageLimiter.consumeFormattingQuota(1L, "guest-1", "127.0.0.1"))
                .thenReturn(AiUsageLimitResult.builder().remainingCount(8).dailyLimit(100).authenticated(true).build());
        mockExecuteWithFallback(AiChatResult.builder()
                .providerType("nvidia")
                .content("""
                        {
                          "documentPatch": {
                            "body": {
                              "fontFamily": "SimSun"
                            }
                          },
                          "scopedPatches": [],
                          "summary": "已解析"
                        }
                        """)
                .build());

        service.parseIntent(request(), "guest-1", "127.0.0.1");

        ArgumentCaptor<AiChatRequest> captor = ArgumentCaptor.forClass(AiChatRequest.class);
        verify(aiProviderManager).executeWithFallback(captor.capture(), any());
        AiChatRequest aiChatRequest = captor.getValue();

        assertEquals(2, aiChatRequest.getMessages().size());
        assertEquals(BigDecimal.valueOf(0.1), aiChatRequest.getTemperature());
        assertEquals(BigDecimal.ONE, aiChatRequest.getTopP());
        assertEquals(768, aiChatRequest.getMaxTokens());
        assertEquals(false, aiChatRequest.isStream());
        String userPrompt = aiChatRequest.getMessages().get(1).getContent();
        assertContains(userPrompt, "typographyReference");
        assertContains(userPrompt, "黑体");
        assertContains(userPrompt, "SimHei");
        assertContains(userPrompt, "\"三号\":16");
        assertContains(userPrompt, "\"小四\":12");
        assertContains(userPrompt, "scopeReference");
        assertContains(userPrompt, "当前块或当前段落/标题");
    }

    @Test
    @DisplayName("selection 作用域应保留选区坐标并过滤不支持属性")
    void shouldPreserveSelectionScopeAndSanitizePatch() {
        when(userContext.getCurrentUserId()).thenReturn(null);
        when(aiUsageLimiter.consumeFormattingQuota(null, "guest-2", "127.0.0.1"))
                .thenReturn(AiUsageLimitResult.builder().remainingCount(6).dailyLimit(10).authenticated(false).build());
        mockExecuteWithFallback(AiChatResult.builder()
                .providerName("NVIDIA")
                .providerType("nvidia")
                .content("""
                        {
                          "documentPatch": {},
                          "scopedPatches": [
                            {
                              "scope": { "scopeType": "selection" },
                              "patch": {
                                "body": {
                                  "color": "#c1121f",
                                  "bold": true,
                                  "unsupported": "drop-me"
                                }
                              },
                              "summary": "将选中文本改为红色加粗"
                            }
                          ],
                          "summary": "已调整当前选中内容"
                        }
                        """)
                .build());

        FormattingIntentResponse response = service.parseIntent(selectionRequest(), "guest-2", "127.0.0.1");

        assertEquals("selection", response.getScopedPatches().get(0).getScope().getScopeType());
        assertEquals(6, response.getScopedPatches().get(0).getScope().getStart());
        assertEquals(10, response.getScopedPatches().get(0).getScope().getEnd());
        assertEquals("#c1121f", response.getScopedPatches().get(0).getPatch().getBody().get("color"));
        assertEquals(true, response.getScopedPatches().get(0).getPatch().getBody().get("bold"));
        assertNull(response.getScopedPatches().get(0).getPatch().getBody().get("unsupported"));
        assertEquals("已调整当前选中内容", response.getSummary());
    }

    @Test
    @DisplayName("selection 场景应兼容模型返回的 text 别名补丁")
    void shouldMapTextAliasToBodyPatchForSelectionScope() {
        when(userContext.getCurrentUserId()).thenReturn(null);
        when(aiUsageLimiter.consumeFormattingQuota(null, "guest-3", "127.0.0.1"))
                .thenReturn(AiUsageLimitResult.builder().remainingCount(5).dailyLimit(10).authenticated(false).build());
        mockExecuteWithFallback(AiChatResult.builder()
                .providerName("NVIDIA")
                .providerType("nvidia")
                .content("""
                        {
                          "documentPatch": {},
                          "scopedPatches": [
                            {
                              "scope": { "scopeType": "selection" },
                              "patch": {
                                "text": {
                                  "color": "#dc2626",
                                  "bold": true
                                }
                              },
                              "summary": "将选中文本改成红色加粗"
                            }
                          ],
                          "summary": "已调整当前选中内容"
                        }
                        """)
                .build());

        FormattingIntentResponse response = service.parseIntent(selectionRequest(), "guest-3", "127.0.0.1");

        assertEquals("selection", response.getScopedPatches().get(0).getScope().getScopeType());
        assertEquals("#dc2626", response.getScopedPatches().get(0).getPatch().getBody().get("color"));
        assertEquals(true, response.getScopedPatches().get(0).getPatch().getBody().get("bold"));
        assertNull(response.getScopedPatches().get(0).getPatch().getCode());
    }

    @Test
    @DisplayName("preview-selection 场景应解析 proposedChanges 并回填片段上下文")
    void shouldParseProposedChangesForPreviewSelection() {
        when(userContext.getCurrentUserId()).thenReturn(null);
        when(aiUsageLimiter.consumeFormattingQuota(null, "guest-5", "127.0.0.1"))
                .thenReturn(AiUsageLimitResult.builder().remainingCount(3).dailyLimit(10).authenticated(false).build());
        mockExecuteWithFallback(AiChatResult.builder()
                .providerName("NVIDIA")
                .providerType("nvidia")
                .content("""
                        {
                          "documentPatch": {},
                          "scopedPatches": [],
                          "proposedChanges": [
                            {
                              "segmentId": "heading-seg",
                              "styleChanges": [
                                {
                                  "target": "h2",
                                  "property": "align",
                                  "value": "center",
                                  "label": "标题居中"
                                },
                                {
                                  "target": "text",
                                  "property": "color",
                                  "value": "#FF0000",
                                  "label": "文字改为红色"
                                }
                              ]
                            }
                          ],
                          "summary": "已生成候选修改"
                        }
                        """)
                .build());

        FormattingIntentResponse response = service.parseIntent(previewSelectionRequest(), "guest-5", "127.0.0.1");

        assertEquals(1, response.getProposedChanges().size());
        assertEquals("heading-seg", response.getProposedChanges().get(0).getSegmentId());
        assertEquals("heading-1", response.getProposedChanges().get(0).getBlockId());
        assertEquals("heading2", response.getProposedChanges().get(0).getBlockType());
        assertEquals("引言", response.getProposedChanges().get(0).getTextPreview());
        assertEquals(2, response.getProposedChanges().get(0).getStyleChanges().size());
        assertEquals("body", response.getProposedChanges().get(0).getStyleChanges().get(1).getTarget());
        assertEquals("已生成候选修改", response.getSummary());
    }

    @Test
    @DisplayName("AI 未返回任何可应用 patch 时应抛出业务异常")
    void shouldThrowWhenAiReturnsNoApplicablePatch() {
        when(userContext.getCurrentUserId()).thenReturn(null);
        when(aiUsageLimiter.consumeFormattingQuota(null, "guest-4", "127.0.0.1"))
                .thenReturn(AiUsageLimitResult.builder().remainingCount(4).dailyLimit(10).authenticated(false).build());
        mockExecuteWithFallback(AiChatResult.builder()
                .providerType("nvidia")
                .content("""
                        {
                          "documentPatch": {},
                          "scopedPatches": [
                            {
                              "scope": { "scopeType": "selection" },
                              "patch": {
                                "text": {
                                  "unsupported": "drop-me"
                                }
                              }
                            }
                          ],
                          "summary": "已调整"
                        }
                        """)
                .build());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.parseIntent(selectionRequest(), "guest-4", "127.0.0.1")
        );

        assertEquals(ErrorCode.AI_FORMAT_INVALID_RESPONSE.getCode(), exception.getCode());
    }

    private FormattingIntentRequest request() {
        FormattingIntentRequest request = new FormattingIntentRequest();
        request.setInstruction("把这一段改成仿宋四号，1.5 倍行距");
        request.setMode("merge");
        request.setSupportedProperties(List.of(
                "fontFamily",
                "fontSizePt",
                "lineSpacing",
                "paragraphSpacingBeforePt",
                "paragraphSpacingAfterPt"
        ));

        FormattingScopeDto scope = new FormattingScopeDto();
        scope.setScopeType("block");
        scope.setBlockId("paragraph-18-a1b2c3");
        request.setScope(scope);

        FormattingIntentRequest.CurrentBlockDto currentBlock = new FormattingIntentRequest.CurrentBlockDto();
        currentBlock.setBlockId("paragraph-18-a1b2c3");
        currentBlock.setBlockType("paragraph");
        currentBlock.setText("这是当前段落");
        currentBlock.setTextPreview("这是当前段落");
        request.setCurrentBlock(currentBlock);
        request.setCurrentResolvedFormat(Map.of("body", Map.of("fontFamily", "Microsoft YaHei", "fontSizePt", 11)));
        return request;
    }

    private FormattingIntentRequest documentRequest() {
        FormattingIntentRequest request = new FormattingIntentRequest();
        request.setInstruction("把一级标题改成黑体三号居中，正文改成仿宋小四，1.5 倍行距");
        request.setMode("merge");
        request.setSupportedProperties(List.of(
                "fontFamily",
                "fontSizePt",
                "color",
                "align",
                "bold",
                "italic",
                "lineSpacing",
                "paragraphSpacingBeforePt",
                "paragraphSpacingAfterPt",
                "indentLeftPt"
        ));

        FormattingScopeDto scope = new FormattingScopeDto();
        scope.setScopeType("document");
        request.setScope(scope);
        request.setCurrentResolvedFormat(Map.of(
                "h1", Map.of("fontFamily", "SimSun", "fontSizePt", 16, "align", "left"),
                "body", Map.of("fontFamily", "Microsoft YaHei", "fontSizePt", 11, "lineSpacing", 1.5)
        ));
        return request;
    }

    private FormattingIntentRequest selectionRequest() {
        FormattingIntentRequest request = new FormattingIntentRequest();
        request.setInstruction("把选中的这几个字改成红色加粗");
        request.setMode("merge");
        request.setSupportedProperties(List.of(
                "color",
                "bold",
                "fontFamily",
                "fontSizePt"
        ));

        FormattingScopeDto scope = new FormattingScopeDto();
        scope.setScopeType("selection");
        scope.setStart(6);
        scope.setEnd(10);
        request.setScope(scope);

        FormattingIntentRequest.CurrentSelectionDto currentSelection = new FormattingIntentRequest.CurrentSelectionDto();
        currentSelection.setStart(6);
        currentSelection.setEnd(10);
        currentSelection.setText("这几个字");
        request.setCurrentSelection(currentSelection);
        request.setCurrentResolvedFormat(Map.of("body", Map.of("fontFamily", "Microsoft YaHei", "fontSizePt", 11)));
        return request;
    }

    private FormattingIntentRequest previewSelectionRequest() {
        FormattingIntentRequest request = new FormattingIntentRequest();
        request.setInstruction("把选中的标题和正文分别调整一下");
        request.setMode("merge");
        request.setSupportedProperties(List.of(
                "color",
                "bold",
                "align"
        ));

        FormattingScopeDto scope = new FormattingScopeDto();
        scope.setScopeType("preview-selection");
        request.setScope(scope);

        FormattingIntentRequest.SelectionSegmentDto segment = new FormattingIntentRequest.SelectionSegmentDto();
        segment.setSegmentId("heading-seg");
        segment.setBlockId("heading-1");
        segment.setBlockType("heading2");
        segment.setSegmentRole("heading");
        segment.setSelectedText("引言");
        segment.setTextPreview("引言");
        segment.setSourceStart(3);
        segment.setSourceEnd(5);
        segment.setSelectedStart(0);
        segment.setSelectedEnd(2);
        request.setSelectionSegments(List.of(segment));
        request.setCurrentResolvedFormat(Map.of("h2", Map.of("fontFamily", "SimSun", "fontSizePt", 14)));
        return request;
    }

    private void assertContains(String source, String expected) {
        org.junit.jupiter.api.Assertions.assertTrue(
                source.contains(expected),
                () -> "期望内容包含: " + expected + "\n实际内容: " + source
        );
    }

    @SuppressWarnings("unchecked")
    private void mockExecuteWithFallback(AiChatResult result) {
        when(aiProviderManager.executeWithFallback(any(), any())).thenAnswer(invocation -> {
            Function<AiChatResult, Object> processor = invocation.getArgument(1);
            return processor.apply(result);
        });
    }
}
