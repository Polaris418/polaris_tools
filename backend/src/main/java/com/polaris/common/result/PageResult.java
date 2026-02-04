package com.polaris.common.result;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageResult<T> {
    private List<T> list;
    private Long total;
    private Long pages;
    private Integer pageNum;
    private Integer pageSize;

    public PageResult(List<T> list, Long total, Long pages) {
        this.list = list;
        this.total = total;
        this.pages = pages;
    }
}
