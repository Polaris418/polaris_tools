package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.entity.UserDocument;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Update;

/**
 * 文档 Mapper 接口
 */
@Mapper
public interface DocumentMapper extends BaseMapper<UserDocument> {
    
    /**
     * 增加浏览次数
     * 
     * @param id 文档 ID
     * @return 影响行数
     */
    @Update("UPDATE t_user_document SET view_count = view_count + 1 WHERE id = #{id} AND deleted = 0")
    int incrementViewCount(Long id);
    
    /**
     * 增加导出次数
     * 
     * @param id 文档 ID
     * @return 影响行数
     */
    @Update("UPDATE t_user_document SET export_count = export_count + 1 WHERE id = #{id} AND deleted = 0")
    int incrementExportCount(Long id);
}
