package com.polaris.ai.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * AI 格式解析响应 DTO
 */
@Data
public class FormattingIntentResponse {

    private FormattingPatchDto documentPatch = new FormattingPatchDto();
    private List<ScopedPatchDto> scopedPatches = new ArrayList<>();
    private List<ProposedChangeDto> proposedChanges = new ArrayList<>();
    private String summary;
    private String providerUsed;
    private Integer remainingCount;

    @Data
    public static class ScopedPatchDto {
        private FormattingScopeDto scope;
        private FormattingPatchDto patch;
        private String summary;
    }

    @Data
    public static class ProposedChangeDto {
        private String segmentId;
        private String blockId;
        private String blockType;
        private String textPreview;
        private String summary;
        private List<StyleChangeDto> styleChanges = new ArrayList<>();
    }

    @Data
    public static class StyleChangeDto {
        private String changeId;
        private String target;
        private String property;
        private Object value;
        private String label;
    }
}
