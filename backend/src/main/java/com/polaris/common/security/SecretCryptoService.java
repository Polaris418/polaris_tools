package com.polaris.common.security;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * 敏感信息可逆加密服务
 */
@Service
@Slf4j
public class SecretCryptoService {

    private static final String AES_TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int IV_LENGTH = 12;

    private final String configuredSecretKey;
    private final String jwtSecret;
    private final SecureRandom secureRandom = new SecureRandom();
    private SecretKeySpec secretKeySpec;

    public SecretCryptoService(
            @Value("${app.security.secret-key:}") String configuredSecretKey,
            @Value("${jwt.secret:}") String jwtSecret
    ) {
        this.configuredSecretKey = configuredSecretKey;
        this.jwtSecret = jwtSecret;
    }

    @PostConstruct
    public void init() {
        String secretSource = StringUtils.hasText(configuredSecretKey) ? configuredSecretKey : jwtSecret;
        if (!StringUtils.hasText(secretSource)) {
            throw new IllegalStateException("启动失败：未配置 app.security.secret-key，且 jwt.secret 不可用，无法初始化敏感信息加密服务。");
        }

        if (secretSource.length() < 32) {
            throw new IllegalStateException("启动失败：敏感信息加密密钥长度必须至少 32 个字符。");
        }

        this.secretKeySpec = new SecretKeySpec(sha256(secretSource), "AES");
        log.info("敏感信息加密服务已初始化");
    }

    public String encrypt(String plainText) {
        if (!StringUtils.hasText(plainText)) {
            throw new IllegalArgumentException("待加密内容不能为空");
        }

        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(AES_TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + encrypted.length);
            byteBuffer.put(iv);
            byteBuffer.put(encrypted);
            return Base64.getEncoder().encodeToString(byteBuffer.array());
        } catch (Exception e) {
            throw new IllegalStateException("敏感信息加密失败", e);
        }
    }

    public String decrypt(String cipherText) {
        if (!StringUtils.hasText(cipherText)) {
            throw new IllegalArgumentException("待解密内容不能为空");
        }

        try {
            byte[] combined = Base64.getDecoder().decode(cipherText);
            ByteBuffer byteBuffer = ByteBuffer.wrap(combined);

            byte[] iv = new byte[IV_LENGTH];
            byteBuffer.get(iv);

            byte[] encrypted = new byte[byteBuffer.remaining()];
            byteBuffer.get(encrypted);

            Cipher cipher = Cipher.getInstance(AES_TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] decrypted = cipher.doFinal(encrypted);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("敏感信息解密失败", e);
        }
    }

    private byte[] sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return digest.digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("无法初始化敏感信息加密密钥", e);
        }
    }
}
