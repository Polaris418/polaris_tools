# 设计文档

## 概述

本设计文档描述了 Polaris Tools 项目集成 Resend 邮件服务的技术实现方案。项目已有基础的邮件服务代码（EmailService、EmailServiceImpl、ResendConfig），本设计将完善域名配置、DNS 设置、错误处理、重试机制、监控日志和测试验证等功能，以实现生产环境的可靠邮件发送能力。

Resend 是一个现代化的邮件发送服务，提供简洁的 API 和强大的功能。通过正确配置 DNS 记录（SPF、DKIM、DMARC），可以显著提高邮件送达率并防止邮件被标记为垃圾邮件。

## 架构

### 整体架构

```
┌─────────────────┐
│  Controller     │  (AdminEmailController, UserController)
│  Layer          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Service        │  (EmailService interface)
│  Layer          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  EmailService   │  (EmailServiceImpl with retry logic)
│  Impl           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Resend SDK     │  (Resend Java Client)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Resend API     │  (External Service)
└─────────────────┘
```

### 配置层次

```
Environment Variables
    ↓
application.yml / application-prod.yml
    ↓
ResendConfig (@ConfigurationProperties)
    ↓
Resend Bean (Spring Bean)
    ↓
EmailServiceImpl (Service Implementation)
```

### 域名验证流程

```
1. 在 Resend Dashboard 添加域名 (polaristools.online)
   ↓
2. Resend 生成 DNS 记录 (SPF, DKIM, DMARC)
   ↓
3. 在 DNS 提供商配置记录
   ↓
4. Resend 验证 DNS 记录
   ↓
5. 域名状态变为 "Verified"
   ↓
6. 可以使用该域名发送邮件
```

## 组件和接口

### 1. ResendConfig 配置类

**职责**: 管理 Resend 服务的配置参数

**配置属性**:
```java
@ConfigurationProperties(prefix = "resend")
public class ResendConfig {
    private String apiKey;           // Resend API 密钥
    private String fromEmail;        // 发件人邮箱地址
    private boolean enabled;         // 是否启用邮件服务
    private int maxRetries;          // 最大重试次数
    private long initialRetryDelay;  // 初始重试延迟（毫秒）
    private int maxRecipientsPerEmail; // 每封邮件最大收件人数
}
```

**Bean 定义**:
```java
@Bean
public Resend resend() {
    if (!enabled) {
        log.warn("邮件服务已禁用");
    }
    return new Resend(apiKey);
}
```

### 2. EmailService 接口

**职责**: 定义邮件发送的核心方法

**主要方法**:
- `sendEmail(SendEmailRequest)`: 发送通用邮件
- `sendSimpleEmail(to, subject, htmlContent)`: 发送简单 HTML 邮件
- `sendTemplateEmail(to, templateType, variables)`: 发送模板邮件
- `sendWelcomeEmail(to, username)`: 发送欢迎邮件
- `sendPasswordResetEmail(to, username, resetLink)`: 发送密码重置邮件
- `sendEmailVerification(to, username, verificationCode)`: 发送邮箱验证邮件
- `sendLoginNotification(to, username, loginTime, ipAddress, device)`: 发送登录通知

### 3. EmailServiceImpl 实现类

**职责**: 实现邮件发送逻辑，包括重试机制和错误处理

**核心功能**:

#### 3.1 邮件发送方法

```java
public SendEmailResponse sendEmail(SendEmailRequest request) {
    // 1. 检查服务是否启用
    if (!resendConfig.isEnabled()) {
        return disabledResponse();
    }
    
    // 2. 验证请求参数
    validateRequest(request);
    
    // 3. 构建 Resend 请求
    CreateEmailOptions options = buildEmailOptions(request);
    
    // 4. 发送邮件（带重试机制）
    return sendWithRetry(options, request);
}
```

#### 3.2 重试机制

使用指数退避策略处理临时错误：

```java
private SendEmailResponse sendWithRetry(CreateEmailOptions options, 
                                         SendEmailRequest request) {
    int attempt = 0;
    long delay = resendConfig.getInitialRetryDelay();
    
    while (attempt <= resendConfig.getMaxRetries()) {
        try {
            CreateEmailResponse response = resend.emails().send(options);
            logSuccess(response, request);
            return buildSuccessResponse(response);
            
        } catch (ResendException e) {
            attempt++;
            
            // 判断是否应该重试
            if (!isRetryableError(e) || attempt > resendConfig.getMaxRetries()) {
                logFailure(e, request, attempt);
                return buildErrorResponse(e);
            }
            
            // 指数退避
            logRetry(attempt, delay, e);
            sleep(delay);
            delay *= 2; // 指数增长: 1s, 2s, 4s
        }
    }
    
    return buildMaxRetriesExceededResponse();
}
```

#### 3.3 错误分类

```java
private boolean isRetryableError(ResendException e) {
    // 可重试的错误：
    // - 429 Too Many Requests (限流)
    // - 500 Internal Server Error
    // - 503 Service Unavailable
    // - 网络超时
    
    // 不可重试的错误：
    // - 400 Bad Request (参数错误)
    // - 401 Unauthorized (API Key 无效)
    // - 404 Not Found
    // - 422 Unprocessable Entity (邮箱地址无效)
    
    String errorMessage = e.getMessage().toLowerCase();
    return errorMessage.contains("429") ||
           errorMessage.contains("500") ||
           errorMessage.contains("503") ||
           errorMessage.contains("timeout");
}
```

#### 3.4 邮件模板生成

```java
private String generateEmailContent(EmailTemplateType templateType, 
                                      Map<String, Object> variables) {
    return switch (templateType) {
        case WELCOME -> generateWelcomeEmail(
            (String) variables.get("username"));
        case PASSWORD_RESET -> generatePasswordResetEmail(
            (String) variables.get("username"),
            (String) variables.get("resetLink"));
        case EMAIL_VERIFICATION -> generateEmailVerificationEmail(
            (String) variables.get("username"),
            (String) variables.get("verificationCode"));
        case LOGIN_NOTIFICATION -> generateLoginNotificationEmail(
            (String) variables.get("username"),
            (String) variables.get("loginTime"),
            (String) variables.get("ipAddress"),
            (String) variables.get("device"));
        default -> generateGenericNotification(
            (String) variables.getOrDefault("title", "通知"),
            (String) variables.getOrDefault("content", ""));
    };
}
```

### 4. AdminEmailController

**职责**: 提供管理员邮件发送 API

**端点**:
```java
@RestController
@RequestMapping("/api/admin/email")
@PreAuthorize("hasRole('ADMIN')")
public class AdminEmailController {
    
    @PostMapping("/send")
    public ResponseEntity<SendEmailResponse> sendEmail(
        @Valid @RequestBody AdminSendEmailRequest request) {
        
        // 验证管理员权限
        // 记录审计日志
        // 调用邮件服务
        // 返回结果
    }
}
```

### 5. EmailAuditLog 审计日志

**职责**: 记录所有邮件发送活动

**数据模型**:
```java
@Entity
@Table(name = "email_audit_log")
public class EmailAuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String emailId;          // Resend 邮件 ID
    private String sender;           // 发件人
    private String recipients;       // 收件人（JSON 数组）
    private String subject;          // 主题
    private String templateType;     // 模板类型
    private String status;           // 状态: SUCCESS, FAILED, RETRYING
    private String errorMessage;     // 错误消息
    private Integer retryCount;      // 重试次数
    private Long responseTime;       // 响应时间（毫秒）
    private String sentBy;           // 发送者（用户 ID 或 SYSTEM）
    private LocalDateTime createdAt; // 创建时间
}
```

### 6. EmailRateLimiter 限流器

**职责**: 防止邮件发送过于频繁

**实现方式**:
```java
@Component
public class EmailRateLimiter {
    
    // 使用 Guava RateLimiter 或 Bucket4j
    private final Map<String, RateLimiter> userLimiters = new ConcurrentHashMap<>();
    
    public boolean allowSend(String userId) {
        RateLimiter limiter = userLimiters.computeIfAbsent(
            userId, 
            k -> RateLimiter.create(5.0) // 每秒最多 5 封
        );
        return limiter.tryAcquire();
    }
}
```

## 数据模型

### SendEmailRequest DTO

```java
public class SendEmailRequest {
    private List<String> to;        // 收件人（必需）
    private String subject;         // 主题（必需）
    private String html;            // HTML 内容
    private String text;            // 纯文本内容
    private List<String> cc;        // 抄送
    private List<String> bcc;       // 密送
    private List<String> replyTo;   // 回复地址
    private String scheduledAt;     // 定时发送时间
}
```

### SendEmailResponse DTO

```java
public class SendEmailResponse {
    private String id;              // Resend 邮件 ID
    private boolean success;        // 是否成功
    private String message;         // 消息
}
```

### AdminSendEmailRequest DTO

```java
public class AdminSendEmailRequest {
    private List<String> to;        // 收件人（必需）
    private String subject;         // 主题（必需）
    private String html;            // HTML 内容（必需）
    private List<String> cc;        // 抄送
    private List<String> bcc;       // 密送
}
```

### EmailTemplateType 枚举

```java
public enum EmailTemplateType {
    WELCOME,                // 欢迎邮件
    PASSWORD_RESET,         // 密码重置
    EMAIL_VERIFICATION,     // 邮箱验证
    ACCOUNT_ACTIVATION,     // 账户激活
    LOGIN_NOTIFICATION,     // 登录通知
    PASSWORD_CHANGED,       // 密码更改通知
    SUBSCRIPTION_CONFIRMED, // 订阅确认
    NOTIFICATION            // 通用通知
}
```

## 配置文件

### application.yml (开发环境)

```yaml
resend:
  api-key: ${RESEND_API_KEY:re_test_key}
  from-email: ${RESEND_FROM_EMAIL:noreply@polaristools.online}
  enabled: ${RESEND_ENABLED:false}  # 开发环境默认禁用
  max-retries: 3
  initial-retry-delay: 1000  # 1 秒
  max-recipients-per-email: 50

logging:
  level:
    com.polaris.service.impl.EmailServiceImpl: DEBUG
```

### application-prod.yml (生产环境)

```yaml
resend:
  api-key: ${RESEND_API_KEY}
  from-email: ${RESEND_FROM_EMAIL:noreply@polaristools.online}
  enabled: ${RESEND_ENABLED:true}  # 生产环境默认启用
  max-retries: 3
  initial-retry-delay: 1000
  max-recipients-per-email: 50

logging:
  level:
    com.polaris.service.impl.EmailServiceImpl: INFO
```

### 环境变量

```bash
# 必需
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# 可选（有默认值）
RESEND_FROM_EMAIL=noreply@polaristools.online
RESEND_ENABLED=true
```

## DNS 配置指南

### 1. 在 Resend Dashboard 添加域名

1. 登录 [Resend Dashboard](https://resend.com/domains)
2. 点击 "Add Domain"
3. 输入域名: `polaristools.online`
4. 选择使用子域名（推荐）: `noreply@polaristools.online`
5. Resend 将生成 DNS 记录

### 2. 配置 DNS 记录

Resend 会提供以下 DNS 记录（示例）：

#### SPF 记录
```
类型: TXT
名称: @
值: v=spf1 include:_spf.resend.com ~all
TTL: 3600
```

#### DKIM 记录
```
类型: TXT
名称: resend._domainkey
值: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...
TTL: 3600
```

#### DMARC 记录（可选但推荐）
```
类型: TXT
名称: _dmarc
值: v=DMARC1; p=none; rua=mailto:dmarc@polaristools.online
TTL: 3600
```

#### MX 记录（用于接收退信）
```
类型: MX
名称: @
值: feedback-smtp.resend.com
优先级: 10
TTL: 3600
```

### 3. 验证 DNS 配置

在 DNS 提供商（如 Cloudflare、阿里云、腾讯云）配置完成后：

1. 等待 DNS 传播（通常 5-30 分钟）
2. 在 Resend Dashboard 点击 "Verify"
3. 检查验证状态
4. 所有记录验证通过后，域名状态变为 "Verified"

### 4. 测试邮件发送

```bash
# 使用 dig 命令验证 DNS 记录
dig TXT polaristools.online
dig TXT resend._domainkey.polaristools.online
dig TXT _dmarc.polaristools.online
dig MX polaristools.online
```

## 错误处理

### 错误分类

#### 1. 配置错误
- **API Key 无效**: 返回 401 Unauthorized
- **发件人邮箱未验证**: 返回 403 Forbidden
- **服务未启用**: 返回友好提示消息

#### 2. 请求错误
- **收件人邮箱格式无效**: 返回 400 Bad Request
- **主题或内容为空**: 返回 400 Bad Request
- **收件人数量超限**: 返回 400 Bad Request

#### 3. 临时错误（可重试）
- **429 Too Many Requests**: 限流，等待后重试
- **500 Internal Server Error**: 服务器错误，重试
- **503 Service Unavailable**: 服务不可用，重试
- **网络超时**: 重试

#### 4. 永久错误（不可重试）
- **401 Unauthorized**: API Key 无效
- **404 Not Found**: 资源不存在
- **422 Unprocessable Entity**: 邮箱地址无效

### 错误响应格式

```java
public class SendEmailResponse {
    private String id;              // null if failed
    private boolean success;        // false
    private String message;         // 错误描述
    private String errorCode;       // 错误代码（可选）
    private Integer retryCount;     // 重试次数（可选）
}
```

### 日志记录

```java
// 成功日志
log.info("邮件发送成功: id={}, to={}, subject={}, responseTime={}ms", 
    response.getId(), request.getTo(), request.getSubject(), responseTime);

// 重试日志
log.warn("邮件发送失败，正在重试: attempt={}/{}, to={}, error={}", 
    attempt, maxRetries, request.getTo(), e.getMessage());

// 失败日志
log.error("邮件发送失败: to={}, subject={}, error={}, retries={}", 
    request.getTo(), request.getSubject(), e.getMessage(), retryCount, e);

// 配置错误日志
log.error("邮件服务配置错误: {}", errorMessage);
```

## 测试策略

### 单元测试

#### 1. 邮件模板生成测试
- 测试欢迎邮件模板生成
- 测试密码重置邮件模板生成
- 测试邮箱验证邮件模板生成
- 测试登录通知邮件模板生成
- 测试 HTML 特殊字符转义

#### 2. 参数验证测试
- 测试空收件人地址
- 测试无效邮箱格式
- 测试收件人数量超限
- 测试空主题
- 测试空内容

#### 3. 错误处理测试
- 测试可重试错误识别
- 测试不可重试错误识别
- 测试重试次数限制
- 测试指数退避延迟计算

### 集成测试

#### 1. Resend API 交互测试
- 使用 Mock Resend 客户端
- 测试成功发送场景
- 测试失败重试场景
- 测试最大重试次数场景

#### 2. 配置加载测试
- 测试从环境变量加载配置
- 测试配置缺失时的默认值
- 测试服务禁用状态

### 手动测试端点

```java
@RestController
@RequestMapping("/api/test/email")
@Profile("dev")  // 仅在开发环境启用
public class EmailTestController {
    
    @PostMapping("/send-test")
    public ResponseEntity<SendEmailResponse> sendTestEmail(
        @RequestParam String to) {
        
        return ResponseEntity.ok(
            emailService.sendWelcomeEmail(to, "测试用户")
        );
    }
}
```

### 测试配置

使用 JUnit 5 和 Mockito：

```java
@SpringBootTest
@ActiveProfiles("test")
class EmailServiceImplTest {
    
    @Mock
    private Resend resend;
    
    @Mock
    private ResendConfig resendConfig;
    
    @InjectMocks
    private EmailServiceImpl emailService;
    
    @Test
    void testSendEmail_Success() {
        // Given
        when(resendConfig.isEnabled()).thenReturn(true);
        when(resend.emails().send(any()))
            .thenReturn(new CreateEmailResponse("email_123"));
        
        // When
        SendEmailResponse response = emailService.sendSimpleEmail(
            "test@example.com", "Test", "<p>Test</p>");
        
        // Then
        assertTrue(response.isSuccess());
        assertEquals("email_123", response.getId());
    }
    
    @Test
    void testSendEmail_RetryOnTransientError() {
        // Given
        when(resendConfig.isEnabled()).thenReturn(true);
        when(resendConfig.getMaxRetries()).thenReturn(3);
        when(resend.emails().send(any()))
            .thenThrow(new ResendException("429 Too Many Requests"))
            .thenThrow(new ResendException("503 Service Unavailable"))
            .thenReturn(new CreateEmailResponse("email_123"));
        
        // When
        SendEmailResponse response = emailService.sendSimpleEmail(
            "test@example.com", "Test", "<p>Test</p>");
        
        // Then
        assertTrue(response.isSuccess());
        verify(resend.emails(), times(3)).send(any());
    }
}
```



## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 邮件模板完整性

*对于任何*邮件模板类型和变量集合，生成的 HTML 内容应该：
- 包含 "Polaris Tools" 品牌标识
- 包含公司信息和页脚
- 正确转义所有 HTML 特殊字符（<, >, &, ", '）
- 正确替换所有提供的模板变量

**验证需求: 4.2, 4.3, 4.4, 4.6**

### 属性 2: 纯文本备用版本

*对于任何*邮件模板类型，系统应该能够生成对应的纯文本版本，且纯文本版本应包含与 HTML 版本相同的核心信息（用户名、链接、验证码等）

**验证需求: 4.5**

### 属性 3: 批量收件人处理

*对于任何*收件人列表（1 到 50 个有效邮箱地址），系统应该能够成功构建邮件请求，且当收件人数量超过 50 时应该返回验证错误

**验证需求: 5.3**

### 属性 4: 邮件发送日志完整性

*对于任何*邮件发送操作（成功或失败），系统应该记录包含以下信息的日志：
- 邮件 ID（如果成功）
- 收件人列表
- 邮件主题
- 发送时间戳
- 响应时间（毫秒）
- 状态（成功/失败）
- 错误详情（如果失败）

**验证需求: 6.1, 6.2, 6.4**

### 属性 5: 审计日志记录

*对于任何*管理员发送的邮件，系统应该创建一条审计日志记录，包含发送者 ID、收件人、主题、状态和时间戳

**验证需求: 5.6**

### 属性 6: 临时错误重试机制

*对于任何*临时错误（429、500、503、超时），系统应该：
- 自动重试最多 3 次
- 在重试之间使用指数退避延迟（1 秒、2 秒、4 秒）
- 记录每次重试尝试
- 在所有重试失败后返回错误响应

**验证需求: 8.1, 8.3**

### 属性 7: 无效邮箱地址验证

*对于任何*无效格式的邮箱地址（缺少 @、无效域名、特殊字符等），系统应该在发送前验证并返回明确的验证错误消息

**验证需求: 8.5**

### 属性 8: 统一错误响应格式

*对于任何*邮件发送错误（ResendException、验证错误、配置错误），系统应该返回统一格式的 SendEmailResponse，包含 success=false、错误消息和错误代码

**验证需求: 5.5, 8.6**

### 属性 9: 用户限流保护

*对于任何*用户，当在 1 秒内发送超过 5 封邮件时，系统应该拒绝后续请求并返回限流错误消息

**验证需求: 10.2**

### 属性 10: 配额监控和警告

*对于任何*时间段，系统应该准确记录邮件发送数量，并在达到配置的配额阈值（如 80%）时记录警告日志

**验证需求: 10.1**

### 属性 11: 环境变量配置加载

*对于任何*有效的环境变量配置（RESEND_API_KEY、RESEND_FROM_EMAIL、RESEND_ENABLED），系统应该正确加载这些值到 ResendConfig Bean 中

**验证需求: 3.1, 3.2, 3.3, 9.2**

## 测试策略（续）

### 属性测试配置

本项目使用 JUnit 5 和 Mockito 进行单元测试和集成测试。每个正确性属性都应该通过属性测试（Property-Based Testing）进行验证，使用随机生成的输入数据运行至少 100 次迭代。

#### 属性测试库

Java 生态系统中推荐使用 **jqwik** 作为属性测试库：

```xml
<dependency>
    <groupId>net.jqwik</groupId>
    <artifactId>jqwik</artifactId>
    <version>1.8.2</version>
    <scope>test</scope>
</dependency>
```

#### 属性测试示例

```java
@Property
@Label("Feature: resend-email-integration, Property 1: 邮件模板完整性")
void emailTemplateIntegrity(
    @ForAll EmailTemplateType templateType,
    @ForAll("validTemplateVariables") Map<String, Object> variables) {
    
    // When
    String htmlContent = emailService.generateEmailContent(templateType, variables);
    
    // Then
    assertThat(htmlContent).contains("Polaris Tools");
    assertThat(htmlContent).contains("© 2024 Polaris Tools");
    
    // 验证 HTML 特殊字符转义
    if (variables.containsKey("username")) {
        String username = (String) variables.get("username");
        if (username.contains("<") || username.contains(">")) {
            assertThat(htmlContent).doesNotContain("<script>");
            assertThat(htmlContent).contains("&lt;").or().contains("&gt;");
        }
    }
}

@Property
@Label("Feature: resend-email-integration, Property 6: 临时错误重试机制")
void temporaryErrorRetryMechanism(
    @ForAll("retryableErrors") ResendException error) {
    
    // Given
    when(resend.emails().send(any()))
        .thenThrow(error)
        .thenThrow(error)
        .thenReturn(new CreateEmailResponse("email_123"));
    
    // When
    long startTime = System.currentTimeMillis();
    SendEmailResponse response = emailService.sendSimpleEmail(
        "test@example.com", "Test", "<p>Test</p>");
    long duration = System.currentTimeMillis() - startTime;
    
    // Then
    assertTrue(response.isSuccess());
    verify(resend.emails(), times(3)).send(any());
    
    // 验证指数退避延迟: 1s + 2s = 3s (允许误差 500ms)
    assertThat(duration).isGreaterThanOrEqualTo(3000);
    assertThat(duration).isLessThan(4000);
}

@Property
@Label("Feature: resend-email-integration, Property 7: 无效邮箱地址验证")
void invalidEmailAddressValidation(
    @ForAll("invalidEmails") String invalidEmail) {
    
    // When
    SendEmailRequest request = SendEmailRequest.builder()
        .to(List.of(invalidEmail))
        .subject("Test")
        .html("<p>Test</p>")
        .build();
    
    SendEmailResponse response = emailService.sendEmail(request);
    
    // Then
    assertFalse(response.isSuccess());
    assertThat(response.getMessage()).containsIgnoringCase("invalid");
    assertThat(response.getMessage()).containsIgnoringCase("email");
}

// 数据生成器
@Provide
Arbitrary<Map<String, Object>> validTemplateVariables() {
    return Arbitraries.maps(
        Arbitraries.of("username", "resetLink", "verificationCode", 
                       "loginTime", "ipAddress", "device"),
        Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(50)
    );
}

@Provide
Arbitrary<ResendException> retryableErrors() {
    return Arbitraries.of(
        new ResendException("429 Too Many Requests"),
        new ResendException("500 Internal Server Error"),
        new ResendException("503 Service Unavailable"),
        new ResendException("Connection timeout")
    );
}

@Provide
Arbitrary<String> invalidEmails() {
    return Arbitraries.oneOf(
        Arbitraries.strings().withoutChars('@'),  // 缺少 @
        Arbitraries.just("test@"),                 // 缺少域名
        Arbitraries.just("@example.com"),          // 缺少用户名
        Arbitraries.just("test@@example.com"),     // 双 @
        Arbitraries.just("test@.com"),             // 无效域名
        Arbitraries.just("test@example"),          // 缺少顶级域名
        Arbitraries.strings().withChars(' ', '\t', '\n') // 包含空白字符
    );
}
```

### 单元测试和属性测试的互补性

- **单元测试**: 验证特定示例、边界情况和错误条件
  - 测试空收件人列表
  - 测试正好 50 个收件人
  - 测试 51 个收件人（超限）
  - 测试服务禁用状态
  - 测试 API Key 无效

- **属性测试**: 验证通用属性在所有输入下的正确性
  - 使用随机生成的邮件模板变量
  - 使用随机生成的收件人数量（1-100）
  - 使用随机生成的无效邮箱地址
  - 使用随机生成的错误类型

两者结合可以提供全面的测试覆盖，单元测试捕获具体的 bug，属性测试验证通用的正确性。

### 测试运行配置

在 Maven 配置中，确保属性测试运行足够的迭代次数：

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <version>3.0.0</version>
    <configuration>
        <systemPropertyVariables>
            <jqwik.tries.default>100</jqwik.tries.default>
        </systemPropertyVariables>
    </configuration>
</plugin>
```

## 部署清单

### 1. 前置准备

- [ ] 注册 Resend 账户并获取 API Key
- [ ] 在 Resend Dashboard 添加域名 polaristools.online
- [ ] 准备 DNS 提供商的访问权限

### 2. DNS 配置

- [ ] 添加 SPF TXT 记录
- [ ] 添加 DKIM TXT 记录
- [ ] 添加 DMARC TXT 记录（可选但推荐）
- [ ] 添加 MX 记录（用于接收退信）
- [ ] 等待 DNS 传播（5-30 分钟）
- [ ] 在 Resend Dashboard 验证域名

### 3. 环境变量配置

生产环境需要配置以下环境变量：

```bash
# 必需
export RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxx"

# 可选（有默认值）
export RESEND_FROM_EMAIL="noreply@polaristools.online"
export RESEND_ENABLED="true"
```

### 4. 应用配置

确保 `application-prod.yml` 包含正确的配置：

```yaml
resend:
  api-key: ${RESEND_API_KEY}
  from-email: ${RESEND_FROM_EMAIL:noreply@polaristools.online}
  enabled: ${RESEND_ENABLED:true}
  max-retries: 3
  initial-retry-delay: 1000
  max-recipients-per-email: 50
```

### 5. 冒烟测试

部署后执行以下测试：

```bash
# 1. 测试配置加载
curl -X GET https://polaristools.online/api/health

# 2. 测试邮件发送（需要管理员权限）
curl -X POST https://polaristools.online/api/admin/email/send \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["admin@polaristools.online"],
    "subject": "部署测试",
    "html": "<p>这是一封测试邮件，验证 Resend 集成是否正常工作。</p>"
  }'

# 3. 检查邮件是否收到
# 4. 检查 Resend Dashboard 中的发送记录
```

### 6. 监控和日志

- [ ] 配置日志聚合（如 ELK、Splunk）
- [ ] 设置邮件发送失败告警
- [ ] 监控 Resend Dashboard 中的送达率
- [ ] 设置配额使用告警（达到 80% 时）

### 7. 回滚方案

如果部署出现问题：

1. **禁用邮件服务**:
   ```bash
   export RESEND_ENABLED="false"
   ```
   重启应用，邮件服务将被禁用但不影响其他功能

2. **回滚到上一个版本**:
   ```bash
   kubectl rollout undo deployment/polaris-backend
   ```

3. **检查日志**:
   ```bash
   kubectl logs -f deployment/polaris-backend | grep EmailService
   ```

### 8. 验证清单

- [ ] 域名在 Resend Dashboard 显示为 "Verified"
- [ ] 测试邮件成功发送并收到
- [ ] 邮件未被标记为垃圾邮件
- [ ] 日志正确记录发送活动
- [ ] 错误处理和重试机制正常工作
- [ ] 管理员邮件发送 API 正常工作
- [ ] 限流机制正常工作

## 安全考虑

### 1. API Key 保护

- API Key 必须存储在环境变量中，不得硬编码
- 使用密钥管理服务（如 AWS Secrets Manager、HashiCorp Vault）
- 定期轮换 API Key
- 限制 API Key 的权限范围

### 2. 邮件内容安全

- 所有用户输入必须进行 HTML 转义
- 防止邮件注入攻击
- 验证所有邮箱地址格式
- 限制邮件内容大小

### 3. 限流和防滥用

- 实施用户级别的限流
- 实施 IP 级别的限流
- 监控异常发送模式
- 设置每日发送配额

### 4. 审计和合规

- 记录所有邮件发送活动
- 保留审计日志至少 90 天
- 提供取消订阅机制
- 遵守 GDPR、CAN-SPAM 等法规

## 性能优化

### 1. 异步发送

对于非关键邮件（如欢迎邮件、通知），使用异步发送：

```java
@Async
public CompletableFuture<SendEmailResponse> sendEmailAsync(SendEmailRequest request) {
    return CompletableFuture.completedFuture(sendEmail(request));
}
```

### 2. 批量发送

对于批量通知，使用 Resend 的批量发送 API：

```java
public List<SendEmailResponse> sendBulkEmails(List<SendEmailRequest> requests) {
    // 分批发送，每批最多 50 个
    return requests.stream()
        .collect(Collectors.groupingBy(it -> requests.indexOf(it) / 50))
        .values()
        .stream()
        .flatMap(batch -> sendBatch(batch).stream())
        .collect(Collectors.toList());
}
```

### 3. 缓存模板

缓存编译后的邮件模板以提高性能：

```java
@Cacheable("emailTemplates")
public String getCompiledTemplate(EmailTemplateType type) {
    // 返回编译后的模板
}
```

### 4. 连接池

Resend Java SDK 内部使用 HTTP 客户端，确保配置合理的连接池：

```java
@Bean
public Resend resend() {
    // Resend SDK 会自动管理连接池
    return new Resend(apiKey);
}
```

## 故障排查

### 常见问题

#### 1. 邮件未收到

**可能原因**:
- DNS 记录未正确配置
- 域名未验证
- 邮件被标记为垃圾邮件
- API Key 无效

**排查步骤**:
1. 检查 Resend Dashboard 中的域名验证状态
2. 使用 `dig` 命令验证 DNS 记录
3. 检查应用日志中的错误信息
4. 在 Resend Dashboard 查看邮件发送历史

#### 2. 邮件发送失败

**可能原因**:
- 收件人邮箱地址无效
- 达到发送配额限制
- API Key 权限不足
- 网络连接问题

**排查步骤**:
1. 检查错误日志中的具体错误消息
2. 验证收件人邮箱地址格式
3. 检查 Resend Dashboard 中的配额使用情况
4. 测试网络连接到 Resend API

#### 3. 重试机制不工作

**可能原因**:
- 错误类型判断不正确
- 重试配置错误
- 线程被阻塞

**排查步骤**:
1. 检查日志中的重试记录
2. 验证 `isRetryableError` 方法的逻辑
3. 检查 `maxRetries` 和 `initialRetryDelay` 配置
4. 使用调试器跟踪重试流程

## 参考资料

### 官方文档

- [Resend 官方文档](https://resend.com/docs)
- [Resend Java SDK](https://github.com/resend/resend-java)
- [Resend 域名验证指南](https://resend.com/docs/dashboard/domains/introduction)
- [SPF 记录说明](https://www.cloudflare.com/learning/dns/dns-records/dns-spf-record/)
- [DKIM 记录说明](https://www.cloudflare.com/learning/dns/dns-records/dns-dkim-record/)
- [DMARC 记录说明](https://www.cloudflare.com/learning/dns/dns-records/dns-dmarc-record/)

### 最佳实践

- [邮件送达率最佳实践](https://resend.com/docs/knowledge-base/deliverability-best-practices)
- [Java 重试机制最佳实践](https://www.baeldung.com/resilience4j)
- [Spring Boot 邮件服务配置](https://spring.io/guides/gs/sending-email/)

### 工具

- [DNS 检查工具](https://mxtoolbox.com/)
- [邮件测试工具](https://www.mail-tester.com/)
- [SPF 记录生成器](https://www.spfwizard.net/)
