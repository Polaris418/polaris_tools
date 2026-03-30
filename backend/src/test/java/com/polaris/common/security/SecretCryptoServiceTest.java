package com.polaris.common.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("敏感信息加密服务测试")
class SecretCryptoServiceTest {

    @Test
    @DisplayName("应能加密并解密敏感信息")
    void shouldEncryptAndDecryptSecret() {
        SecretCryptoService service = new SecretCryptoService(
                "this-is-a-very-secure-test-secret-key-123456",
                ""
        );
        service.init();

        String encrypted = service.encrypt("nvapi-test-key");
        String decrypted = service.decrypt(encrypted);

        assertNotEquals("nvapi-test-key", encrypted);
        assertEquals("nvapi-test-key", decrypted);
    }

    @Test
    @DisplayName("未提供有效密钥时应初始化失败")
    void shouldFailWithoutValidSecretKey() {
        SecretCryptoService service = new SecretCryptoService("", "");
        assertThrows(IllegalStateException.class, service::init);
    }
}
