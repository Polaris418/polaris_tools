package com.polaris.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.entity.Md2WordHistory;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface Md2WordHistoryMapper extends BaseMapper<Md2WordHistory> {

    @Delete("DELETE FROM t_md2word_history WHERE id = #{id} AND user_id = #{userId}")
    int hardDeleteByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    @Delete("DELETE FROM t_md2word_history WHERE id = #{id}")
    int hardDeleteById(@Param("id") Long id);
}
