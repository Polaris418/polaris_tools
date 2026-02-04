package com.polaris.service;

import com.polaris.common.base.BaseService;
import com.polaris.dto.ToolCreateRequest;
import com.polaris.dto.ToolQueryRequest;
import com.polaris.dto.ToolResponse;
import com.polaris.dto.ToolUpdateRequest;
import com.polaris.entity.Tool;
import jakarta.servlet.http.HttpServletRequest;

/**
 * 工具服务接口
 * 继承 BaseService 获得标准 CRUD 操作
 */
public interface ToolService extends BaseService<Tool, ToolResponse, ToolCreateRequest, ToolUpdateRequest, ToolQueryRequest> {
    
    // ==================== 扩展方法（Tool 特有功能） ====================
    
    /**
     * 增加浏览计数
     * 
     * @param id 工具 ID
     */
    void incrementViewCount(Long id);
    
    /**
     * 记录工具使用
     * 
     * @param id 工具 ID
     * @param authHeader Authorization header（可选，用于识别登录用户）
     * @param request HTTP 请求（用于获取 IP 和 User-Agent）
     */
    void recordToolUsage(Long id, String authHeader, HttpServletRequest request);
    
    /**
     * 通过工具 URL 记录使用
     * 
     * @param url 工具 URL
     * @param authHeader Authorization header（可选，用于识别登录用户）
     * @param request HTTP 请求（用于获取 IP 和 User-Agent）
     * @return 使用记录 ID
     */
    Long recordToolUsageByUrl(String url, String authHeader, HttpServletRequest request);
    
    /**
     * 更新使用时长
     * 
     * @param usageId 使用记录 ID
     * @param duration 使用时长（秒）
     */
    void updateUsageDuration(Long usageId, Integer duration);
    
    /**
     * 恢复工具
     * 
     * @param id 工具 ID
     */
    void restoreTool(Long id);
    
    /**
     * 永久删除工具
     * 
     * @param id 工具 ID
     */
    void hardDeleteTool(Long id);
}
