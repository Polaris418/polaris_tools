package com.polaris.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.ibatis.type.ClobTypeHandler;
import com.baomidou.mybatisplus.annotation.TableField;

/**
 * md2word 历史记录
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_md2word_history")
public class Md2WordHistory extends BaseEntity {

    private Long userId;

    private String clientFileId;

    private String documentName;

    @TableField(typeHandler = ClobTypeHandler.class)
    private String content;

    private String contentHash;

    private String previewText;

    private Long wordCount;

    private Long charCount;
}
