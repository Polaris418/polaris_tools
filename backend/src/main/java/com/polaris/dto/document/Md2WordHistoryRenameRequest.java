package com.polaris.dto.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class Md2WordHistoryRenameRequest {

    @NotBlank(message = "文档名称不能为空")
    @Size(max = 200, message = "文档名称不能超过 200 个字符")
    private String documentName;
}
