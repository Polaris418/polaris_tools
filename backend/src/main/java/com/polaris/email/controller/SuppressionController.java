package com.polaris.email.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.polaris.common.result.PageResult;
import com.polaris.common.result.Result;
import com.polaris.email.converter.SuppressionConverter;
import com.polaris.email.dto.suppression.AddSuppressionRequest;
import com.polaris.email.dto.suppression.SuppressionQueryRequest;
import com.polaris.email.dto.suppression.SuppressionResponse;
import com.polaris.email.entity.EmailSuppression;
import com.polaris.email.mapper.EmailSuppressionMapper;
import com.polaris.auth.security.RequireAdmin;
import com.polaris.email.service.SuppressionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 抑制列表管理控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/suppression")
@RequireAdmin
@Tag(name = "抑制列表管理", description = "管理邮件抑制列表")
@RequiredArgsConstructor
public class SuppressionController {
    
    private final SuppressionService suppressionService;
    private final EmailSuppressionMapper suppressionMapper;
    private final SuppressionConverter suppressionConverter;
    
    /**
     * 查询抑制列表
     */
    @GetMapping
    @Operation(summary = "查询抑制列表", description = "分页查询抑制列表，支持按邮箱、原因、来源筛选")
    public Result<PageResult<SuppressionResponse>> querySuppressionList(
            @ModelAttribute SuppressionQueryRequest request) {
        
        log.info("查询抑制列表: request={}", request);
        
        // 构建查询条件
        LambdaQueryWrapper<EmailSuppression> wrapper = new LambdaQueryWrapper<>();
        
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            wrapper.like(EmailSuppression::getEmail, request.getEmail().trim());
        }
        
        if (request.getReason() != null && !request.getReason().trim().isEmpty()) {
            wrapper.eq(EmailSuppression::getReason, request.getReason().trim());
        }
        
        if (request.getSource() != null && !request.getSource().trim().isEmpty()) {
            wrapper.eq(EmailSuppression::getSource, request.getSource().trim());
        }
        
        wrapper.orderByDesc(EmailSuppression::getCreatedAt);
        
        // 分页查询
        Page<EmailSuppression> page = new Page<>(request.getPage(), request.getPageSize());
        IPage<EmailSuppression> result = suppressionMapper.selectPage(page, wrapper);
        
        // 转换为响应对象
        List<SuppressionResponse> responses = result.getRecords().stream()
                .map(suppressionConverter::toResponse)
                .collect(Collectors.toList());
        
        PageResult<SuppressionResponse> pageResult = new PageResult<>(
                responses,
                result.getTotal(),
                result.getPages(),
                (int) result.getCurrent(),
                (int) result.getSize()
        );
        
        return Result.success(pageResult);
    }
    
    /**
     * 添加到抑制列表
     */
    @PostMapping
    @Operation(summary = "添加到抑制列表", description = "手动添加邮箱到抑制列表")
    public Result<SuppressionResponse> addToSuppressionList(
            @Valid @RequestBody AddSuppressionRequest request) {
        
        log.info("添加到抑制列表: email={}, reason={}", request.getEmail(), request.getReason());
        
        EmailSuppression suppression = suppressionService.addToSuppressionList(
                request.getEmail(),
                request.getReason(),
                request.getNotes()
        );
        
        SuppressionResponse response = suppressionConverter.toResponse(suppression);
        
        return Result.success(response);
    }
    
    /**
     * 从抑制列表中移除
     */
    @DeleteMapping("/{email}")
    @Operation(summary = "从抑制列表中移除", description = "从抑制列表中移除指定邮箱")
    public Result<Void> removeFromSuppressionList(@PathVariable String email) {
        
        log.info("从抑制列表中移除: email={}", email);
        
        boolean success = suppressionService.removeFromSuppressionList(email);
        
        if (success) {
            return Result.success();
        } else {
            return Result.error(400, "移除失败，邮箱不在抑制列表中");
        }
    }
    
    /**
     * 检查邮箱是否在抑制列表中
     */
    @GetMapping("/check/{email}")
    @Operation(summary = "检查邮箱状态", description = "检查邮箱是否在抑制列表中")
    public Result<SuppressionResponse> checkSuppression(@PathVariable String email) {
        
        log.info("检查邮箱状态: email={}", email);
        
        EmailSuppression suppression = suppressionService.getSuppressionRecord(email);
        
        if (suppression != null) {
            SuppressionResponse response = suppressionConverter.toResponse(suppression);
            return Result.success(response);
        } else {
            return Result.error(404, "邮箱不在抑制列表中");
        }
    }
    
    /**
     * 导出抑制列表
     */
    @GetMapping("/export")
    @Operation(summary = "导出抑制列表", description = "导出抑制列表为 CSV 文件")
    public ResponseEntity<byte[]> exportSuppressionList(
            @ModelAttribute SuppressionQueryRequest request) {
        
        log.info("导出抑制列表: request={}", request);
        
        try {
            // 构建查询条件
            LambdaQueryWrapper<EmailSuppression> wrapper = new LambdaQueryWrapper<>();
            
            if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
                wrapper.like(EmailSuppression::getEmail, request.getEmail().trim());
            }
            
            if (request.getReason() != null && !request.getReason().trim().isEmpty()) {
                wrapper.eq(EmailSuppression::getReason, request.getReason().trim());
            }
            
            if (request.getSource() != null && !request.getSource().trim().isEmpty()) {
                wrapper.eq(EmailSuppression::getSource, request.getSource().trim());
            }
            
            wrapper.orderByDesc(EmailSuppression::getCreatedAt);
            
            // 查询所有记录
            List<EmailSuppression> suppressions = suppressionMapper.selectList(wrapper);
            
            // 生成 CSV 内容
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            OutputStreamWriter writer = new OutputStreamWriter(baos, StandardCharsets.UTF_8);
            
            // 写入 BOM 以支持 Excel 正确识别 UTF-8
            writer.write('\uFEFF');
            
            // 写入表头
            writer.write("邮箱地址,抑制原因,来源,软退信计数,备注,创建时间,更新时间\n");
            
            // 写入数据
            for (EmailSuppression suppression : suppressions) {
                writer.write(String.format("%s,%s,%s,%d,%s,%s,%s\n",
                        escapeCSV(suppression.getEmail()),
                        escapeCSV(suppression.getReason()),
                        escapeCSV(suppression.getSource()),
                        suppression.getSoftBounceCount(),
                        escapeCSV(suppression.getNotes()),
                        suppression.getCreatedAt(),
                        suppression.getUpdatedAt()
                ));
            }
            
            writer.flush();
            writer.close();
            
            byte[] csvBytes = baos.toByteArray();
            
            // 设置响应头
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("text/csv"));
            headers.setContentDispositionFormData("attachment", "suppression_list.csv");
            headers.setContentLength(csvBytes.length);
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(csvBytes);
            
        } catch (Exception e) {
            log.error("导出抑制列表失败", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 转义 CSV 字段
     */
    private String escapeCSV(String value) {
        if (value == null) {
            return "";
        }
        
        // 如果包含逗号、引号或换行符，需要用引号包裹并转义引号
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        
        return value;
    }
}
