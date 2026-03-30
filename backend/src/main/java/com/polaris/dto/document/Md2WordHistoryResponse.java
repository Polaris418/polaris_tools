package com.polaris.dto.document;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class Md2WordHistoryResponse {

    private Long id;

    private String clientFileId;

    private String documentName;

    private String content;

    private String previewText;

    private Long wordCount;

    private Long charCount;

    private LocalDateTime updatedAt;
}
