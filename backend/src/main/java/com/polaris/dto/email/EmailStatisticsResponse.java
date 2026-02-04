package com.polaris.dto.email;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.Map;

/**
 * 邮件统计响应
 */
@Data
@Schema(description = "邮件统计响应")
public class EmailStatisticsResponse {
    
    @Schema(description = "总发送数", example = "1000")
    private Long totalSent;
    
    @Schema(description = "成功数", example = "950")
    private Long successCount;
    
    @Schema(description = "失败数", example = "50")
    private Long failedCount;
    
    @Schema(description = "待发送数", example = "10")
    private Long pendingCount;
    
    @Schema(description = "成功率", example = "95.0")
    private Double successRate;
    
    @Schema(description = "各邮件类型的发送数量", example = "{\"VERIFICATION\": 500, \"PASSWORD_RESET\": 300, \"NOTIFICATION\": 200}")
    private Map<String, Long> emailTypeStats;
    
    @Schema(description = "今日发送数", example = "100")
    private Long todaySent;
    
    @Schema(description = "本周发送数", example = "500")
    private Long weekSent;
    
    @Schema(description = "本月发送数", example = "2000")
    private Long monthSent;
}
