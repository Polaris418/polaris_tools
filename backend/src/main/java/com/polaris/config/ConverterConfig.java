package com.polaris.config;

import com.polaris.converter.UserConverter;
import org.mapstruct.factory.Mappers;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Converter 兜底配置。
 * 在 MapStruct 生成实现未被组件扫描到时，提供显式 Bean，避免启动失败。
 */
@Configuration
public class ConverterConfig {

    @Bean
    @ConditionalOnMissingBean(UserConverter.class)
    public UserConverter userConverter() {
        return Mappers.getMapper(UserConverter.class);
    }
}
