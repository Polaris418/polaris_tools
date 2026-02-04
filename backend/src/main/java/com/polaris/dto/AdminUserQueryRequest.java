package com.polaris.dto;

import com.polaris.common.base.BaseRequest;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 管理员用户查询请求 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "用户查询请求")
public class AdminUserQueryRequest extends BaseRequest {
    
    @Schema(description = "搜索关键词（用户名或邮箱）", example = "john")
    @Size(max = 100, message = "搜索关键词不能超过100个字符")
    private String keyword;
    
    @Schema(description = "状态过滤：0-禁用，1-启用", example = "1")
    @Min(value = 0, message = "状态必须为0或1")
    @Max(value = 1, message = "状态必须为0或1")
    private Integer status;
    
    @Schema(description = "套餐类型过滤：0-免费用户，1-会员用户，2-管理员", example = "1")
    @Min(value = 0, message = "套餐类型必须在0-2之间")
    @Max(value = 2, message = "套餐类型必须在0-2之间")
    private Integer planType;
    
    @Schema(description = "是否包含已删除数据", example = "false")
    private Boolean includeDeleted;
}
