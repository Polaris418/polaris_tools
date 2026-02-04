package com.polaris.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.Components;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI 配置类
 * 配置 Swagger UI 文档信息
 */
@Configuration
public class OpenApiConfig {
    
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Polaris Tools Platform API")
                        .description("北极星工具箱 - 现代化的开发工具导航平台 API 文档\n\n" +
                                "本 API 采用统一的 RESTful 设计模式，所有资源管理端点遵循标准 CRUD 操作。\n" +
                                "架构版本: v2.4 - 完成基础类体系重构")
                        .version("v1.1.0")
                        .contact(new Contact()
                                .name("Polaris Team")
                                .email("support@polaris-tools.com")
                                .url("https://polaris-tools.com"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")))
                .components(new Components()
                        .addSecuritySchemes("bearer-jwt", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT 认证令牌，格式: Bearer {token}")))
                .addSecurityItem(new SecurityRequirement().addList("bearer-jwt"));
    }
}
