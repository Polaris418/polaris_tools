package com.polaris.email.service;

import com.polaris.email.config.AwsSesConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.GetEmailIdentityRequest;
import software.amazon.awssdk.services.sesv2.model.GetEmailIdentityResponse;
import software.amazon.awssdk.services.sesv2.model.NotFoundException;
import software.amazon.awssdk.services.sesv2.model.SesV2Exception;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 发件人地址验证服务：
 * - 优先检查邮箱 identity
 * - 如果邮箱 identity 不存在，则回退检查域名 identity
 * - 如果权限不足(403)，提示 IAM policy 问题，不把它当成“未验证”
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SenderVerificationService {

    private final SesV2Client sesV2Client;
    private final AwsSesConfig config;

    private static final Pattern EMAIL_PATTERN = Pattern.compile("<([^>]+)>|([^<\\s]+@[^>\\s]+)");

    @EventListener(ApplicationReadyEvent.class)
    public void verifyAllSenders() {
        if (!config.isEnabled()) {
            log.info("邮件服务已禁用，跳过发件人地址验证");
            return;
        }

        log.info("开始验证所有配置的发件人地址...");

        List<String> senderAddresses = getAllConfiguredSenders();
        List<String> ok = new ArrayList<>();
        List<String> warn = new ArrayList<>();
        List<String> failed = new ArrayList<>();

        for (String senderAddress : senderAddresses) {
            String email = extractEmailAddress(senderAddress);
            if (email == null) {
                log.warn("无法从配置中提取邮箱地址: {}", senderAddress);
                continue;
            }

            VerificationResult r = checkSenderAvailable(email);

            switch (r.status) {
                case OK -> {
                    ok.add(email);
                    log.info("✓ 发件人可用: {}", email);
                }
                case WARN -> {
                    warn.add(email);
                    log.warn("⚠ 发件人可能不可用: {}，原因: {}", email, r.message);
                }
                case FAILED -> {
                    failed.add(email);
                    log.error("✗ 发件人不可用: {}，原因: {}", email, r.message);
                }
            }
        }

        log.info("发件人验证完成: 成功 {}/{}, 警告 {}, 失败 {}",
                ok.size(), senderAddresses.size(), warn.size(), failed.size());

        if (!failed.isEmpty()) {
            log.warn("以下发件人地址不可用，可能无法发送邮件:");
            failed.forEach(e -> log.warn("  - {}", e));
            log.warn("请在 AWS SES 控制台检查 identity 验证或 IAM 权限: https://console.aws.amazon.com/ses/");
        }
    }

    private enum Status { OK, WARN, FAILED }

    private static class VerificationResult {
        final Status status;
        final String message;

        private VerificationResult(Status status, String message) {
            this.status = status;
            this.message = message;
        }

        static VerificationResult ok(String msg) { return new VerificationResult(Status.OK, msg); }
        static VerificationResult warn(String msg) { return new VerificationResult(Status.WARN, msg); }
        static VerificationResult failed(String msg) { return new VerificationResult(Status.FAILED, msg); }
    }

    private VerificationResult checkSenderAvailable(String emailAddress) {
        // 1) 先检查邮箱 identity
        IdentityCheck emailCheck = checkIdentity(emailAddress);

        if (emailCheck == IdentityCheck.VERIFIED) {
            return VerificationResult.ok("邮箱 identity 已验证");
        }
        if (emailCheck == IdentityCheck.NOT_FOUND) {
            log.warn("SES identity 不存在: {}", emailAddress);
        }
        if (emailCheck == IdentityCheck.ACCESS_DENIED) {
            return VerificationResult.warn("IAM 权限不足，无法调用 ses:GetEmailIdentity（请补 sesv2 读取权限）");
        }
        if (emailCheck == IdentityCheck.UNVERIFIED) {
            return VerificationResult.warn("邮箱 identity 存在但未完成验证");
        }

        // 2) 邮箱没法确认时，回退检查域名 identity（域名验证即可发送任意该域名 From）
        String domain = extractDomain(emailAddress);
        if (domain == null) {
            return VerificationResult.failed("无法解析域名");
        }

        IdentityCheck domainCheck = checkIdentity(domain);
        if (domainCheck == IdentityCheck.VERIFIED) {
            log.info("邮箱未单独验证，但域名已验证: {}", domain);
            return VerificationResult.ok("域名 identity 已验证");
        }
        if (domainCheck == IdentityCheck.ACCESS_DENIED) {
            return VerificationResult.warn("IAM 权限不足，无法检查域名 identity（但发送可能仍可用）");
        }
        if (domainCheck == IdentityCheck.NOT_FOUND) {
            return VerificationResult.failed("域名 identity 不存在（请先验证域名）");
        }
        return VerificationResult.failed("域名 identity 未验证完成");
    }

    private enum IdentityCheck { VERIFIED, UNVERIFIED, NOT_FOUND, ACCESS_DENIED }

    private IdentityCheck checkIdentity(String identity) {
        try {
            GetEmailIdentityResponse resp = sesV2Client.getEmailIdentity(
                    GetEmailIdentityRequest.builder().emailIdentity(identity).build()
            );
            return resp.verifiedForSendingStatus() ? IdentityCheck.VERIFIED : IdentityCheck.UNVERIFIED;

        } catch (NotFoundException e) {
            return IdentityCheck.NOT_FOUND;

        } catch (SesV2Exception e) {
            if (e.statusCode() == 403) {
                return IdentityCheck.ACCESS_DENIED;
            }
            log.error("检查 SES identity 失败: {}, status={}, msg={}", identity, e.statusCode(), e.awsErrorDetails().errorMessage());
            return IdentityCheck.UNVERIFIED;

        } catch (Exception e) {
            log.error("检查 SES identity 异常: {}, err={}", identity, e.getMessage());
            return IdentityCheck.UNVERIFIED;
        }
    }

    private List<String> getAllConfiguredSenders() {
        List<String> senders = new ArrayList<>();
        AwsSesConfig.SenderConfig senderConfig = config.getSenders();

        if (senderConfig != null) {
            if (notBlank(senderConfig.getNoreply())) senders.add(senderConfig.getNoreply());
            if (notBlank(senderConfig.getSupport())) senders.add(senderConfig.getSupport());
            if (notBlank(senderConfig.getSecurity())) senders.add(senderConfig.getSecurity());
        }

        if (notBlank(config.getFromEmail()) && !senders.contains(config.getFromEmail())) {
            senders.add(config.getFromEmail());
        }

        // 去重
        return senders.stream().filter(this::notBlank).distinct().toList();
    }

    private String extractEmailAddress(String senderAddress) {
        if (!notBlank(senderAddress)) return null;

        Matcher matcher = EMAIL_PATTERN.matcher(senderAddress);
        if (matcher.find()) {
            String email = matcher.group(1);
            if (email != null) return email.trim();
            email = matcher.group(2);
            if (email != null) return email.trim();
        }
        return senderAddress.trim();
    }

    private String extractDomain(String email) {
        int idx = email.lastIndexOf('@');
        if (idx <= 0 || idx >= email.length() - 1) return null;
        return email.substring(idx + 1).trim().toLowerCase(Locale.ROOT);
    }

    private boolean notBlank(String s) {
        return s != null && !s.trim().isEmpty();
    }
}
