package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.entity.DocumentVersion;
import org.apache.ibatis.annotations.*;
import java.util.List;

/**
 * 文档版本历史 Mapper
 */
@Mapper
public interface DocumentVersionMapper extends BaseMapper<DocumentVersion> {
    
    /**
     * 根据文档ID查询版本列表（未过期）
     */
    @Select("SELECT * FROM t_document_version WHERE document_id = #{documentId} " +
            "AND (expire_at IS NULL OR expire_at > NOW()) " +
            "ORDER BY version_number DESC")
    List<DocumentVersion> selectByDocumentId(Long documentId);

    /**
     * 查询文档的最新版本号
     */
    @Select("SELECT COALESCE(MAX(version_number), 0) FROM t_document_version WHERE document_id = #{documentId}")
    int selectMaxVersionNumber(Long documentId);

    /**
     * 删除过期版本
     */
    @Delete("DELETE FROM t_document_version WHERE expire_at < NOW()")
    int deleteExpired();

    /**
     * 删除文档的所有版本
     */
    @Delete("DELETE FROM t_document_version WHERE document_id = #{documentId}")
    int deleteByDocumentId(Long documentId);
}
