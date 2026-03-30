package com.polaris.dto.category;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/**
 * 分类排序请求 DTO
 * 用于批量更新分类的排序顺序
 */
@Data
public class CategoryReorderRequest {
    
    /**
     * 排序项列表，按新的顺序排列
     */
    @NotEmpty(message = "排序列表不能为空")
    private List<ReorderItem> items;
    
    /**
     * 单个排序项
     */
    @Data
    public static class ReorderItem {
        /**
         * 分类 ID
         */
        private Long id;
        
        /**
         * 新的排序值
         */
        private Integer sortOrder;
    }
}
