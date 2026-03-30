package com.polaris.ai.service;

import com.polaris.ai.dto.FormattingIntentRequest;
import com.polaris.ai.dto.FormattingIntentResponse;

/**
 * AI 格式意图解析服务
 */
public interface FormattingIntentService {

    FormattingIntentResponse parseIntent(FormattingIntentRequest request, String guestId, String ipAddress);
}
