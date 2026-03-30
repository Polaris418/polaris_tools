package com.polaris.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 启动配置校验，防止关键安全配置缺失后以弱配置运行。
 */
@Component
public class StartupConfigValidator {

    private final Environment environment;

    @Value("${jwt.secret:}")
    private String jwtSecret;

    @Value("${email.provider:resend}")
    private String emailProvider;

    @Value("${resend.api-key:}")
    private String resendApiKey;

    @Value("${aws.ses.access-key-id:}")
    private String awsAccessKeyId;

    @Value("${aws.ses.secret-access-key:}")
    private String awsSecretAccessKey;

    public StartupConfigValidator(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void validate() {
        // 测试环境跳过严格校验，避免影响单元测试执行
        if (isTestProfile()) {
            return;
        }

        requireNonBlank(jwtSecret, "启动失败：未配置 JWT_SECRET。");
        if (jwtSecret.length() < 32) {
            throw new IllegalStateException("启动失败：JWT_SECRET 长度必须至少 32 个字符。");
        }

        String provider = emailProvider == null ? "" : emailProvider.trim().toLowerCase();
        switch (provider) {
            case "resend":
                requireNonBlank(resendApiKey, "启动失败：EMAIL_PROVIDER=resend 时必须配置 RESEND_API_KEY。");
                if (!resendApiKey.startsWith("re_")) {
                    throw new IllegalStateException("启动失败：RESEND_API_KEY 格式无效，必须以 re_ 开头，且不要包含 \"RESEND_API_KEY:\" 前缀。");
                }
                break;
            case "aws-ses":
                requireNonBlank(awsAccessKeyId, "启动失败：EMAIL_PROVIDER=aws-ses 时必须配置 AWS_ACCESS_KEY_ID。");
                requireNonBlank(awsSecretAccessKey, "启动失败：EMAIL_PROVIDER=aws-ses 时必须配置 AWS_SECRET_ACCESS_KEY。");
                break;
            default:
                throw new IllegalStateException("启动失败：EMAIL_PROVIDER 仅支持 resend 或 aws-ses。");
        }
    }

    private boolean isTestProfile() {
        for (String profile : environment.getActiveProfiles()) {
            if ("test".equalsIgnoreCase(profile)) {
                return true;
            }
        }
        return false;
    }

    private void requireNonBlank(String value, String errorMessage) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalStateException(errorMessage);
        }
    }
}
