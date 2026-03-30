package com.polaris.controller;

import com.polaris.ai.dto.FormattingIntentRequest;
import com.polaris.ai.dto.FormattingIntentResponse;
import com.polaris.ai.service.FormattingIntentService;
import com.polaris.common.result.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.util.StringUtils;

/**
 * AI 格式解析控制器
 */
@RestController
@RequestMapping("/api/v1/ai/formatting")
@RequiredArgsConstructor
@Tag(name = "AI Formatting", description = "AI 格式解析接口")
public class FormattingIntentController {

    private final FormattingIntentService formattingIntentService;

    @PostMapping("/parse")
    @Operation(summary = "解析自然语言格式需求")
    public Result<FormattingIntentResponse> parse(
            @Valid @RequestBody FormattingIntentRequest request,
            @RequestHeader(value = "X-Guest-Id", required = false) String guestId,
            HttpServletRequest httpServletRequest
    ) {
        FormattingIntentResponse response = formattingIntentService.parseIntent(
                request,
                guestId,
                resolveClientIp(httpServletRequest)
        );
        return Result.success(response);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwardedFor)) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
