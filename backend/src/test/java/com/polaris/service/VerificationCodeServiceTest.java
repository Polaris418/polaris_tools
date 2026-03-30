package com.polaris.service;

import com.polaris.email.entity.EmailVerificationCode;
import com.polaris.entity.VerificationPurpose;
import com.polaris.email.mapper.EmailVerificationCodeMapper;
import com.polaris.email.service.EmailService;
import com.polaris.service.impl.VerificationCodeServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * 验证码服务测试类
 * 测试验证码验证功能
 */
@ExtendWith(MockitoExtension.class)
class VerificationCodeServiceTest {
    
    @Mock
    private EmailVerificationCodeMapper verificationCodeMapper;
    
    @Mock
    private EmailService emailService;

    @Mock
    private VerificationLogService verificationLogService;
    
    @InjectMocks
    private VerificationCodeServiceImpl verificationCodeService;
    
    private static final String TEST_EMAIL = "test@example.com";
    private static final String VALID_CODE = "123456";
    private static final String INVALID_CODE = "654321";
    private static final VerificationPurpose TEST_PURPOSE = VerificationPurpose.REGISTER;
    
    private EmailVerificationCode validVerificationCode;
    
    @BeforeEach
    void setUp() {
        validVerificationCode = new EmailVerificationCode();
        validVerificationCode.setId(1L);
        validVerificationCode.setEmail(TEST_EMAIL);
        validVerificationCode.setPurpose(TEST_PURPOSE.name());
        validVerificationCode.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        validVerificationCode.setUsed(0);
        validVerificationCode.setFailCount(0);
        
        // Calculate the hash for the valid code
        // Note: This needs to match the hash algorithm in the service
        // For testing purposes, we'll set a mock hash
        validVerificationCode.setCodeHash(calculateHash(VALID_CODE));
    }
    
    /**
     * Test 6.1: 验证码格式验证 - 有效的6位数字
     */
    @Test
    void testVerifyCode_ValidFormat() {
        when(verificationCodeMapper.findValidByEmailAndPurpose(
                eq(TEST_EMAIL), 
                eq(TEST_PURPOSE.name()), 
                any(LocalDateTime.class), 
                eq(5)
        )).thenReturn(validVerificationCode);
        
        boolean result = verificationCodeService.verifyCode(TEST_EMAIL, VALID_CODE, TEST_PURPOSE);
        
        assertTrue(result, "验证码验证应该成功");
        verify(verificationCodeMapper).updateById(validVerificationCode);
        assertEquals(1, validVerificationCode.getUsed(), "验证码应该被标记为已使用");
        assertNotNull(validVerificationCode.getUsedAt(), "应该记录使用时间");
    }
    
    /**
     * Test 6.1: 验证码格式验证 - 无效格式（null）
     */
    @Test
    void testVerifyCode_NullCode() {
        boolean result = verificationCodeService.verifyCode(TEST_EMAIL, null, TEST_PURPOSE);
        
        assertFalse(result, "null验证码应该验证失败");
        verify(verificationCodeMapper, never()).findValidByEmailAndPurpose(any(), any(), any(), any());
    }
    
    /**
     * Test 6.1: 验证码格式验证 - 无效格式（少于6位）
     */
    @Test
    void testVerifyCode_InvalidFormat_TooShort() {
        boolean result = verificationCodeService.verifyCode(TEST_EMAIL, "12345", TEST_PURPOSE);
        
        assertFalse(result, "少于6位的验证码应该验证失败");
        verify(verificationCodeMapper, never()).findValidByEmailAndPurpose(any(), any(), any(), any());
    }
    
    /**
     * Test 6.1: 验证码格式验证 - 无效格式（多于6位）
     */
    @Test
    void testVerifyCode_InvalidFormat_TooLong() {
        boolean result = verificationCodeService.verifyCode(TEST_EMAIL, "1234567", TEST_PURPOSE);
        
        assertFalse(result, "多于6位的验证码应该验证失败");
        verify(verificationCodeMapper, never()).findValidByEmailAndPurpose(any(), any(), any(), any());
    }
    
    /**
     * Test 6.1: 验证码格式验证 - 无效格式（包含非数字字符）
     */
    @Test
    void testVerifyCode_InvalidFormat_NonNumeric() {
        boolean result = verificationCodeService.verifyCode(TEST_EMAIL, "12345a", TEST_PURPOSE);
        
        assertFalse(result, "包含非数字字符的验证码应该验证失败");
        verify(verificationCodeMapper, never()).findValidByEmailAndPurpose(any(), any(), any(), any());
    }
    
    /**
     * Test 6.2: 验证码不存在
     */
    @Test
    void testVerifyCode_CodeNotFound() {
        when(verificationCodeMapper.findValidByEmailAndPurpose(
                eq(TEST_EMAIL), 
                eq(TEST_PURPOSE.name()), 
                any(LocalDateTime.class), 
                eq(5)
        )).thenReturn(null);
        
        boolean result = verificationCodeService.verifyCode(TEST_EMAIL, VALID_CODE, TEST_PURPOSE);
        
        assertFalse(result, "不存在的验证码应该验证失败");
    }
    
    /**
     * Test 6.2: 验证码已过期（通过SQL查询过滤）
     * 注意：过期检查在SQL查询中完成，这里测试查询返回null的情况
     */
    @Test
    void testVerifyCode_CodeExpired() {
        // 当验证码过期时，findValidByEmailAndPurpose会返回null
        when(verificationCodeMapper.findValidByEmailAndPurpose(
                eq(TEST_EMAIL), 
                eq(TEST_PURPOSE.name()), 
                any(LocalDateTime.class), 
                eq(5)
        )).thenReturn(null);
        
        boolean result = verificationCodeService.verifyCode(TEST_EMAIL, VALID_CODE, TEST_PURPOSE);
        
        assertFalse(result, "过期的验证码应该验证失败");
    }
    
    /**
     * Test 6.2: 验证码已使用（通过SQL查询过滤）
     * 注意：已使用检查在SQL查询中完成，这里测试查询返回null的情况
     */
    @Test
    void testVerifyCode_CodeAlreadyUsed() {
        // 当验证码已使用时，findValidByEmailAndPurpose会返回null
        when(verificationCodeMapper.findValidByEmailAndPurpose(
                eq(TEST_EMAIL), 
                eq(TEST_PURPOSE.name()), 
                any(LocalDateTime.class), 
                eq(5)
        )).thenReturn(null);
        
        boolean result = verificationCodeService.verifyCode(TEST_EMAIL, VALID_CODE, TEST_PURPOSE);
        
        assertFalse(result, "已使用的验证码应该验证失败");
    }
    
    /**
     * Test 6.3: 验证失败次数管理 - 失败次数未超限
     */
    @Test
    void testVerifyCode_FailCountNotExceeded() {
        validVerificationCode.setFailCount(3);
        validVerificationCode.setCodeHash(calculateHash(INVALID_CODE));
        
        when(verificationCodeMapper.findValidByEmailAndPurpose(
                eq(TEST_EMAIL), 
                eq(TEST_PURPOSE.name()), 
                any(LocalDateTime.class), 
                eq(5)
        )).thenReturn(validVerificationCode);
        
        boolean result = verificationCodeService.verifyCode(TEST_EMAIL, VALID_CODE, TEST_PURPOSE);
        
        assertFalse(result, "错误的验证码应该验证失败");
        verify(verificationCodeMapper).updateById(validVerificationCode);
        assertEquals(4, validVerificationCode.getFailCount(), "失败次数应该增加");
    }
    
    /**
     * Test 6.3: 验证失败次数管理 - 失败次数已超限（通过SQL查询过滤）
     */
    @Test
    void testVerifyCode_FailCountExceeded() {
        // 当失败次数超限时，findValidByEmailAndPurpose会返回null
        when(verificationCodeMapper.findValidByEmailAndPurpose(
                eq(TEST_EMAIL), 
                eq(TEST_PURPOSE.name()), 
                any(LocalDateTime.class), 
                eq(5)
        )).thenReturn(null);
        
        boolean result = verificationCodeService.verifyCode(TEST_EMAIL, VALID_CODE, TEST_PURPOSE);
        
        assertFalse(result, "失败次数超限的验证码应该验证失败");
    }
    
    /**
     * Test 6.4: 验证码哈希比较 - 正确的验证码
     */
    @Test
    void testVerifyCode_CorrectCode() {
        when(verificationCodeMapper.findValidByEmailAndPurpose(
                eq(TEST_EMAIL), 
                eq(TEST_PURPOSE.name()), 
                any(LocalDateTime.class), 
                eq(5)
        )).thenReturn(validVerificationCode);
        
        boolean result = verificationCodeService.verifyCode(TEST_EMAIL, VALID_CODE, TEST_PURPOSE);
        
        assertTrue(result, "正确的验证码应该验证成功");
        verify(verificationCodeMapper).updateById(validVerificationCode);
        assertEquals(1, validVerificationCode.getUsed(), "验证码应该被标记为已使用");
        assertNotNull(validVerificationCode.getUsedAt(), "应该记录使用时间");
    }
    
    /**
     * Test 6.4: 验证码哈希比较 - 错误的验证码
     */
    @Test
    void testVerifyCode_IncorrectCode() {
        validVerificationCode.setCodeHash(calculateHash(INVALID_CODE));
        
        when(verificationCodeMapper.findValidByEmailAndPurpose(
                eq(TEST_EMAIL), 
                eq(TEST_PURPOSE.name()), 
                any(LocalDateTime.class), 
                eq(5)
        )).thenReturn(validVerificationCode);
        
        boolean result = verificationCodeService.verifyCode(TEST_EMAIL, VALID_CODE, TEST_PURPOSE);
        
        assertFalse(result, "错误的验证码应该验证失败");
        verify(verificationCodeMapper).updateById(validVerificationCode);
        assertEquals(1, validVerificationCode.getFailCount(), "失败次数应该增加");
        assertEquals(0, validVerificationCode.getUsed(), "验证码不应该被标记为已使用");
    }
    
    /**
     * Test 6.4: 验证成功后标记为已使用
     */
    @Test
    void testVerifyCode_MarkedAsUsedOnSuccess() {
        when(verificationCodeMapper.findValidByEmailAndPurpose(
                eq(TEST_EMAIL), 
                eq(TEST_PURPOSE.name()), 
                any(LocalDateTime.class), 
                eq(5)
        )).thenReturn(validVerificationCode);
        
        boolean result = verificationCodeService.verifyCode(TEST_EMAIL, VALID_CODE, TEST_PURPOSE);
        
        assertTrue(result, "验证应该成功");
        assertEquals(1, validVerificationCode.getUsed(), "验证码应该被标记为已使用");
        assertNotNull(validVerificationCode.getUsedAt(), "应该记录使用时间");
        assertTrue(validVerificationCode.getUsedAt().isBefore(LocalDateTime.now().plusSeconds(1)), 
                "使用时间应该是当前时间");
    }
    
    /**
     * Helper method to calculate hash (mimics the service implementation)
     */
    private String calculateHash(String code) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            String salt = "polaris_verification_salt";
            String saltedCode = code + salt;
            byte[] hash = digest.digest(saltedCode.getBytes());
            return java.util.HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
