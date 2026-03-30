package com.polaris.ai.dto;

import lombok.Data;

import java.util.Map;

/**
 * 统一格式补丁 DTO
 */
@Data
public class FormattingPatchDto {

    private Map<String, Object> h1;
    private Map<String, Object> h2;
    private Map<String, Object> h3;
    private Map<String, Object> body;
    private Map<String, Object> code;
    private Map<String, Object> document;
}
