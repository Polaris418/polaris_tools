package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.entity.DocumentExport;
import org.apache.ibatis.annotations.Mapper;

/**
 * 文档导出记录 Mapper 接口
 */
@Mapper
public interface DocumentExportMapper extends BaseMapper<DocumentExport> {
}
