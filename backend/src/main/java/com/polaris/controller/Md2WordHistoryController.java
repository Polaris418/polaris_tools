package com.polaris.controller;

import com.polaris.common.result.Result;
import com.polaris.dto.document.Md2WordHistoryRenameRequest;
import com.polaris.dto.document.Md2WordHistoryResponse;
import com.polaris.dto.document.Md2WordHistoryUpsertRequest;
import com.polaris.service.Md2WordHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/md2word/history")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Md2Word History", description = "md2word 历史记录 API")
public class Md2WordHistoryController {

    private final Md2WordHistoryService md2WordHistoryService;

    @GetMapping
    @Operation(summary = "获取当前用户 md2word 历史记录")
    public Result<List<Md2WordHistoryResponse>> list(
            @RequestParam(value = "search", required = false) String search
    ) {
        return Result.success(md2WordHistoryService.listCurrentUserHistory(search));
    }

    @PostMapping
    @Operation(summary = "保存当前用户 md2word 历史记录")
    public Result<Md2WordHistoryResponse> save(@Valid @RequestBody Md2WordHistoryUpsertRequest request) {
        return Result.success(md2WordHistoryService.saveCurrentUserHistory(request));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "重命名当前用户 md2word 历史记录")
    public Result<Md2WordHistoryResponse> rename(
            @PathVariable Long id,
            @Valid @RequestBody Md2WordHistoryRenameRequest request
    ) {
        return Result.success(md2WordHistoryService.renameCurrentUserHistory(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除当前用户 md2word 历史记录")
    public Result<Void> delete(@PathVariable Long id) {
        md2WordHistoryService.deleteCurrentUserHistory(id);
        return Result.success();
    }
}
