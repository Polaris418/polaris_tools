package com.polaris.ai.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.polaris.ai.dto.AiChatRequest;
import com.polaris.ai.dto.AiChatResult;
import com.polaris.ai.dto.AiUsageLimitResult;
import com.polaris.ai.dto.FormattingIntentRequest;
import com.polaris.ai.dto.FormattingIntentResponse;
import com.polaris.ai.dto.FormattingPatchDto;
import com.polaris.ai.dto.FormattingScopeDto;
import com.polaris.ai.service.AiProviderManager;
import com.polaris.ai.service.AiUsageLimiter;
import com.polaris.ai.service.FormattingIntentService;
import com.polaris.auth.security.UserContext;
import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * AI 格式意图解析服务实现
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FormattingIntentServiceImpl implements FormattingIntentService {

    private static final Set<String> ALLOWED_SCOPE_TYPES = Set.of("document", "block", "selection", "preview-selection");
    private static final Set<String> ALLOWED_PATCH_TARGETS = Set.of("h1", "h2", "h3", "body", "code", "document");
    private static final Map<String, String> TARGET_ALIASES = Map.ofEntries(
            Map.entry("text", "body"),
            Map.entry("paragraph", "body"),
            Map.entry("content", "body"),
            Map.entry("bodyText", "body"),
            Map.entry("heading1", "h1"),
            Map.entry("title1", "h1"),
            Map.entry("heading-1", "h1"),
            Map.entry("heading2", "h2"),
            Map.entry("title2", "h2"),
            Map.entry("heading-2", "h2"),
            Map.entry("heading3", "h3"),
            Map.entry("title3", "h3"),
            Map.entry("heading-3", "h3"),
            Map.entry("codeBlock", "code"),
            Map.entry("settings", "document")
    );
    private static final Map<String, String> FONT_FAMILY_ALIASES = Map.ofEntries(
            Map.entry("黑体", "SimHei"),
            Map.entry("simhei", "SimHei"),
            Map.entry("宋体", "SimSun"),
            Map.entry("simsun", "SimSun"),
            Map.entry("仿宋", "FangSong"),
            Map.entry("fangsong", "FangSong"),
            Map.entry("楷体", "KaiTi"),
            Map.entry("kaiti", "KaiTi"),
            Map.entry("微软雅黑", "Microsoft YaHei"),
            Map.entry("microsoft yahei", "Microsoft YaHei"),
            Map.entry("consolas", "Consolas")
    );
    private static final Map<String, BigDecimal> NUMERIC_VALUE_ALIASES = Map.ofEntries(
            Map.entry("三号", BigDecimal.valueOf(16)),
            Map.entry("小三", BigDecimal.valueOf(15)),
            Map.entry("四号", BigDecimal.valueOf(14)),
            Map.entry("小四", BigDecimal.valueOf(12)),
            Map.entry("五号", BigDecimal.valueOf(10.5))
    );
    private static final Map<String, String> ALIGN_ALIASES = Map.ofEntries(
            Map.entry("左对齐", "left"),
            Map.entry("居左", "left"),
            Map.entry("居中", "center"),
            Map.entry("居中对齐", "center"),
            Map.entry("中间", "center"),
            Map.entry("中间对齐", "center"),
            Map.entry("右对齐", "right"),
            Map.entry("居右", "right"),
            Map.entry("两端对齐", "justify")
    );
    private static final Map<String, Boolean> BOOLEAN_ALIASES = Map.ofEntries(
            Map.entry("true", true),
            Map.entry("false", false),
            Map.entry("是", true),
            Map.entry("否", false),
            Map.entry("开启", true),
            Map.entry("关闭", false),
            Map.entry("开", true),
            Map.entry("关", false)
    );
    private static final Map<String, String> PAGE_SIZE_ALIASES = Map.ofEntries(
            Map.entry("a4纸", "a4"),
            Map.entry("letter纸", "letter"),
            Map.entry("信纸", "letter")
    );
    private static final Set<String> TEXT_PROPERTIES = Set.of(
            "fontFamily", "fontSizePt", "color", "align", "bold", "italic",
            "lineSpacing", "paragraphSpacingBeforePt", "paragraphSpacingAfterPt", "indentLeftPt"
    );
    private static final Set<String> CODE_PROPERTIES = Set.of(
            "fontFamily", "fontSizePt", "color", "align", "bold", "italic",
            "lineSpacing", "paragraphSpacingBeforePt", "paragraphSpacingAfterPt", "indentLeftPt", "backgroundColor"
    );
    private static final Set<String> DOCUMENT_PROPERTIES = Set.of(
            "imageQuality", "includeTableOfContents", "pageNumbers", "mirrorMargins", "pageSize"
    );
    private static final Set<String> ALLOWED_ALIGN = Set.of("left", "center", "right", "justify");
    private static final Set<String> ALLOWED_PAGE_SIZE = Set.of("a4", "letter");
    private static final BigDecimal DEFAULT_FORMAT_TEMPERATURE = BigDecimal.valueOf(0.1);
    private static final BigDecimal DEFAULT_FORMAT_TOP_P = BigDecimal.ONE;
    private static final int DEFAULT_FORMAT_MAX_TOKENS = 768;
    private static final boolean DEFAULT_FORMAT_STREAM = false;
    private static final Map<String, Object> TYPOGRAPHY_REFERENCE = Map.ofEntries(
            Map.entry("黑体", "SimHei"),
            Map.entry("宋体", "SimSun"),
            Map.entry("仿宋", "FangSong"),
            Map.entry("楷体", "KaiTi"),
            Map.entry("微软雅黑", "Microsoft YaHei"),
            Map.entry("三号", 16),
            Map.entry("小三", 15),
            Map.entry("四号", 14),
            Map.entry("小四", 12),
            Map.entry("五号", 10.5)
    );
    private static final Map<String, String> SCOPE_REFERENCE = Map.of(
            "document", "整篇文档",
            "block", "当前块或当前段落/标题",
            "selection", "当前选中内容",
            "preview-selection", "预览区跨标题/段落的多片段选区"
    );
    private static final Map<String, String> PROPERTY_LABELS = Map.ofEntries(
            Map.entry("fontFamily", "字体"),
            Map.entry("fontSizePt", "字号"),
            Map.entry("color", "颜色"),
            Map.entry("align", "对齐"),
            Map.entry("bold", "加粗"),
            Map.entry("italic", "斜体"),
            Map.entry("lineSpacing", "行距"),
            Map.entry("paragraphSpacingBeforePt", "段前距"),
            Map.entry("paragraphSpacingAfterPt", "段后距"),
            Map.entry("indentLeftPt", "缩进"),
            Map.entry("backgroundColor", "背景色"),
            Map.entry("imageQuality", "图片质量"),
            Map.entry("includeTableOfContents", "目录"),
            Map.entry("pageNumbers", "页码"),
            Map.entry("mirrorMargins", "镜像页边距"),
            Map.entry("pageSize", "纸张大小")
    );

    private final AiProviderManager aiProviderManager;
    private final AiUsageLimiter aiUsageLimiter;
    private final UserContext userContext;
    private final ObjectMapper objectMapper;

    @Override
    public FormattingIntentResponse parseIntent(FormattingIntentRequest request, String guestId, String ipAddress) {
        validateRequest(request);

        AiUsageLimitResult usage = aiUsageLimiter.consumeFormattingQuota(userContext.getCurrentUserId(), guestId, ipAddress);
        ParsedIntentCandidate candidate;
        try {
            candidate = aiProviderManager.executeWithFallback(buildChatRequest(request), aiChatResult ->
                    new ParsedIntentCandidate(aiChatResult, parseAiResponse(aiChatResult.getContent(), request))
            );
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("AI 格式解析调用失败", ex);
            throw new BusinessException(ErrorCode.AI_PROVIDER_UNAVAILABLE);
        }

        FormattingIntentResponse response = candidate.response();
        AiChatResult aiChatResult = candidate.aiChatResult();
        response.setProviderUsed(StringUtils.hasText(aiChatResult.getProviderName())
                ? aiChatResult.getProviderName()
                : aiChatResult.getProviderType());
        response.setRemainingCount(usage.getRemainingCount());
        return response;
    }

    private void validateRequest(FormattingIntentRequest request) {
        if (!"merge".equalsIgnoreCase(request.getMode())) {
            throw new IllegalArgumentException("当前仅支持 merge 模式");
        }

        FormattingScopeDto scope = request.getScope();
        if (!ALLOWED_SCOPE_TYPES.contains(scope.getScopeType())) {
            throw new IllegalArgumentException("不支持的 scopeType: " + scope.getScopeType());
        }

        if ("block".equals(scope.getScopeType()) && !StringUtils.hasText(scope.getBlockId())) {
            throw new IllegalArgumentException("block 作用域必须提供 blockId");
        }

        if ("selection".equals(scope.getScopeType()) && (scope.getStart() == null || scope.getEnd() == null)) {
            throw new IllegalArgumentException("selection 作用域必须提供 start 和 end");
        }

        if ("preview-selection".equals(scope.getScopeType())
                && (request.getSelectionSegments() == null || request.getSelectionSegments().isEmpty())) {
            throw new IllegalArgumentException("preview-selection 作用域必须提供 selectionSegments");
        }
    }

    private AiChatRequest buildChatRequest(FormattingIntentRequest request) {
        String contextJson = safeWriteValueAsString(buildPromptContext(request));
        String systemPrompt = """
                你是一个 Markdown to Word 格式意图解析器。
                你的任务是把用户的自然语言格式需求转换成 JSON 补丁。
                你只能返回 JSON，不要输出 Markdown 代码块，不要输出解释性文字。
                不要输出思考过程、reasoning、分析说明、前言、结尾或任何自然语言。
                不允许改写 Markdown 内容本身，不允许返回 HTML 或 CSS。
                顶层仅允许包含 documentPatch、scopedPatches、proposedChanges、summary。
                documentPatch 和 scopedPatches[*].patch 只允许包含 h1、h2、h3、body、code、document 六个对象。
                proposedChanges[*] 仅允许包含 segmentId、blockId、blockType、textPreview、summary、styleChanges。
                styleChanges[*] 仅允许包含 changeId、target、property、value、label。
                仅使用请求里支持的属性名；未提到的属性不要输出。
                当当前 scope 不是 document 时，除非用户明确提到“整篇文档”或“全文”，否则优先输出 scopedPatches。
                当当前 scopeType 为 preview-selection 时，不要返回 scopedPatches，改为返回 proposedChanges。
                proposedChanges 必须一条对应一个 segmentId；styleChanges 里的 target 只能是 h1、h2、h3、body、code、document 之一。
                如果你不确定，也必须返回一个合法 JSON 骨架，不能输出半截 JSON。
                中文排版术语优先按上下文里的 typographyReference 理解，例如“三号”应转成 16pt、“小四”应转成 12pt。
                返回示例：
                {
                  "documentPatch": {},
                  "scopedPatches": [
                    {
                      "scope": { "scopeType": "block", "blockId": "paragraph-1" },
                      "patch": {
                        "body": { "fontFamily": "FangSong", "fontSizePt": 12, "lineSpacing": 1.5 }
                      },
                      "summary": "将当前段落调整为仿宋四号并设置 1.5 倍行距"
                    }
                  ],
                  "proposedChanges": [],
                  "summary": "已完成格式调整建议"
                }
                """;

        String userPrompt = "请基于以下上下文生成 JSON 补丁，不要输出其他文本：\n" + contextJson;

        return AiChatRequest.builder()
                .messages(List.of(
                        AiChatRequest.Message.builder().role("system").content(systemPrompt).build(),
                        AiChatRequest.Message.builder().role("user").content(userPrompt).build()
                ))
                .temperature(DEFAULT_FORMAT_TEMPERATURE)
                .topP(DEFAULT_FORMAT_TOP_P)
                .maxTokens(DEFAULT_FORMAT_MAX_TOKENS)
                .stream(DEFAULT_FORMAT_STREAM)
                .build();
    }

    private Map<String, Object> buildPromptContext(FormattingIntentRequest request) {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("instruction", request.getInstruction());
        context.put("mode", request.getMode());
        context.put("scope", request.getScope());
        context.put("currentBlock", request.getCurrentBlock());
        context.put("currentSelection", request.getCurrentSelection());
        context.put("selectionSegments", request.getSelectionSegments());
        context.put("currentResolvedFormat", request.getCurrentResolvedFormat());
        context.put("supportedProperties", resolveSupportedProperties(request.getSupportedProperties()));
        context.put("typographyReference", TYPOGRAPHY_REFERENCE);
        context.put("scopeReference", SCOPE_REFERENCE);
        return context;
    }

    private FormattingIntentResponse parseAiResponse(String rawContent, FormattingIntentRequest request) {
        try {
            JsonNode root = parseJsonNodeFromAiContent(rawContent);
            FormattingIntentResponse response = new FormattingIntentResponse();
            response.setDocumentPatch(sanitizePatch(root.path("documentPatch"), resolveSupportedProperties(request.getSupportedProperties())));
            response.setScopedPatches(parseScopedPatches(root.path("scopedPatches"), request));
            response.setProposedChanges(parseProposedChanges(root.path("proposedChanges"), request));
            if ("preview-selection".equals(request.getScope().getScopeType()) && response.getProposedChanges().isEmpty()) {
                response.setProposedChanges(synthesizePreviewSelectionChanges(response, request));
            }

            if (isPatchEmpty(response.getDocumentPatch())
                    && response.getScopedPatches().isEmpty()
                    && response.getProposedChanges().isEmpty()) {
                throw new BusinessException(ErrorCode.AI_FORMAT_INVALID_RESPONSE);
            }

            String summary = root.path("summary").asText("");
            response.setSummary(StringUtils.hasText(summary) ? summary : "已生成格式调整建议");
            return response;
        } catch (JsonProcessingException ex) {
            log.error("AI 返回的格式结果无法解析: {}", rawContent, ex);
            throw new BusinessException(ErrorCode.AI_FORMAT_INVALID_RESPONSE);
        }
    }

    private JsonNode parseJsonNodeFromAiContent(String rawContent) throws JsonProcessingException {
        String stripped = stripCodeFence(rawContent);
        try {
            return objectMapper.readTree(stripped);
        } catch (JsonProcessingException ex) {
            for (String candidate : extractJsonCandidates(stripped)) {
                try {
                    return objectMapper.readTree(candidate);
                } catch (JsonProcessingException ignored) {
                    // 继续尝试下一个候选 JSON 片段
                }
            }
            throw ex;
        }
    }

    private List<String> extractJsonCandidates(String content) {
        LinkedHashSet<String> candidates = new LinkedHashSet<>();
        String trimmed = content.trim();
        if (!trimmed.isEmpty()) {
            candidates.add(trimmed);
        }

        String fencedJson = extractFencedJson(content);
        if (StringUtils.hasText(fencedJson)) {
            candidates.add(fencedJson);
        }

        String balancedObject = extractFirstBalancedJson(content, '{', '}');
        if (StringUtils.hasText(balancedObject)) {
            candidates.add(balancedObject);
        }

        String balancedArray = extractFirstBalancedJson(content, '[', ']');
        if (StringUtils.hasText(balancedArray)) {
            candidates.add(balancedArray);
        }

        return new ArrayList<>(candidates);
    }

    private String extractFencedJson(String content) {
        String marker = "```";
        int fenceStart = content.indexOf(marker);
        while (fenceStart >= 0) {
            int languageLineEnd = content.indexOf('\n', fenceStart);
            if (languageLineEnd < 0) {
                return null;
            }
            int fenceEnd = content.indexOf(marker, languageLineEnd + 1);
            if (fenceEnd < 0) {
                return null;
            }
            String candidate = content.substring(languageLineEnd + 1, fenceEnd).trim();
            if (StringUtils.hasText(candidate)) {
                return candidate;
            }
            fenceStart = content.indexOf(marker, fenceEnd + marker.length());
        }
        return null;
    }

    private String extractFirstBalancedJson(String content, char openChar, char closeChar) {
        boolean inString = false;
        boolean escaped = false;
        int depth = 0;
        int start = -1;

        for (int index = 0; index < content.length(); index++) {
            char current = content.charAt(index);

            if (escaped) {
                escaped = false;
                continue;
            }

            if (current == '\\') {
                escaped = inString;
                continue;
            }

            if (current == '"') {
                inString = !inString;
                continue;
            }

            if (inString) {
                continue;
            }

            if (current == openChar) {
                if (depth == 0) {
                    start = index;
                }
                depth++;
                continue;
            }

            if (current == closeChar && depth > 0) {
                depth--;
                if (depth == 0 && start >= 0) {
                    return content.substring(start, index + 1).trim();
                }
            }
        }

        return null;
    }

    private List<FormattingIntentResponse.ScopedPatchDto> parseScopedPatches(JsonNode node, FormattingIntentRequest request) {
        List<FormattingIntentResponse.ScopedPatchDto> result = new ArrayList<>();
        if (!node.isArray()) {
            return result;
        }

        Set<String> supportedProperties = resolveSupportedProperties(request.getSupportedProperties());
        for (JsonNode item : node) {
            FormattingPatchDto patch = sanitizePatch(item.path("patch"), supportedProperties);
            if (isPatchEmpty(patch)) {
                continue;
            }

            FormattingIntentResponse.ScopedPatchDto scopedPatch = new FormattingIntentResponse.ScopedPatchDto();
            scopedPatch.setScope(sanitizeScope(item.path("scope"), request.getScope()));
            scopedPatch.setPatch(patch);
            String summary = item.path("summary").asText("");
            if (StringUtils.hasText(summary)) {
                scopedPatch.setSummary(summary);
            }
            result.add(scopedPatch);
        }

        return result;
    }

    private List<FormattingIntentResponse.ProposedChangeDto> parseProposedChanges(
            JsonNode node,
            FormattingIntentRequest request
    ) {
        List<FormattingIntentResponse.ProposedChangeDto> result = new ArrayList<>();
        if (!node.isArray()) {
            return result;
        }

        Map<String, FormattingIntentRequest.SelectionSegmentDto> selectionSegmentMap = new LinkedHashMap<>();
        if (request.getSelectionSegments() != null) {
            request.getSelectionSegments().forEach((segment) -> selectionSegmentMap.put(segment.getSegmentId(), segment));
        }

        Set<String> supportedProperties = resolveSupportedProperties(request.getSupportedProperties());
        for (JsonNode item : node) {
            String segmentId = item.path("segmentId").asText("");
            FormattingIntentRequest.SelectionSegmentDto fallbackSegment = selectionSegmentMap.get(segmentId);
            if (!StringUtils.hasText(segmentId) || fallbackSegment == null) {
                continue;
            }

            List<FormattingIntentResponse.StyleChangeDto> styleChanges = parseStyleChanges(
                    item.path("styleChanges"),
                    supportedProperties
            );
            if (styleChanges.isEmpty()) {
                continue;
            }

            FormattingIntentResponse.ProposedChangeDto proposedChange = new FormattingIntentResponse.ProposedChangeDto();
            proposedChange.setSegmentId(segmentId);
            proposedChange.setBlockId(StringUtils.hasText(item.path("blockId").asText(""))
                    ? item.path("blockId").asText()
                    : fallbackSegment.getBlockId());
            proposedChange.setBlockType(StringUtils.hasText(item.path("blockType").asText(""))
                    ? item.path("blockType").asText()
                    : fallbackSegment.getBlockType());
            proposedChange.setTextPreview(StringUtils.hasText(item.path("textPreview").asText(""))
                    ? item.path("textPreview").asText()
                    : fallbackSegment.getTextPreview());
            String summary = item.path("summary").asText("");
            if (StringUtils.hasText(summary)) {
                proposedChange.setSummary(summary);
            }
            proposedChange.setStyleChanges(styleChanges);
            result.add(proposedChange);
        }

        return result;
    }

    private List<FormattingIntentResponse.ProposedChangeDto> synthesizePreviewSelectionChanges(
            FormattingIntentResponse response,
            FormattingIntentRequest request
    ) {
        List<FormattingIntentResponse.ProposedChangeDto> result = new ArrayList<>();
        if (request.getSelectionSegments() == null || request.getSelectionSegments().isEmpty()) {
            return result;
        }

        Map<String, FormattingIntentResponse.ProposedChangeDto> mergedBySegmentId = new LinkedHashMap<>();
        for (int index = 0; index < response.getScopedPatches().size(); index++) {
            FormattingIntentResponse.ScopedPatchDto scopedPatch = response.getScopedPatches().get(index);
            FormattingIntentRequest.SelectionSegmentDto matchedSegment = matchSelectionSegment(scopedPatch, request.getSelectionSegments(), index);
            if (matchedSegment == null) {
                continue;
            }

            List<FormattingIntentResponse.StyleChangeDto> styleChanges = buildStyleChangesFromPatch(
                    scopedPatch.getPatch(),
                    matchedSegment.getSegmentId()
            );
            if (styleChanges.isEmpty()) {
                continue;
            }

            FormattingIntentResponse.ProposedChangeDto proposedChange = mergedBySegmentId.computeIfAbsent(
                    matchedSegment.getSegmentId(),
                    ignored -> createProposedChange(matchedSegment)
            );
            if (StringUtils.hasText(scopedPatch.getSummary())) {
                proposedChange.setSummary(scopedPatch.getSummary());
            }
            proposedChange.getStyleChanges().addAll(styleChanges);
        }

        if (!mergedBySegmentId.isEmpty()) {
            result.addAll(mergedBySegmentId.values());
            return result;
        }

        for (FormattingIntentRequest.SelectionSegmentDto segment : request.getSelectionSegments()) {
            List<FormattingIntentResponse.StyleChangeDto> styleChanges = buildStyleChangesFromDocumentPatch(
                    response.getDocumentPatch(),
                    segment
            );
            if (styleChanges.isEmpty()) {
                continue;
            }

            FormattingIntentResponse.ProposedChangeDto proposedChange = createProposedChange(segment);
            proposedChange.setSummary(response.getSummary());
            proposedChange.setStyleChanges(styleChanges);
            result.add(proposedChange);
        }

        return result;
    }

    private FormattingIntentRequest.SelectionSegmentDto matchSelectionSegment(
            FormattingIntentResponse.ScopedPatchDto scopedPatch,
            List<FormattingIntentRequest.SelectionSegmentDto> selectionSegments,
            int fallbackIndex
    ) {
        if (scopedPatch.getScope() != null) {
            FormattingScopeDto scope = scopedPatch.getScope();
            if ("selection".equals(scope.getScopeType()) && scope.getStart() != null && scope.getEnd() != null) {
                for (FormattingIntentRequest.SelectionSegmentDto segment : selectionSegments) {
                    if (scope.getStart().equals(segment.getSourceStart()) && scope.getEnd().equals(segment.getSourceEnd())) {
                        return segment;
                    }
                }
            }

            if ("block".equals(scope.getScopeType()) && StringUtils.hasText(scope.getBlockId())) {
                for (FormattingIntentRequest.SelectionSegmentDto segment : selectionSegments) {
                    if (scope.getBlockId().equals(segment.getBlockId())) {
                        return segment;
                    }
                }
            }
        }

        return fallbackIndex < selectionSegments.size() ? selectionSegments.get(fallbackIndex) : null;
    }

    private FormattingIntentResponse.ProposedChangeDto createProposedChange(
            FormattingIntentRequest.SelectionSegmentDto segment
    ) {
        FormattingIntentResponse.ProposedChangeDto proposedChange = new FormattingIntentResponse.ProposedChangeDto();
        proposedChange.setSegmentId(segment.getSegmentId());
        proposedChange.setBlockId(segment.getBlockId());
        proposedChange.setBlockType(segment.getBlockType());
        proposedChange.setTextPreview(segment.getTextPreview());
        proposedChange.setStyleChanges(new ArrayList<>());
        return proposedChange;
    }

    private List<FormattingIntentResponse.StyleChangeDto> buildStyleChangesFromPatch(
            FormattingPatchDto patch,
            String segmentId
    ) {
        List<FormattingIntentResponse.StyleChangeDto> styleChanges = new ArrayList<>();
        if (patch == null) {
            return styleChanges;
        }

        appendStyleChanges(styleChanges, segmentId, "h1", patch.getH1());
        appendStyleChanges(styleChanges, segmentId, "h2", patch.getH2());
        appendStyleChanges(styleChanges, segmentId, "h3", patch.getH3());
        appendStyleChanges(styleChanges, segmentId, "body", patch.getBody());
        appendStyleChanges(styleChanges, segmentId, "code", patch.getCode());
        appendStyleChanges(styleChanges, segmentId, "document", patch.getDocument());
        return styleChanges;
    }

    private List<FormattingIntentResponse.StyleChangeDto> buildStyleChangesFromDocumentPatch(
            FormattingPatchDto patch,
            FormattingIntentRequest.SelectionSegmentDto segment
    ) {
        List<FormattingIntentResponse.StyleChangeDto> styleChanges = new ArrayList<>();
        if (patch == null) {
            return styleChanges;
        }

        String target = switch (segment.getBlockType()) {
            case "heading1" -> "h1";
            case "heading2" -> "h2";
            case "heading3" -> "h3";
            case "code" -> "code";
            default -> "body";
        };

        Map<String, Object> targetPatch = switch (target) {
            case "h1" -> patch.getH1();
            case "h2" -> patch.getH2();
            case "h3" -> patch.getH3();
            case "code" -> patch.getCode();
            default -> patch.getBody();
        };

        appendStyleChanges(styleChanges, segment.getSegmentId(), target, targetPatch);
        return styleChanges;
    }

    private void appendStyleChanges(
            List<FormattingIntentResponse.StyleChangeDto> targetList,
            String segmentId,
            String target,
            Map<String, Object> patch
    ) {
        if (patch == null || patch.isEmpty()) {
            return;
        }

        int index = 0;
        for (Map.Entry<String, Object> entry : patch.entrySet()) {
            FormattingIntentResponse.StyleChangeDto styleChange = new FormattingIntentResponse.StyleChangeDto();
            styleChange.setChangeId(segmentId + "-" + target + "-" + entry.getKey() + "-" + index);
            styleChange.setTarget(target);
            styleChange.setProperty(entry.getKey());
            styleChange.setValue(entry.getValue());
            styleChange.setLabel((PROPERTY_LABELS.getOrDefault(entry.getKey(), entry.getKey())) + "：" + entry.getValue());
            targetList.add(styleChange);
            index++;
        }
    }

    private FormattingScopeDto sanitizeScope(JsonNode scopeNode, FormattingScopeDto fallbackScope) {
        if (!scopeNode.isObject()) {
            return fallbackScope;
        }

        String scopeType = scopeNode.path("scopeType").asText("");
        if (!ALLOWED_SCOPE_TYPES.contains(scopeType)) {
            return fallbackScope;
        }

        FormattingScopeDto scope = new FormattingScopeDto();
        scope.setScopeType(scopeType);
        if ("block".equals(scopeType)) {
            String blockId = scopeNode.path("blockId").asText("");
            scope.setBlockId(StringUtils.hasText(blockId) ? blockId : fallbackScope.getBlockId());
        } else if ("selection".equals(scopeType)) {
            scope.setStart(scopeNode.has("start") ? scopeNode.path("start").asInt() : fallbackScope.getStart());
            scope.setEnd(scopeNode.has("end") ? scopeNode.path("end").asInt() : fallbackScope.getEnd());
        }
        return scope;
    }

    private List<FormattingIntentResponse.StyleChangeDto> parseStyleChanges(
            JsonNode node,
            Set<String> supportedProperties
    ) {
        List<FormattingIntentResponse.StyleChangeDto> result = new ArrayList<>();
        if (!node.isArray()) {
            return result;
        }

        for (JsonNode item : node) {
            String target = normalizeTarget(item.path("target").asText(""));
            String property = item.path("property").asText("");
            if (!ALLOWED_PATCH_TARGETS.contains(target) || !supportedProperties.contains(property)) {
                continue;
            }

            Set<String> allowedProperties = switch (target) {
                case "code" -> CODE_PROPERTIES;
                case "document" -> DOCUMENT_PROPERTIES;
                default -> TEXT_PROPERTIES;
            };
            if (!allowedProperties.contains(property)) {
                continue;
            }

            Object sanitizedValue = sanitizePropertyValue(property, item.path("value"));
            if (sanitizedValue == null) {
                continue;
            }

            FormattingIntentResponse.StyleChangeDto styleChange = new FormattingIntentResponse.StyleChangeDto();
            styleChange.setChangeId(StringUtils.hasText(item.path("changeId").asText(""))
                    ? item.path("changeId").asText()
                    : null);
            styleChange.setTarget(target);
            styleChange.setProperty(property);
            styleChange.setValue(sanitizedValue);
            String label = item.path("label").asText("");
            if (StringUtils.hasText(label)) {
                styleChange.setLabel(label);
            }
            result.add(styleChange);
        }

        return result;
    }

    private FormattingPatchDto sanitizePatch(JsonNode patchNode, Set<String> supportedProperties) {
        FormattingPatchDto patch = new FormattingPatchDto();
        if (!patchNode.isObject()) {
            return patch;
        }

        patch.setH1(resolveAliasTargetPatch(patchNode, List.of("h1", "heading1", "title1", "heading-1"), TEXT_PROPERTIES, supportedProperties));
        patch.setH2(resolveAliasTargetPatch(patchNode, List.of("h2", "heading2", "title2", "heading-2"), TEXT_PROPERTIES, supportedProperties));
        patch.setH3(resolveAliasTargetPatch(patchNode, List.of("h3", "heading3", "title3", "heading-3"), TEXT_PROPERTIES, supportedProperties));
        patch.setBody(resolveBodyPatch(patchNode, supportedProperties));
        patch.setCode(resolveAliasTargetPatch(patchNode, List.of("code", "codeBlock"), CODE_PROPERTIES, supportedProperties));
        patch.setDocument(resolveAliasTargetPatch(patchNode, List.of("document", "settings"), DOCUMENT_PROPERTIES, supportedProperties));
        return patch;
    }

    private Map<String, Object> resolveBodyPatch(JsonNode patchNode, Set<String> supportedProperties) {
        return resolveAliasTargetPatch(patchNode, List.of("body", "text", "paragraph", "content", "bodyText"), TEXT_PROPERTIES, supportedProperties);
    }

    private Map<String, Object> resolveAliasTargetPatch(
            JsonNode patchNode,
            List<String> aliases,
            Set<String> allowedProperties,
            Set<String> supportedProperties
    ) {
        Map<String, Object> merged = null;
        for (String alias : aliases) {
            Map<String, Object> candidate = sanitizeTargetPatch(patchNode.path(alias), allowedProperties, supportedProperties);
            if (candidate == null) {
                continue;
            }
            if (merged == null) {
                merged = new LinkedHashMap<>();
            }
            merged.putAll(candidate);
        }
        return merged;
    }

    private Map<String, Object> sanitizeTargetPatch(
            JsonNode targetNode,
            Set<String> allowedProperties,
            Set<String> supportedProperties
    ) {
        if (!targetNode.isObject()) {
            return null;
        }

        Map<String, Object> sanitized = new LinkedHashMap<>();
        Iterator<Map.Entry<String, JsonNode>> fields = targetNode.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            String property = entry.getKey();
            if (!allowedProperties.contains(property) || !supportedProperties.contains(property)) {
                continue;
            }

            Object value = sanitizePropertyValue(property, entry.getValue());
            if (value != null) {
                sanitized.put(property, value);
            }
        }

        return sanitized.isEmpty() ? null : sanitized;
    }

    private Object sanitizePropertyValue(String property, JsonNode valueNode) {
        if (valueNode == null || valueNode.isNull()) {
            return null;
        }

        if ("fontFamily".equals(property) && valueNode.isTextual()) {
            String value = normalizeFontFamily(valueNode.asText());
            return StringUtils.hasText(value) ? value : null;
        }

        if (Set.of("color", "backgroundColor").contains(property) && valueNode.isTextual()) {
            String value = valueNode.asText().trim();
            return StringUtils.hasText(value) ? value : null;
        }

        if ("align".equals(property) && valueNode.isTextual()) {
            String value = normalizeAlign(valueNode.asText());
            return ALLOWED_ALIGN.contains(value) ? value : null;
        }

        if ("pageSize".equals(property) && valueNode.isTextual()) {
            String value = normalizePageSize(valueNode.asText());
            return ALLOWED_PAGE_SIZE.contains(value) ? value : null;
        }

        if (Set.of(
                "fontSizePt", "lineSpacing", "paragraphSpacingBeforePt", "paragraphSpacingAfterPt",
                "indentLeftPt", "imageQuality"
        ).contains(property)) {
            Number value = normalizeNumberValue(valueNode);
            return value;
        }

        if (Set.of("bold", "italic", "includeTableOfContents", "pageNumbers", "mirrorMargins").contains(property)) {
            Boolean value = normalizeBooleanValue(valueNode);
            return value;
        }

        return null;
    }

    private String normalizeTarget(String rawTarget) {
        if (!StringUtils.hasText(rawTarget)) {
            return rawTarget;
        }
        String normalized = rawTarget.trim();
        return TARGET_ALIASES.getOrDefault(normalized, TARGET_ALIASES.getOrDefault(normalized.toLowerCase(), normalized));
    }

    private String normalizeFontFamily(String rawValue) {
        if (!StringUtils.hasText(rawValue)) {
            return null;
        }
        String trimmed = rawValue.trim();
        return FONT_FAMILY_ALIASES.getOrDefault(trimmed, FONT_FAMILY_ALIASES.getOrDefault(trimmed.toLowerCase(), trimmed));
    }

    private String normalizeAlign(String rawValue) {
        if (!StringUtils.hasText(rawValue)) {
            return null;
        }
        String trimmed = rawValue.trim();
        String aliased = ALIGN_ALIASES.getOrDefault(trimmed, trimmed);
        return aliased.toLowerCase();
    }

    private String normalizePageSize(String rawValue) {
        if (!StringUtils.hasText(rawValue)) {
            return null;
        }
        String trimmed = rawValue.trim();
        String aliased = PAGE_SIZE_ALIASES.getOrDefault(trimmed.toLowerCase(), PAGE_SIZE_ALIASES.getOrDefault(trimmed, trimmed));
        return aliased.toLowerCase();
    }

    private Number normalizeNumberValue(JsonNode valueNode) {
        if (valueNode.isNumber()) {
            return valueNode.numberValue();
        }
        if (!valueNode.isTextual()) {
            return null;
        }

        String trimmed = valueNode.asText().trim();
        if (!StringUtils.hasText(trimmed)) {
            return null;
        }
        BigDecimal aliased = NUMERIC_VALUE_ALIASES.get(trimmed);
        if (aliased != null) {
            return aliased;
        }

        String normalized = trimmed
                .replace("倍行距", "")
                .replace("倍", "")
                .replace("pt", "")
                .replace("PT", "")
                .replace("磅", "")
                .replace("号", "")
                .trim();

        if (!StringUtils.hasText(normalized)) {
            return null;
        }

        try {
            return new BigDecimal(normalized);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Boolean normalizeBooleanValue(JsonNode valueNode) {
        if (valueNode.isBoolean()) {
            return valueNode.booleanValue();
        }
        if (!valueNode.isTextual()) {
            return null;
        }

        String trimmed = valueNode.asText().trim().toLowerCase();
        return BOOLEAN_ALIASES.get(trimmed);
    }

    private Set<String> resolveSupportedProperties(List<String> supportedProperties) {
        if (supportedProperties == null || supportedProperties.isEmpty()) {
            LinkedHashSet<String> defaults = new LinkedHashSet<>();
            defaults.addAll(TEXT_PROPERTIES);
            defaults.addAll(Set.of("backgroundColor"));
            defaults.addAll(DOCUMENT_PROPERTIES);
            return defaults;
        }

        return new LinkedHashSet<>(supportedProperties);
    }

    private boolean isPatchEmpty(FormattingPatchDto patch) {
        return patch.getH1() == null
                && patch.getH2() == null
                && patch.getH3() == null
                && patch.getBody() == null
                && patch.getCode() == null
                && patch.getDocument() == null;
    }

    private String stripCodeFence(String content) {
        if (!StringUtils.hasText(content)) {
            throw new BusinessException(ErrorCode.AI_FORMAT_INVALID_RESPONSE);
        }

        String trimmed = content.trim();
        if (trimmed.startsWith("```")) {
            int firstLineBreak = trimmed.indexOf('\n');
            if (firstLineBreak > -1) {
                trimmed = trimmed.substring(firstLineBreak + 1);
            }
            if (trimmed.endsWith("```")) {
                trimmed = trimmed.substring(0, trimmed.length() - 3);
            }
        }
        return trimmed.trim();
    }

    private String safeWriteValueAsString(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("构造 AI 请求上下文失败", ex);
        }
    }

    private record ParsedIntentCandidate(AiChatResult aiChatResult, FormattingIntentResponse response) {
    }
}
