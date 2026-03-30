package com.polaris.ai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * AI 格式解析请求 DTO
 */
@Data
public class FormattingIntentRequest {

    @NotBlank(message = "instruction 不能为空")
    private String instruction;

    @NotBlank(message = "mode 不能为空")
    private String mode;

    @Valid
    @NotNull(message = "scope 不能为空")
    private FormattingScopeDto scope;

    @Valid
    private CurrentBlockDto currentBlock;

    @Valid
    private CurrentSelectionDto currentSelection;

    @Valid
    private List<SelectionSegmentDto> selectionSegments;

    private Map<String, Object> currentResolvedFormat;

    private List<String> supportedProperties;

    @Data
    public static class CurrentBlockDto {
        private String blockId;
        private String blockType;
        private Integer lineStart;
        private Integer lineEnd;
        private String text;
        private String textPreview;
    }

    @Data
    public static class CurrentSelectionDto {
        private Integer start;
        private Integer end;
        private String text;
    }

    @Data
    public static class SelectionSegmentDto {
        private String segmentId;
        private String blockId;
        private String blockType;
        private String segmentRole;
        private String selectedText;
        private String textPreview;
        private Integer sourceStart;
        private Integer sourceEnd;
        private Integer selectedStart;
        private Integer selectedEnd;
    }
}
