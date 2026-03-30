package com.polaris.auth.service.impl;

import com.polaris.auth.dto.LoginResponse;
import com.polaris.auth.dto.UserLoginRequest;
import com.polaris.auth.security.JwtTokenProvider;
import com.polaris.auth.security.UserContext;
import com.polaris.auth.service.RateLimiterService;
import com.polaris.auth.service.TokenService;
import com.polaris.common.exception.BusinessException;
import com.polaris.converter.UserConverter;
import com.polaris.dto.user.UserResponse;
import com.polaris.dto.verification.RegisterWithCodeRequest;
import com.polaris.email.mapper.EmailVerificationLogMapper;
import com.polaris.entity.User;
import com.polaris.mapper.UserMapper;
import com.polaris.service.SubscriptionService;
import com.polaris.service.VerificationCodeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService 邮箱规范化测试")
class AuthServiceImplEmailNormalizationTest {

    @Mock
    private UserMapper userMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private UserContext userContext;

    @Mock
    private UserConverter userConverter;

    @Mock
    private SubscriptionService subscriptionService;

    @Mock
    private VerificationCodeService verificationCodeService;

    @Mock
    private RateLimiterService rateLimiterService;

    @Mock
    private EmailVerificationLogMapper verificationLogMapper;

    @Mock
    private TokenService tokenService;

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private com.polaris.email.service.EmailService emailService;

    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        authService = new AuthServiceImpl(
                userMapper,
                passwordEncoder,
                jwtTokenProvider,
                userContext,
                userConverter,
                subscriptionService,
                verificationCodeService,
                rateLimiterService,
                verificationLogMapper,
                tokenService,
                redisTemplate,
                emailService
        );
    }

    @Test
    @DisplayName("Gmail 地址应去点号、去 plus 并统一域名")
    void shouldNormalizeGmailAddress() {
        String normalized = ReflectionTestUtils.invokeMethod(
                authService,
                "normalizeEmail",
                " John.Doe+promo@GoogleMail.com "
        );

        assertEquals("johndoe@gmail.com", normalized);
    }

    @Test
    @DisplayName("非 Gmail 地址应保留点号")
    void shouldKeepDotsForNonGmailAddress() {
        String normalized = ReflectionTestUtils.invokeMethod(
                authService,
                "normalizeEmail",
                "john.doe@outlook.com"
        );

        assertEquals("john.doe@outlook.com", normalized);
    }

    @Test
    @DisplayName("检查邮箱可用性时应识别 Gmail 规范化后的占用")
    void shouldDetectOccupiedNormalizedGmailAddress() {
        User existingUser = new User();
        existingUser.setId(1L);

        when(userMapper.findByEmail("john.doe+promo@gmail.com")).thenReturn(null);
        when(userMapper.findByEmail("johndoe@gmail.com")).thenReturn(existingUser);

        boolean available = authService.checkEmailAvailable("john.doe+promo@gmail.com");

        assertFalse(available);
        verify(userMapper).findByEmail("john.doe+promo@gmail.com");
        verify(userMapper).findByEmail("johndoe@gmail.com");
    }

    @Test
    @DisplayName("检查邮箱可用性时不应错误去掉非 Gmail 点号")
    void shouldNotStripDotsForNonGmailAvailabilityCheck() {
        when(userMapper.findByEmail("john.doe@outlook.com")).thenReturn(null);

        boolean available = authService.checkEmailAvailable("john.doe@outlook.com");

        assertTrue(available);
        verify(userMapper).findByEmail("john.doe@outlook.com");
        verify(userMapper, never()).findByEmail("johndoe@outlook.com");
    }

    @Test
    @DisplayName("邮箱登录时应对 Gmail 使用规范化地址查找")
    void shouldLoginWithNormalizedGmailAddress() {
        User user = buildUser(10L, "tester", "johndoe@gmail.com");
        UserResponse userResponse = new UserResponse();
        userResponse.setId(10L);
        userResponse.setEmail(user.getEmail());
        userResponse.setUsername(user.getUsername());

        UserLoginRequest request = new UserLoginRequest();
        request.setUsername("john.doe+promo@gmail.com");
        request.setPassword("Password1");

        when(userMapper.findByEmail("johndoe@gmail.com")).thenReturn(user);
        when(passwordEncoder.matches("Password1", "encoded")).thenReturn(true);
        when(jwtTokenProvider.getExpiration()).thenReturn(86_400_000L);
        when(jwtTokenProvider.createToken(10L, "tester", 86_400_000L)).thenReturn("access-token");
        when(jwtTokenProvider.createRefreshToken(10L, "tester")).thenReturn("refresh-token");
        when(userConverter.toUserResponse(user)).thenReturn(userResponse);

        LoginResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("access-token", response.getToken());
        verify(userMapper).findByEmail("johndoe@gmail.com");
        verify(userMapper, never()).findByEmail("john.doe+promo@gmail.com");
    }

    @Test
    @DisplayName("邮箱登录时不应错误修改非 Gmail 地址")
    void shouldKeepDotsWhenLoggingInWithNonGmailAddress() {
        User user = buildUser(11L, "tester2", "john.doe@outlook.com");
        UserResponse userResponse = new UserResponse();
        userResponse.setId(11L);
        userResponse.setEmail(user.getEmail());
        userResponse.setUsername(user.getUsername());

        UserLoginRequest request = new UserLoginRequest();
        request.setUsername("john.doe@outlook.com");
        request.setPassword("Password1");

        when(userMapper.findByEmail("john.doe@outlook.com")).thenReturn(user);
        when(passwordEncoder.matches("Password1", "encoded")).thenReturn(true);
        when(jwtTokenProvider.getExpiration()).thenReturn(86_400_000L);
        when(jwtTokenProvider.createToken(11L, "tester2", 86_400_000L)).thenReturn("access-token");
        when(jwtTokenProvider.createRefreshToken(11L, "tester2")).thenReturn("refresh-token");
        when(userConverter.toUserResponse(user)).thenReturn(userResponse);

        LoginResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("access-token", response.getToken());
        verify(userMapper).findByEmail("john.doe@outlook.com");
        verify(userMapper, never()).findByEmail("johndoe@outlook.com");
    }

    @Test
    @DisplayName("验证码注册时应仅对 Gmail 入库规范化邮箱")
    void shouldStoreNormalizedGmailAddressOnRegisterWithCode() {
        RegisterWithCodeRequest request = new RegisterWithCodeRequest();
        request.setEmail("john.doe+promo@gmail.com");
        request.setCode("123456");
        request.setUsername("tester3");
        request.setPassword("Password1");
        request.setNickname("Tester");

        UserResponse userResponse = new UserResponse();
        userResponse.setId(12L);
        userResponse.setEmail("johndoe@gmail.com");
        userResponse.setUsername("tester3");

        when(verificationCodeService.verifyCode("john.doe+promo@gmail.com", "123456", com.polaris.entity.VerificationPurpose.REGISTER))
                .thenReturn(true);
        when(userMapper.findByEmail("john.doe+promo@gmail.com")).thenReturn(null);
        when(userMapper.findByEmail("johndoe@gmail.com")).thenReturn(null);
        when(userMapper.findByUsername("tester3")).thenReturn(null);
        when(passwordEncoder.encode("Password1")).thenReturn("encoded-password");
        doAnswer(invocation -> {
            User inserted = invocation.getArgument(0);
            inserted.setId(12L);
            return 1;
        }).when(userMapper).insert(any(User.class));
        when(jwtTokenProvider.getExpiration()).thenReturn(86_400_000L);
        when(jwtTokenProvider.createToken(12L, "tester3")).thenReturn("access-token");
        when(jwtTokenProvider.createRefreshToken(12L, "tester3")).thenReturn("refresh-token");
        when(userConverter.toUserResponse(any(User.class))).thenReturn(userResponse);

        LoginResponse response = authService.registerWithCode(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userMapper).insert(userCaptor.capture());
        verify(subscriptionService).initializeDefaultPreferences(12L);

        User insertedUser = userCaptor.getValue();
        assertEquals("johndoe@gmail.com", insertedUser.getEmail());
        assertEquals("access-token", response.getToken());
    }

    @Test
    @DisplayName("非 Gmail 注册不应移除点号")
    void shouldKeepDotsForNonGmailRegister() {
        String normalized = ReflectionTestUtils.invokeMethod(
                authService,
                "normalizeEmail",
                "john.doe@outlook.com"
        );

        assertEquals("john.doe@outlook.com", normalized);
    }

    @Test
    @DisplayName("Gmail 规范化后已存在时注册应失败")
    void shouldRejectRegisterWhenNormalizedGmailAlreadyExists() {
        RegisterWithCodeRequest request = new RegisterWithCodeRequest();
        request.setEmail("john.doe@gmail.com");
        request.setCode("123456");
        request.setUsername("tester4");
        request.setPassword("Password1");

        User existingUser = buildUser(20L, "existing", "johndoe@gmail.com");

        when(verificationCodeService.verifyCode("john.doe@gmail.com", "123456", com.polaris.entity.VerificationPurpose.REGISTER))
                .thenReturn(true);
        when(userMapper.findByEmail("john.doe@gmail.com")).thenReturn(null);
        when(userMapper.findByEmail("johndoe@gmail.com")).thenReturn(existingUser);

        assertThrows(BusinessException.class, () -> authService.registerWithCode(request));
    }

    private User buildUser(Long id, String username, String email) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword("encoded");
        user.setStatus(1);
        return user;
    }
}
