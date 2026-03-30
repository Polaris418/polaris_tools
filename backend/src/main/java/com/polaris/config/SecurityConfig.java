package com.polaris.config;

import com.polaris.auth.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final SecurityHeadersFilter securityHeadersFilter;
    private final Environment environment;

    @Value("${springdoc.api-docs.enabled:true}")
    private boolean apiDocsEnabled;

    @Value("${springdoc.swagger-ui.enabled:true}")
    private boolean swaggerUiEnabled;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) ->
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED))
            )
            .authorizeHttpRequests(auth -> {
                // 公开接口
                auth.requestMatchers("/api/v1/auth/**").permitAll();

                // 开发调试接口仅在 dev profile 下放行
                if (environment.matchesProfiles("dev")) {
                    auth.requestMatchers("/api/v1/dev/**").permitAll();
                }

                // 类目、工具只开放 GET，其余操作需认证
                auth.requestMatchers(HttpMethod.GET, "/api/v1/categories/**").permitAll();
                auth.requestMatchers(HttpMethod.GET, "/api/v1/tools/**").permitAll();
                auth.requestMatchers(HttpMethod.POST, "/api/v1/documents/preview").permitAll();
                auth.requestMatchers(HttpMethod.POST, "/api/v1/documents/onlyoffice/session").permitAll();
                auth.requestMatchers(HttpMethod.GET, "/api/v1/documents/onlyoffice/files/**").permitAll();
                auth.requestMatchers(HttpMethod.POST, "/api/v1/documents/onlyoffice/callback/**").permitAll();
                auth.requestMatchers(HttpMethod.POST, "/api/v1/ai/formatting/parse").permitAll();

                // Swagger 放行与配置开关联动，可在生产环境通过环境变量关闭
                if (apiDocsEnabled || swaggerUiEnabled) {
                    auth.requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll();
                }

                // 其他需认证
                auth.anyRequest().authenticated();
            })
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * Register Security Headers Filter
     * Adds security-related HTTP headers to all responses
     */
    @Bean
    public FilterRegistrationBean<SecurityHeadersFilter> securityHeadersFilterRegistration() {
        FilterRegistrationBean<SecurityHeadersFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(securityHeadersFilter);
        registrationBean.addUrlPatterns("/*");
        registrationBean.setOrder(1); // Execute before other filters
        return registrationBean;
    }
}
