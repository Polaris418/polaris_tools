package com.polaris.service.impl;

import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import com.polaris.converter.UserConverter;
import com.polaris.dto.LoginResponse;
import com.polaris.dto.UserLoginRequest;
import com.polaris.dto.UserRegisterRequest;
import com.polaris.dto.UserResponse;
import com.polaris.dto.UserUpdateRequest;
import com.polaris.dto.verification.RegisterWithCodeRequest;
import com.polaris.dto.verification.SendVerificationCodeRequest;
import com.polaris.dto.verification.SendVerificationCodeResponse;
import com.polaris.entity.EmailVerificationLog;
import com.polaris.entity.User;
import com.polaris.entity.VerificationPurpose;
import com.polaris.mapper.EmailVerificationLogMapper;
import com.polaris.mapper.UserMapper;
import com.polaris.security.JwtTokenProvider;
import com.polaris.security.UserContext;
import com.polaris.service.AuthService;
import com.polaris.service.RateLimiterService;
import com.polaris.service.SubscriptionService;
import com.polaris.service.TokenService;
import com.polaris.service.VerificationCodeService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * 认证服务实现类
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {
    
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserContext userContext;
    private final UserConverter userConverter;
    private final SubscriptionService subscriptionService;
    private final VerificationCodeService verificationCodeService;
    private final RateLimiterService rateLimiterService;
    private final EmailVerificationLogMapper verificationLogMapper;
    private final TokenService tokenService;
    private final org.springframework.data.redis.core.RedisTemplate<String, String> redisTemplate;
    private final com.polaris.service.EmailService emailService;
    
    /**
     * 规范化邮箱地址
     * 移除用户名部分的所有点号，防止使用点号技巧重复注册
     * 例如: john.doe@example.com -> johndoe@example.com
     * 例如: j.o.h.n@example.com -> john@example.com
     * 
     * 注意：对于 Gmail，还会移除 + 号后的内容
     * 
     * @param email 原始邮箱地址
     * @return 规范化后的邮箱地址
     */
    private String normalizeEmail(String email) {
        if (email == null || email.isEmpty()) {
            return email;
        }
        
        email = email.toLowerCase().trim();
        
        // 分离用户名和域名
        String[] parts = email.split("@");
        if (parts.length != 2) {
            return email;
        }
        
        String username = parts[0];
        String domain = parts[1];
        
        // 对所有邮箱：移除用户名中的所有点号
        username = username.replace(".", "");
        
        // 对于 Gmail 和 Googlemail，还要移除 + 号及其后面的内容
        if (domain.equals("gmail.com") || domain.equals("googlemail.com")) {
            // 移除 + 号及其后面的所有内容
            int plusIndex = username.indexOf('+');
            if (plusIndex > 0) {
                username = username.substring(0, plusIndex);
            }
            
            // 统一使用 gmail.com
            domain = "gmail.com";
        }
        
        return username + "@" + domain;
    }
    
    /**
     * 检查邮箱是否已被注册（考虑规范化）
     * 
     * @param email 邮箱地址
     * @return 如果已注册返回 true
     */
    private boolean isEmailRegistered(String email) {
        String normalizedEmail = normalizeEmail(email);
        
        // 先检查原始邮箱
        User user = userMapper.findByEmail(email);
        if (user != null) {
            return true;
        }
        
        // 如果规范化后的邮箱不同，也检查规范化的邮箱
        if (!normalizedEmail.equals(email)) {
            user = userMapper.findByEmail(normalizedEmail);
            if (user != null) {
                return true;
            }
        }
        
        return false;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserResponse register(UserRegisterRequest request) {
        log.info("用户注册: username={}, email={}", request.getUsername(), request.getEmail());
        
        // 验证用户名唯一性
        User existingUser = userMapper.findByUsername(request.getUsername());
        if (existingUser != null) {
            throw new BusinessException(ErrorCode.USERNAME_EXISTS);
        }
        
        // 验证邮箱唯一性
        existingUser = userMapper.findByEmail(request.getEmail());
        if (existingUser != null) {
            throw new BusinessException(ErrorCode.EMAIL_EXISTS);
        }
        
        // 创建用户实体
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword())); // BCrypt 加密
        user.setPasswordUpdatedAt(LocalDateTime.now()); // 设置密码创建时间
        user.setEmail(request.getEmail());
        user.setNickname(request.getNickname() != null ? request.getNickname() : request.getUsername());
        user.setPlanType(0); // 默认 Free Plan
        user.setStatus(1); // 默认正常状态
        
        // 使用邮箱注册时，自动验证邮箱
        // 注意：将来如果添加手机号注册功能，需要根据注册方式判断是否自动验证邮箱
        // 手机号注册时，emailVerified 应设置为 false，emailVerifiedAt 为 null
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(LocalDateTime.now());
        
        // 保存到数据库
        userMapper.insert(user);
        
        // 初始化默认订阅偏好
        subscriptionService.initializeDefaultPreferences(user.getId());
        
        log.info("用户注册成功: userId={}, emailVerified={}", user.getId(), user.getEmailVerified());
        
        // 异步发送欢迎邮件
        sendWelcomeEmailAsync(user.getEmail(), user.getUsername());
        
        // 使用 MapStruct 转换为响应 DTO
        return userConverter.toUserResponse(user);
    }
    
    /**
     * 异步发送欢迎邮件
     */
    @Async
    private void sendWelcomeEmailAsync(String email, String username) {
        try {
            log.info("发送欢迎邮件: email={}, username={}", email, username);
            emailService.sendWelcomeEmail(email, username);
            log.info("欢迎邮件发送成功: email={}", email);
        } catch (Exception e) {
            log.error("发送欢迎邮件失败: email={}, error={}", email, e.getMessage(), e);
            // 欢迎邮件发送失败不影响注册流程
        }
    }
    
    /**
     * 异步发送邮箱验证邮件
     */
    @Async
    private void sendEmailVerificationAsync(Long userId, String email, String username) {
        try {
            log.info("发送邮箱验证邮件: userId={}, email={}, username={}", userId, email, username);
            emailService.sendEmailVerificationWithToken(userId, email, username);
            log.info("邮箱验证邮件发送成功: email={}", email);
        } catch (Exception e) {
            log.error("发送邮箱验证邮件失败: userId={}, email={}, error={}", userId, email, e.getMessage(), e);
            // 验证邮件发送失败不影响主流程
        }
    }
    
    @Override
    public LoginResponse login(UserLoginRequest request) {
        log.info("用户登录: username={}, rememberMe={}", request.getUsername(), request.isRememberMe());
        
        String loginIdentifier = request.getUsername();
        User user = null;
        
        // 判断是邮箱还是用户名登录
        if (loginIdentifier.contains("@")) {
            // 邮箱登录 - 使用规范化的邮箱查找
            String normalizedEmail = normalizeEmail(loginIdentifier);
            user = userMapper.findByEmail(normalizedEmail);
            
            // 如果规范化邮箱找不到，尝试原始邮箱
            if (user == null && !normalizedEmail.equals(loginIdentifier)) {
                user = userMapper.findByEmail(loginIdentifier);
            }
        } else {
            // 用户名登录
            user = userMapper.findByUsername(loginIdentifier);
        }
        
        if (user == null) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
        
        // 验证密码
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
        
        // 检查用户状态
        if (user.getStatus() == 0) {
            throw new BusinessException(ErrorCode.USER_DISABLED);
        }
        
        // 更新最后登录时间和 IP（这里简化处理，实际应从 HttpServletRequest 获取）
        user.setLastLoginAt(LocalDateTime.now());
        userMapper.updateById(user);
        
        // 根据 rememberMe 选择不同的过期时间
        long tokenExpiration = request.isRememberMe() 
            ? jwtTokenProvider.getRememberMeExpiration()  // 30 天
            : jwtTokenProvider.getExpiration();           // 1 天
        
        // 生成 JWT Token（使用自定义过期时间）
        String token = jwtTokenProvider.createToken(user.getId(), user.getUsername(), tokenExpiration);
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId(), user.getUsername());
        
        log.info("用户登录成功: userId={}, tokenExpiration={}ms", user.getId(), tokenExpiration);
        
        // 构建响应
        LoginResponse response = new LoginResponse();
        response.setToken(token);
        response.setRefreshToken(refreshToken);
        response.setUser(userConverter.toUserResponse(user));
        response.setExpiresIn(tokenExpiration / 1000); // 转换为秒
        
        return response;
    }
    
    @Override
    public void logout() {
        Long userId = userContext.getCurrentUserId();
        if (userId != null) {
            log.info("用户登出: userId={}", userId);
            // 在无状态 JWT 认证中，登出主要由客户端处理（删除 Token）
            // 如果需要服务端黑名单，可以在这里将 Token 加入 Redis 黑名单
        }
    }
    
    @Override
    public String refreshToken(String refreshToken) {
        log.info("刷新 Token");
        
        // 验证 refreshToken
        if (!jwtTokenProvider.validateToken(refreshToken) || !jwtTokenProvider.isRefreshToken(refreshToken)) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID, "Refresh Token 无效、已过期或类型错误");
        }
        
        // 从 refreshToken 中提取用户信息
        Long userId = jwtTokenProvider.getUserIdFromToken(refreshToken);
        String username = jwtTokenProvider.getUsernameFromToken(refreshToken);
        
        // 验证用户是否存在且状态正常
        User user = userMapper.selectById(userId);
        if (user == null || user.getDeleted() == 1) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        if (user.getStatus() == 0) {
            throw new BusinessException(ErrorCode.USER_DISABLED);
        }
        
        // 生成新的访问令牌
        String newToken = jwtTokenProvider.createToken(userId, username);
        
        log.info("Token 刷新成功: userId={}", userId);
        
        return newToken;
    }
    
    @Override
    public UserResponse getCurrentUser() {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        User user = userMapper.selectById(userId);
        if (user == null || user.getDeleted() == 1) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        
        return userConverter.toUserResponse(user);
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserResponse updateProfile(UserUpdateRequest request) {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        log.info("更新用户资料: userId={}", userId);
        
        User user = userMapper.selectById(userId);
        if (user == null || user.getDeleted() == 1) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        
        // 更新字段
        if (request.getNickname() != null) {
            user.setNickname(request.getNickname());
        }
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            // 验证邮箱唯一性（排除当前用户）
            User existingUser = userMapper.findByEmail(request.getEmail());
            if (existingUser != null && !existingUser.getId().equals(userId)) {
                throw new BusinessException(ErrorCode.EMAIL_EXISTS);
            }
            
            // 修改邮箱时标记为未验证
            user.setEmail(request.getEmail());
            user.setEmailVerified(false);
            user.setEmailVerifiedAt(null);
            
            log.info("用户邮箱已修改，标记为未验证: userId={}, oldEmail={}, newEmail={}", 
                    userId, user.getEmail(), request.getEmail());
            
            // 异步发送验证邮件到新邮箱
            sendEmailVerificationAsync(userId, request.getEmail(), user.getUsername());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }
        if (request.getAvatarStyle() != null) {
            user.setAvatar(request.getAvatarStyle());
        }
        if (request.getAvatarConfig() != null) {
            user.setAvatarConfig(request.getAvatarConfig());
        }
        if (request.getLanguage() != null) {
            user.setLanguage(request.getLanguage());
            log.info("用户语言偏好已更新: userId={}, language={}", userId, request.getLanguage());
        }
        
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(user);
        
        log.info("用户资料更新成功: userId={}", userId);
        
        return userConverter.toUserResponse(user);
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateEmail(String newEmail, String password) {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        log.info("修改邮箱: userId={}, newEmail={}", userId, newEmail);
        
        // 获取当前用户
        User user = userMapper.selectById(userId);
        if (user == null || user.getDeleted() == 1) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        
        // 验证密码
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, "密码错误");
        }
        
        // 检查新邮箱是否与当前邮箱相同
        if (newEmail.equals(user.getEmail())) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "新邮箱不能与当前邮箱相同");
        }
        
        // 验证新邮箱唯一性
        User existingUser = userMapper.findByEmail(newEmail);
        if (existingUser != null) {
            throw new BusinessException(ErrorCode.EMAIL_EXISTS, "该邮箱已被使用");
        }
        
        // 更新邮箱并标记为未验证
        user.setEmail(newEmail);
        user.setEmailVerified(false);
        user.setEmailVerifiedAt(null);
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(user);
        
        log.info("邮箱修改成功，已标记为未验证: userId={}, newEmail={}", userId, newEmail);
        
        // 异步发送验证邮件到新邮箱
        sendEmailVerificationAsync(userId, newEmail, user.getUsername());
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public SendVerificationCodeResponse sendRegisterCode(SendVerificationCodeRequest request) {
        String email = request.getEmail();
        VerificationPurpose purpose = VerificationPurpose.REGISTER;
        log.info("发送注册验证码: email={}", email);
        
        // 1. 验证邮箱格式（已通过 @Email 注解验证）
        
        // 2. 检查邮箱是否已注册
        User existingUser = userMapper.findByEmail(email);
        if (existingUser != null) {
            throw new BusinessException(ErrorCode.EMAIL_EXISTS, "该邮箱已注册");
        }
        
        // 3. 获取IP地址
        String ipAddress = getClientIpAddress();
        
        // 4. 检查限流
        // 检查邮箱级限流
        if (!rateLimiterService.checkEmailRateLimit(email, purpose)) {
            long cooldownSeconds = rateLimiterService.getEmailCooldownSeconds(email, purpose);
            log.warn("邮箱级限流触发: email={}, cooldownSeconds={}", email, cooldownSeconds);
            recordVerificationLog(email, purpose, "send", ipAddress, false, "邮箱级限流");
            throw new BusinessException(ErrorCode.RATE_LIMIT_EMAIL, 
                String.format("发送过于频繁，请%d秒后再试", cooldownSeconds));
        }
        
        // 检查IP级限流
        if (!rateLimiterService.checkIpRateLimit(ipAddress)) {
            long cooldownSeconds = rateLimiterService.getIpCooldownSeconds(ipAddress);
            log.warn("IP级限流触发: ip={}, cooldownSeconds={}", ipAddress, cooldownSeconds);
            recordVerificationLog(email, purpose, "send", ipAddress, false, "IP级限流");
            throw new BusinessException(ErrorCode.RATE_LIMIT_IP, "请求过于频繁，请稍后再试");
        }
        
        // 检查邮箱是否被封禁
        if (rateLimiterService.isEmailBlocked(email, purpose)) {
            log.warn("邮箱已被封禁: email={}", email);
            recordVerificationLog(email, purpose, "send", ipAddress, false, "邮箱已被封禁");
            throw new BusinessException(ErrorCode.EMAIL_BLOCKED, "该邮箱已被临时封禁");
        }
        
        // 5. 生成并发送验证码（默认语言为中文）
        SendVerificationCodeResponse response = verificationCodeService.generateAndSendCode(
            email, 
            purpose, 
            "zh-CN"
        );
        
        // 6. 记录发送尝试
        rateLimiterService.recordAttempt(email, purpose, ipAddress);
        
        // 7. 记录发送日志
        recordVerificationLog(email, purpose, "send", ipAddress, true, null);
        
        log.info("注册验证码发送成功: email={}", email);
        
        return response;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public LoginResponse registerWithCode(RegisterWithCodeRequest request) {
        String email = request.getEmail();
        String code = request.getCode();
        log.info("使用验证码注册: email={}", email);
        
        // 1. 获取IP地址
        String ipAddress = getClientIpAddress();
        
        // 2. 验证验证码
        boolean isValid = verificationCodeService.verifyCode(email, code, VerificationPurpose.REGISTER);
        if (!isValid) {
            log.warn("验证码验证失败: email={}, code={}", email, code);
            recordVerificationLog(email, VerificationPurpose.REGISTER, "verify", ipAddress, false, "验证码无效");
            throw new BusinessException(ErrorCode.CODE_INVALID, "验证码无效或已过期");
        }
        
        // 3. 检查邮箱是否已注册（使用规范化检查，防止 Gmail 点号绕过）
        if (isEmailRegistered(email)) {
            String normalizedEmail = normalizeEmail(email);
            log.warn("邮箱已被注册: email={}, normalizedEmail={}", email, normalizedEmail);
            recordVerificationLog(email, VerificationPurpose.REGISTER, "verify", ipAddress, false, "邮箱已注册");
            throw new BusinessException(ErrorCode.EMAIL_EXISTS, "该邮箱已注册");
        }
        
        // 4. 检查用户名是否已存在
        User existingUser = userMapper.findByUsername(request.getUsername());
        if (existingUser != null) {
            log.warn("用户名已存在: username={}", request.getUsername());
            recordVerificationLog(email, VerificationPurpose.REGISTER, "verify", ipAddress, false, "用户名已存在");
            throw new BusinessException(ErrorCode.USERNAME_EXISTS, "该用户名已被使用");
        }
        
        // 5. 创建用户账户（使用规范化的邮箱地址）
        String normalizedEmail = normalizeEmail(email);
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPasswordUpdatedAt(LocalDateTime.now()); // 设置密码创建时间
        user.setEmail(normalizedEmail); // 使用规范化的邮箱地址
        user.setNickname(request.getNickname() != null ? request.getNickname() : request.getUsername());
        user.setPlanType(0); // 默认 Free Plan
        user.setStatus(1); // 默认正常状态
        user.setEmailVerified(true); // 标记邮箱为已验证
        user.setEmailVerifiedAt(LocalDateTime.now());
        
        // 6. 保存到数据库
        userMapper.insert(user);
        
        // 7. 初始化默认订阅偏好
        subscriptionService.initializeDefaultPreferences(user.getId());
        
        // 8. 使验证码失效
        verificationCodeService.invalidateCode(email, VerificationPurpose.REGISTER);
        
        // 9. 记录验证日志
        recordVerificationLog(email, VerificationPurpose.REGISTER, "verify", ipAddress, true, null);
        
        // 10. 异步发送欢迎邮件
        sendWelcomeEmailAsync(normalizedEmail, user.getUsername());
        
        // 11. 生成 JWT Token
        String token = jwtTokenProvider.createToken(user.getId(), user.getUsername());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId(), user.getUsername());
        
        log.info("用户注册成功: userId={}, username={}, email={}, normalizedEmail={}", 
                 user.getId(), user.getUsername(), email, normalizedEmail);
        
        // 12. 构建响应
        LoginResponse response = new LoginResponse();
        response.setToken(token);
        response.setRefreshToken(refreshToken);
        response.setUser(userConverter.toUserResponse(user));
        response.setExpiresIn(jwtTokenProvider.getExpiration() / 1000); // 转换为秒
        
        return response;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public SendVerificationCodeResponse sendLoginCode(SendVerificationCodeRequest request) {
        String email = request.getEmail();
        VerificationPurpose purpose = VerificationPurpose.LOGIN;
        log.info("发送登录验证码: email={}", email);
        
        // 1. 验证邮箱格式（已通过 @Email 注解验证）
        
        // 2. 检查邮箱是否已注册
        User existingUser = userMapper.findByEmail(email);
        if (existingUser == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "该邮箱未注册");
        }
        
        // 3. 检查用户状态
        if (existingUser.getStatus() == 0) {
            throw new BusinessException(ErrorCode.USER_DISABLED, "该账户已被禁用");
        }
        
        // 4. 获取IP地址
        String ipAddress = getClientIpAddress();
        
        // 5. 检查限流
        // 检查邮箱级限流
        if (!rateLimiterService.checkEmailRateLimit(email, purpose)) {
            long cooldownSeconds = rateLimiterService.getEmailCooldownSeconds(email, purpose);
            log.warn("邮箱级限流触发: email={}, cooldownSeconds={}", email, cooldownSeconds);
            recordVerificationLog(email, purpose, "send", ipAddress, false, "邮箱级限流");
            throw new BusinessException(ErrorCode.RATE_LIMIT_EMAIL, 
                String.format("发送过于频繁，请%d秒后再试", cooldownSeconds));
        }
        
        // 检查IP级限流
        if (!rateLimiterService.checkIpRateLimit(ipAddress)) {
            long cooldownSeconds = rateLimiterService.getIpCooldownSeconds(ipAddress);
            log.warn("IP级限流触发: ip={}, cooldownSeconds={}", ipAddress, cooldownSeconds);
            recordVerificationLog(email, purpose, "send", ipAddress, false, "IP级限流");
            throw new BusinessException(ErrorCode.RATE_LIMIT_IP, "请求过于频繁，请稍后再试");
        }
        
        // 检查邮箱是否被封禁
        if (rateLimiterService.isEmailBlocked(email, purpose)) {
            log.warn("邮箱已被封禁: email={}", email);
            recordVerificationLog(email, purpose, "send", ipAddress, false, "邮箱已被封禁");
            throw new BusinessException(ErrorCode.EMAIL_BLOCKED, "该邮箱已被临时封禁");
        }
        
        // 6. 生成并发送验证码（默认语言为中文）
        SendVerificationCodeResponse response = verificationCodeService.generateAndSendCode(
            email, 
            purpose, 
            "zh-CN"
        );
        
        // 7. 记录发送尝试
        rateLimiterService.recordAttempt(email, purpose, ipAddress);
        
        // 8. 记录发送日志
        recordVerificationLog(email, purpose, "send", ipAddress, true, null);
        
        log.info("登录验证码发送成功: email={}", email);
        
        return response;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public LoginResponse loginWithCode(com.polaris.dto.verification.LoginWithCodeRequest request) {
        String email = request.getEmail();
        String code = request.getCode();
        boolean rememberMe = request.isRememberMe();
        log.info("使用验证码登录: email={}, rememberMe={}", email, rememberMe);
        
        // 1. 获取IP地址
        String ipAddress = getClientIpAddress();
        
        // 2. 验证验证码
        boolean isValid = verificationCodeService.verifyCode(email, code, VerificationPurpose.LOGIN);
        if (!isValid) {
            log.warn("验证码验证失败: email={}, code={}", email, code);
            recordVerificationLog(email, VerificationPurpose.LOGIN, "verify", ipAddress, false, "验证码无效");
            throw new BusinessException(ErrorCode.CODE_INVALID, "验证码无效或已过期");
        }
        
        // 3. 查找用户
        User user = userMapper.findByEmail(email);
        if (user == null) {
            log.warn("用户不存在: email={}", email);
            recordVerificationLog(email, VerificationPurpose.LOGIN, "verify", ipAddress, false, "用户不存在");
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
        }
        
        // 4. 检查用户状态
        if (user.getStatus() == 0) {
            log.warn("用户已被禁用: email={}", email);
            recordVerificationLog(email, VerificationPurpose.LOGIN, "verify", ipAddress, false, "用户已被禁用");
            throw new BusinessException(ErrorCode.USER_DISABLED, "该账户已被禁用");
        }
        
        // 5. 更新最后登录时间
        user.setLastLoginAt(LocalDateTime.now());
        userMapper.updateById(user);
        
        // 6. 使验证码失效
        verificationCodeService.invalidateCode(email, VerificationPurpose.LOGIN);
        
        // 7. 记录验证日志
        recordVerificationLog(email, VerificationPurpose.LOGIN, "verify", ipAddress, true, null);
        
        // 8. 根据 rememberMe 选择不同的过期时间
        long tokenExpiration = rememberMe 
            ? jwtTokenProvider.getRememberMeExpiration()  // 30 天
            : jwtTokenProvider.getExpiration();           // 1 天
        
        // 9. 生成 JWT Token（使用自定义过期时间）
        String token = jwtTokenProvider.createToken(user.getId(), user.getUsername(), tokenExpiration);
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId(), user.getUsername());
        
        log.info("用户登录成功: userId={}, email={}, tokenExpiration={}ms", user.getId(), email, tokenExpiration);
        
        // 10. 构建响应
        LoginResponse response = new LoginResponse();
        response.setToken(token);
        response.setRefreshToken(refreshToken);
        response.setUser(userConverter.toUserResponse(user));
        response.setExpiresIn(tokenExpiration / 1000); // 转换为秒
        
        return response;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public SendVerificationCodeResponse sendResetPasswordCode(SendVerificationCodeRequest request) {
        String email = request.getEmail();
        VerificationPurpose purpose = VerificationPurpose.RESET;
        log.info("发送密码重置验证码: email={}", email);
        
        // 1. 验证邮箱格式（已通过 @Email 注解验证）
        
        // 2. 检查邮箱是否已注册（返回通用提示避免泄露信息）
        User existingUser = userMapper.findByEmail(email);
        // 注意：即使邮箱不存在，也返回成功，避免泄露用户信息
        if (existingUser == null) {
            log.info("邮箱未注册，但返回通用成功提示: email={}", email);
            // 返回通用响应，不泄露邮箱是否存在
            SendVerificationCodeResponse response = new SendVerificationCodeResponse();
            response.setCooldownSeconds(60);
            response.setExpiresIn(600);
            return response;
        }
        
        // 3. 检查用户状态
        if (existingUser.getStatus() == 0) {
            log.warn("用户已被禁用: email={}", email);
            // 同样返回通用提示，不泄露用户状态
            SendVerificationCodeResponse response = new SendVerificationCodeResponse();
            response.setCooldownSeconds(60);
            response.setExpiresIn(600);
            return response;
        }
        
        // 4. 获取IP地址
        String ipAddress = getClientIpAddress();
        
        // 5. 检查限流
        // 检查邮箱级限流
        if (!rateLimiterService.checkEmailRateLimit(email, purpose)) {
            long cooldownSeconds = rateLimiterService.getEmailCooldownSeconds(email, purpose);
            log.warn("邮箱级限流触发: email={}, cooldownSeconds={}", email, cooldownSeconds);
            recordVerificationLog(email, purpose, "send", ipAddress, false, "邮箱级限流");
            throw new BusinessException(ErrorCode.RATE_LIMIT_EMAIL, 
                String.format("发送过于频繁，请%d秒后再试", cooldownSeconds));
        }
        
        // 检查IP级限流
        if (!rateLimiterService.checkIpRateLimit(ipAddress)) {
            long cooldownSeconds = rateLimiterService.getIpCooldownSeconds(ipAddress);
            log.warn("IP级限流触发: ip={}, cooldownSeconds={}", ipAddress, cooldownSeconds);
            recordVerificationLog(email, purpose, "send", ipAddress, false, "IP级限流");
            throw new BusinessException(ErrorCode.RATE_LIMIT_IP, "请求过于频繁，请稍后再试");
        }
        
        // 检查邮箱是否被封禁
        if (rateLimiterService.isEmailBlocked(email, purpose)) {
            log.warn("邮箱已被封禁: email={}", email);
            recordVerificationLog(email, purpose, "send", ipAddress, false, "邮箱已被封禁");
            throw new BusinessException(ErrorCode.EMAIL_BLOCKED, "该邮箱已被临时封禁");
        }
        
        // 6. 生成并发送验证码（默认语言为中文）
        SendVerificationCodeResponse response = verificationCodeService.generateAndSendCode(
            email, 
            purpose, 
            "zh-CN"
        );
        
        // 7. 记录发送尝试
        rateLimiterService.recordAttempt(email, purpose, ipAddress);
        
        // 8. 记录发送日志
        recordVerificationLog(email, purpose, "send", ipAddress, true, null);
        
        log.info("密码重置验证码发送成功: email={}", email);
        
        return response;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> verifyResetPasswordCode(com.polaris.dto.verification.VerifyCodeRequest request) {
        String email = request.getEmail();
        String code = request.getCode();
        VerificationPurpose purpose = VerificationPurpose.RESET;
        log.info("验证密码重置验证码: email={}", email);
        
        // 1. 获取IP地址
        String ipAddress = getClientIpAddress();
        
        // 2. 验证验证码
        boolean isValid = verificationCodeService.verifyCode(email, code, purpose);
        if (!isValid) {
            log.warn("验证码验证失败: email={}, code={}", email, code);
            recordVerificationLog(email, purpose, "verify", ipAddress, false, "验证码无效");
            throw new BusinessException(ErrorCode.CODE_INVALID, "验证码无效或已过期");
        }
        
        // 3. 查找用户
        User user = userMapper.findByEmail(email);
        if (user == null) {
            log.warn("用户不存在: email={}", email);
            recordVerificationLog(email, purpose, "verify", ipAddress, false, "用户不存在");
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
        }
        
        // 4. 检查用户状态
        if (user.getStatus() == 0) {
            log.warn("用户已被禁用: email={}", email);
            recordVerificationLog(email, purpose, "verify", ipAddress, false, "用户已被禁用");
            throw new BusinessException(ErrorCode.USER_DISABLED, "该账户已被禁用");
        }
        
        // 5. 生成临时重置令牌（使用UUID）
        String resetToken = UUID.randomUUID().toString().replace("-", "");
        
        // 6. 将重置令牌存储到Redis，有效期5分钟
        String redisKey = "password_reset_token:" + resetToken;
        redisTemplate.opsForValue().set(redisKey, user.getId().toString(), 5, java.util.concurrent.TimeUnit.MINUTES);
        
        // 7. 使验证码失效
        verificationCodeService.invalidateCode(email, purpose);
        
        // 8. 记录验证日志
        recordVerificationLog(email, purpose, "verify", ipAddress, true, null);
        
        log.info("密码重置验证码验证成功，生成临时令牌: email={}, userId={}", email, user.getId());
        
        // 9. 构建响应
        Map<String, Object> response = new HashMap<>();
        response.put("resetToken", resetToken);
        response.put("expiresIn", 300L); // 5分钟 = 300秒
        
        return response;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void resetPassword(com.polaris.dto.verification.ResetPasswordRequest request) {
        String resetToken = request.getResetToken();
        String newPassword = request.getNewPassword();
        log.info("重置密码: resetToken={}", resetToken);
        
        // 1. 从Redis验证重置令牌
        String redisKey = "password_reset_token:" + resetToken;
        String userIdStr = redisTemplate.opsForValue().get(redisKey);
        
        if (userIdStr == null) {
            log.warn("重置令牌无效或已过期: resetToken={}", resetToken);
            throw new BusinessException(ErrorCode.TOKEN_INVALID, "重置令牌无效或已过期");
        }
        
        Long userId = Long.parseLong(userIdStr);
        
        // 2. 查找用户
        User user = userMapper.selectById(userId);
        if (user == null || user.getDeleted() == 1) {
            log.warn("用户不存在: userId={}", userId);
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
        }
        
        // 3. 检查用户状态
        if (user.getStatus() == 0) {
            log.warn("用户已被禁用: userId={}", userId);
            throw new BusinessException(ErrorCode.USER_DISABLED, "该账户已被禁用");
        }
        
        // 4. 更新密码
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordUpdatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(user);
        
        // 5. 删除Redis中的重置令牌
        redisTemplate.delete(redisKey);
        
        // 6. 使该用户的所有旧Token失效（可选，增强安全性）
        // 注意：这会导致用户在所有设备上被登出
        // tokenService.invalidateUserTokens(userId, "reset");
        
        log.info("密码重置成功: userId={}, email={}", userId, user.getEmail());
        
        // 7. 记录验证日志
        String ipAddress = getClientIpAddress();
        recordVerificationLog(user.getEmail(), VerificationPurpose.RESET, "reset", ipAddress, true, null);
    }
    
    /**
     * 获取客户端IP地址
     */
    private String getClientIpAddress() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String ip = request.getHeader("X-Forwarded-For");
                if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                    ip = request.getHeader("X-Real-IP");
                }
                if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                    ip = request.getRemoteAddr();
                }
                // 如果是多级代理，取第一个IP
                if (ip != null && ip.contains(",")) {
                    ip = ip.split(",")[0].trim();
                }
                return ip;
            }
        } catch (Exception e) {
            log.warn("获取客户端IP地址失败", e);
        }
        return "unknown";
    }
    
    /**
     * 异步记录验证日志
     */
    @Async
    private void recordVerificationLog(String email, VerificationPurpose purpose, String action, 
                                      String ipAddress, boolean success, String errorMessage) {
        try {
            EmailVerificationLog log = new EmailVerificationLog();
            log.setEmail(email);
            log.setPurpose(purpose.name());
            log.setAction(action);
            log.setIpAddress(ipAddress);
            log.setSuccess(success ? 1 : 0);
            log.setErrorMessage(errorMessage);
            
            // 获取 User-Agent
            try {
                ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attributes != null) {
                    HttpServletRequest request = attributes.getRequest();
                    log.setUserAgent(request.getHeader("User-Agent"));
                }
            } catch (Exception e) {
                // 忽略异常
            }
            
            verificationLogMapper.insert(log);
        } catch (Exception e) {
            // 记录日志失败不应影响主流程
            this.log.error("记录验证日志失败: email={}, purpose={}, action={}", email, purpose, action, e);
        }
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public SendVerificationCodeResponse sendChangePasswordCode(SendVerificationCodeRequest request) {
        String email = request.getEmail();
        VerificationPurpose purpose = VerificationPurpose.CHANGE;
        log.info("发送修改密码验证码: email={}", email);
        
        // 1. 验证邮箱格式（已通过 @Email 注解验证）
        
        // 2. 检查邮箱是否已注册
        User existingUser = userMapper.findByEmail(email);
        if (existingUser == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "该邮箱未注册");
        }
        
        // 3. 检查用户状态
        if (existingUser.getStatus() == 0) {
            throw new BusinessException(ErrorCode.USER_DISABLED, "该账户已被禁用");
        }
        
        // 4. 验证当前用户是否是该邮箱的所有者
        Long currentUserId = userContext.getCurrentUserId();
        if (currentUserId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "请先登录");
        }
        if (!existingUser.getId().equals(currentUserId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "只能修改自己的密码");
        }
        
        // 5. 获取IP地址
        String ipAddress = getClientIpAddress();
        
        // 6. 检查限流
        // 检查邮箱级限流
        if (!rateLimiterService.checkEmailRateLimit(email, purpose)) {
            long cooldownSeconds = rateLimiterService.getEmailCooldownSeconds(email, purpose);
            log.warn("邮箱级限流触发: email={}, cooldownSeconds={}", email, cooldownSeconds);
            recordVerificationLog(email, purpose, "send", ipAddress, false, "邮箱级限流");
            throw new BusinessException(ErrorCode.RATE_LIMIT_EMAIL, 
                String.format("发送过于频繁，请%d秒后再试", cooldownSeconds));
        }
        
        // 检查IP级限流
        if (!rateLimiterService.checkIpRateLimit(ipAddress)) {
            long cooldownSeconds = rateLimiterService.getIpCooldownSeconds(ipAddress);
            log.warn("IP级限流触发: ip={}, cooldownSeconds={}", ipAddress, cooldownSeconds);
            recordVerificationLog(email, purpose, "send", ipAddress, false, "IP级限流");
            throw new BusinessException(ErrorCode.RATE_LIMIT_IP, "请求过于频繁，请稍后再试");
        }
        
        // 检查邮箱是否被封禁
        if (rateLimiterService.isEmailBlocked(email, purpose)) {
            log.warn("邮箱已被封禁: email={}", email);
            recordVerificationLog(email, purpose, "send", ipAddress, false, "邮箱已被封禁");
            throw new BusinessException(ErrorCode.EMAIL_BLOCKED, "该邮箱已被临时封禁");
        }
        
        // 7. 生成并发送验证码（默认语言为中文）
        SendVerificationCodeResponse response = verificationCodeService.generateAndSendCode(
            email, 
            purpose, 
            "zh-CN"
        );
        
        // 8. 记录发送尝试
        rateLimiterService.recordAttempt(email, purpose, ipAddress);
        
        // 9. 记录发送日志
        recordVerificationLog(email, purpose, "send", ipAddress, true, null);
        
        log.info("修改密码验证码发送成功: email={}", email);
        
        return response;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void changePassword(com.polaris.dto.verification.ChangePasswordRequest request) {
        Long currentUserId = userContext.getCurrentUserId();
        if (currentUserId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "请先登录");
        }
        
        log.info("修改密码: userId={}", currentUserId);
        
        // 1. 获取当前用户
        User user = userMapper.selectById(currentUserId);
        if (user == null || user.getDeleted() == 1) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
        }
        
        // 2. 检查用户状态
        if (user.getStatus() == 0) {
            throw new BusinessException(ErrorCode.USER_DISABLED, "该账户已被禁用");
        }
        
        // 3. 验证旧密码
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            log.warn("旧密码验证失败: userId={}", currentUserId);
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, "旧密码错误");
        }
        
        // 4. 获取IP地址
        String ipAddress = getClientIpAddress();
        
        // 5. 验证验证码
        boolean isValid = verificationCodeService.verifyCode(user.getEmail(), request.getCode(), VerificationPurpose.CHANGE);
        if (!isValid) {
            log.warn("验证码验证失败: userId={}, email={}", currentUserId, user.getEmail());
            recordVerificationLog(user.getEmail(), VerificationPurpose.CHANGE, "verify", ipAddress, false, "验证码无效");
            throw new BusinessException(ErrorCode.CODE_INVALID, "验证码无效或已过期");
        }
        
        // 6. 检查新密码是否与旧密码相同
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "新密码不能与旧密码相同");
        }
        
        // 7. 更新密码
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordUpdatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(user);
        
        // 8. 使验证码失效
        verificationCodeService.invalidateCode(user.getEmail(), VerificationPurpose.CHANGE);
        
        // 9. 记录验证日志
        recordVerificationLog(user.getEmail(), VerificationPurpose.CHANGE, "verify", ipAddress, true, null);
        
        log.info("密码修改成功: userId={}, email={}", currentUserId, user.getEmail());
    }
    
    @Override
    public boolean checkEmailAvailable(String email) {
        log.info("检查邮箱是否可用: email={}", email);
        
        // 检查原始邮箱
        User user = userMapper.findByEmail(email);
        if (user != null) {
            log.info("邮箱已被占用: email={}", email);
            return false;
        }
        
        // 检查规范化后的邮箱
        String normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail.equals(email)) {
            user = userMapper.findByEmail(normalizedEmail);
            if (user != null) {
                log.info("邮箱已被占用（规范化后）: email={}, normalizedEmail={}", email, normalizedEmail);
                return false;
            }
        }
        
        log.info("邮箱可用: email={}", email);
        return true;
    }
    
    @Override
    public boolean checkUsernameAvailable(String username) {
        log.info("检查用户名是否可用: username={}", username);
        
        User user = userMapper.findByUsername(username);
        if (user != null) {
            log.info("用户名已被占用: username={}", username);
            return false;
        }
        
        log.info("用户名可用: username={}", username);
        return true;
    }
}
