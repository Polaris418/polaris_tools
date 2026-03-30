package com.polaris.dto.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class Md2WordHistoryUpsertRequest {

    @NotBlank(message = "客户端文件 ID 不能为空")
    @Size(max = 64, message = "客户端文件 ID 不能超过 64 个字符")
    private String clientFileId;

    @NotBlank(message = "文档名称不能为空")
    @Size(max = 200, message = "文档名称不能超过 200 个字符")
    private String documentName;

    private String content;
}
