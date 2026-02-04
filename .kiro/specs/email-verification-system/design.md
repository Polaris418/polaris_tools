# 邮件验证系统设计文档

## 1. 系统架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 注册页面 │  │ 登录页面 │  │ 重置密码 │  │ 修改邮箱 │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                      控制器层 (Controller)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AuthController  │  EmailVerificationController      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      服务层 (Service)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │VerificationCode│  │EmailService │  │RateLimiter  │     │
│  │   Service     │  │             │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    数据访问层 (Mapper)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  VerificationCodeMapper  │  VerificationLogMapper    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      数据存储层                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  MySQL   │  │  Redis   │  │ AWS SES  │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心组件

#### 1.2.1 VerificationCodeService
- 职责：验证码生成、验证、管理
- 主要方法：
  - `generateCode(email, purpose)`: 生成验证码
  - `verifyCode(email, code, purpose)`: 验证验证码
  - `invalidateCode(email, purpose)`: 使验证码失效

#### 1.2.2 EmailService
- 职责：邮件发送、模板管理
- 主要方法：
  - `sendVerificationCode(email, code, purpose, language)`: 发送验证码邮件
  - `sendNotification(email, subject, content)`: 发送通知邮件

#### 1.2.3 RateLimiterService
- 职责：限流控制、防滥用
- 主要方法：
  - `checkEmailRateLimit(email)`: 检查邮箱级限流
  - `checkIpRateLimit(ip)`: 检查 IP 级限流
  - `recordAttempt(email, ip)`: 记录尝试次数

## 2. 数据库设计

### 2.1 email_verification_code 表

```sql
CREATE TABLE email_verification_code (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    code_hash VARCHAR(64) NOT NULL COMMENT '验证码哈希值(SHA-256)',
    email VARCHAR(255) NOT NULL COMMENT '邮箱地址',
    purpose VARCHAR(20) NOT NULL COMMENT '用途: register/login/reset/verify/change',
    expires_at DATETIME NOT NULL COMMENT '过期时间',
    used TINYINT DEFAULT 0 COMMENT '是否已使用: 0-未使用, 1-已使用',
    used_at DATETIME COMMENT '使用时间',
    fail_count INT DEFAULT 0 COMMENT '验证失败次数',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '软删除标记: 0-未删除, 1-已删除',
    
    INDEX idx_email_purpose (email, purpose),
    INDEX idx_expires_at (expires_at),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邮件验证码表';
```


### 2.2 email_verification_log 表

```sql
CREATE TABLE email_verification_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    email VARCHAR(255) NOT NULL COMMENT '邮箱地址',
    purpose VARCHAR(20) NOT NULL COMMENT '用途',
    action VARCHAR(20) NOT NULL COMMENT '操作: send/verify/fail',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent VARCHAR(500) COMMENT '用户代理',
    success TINYINT DEFAULT 0 COMMENT '是否成功: 0-失败, 1-成功',
    error_message VARCHAR(500) COMMENT '错误信息',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    INDEX idx_email (email),
    INDEX idx_created_at (created_at),
    INDEX idx_ip_address (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邮件验证日志表';
```

## 3. API 设计

### 3.1 注册相关 API

#### 3.1.1 发送注册验证码

**端点**: `POST /api/auth/register/send-code`

**请求体**:
```json
{
  "email": "user@example.com"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "验证码已发送",
  "data": {
    "cooldownSeconds": 60,
    "expiresIn": 600
  }
}
```

#### 3.1.2 验证注册

**端点**: `POST /api/auth/register/verify`

**请求体**:
```json
{
  "email": "user@example.com",
  "code": "123456",
  "username": "testuser",
  "password": "password123",
  "nickname": "Test User"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "user@example.com",
      "emailVerified": true
    }
  }
}
```

### 3.2 登录相关 API

#### 3.2.1 发送登录验证码

**端点**: `POST /api/auth/login/send-code`

**请求体**:
```json
{
  "email": "user@example.com"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "验证码已发送",
  "data": {
    "cooldownSeconds": 60,
    "expiresIn": 600
  }
}
```

#### 3.2.2 验证码登录

**端点**: `POST /api/auth/login/verify-code`

**请求体**:
```json
{
  "email": "user@example.com",
  "code": "123456",
  "rememberMe": true
}
```

**响应**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "user@example.com"
    }
  }
}
```

### 3.3 密码重置相关 API

#### 3.3.1 发送密码重置验证码

**端点**: `POST /api/auth/password/send-reset-code`

**请求体**:
```json
{
  "email": "user@example.com"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "验证码已发送",
  "data": {
    "cooldownSeconds": 60,
    "expiresIn": 600
  }
}
```

#### 3.3.2 验证重置验证码

**端点**: `POST /api/auth/password/verify-code`

**请求体**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "验证成功",
  "data": {
    "resetToken": "temp_token_12345",
    "expiresIn": 300
  }
}
```

#### 3.3.3 重置密码

**端点**: `POST /api/auth/password/reset`

**请求体**:
```json
{
  "resetToken": "temp_token_12345",
  "newPassword": "newpassword123"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "密码重置成功",
  "data": null
}
```

### 3.4 邮箱修改相关 API

#### 3.4.1 发送邮箱修改验证码

**端点**: `POST /api/user/email/send-change-code`

**请求头**: `Authorization: Bearer {token}`

**请求体**:
```json
{
  "newEmail": "newemail@example.com",
  "password": "currentpassword"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "验证码已发送到新邮箱",
  "data": {
    "cooldownSeconds": 60,
    "expiresIn": 600
  }
}
```

#### 3.4.2 验证邮箱修改

**端点**: `POST /api/user/email/verify-change`

**请求头**: `Authorization: Bearer {token}`

**请求体**:
```json
{
  "newEmail": "newemail@example.com",
  "code": "123456"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "邮箱修改成功",
  "data": null
}
```

## 4. 核心流程设计

### 4.1 验证码生成流程

```
用户请求发送验证码
    ↓
检查邮箱格式
    ↓
检查限流（邮箱级 + IP级）
    ↓
检查业务规则（如邮箱是否已注册）
    ↓
生成6位随机数字验证码
    ↓
计算验证码的SHA-256哈希值
    ↓
使旧验证码失效（同邮箱同用途）
    ↓
保存验证码到数据库
    ↓
选择邮件模板（根据用途和语言）
    ↓
发送验证码邮件（AWS SES）
    ↓
记录发送日志
    ↓
返回成功响应（包含冷却时间）
```

### 4.2 验证码验证流程

```
用户提交验证码
    ↓
检查验证码格式（6位数字）
    ↓
计算提交验证码的哈希值
    ↓
查询数据库匹配验证码
    ↓
验证码不存在？ → 返回错误
    ↓
验证码已过期？ → 返回错误
    ↓
验证码已使用？ → 返回错误
    ↓
验证码用途匹配？ → 不匹配返回错误
    ↓
验证码失败次数 >= 5？ → 返回错误
    ↓
哈希值匹配？ → 不匹配增加失败次数，返回错误
    ↓
标记验证码为已使用
    ↓
记录验证日志
    ↓
执行业务逻辑（注册/登录/重置密码等）
    ↓
返回成功响应
```

### 4.3 用户注册流程（验证码方式）

```
用户访问注册页面
    ↓
输入邮箱地址
    ↓
点击"发送验证码"
    ↓
前端调用 /api/auth/register/send-code
    ↓
后端生成并发送验证码
    ↓
前端显示验证码输入框和倒计时
    ↓
用户输入验证码、用户名、密码等信息
    ↓
前端调用 /api/auth/register/verify
    ↓
后端验证验证码
    ↓
验证成功 → 创建用户账户
    ↓
标记邮箱为已验证
    ↓
生成JWT Token
    ↓
返回Token和用户信息
    ↓
前端保存Token并跳转到首页
```

### 4.4 验证码登录流程

```
用户访问登录页面
    ↓
选择"验证码登录"
    ↓
输入邮箱地址
    ↓
点击"发送验证码"
    ↓
前端调用 /api/auth/login/send-code
    ↓
后端验证邮箱是否已注册
    ↓
生成并发送验证码
    ↓
前端显示验证码输入框和倒计时
    ↓
用户输入验证码
    ↓
前端调用 /api/auth/login/verify-code
    ↓
后端验证验证码
    ↓
验证成功 → 生成JWT Token
    ↓
更新最后登录时间
    ↓
返回Token和用户信息
    ↓
前端保存Token并跳转到首页
```

## 5. 安全设计

### 5.1 验证码安全

1. **哈希存储**: 使用 SHA-256 + 盐值存储验证码
2. **有效期限制**: 验证码有效期 10 分钟
3. **失败次数限制**: 验证失败 5 次后验证码失效
4. **一次性使用**: 验证码使用后立即失效
5. **常量时间比较**: 防止时序攻击

### 5.2 限流策略

#### 5.2.1 邮箱级限流
- 60 秒内最多发送 1 次验证码
- 每日最多发送 10 次验证码
- 验证失败 10 次后临时封禁 1 小时

#### 5.2.2 IP 级限流
- 60 秒内最多发送 3 次验证码请求
- 每日最多发送 20 次验证码请求

#### 5.2.3 限流实现
使用 Redis 存储限流计数器：
```
Key: rate_limit:email:{email}:{purpose}
Value: 发送次数
TTL: 60秒 或 24小时

Key: rate_limit:ip:{ip}
Value: 发送次数
TTL: 60秒 或 24小时
```

### 5.3 防暴力破解

1. **验证码复杂度**: 6 位数字，共 1,000,000 种组合
2. **失败次数限制**: 5 次失败后验证码失效
3. **时间窗口**: 10 分钟有效期
4. **IP 封禁**: 异常行为自动封禁 IP
5. **日志审计**: 记录所有验证尝试

### 5.4 数据安全

1. **传输加密**: 使用 HTTPS
2. **存储加密**: 验证码哈希存储
3. **日志脱敏**: 日志中不记录明文验证码
4. **权限控制**: API 需要适当的认证授权

## 6. 邮件模板设计

### 6.1 注册验证码邮件模板（中文）

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>注册验证码 - Polaris Tools</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #4F46E5; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Polaris Tools</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #1F2937; margin: 0 0 20px 0; font-size: 20px;">欢迎注册 Polaris Tools</h2>
                            <p style="color: #6B7280; line-height: 1.6; margin: 0 0 30px 0;">
                                您正在注册 Polaris Tools 账户，请使用以下验证码完成注册：
                            </p>
                            
                            <!-- Verification Code -->
                            <div style="background-color: #F3F4F6; border-radius: 8px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
                                <div style="font-size: 36px; font-weight: bold; color: #4F46E5; letter-spacing: 8px;">
                                    ${code}
                                </div>
                                <p style="color: #6B7280; margin: 15px 0 0 0; font-size: 14px;">
                                    验证码有效期：10 分钟
                                </p>
                            </div>
                            
                            <!-- Security Notice -->
                            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 0 0 20px 0;">
                                <p style="color: #92400E; margin: 0; font-size: 14px;">
                                    <strong>安全提示：</strong>如果这不是您的操作，请忽略此邮件。
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
                            <p style="color: #9CA3AF; margin: 0; font-size: 12px;">
                                此邮件由 Polaris Tools 自动发送，请勿回复。<br>
                                如有问题，请联系 <a href="mailto:support@polaristools.online" style="color: #4F46E5;">support@polaristools.online</a>
                            </p>
                            <p style="color: #9CA3AF; margin: 10px 0 0 0; font-size: 12px;">
                                &copy; 2024 Polaris Tools. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

### 6.2 登录验证码邮件模板（中文）

类似注册模板，主要内容改为：
```
您正在登录 Polaris Tools 账户，请使用以下验证码完成登录：
```

### 6.3 密码重置验证码邮件模板（中文）

类似注册模板，主要内容改为：
```
您正在重置 Polaris Tools 账户密码，请使用以下验证码继续操作：
```

## 7. 错误处理

### 7.1 错误码定义

```java
public enum VerificationErrorCode {
    // 验证码相关错误 (4001-4099)
    CODE_INVALID(4001, "验证码无效"),
    CODE_EXPIRED(4002, "验证码已过期"),
    CODE_USED(4003, "验证码已使用"),
    CODE_FAILED_TOO_MANY(4004, "验证失败次数过多，验证码已失效"),
    CODE_PURPOSE_MISMATCH(4005, "验证码用途不匹配"),
    
    // 限流相关错误 (4291-4299)
    RATE_LIMIT_EMAIL(4291, "发送过于频繁，请{seconds}秒后再试"),
    RATE_LIMIT_IP(4292, "请求过于频繁，请稍后再试"),
    RATE_LIMIT_DAILY(4293, "今日发送次数已达上限"),
    EMAIL_BLOCKED(4294, "该邮箱已被临时封禁"),
    
    // 业务相关错误 (4001-4099)
    EMAIL_ALREADY_REGISTERED(4011, "该邮箱已注册"),
    EMAIL_NOT_REGISTERED(4012, "该邮箱未注册"),
    EMAIL_FORMAT_INVALID(4013, "邮箱格式无效"),
    
    // 系统错误 (5001-5099)
    EMAIL_SEND_FAILED(5001, "邮件发送失败"),
    CODE_GENERATE_FAILED(5002, "验证码生成失败");
}
```

### 7.2 错误响应格式

```json
{
  "code": 4001,
  "message": "验证码无效",
  "data": null,
  "timestamp": "2024-02-02T10:30:00Z"
}
```

## 8. 性能优化

### 8.1 缓存策略

1. **验证码缓存**: Redis 存储验证码，减少数据库查询
2. **限流计数器**: Redis 存储限流计数器
3. **邮件模板缓存**: 内存缓存邮件模板
4. **用户信息缓存**: Redis 缓存用户基本信息

### 8.2 异步处理

1. **邮件发送**: 使用异步队列发送邮件
2. **日志记录**: 异步记录验证日志
3. **统计更新**: 异步更新统计数据

### 8.3 数据库优化

1. **索引优化**: 在 email + purpose 字段上创建联合索引
2. **分区表**: 按时间分区存储日志数据
3. **定期清理**: 定时任务清理过期数据

## 9. 监控和告警

### 9.1 监控指标

1. **验证码发送成功率**: 目标 > 95%
2. **验证码验证成功率**: 目标 > 90%
3. **邮件送达率**: 目标 > 95%
4. **API 响应时间**: P95 < 500ms
5. **限流触发次数**: 监控异常流量
6. **验证失败率**: 监控暴力破解尝试

### 9.2 告警规则

1. **验证码发送失败率 > 5%**: 立即告警
2. **验证码验证失败率 > 30%**: 立即告警
3. **限流触发次数异常增长**: 立即告警
4. **邮件发送队列积压 > 1000**: 告警
5. **Redis 连接失败**: 立即告警

## 10. 部署方案

### 10.1 环境配置

```yaml
# application.yml
verification:
  code:
    length: 6
    expiry-minutes: 10
    max-fail-count: 5
  rate-limit:
    email-cooldown-seconds: 60
    email-daily-limit: 10
    ip-cooldown-seconds: 60
    ip-daily-limit: 20
  email:
    from: noreply@polaristools.online
    templates:
      register: verification-code-register
      login: verification-code-login
      reset: verification-code-reset
      change: verification-code-change
```

### 10.2 数据库迁移

使用 Flyway 管理数据库迁移：

```sql
-- V2.1__create_verification_code_table.sql
CREATE TABLE email_verification_code (...);

-- V2.2__create_verification_log_table.sql
CREATE TABLE email_verification_log (...);
```

### 10.3 Redis 配置

```yaml
spring:
  redis:
    host: localhost
    port: 6379
    database: 0
    timeout: 3000ms
    lettuce:
      pool:
        max-active: 8
        max-idle: 8
        min-idle: 0
```

## 11. 测试策略

### 11.1 单元测试

- VerificationCodeService 测试
- RateLimiterService 测试
- 哈希算法测试
- 验证逻辑测试

### 11.2 集成测试

- 完整注册流程测试
- 完整登录流程测试
- 限流机制测试
- 邮件发送测试

### 11.3 性能测试

- 并发验证码生成测试（1000 TPS）
- 并发验证码验证测试（1000 TPS）
- Redis 性能测试
- 数据库性能测试

## 12. 迁移计划

### 12.1 阶段一：基础设施（第 1-2 周）
- 创建数据库表
- 实现验证码生成和存储
- 实现限流机制
- 实现邮件模板

### 12.2 阶段二：核心功能（第 3-4 周）
- 实现注册验证码功能
- 实现登录验证码功能
- 实现密码重置功能
- 实现邮箱修改功能

### 12.3 阶段三：测试和优化（第 5-6 周）
- 单元测试和集成测试
- 性能测试和优化
- 安全测试
- 文档编写

### 12.4 阶段四：上线和监控（第 7 周）
- 灰度发布
- 监控和告警配置
- 用户反馈收集
- 问题修复和优化
