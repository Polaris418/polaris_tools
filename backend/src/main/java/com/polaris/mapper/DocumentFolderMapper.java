package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.entity.DocumentFolder;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

/**
 * 文档文件夹 Mapper 接口
 */
@Mapper
public interface DocumentFolderMapper extends BaseMapper<DocumentFolder> {
    
    /**
     * 统计文件夹中的文档数量
     * 
     * @param folderId 文件夹 ID
     * @return 文档数量
     */
    @Select("SELECT COUNT(*) FROM t_user_document WHERE folder_id = #{folderId} AND deleted = 0")
    Long countDocumentsByFolderId(Long folderId);
}
