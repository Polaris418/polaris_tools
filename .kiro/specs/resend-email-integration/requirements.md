# 需求文档

## 介绍

本文档定义了 Polaris Tools 项目集成 Resend 邮件服务的需求。项目已有基础的邮件服务代码（EmailService、EmailServiceImpl、ResendConfig），需要完成域名配置、DNS 设置、功能完善和测试验证，以实现生产环境的邮件发送能力。

## 术语表

- **Resend**: 现代化的邮件发送服务提供商
- **SPF (Sender Policy Framework)**: 发件人策略框架，用于验证邮件发送者身份的 DNS 记录
- **DKIM (DomainKeys Identified Mail)**: 域名密钥识别邮件，用于验证邮件完整性的加密签名机制
- **DMARC (Domain-based Message Authentication, Reporting & Conformance)**: 基于域的消息认证、报告和一致性协议
- **EmailService**: 邮件服务接口，定义邮件发送的核心方法
- **EmailServiceImpl**: 邮件服务实现类，基于 Resend SDK 实现邮件发送
- **ResendConfig**: Resend 配置类，管理 API Key 和发件人信息
- **Domain_Verification**: 域名验证过程，确保域名所有权并提高邮件送达率
- **Email_Template**: 邮件模板，包括欢迎邮件、密码重置、邮箱验证、登录通知等预定义格式

## 需求

### 需求 1: 域名配置和验证

**用户故事:** 作为系统管理员，我需要在 Resend 中配置和验证 polaristools.online 域名，以便系统能够使用该域名发送邮件。

#### 验收标准

1. WHEN 管理员在 Resend Dashboard 添加域名 THEN THE System SHALL 提供 DNS 验证记录（SPF、DKIM、DMARC）
2. WHEN DNS 记录正确配置 THEN THE Resend_Platform SHALL 验证域名所有权并标记为已验证状态
3. THE System SHALL 使用子域名 noreply@polaristools.online 作为默认发件人地址
4. WHEN 域名验证失败 THEN THE System SHALL 记录错误日志并提供诊断信息
5. THE System SHALL 在配置文件中存储已验证的发件人邮箱地址

### 需求 2: DNS 记录配置

**用户故事:** 作为系统管理员，我需要配置正确的 DNS 记录（SPF、DKIM、DMARC），以确保邮件能够通过反垃圾邮件验证并提高送达率。

#### 验收标准

1. THE System SHALL 要求配置 SPF 记录以授权 Resend 服务器代表域名发送邮件
2. THE System SHALL 要求配置 DKIM 记录以对发送的邮件进行数字签名
3. THE System SHALL 要求配置 DMARC 记录以定义邮件认证失败时的处理策略
4. WHEN DNS 记录配置完成 THEN THE System SHALL 在 Resend Dashboard 中显示验证通过状态
5. THE System SHALL 提供 DNS 记录配置的详细文档和示例

### 需求 3: 环境变量和配置管理

**用户故事:** 作为开发人员，我需要通过环境变量管理 Resend API Key 和邮件配置，以便在不同环境（开发、测试、生产）中灵活切换配置。

#### 验收标准

1. THE System SHALL 从环境变量 RESEND_API_KEY 读取 Resend API 密钥
2. THE System SHALL 从环境变量 RESEND_FROM_EMAIL 读取发件人邮箱地址
3. THE System SHALL 从环境变量 RESEND_ENABLED 读取邮件服务启用状态（默认为 true）
4. WHEN 必需的环境变量缺失 THEN THE System SHALL 在启动时记录警告并禁用邮件服务
5. THE System SHALL 支持在 application.yml 和 application-prod.yml 中配置邮件参数
6. THE System SHALL 在开发环境中支持禁用邮件发送以避免误发

### 需求 4: 邮件模板完善

**用户故事:** 作为产品经理，我需要完善的邮件模板（欢迎邮件、密码重置、邮箱验证、登录通知），以提供专业的用户体验。

#### 验收标准

1. THE System SHALL 提供响应式 HTML 邮件模板，在桌面和移动设备上均能正常显示
2. THE System SHALL 在所有邮件模板中包含 Polaris Tools 品牌标识和统一的视觉风格
3. THE System SHALL 在邮件底部包含取消订阅链接和公司信息
4. WHEN 生成邮件内容 THEN THE System SHALL 正确转义 HTML 特殊字符以防止注入攻击
5. THE System SHALL 为每种邮件类型提供纯文本备用版本以支持不支持 HTML 的邮件客户端
6. THE System SHALL 在邮件模板中使用可配置的变量（用户名、链接、验证码等）

### 需求 5: 管理员邮件发送功能

**用户故事:** 作为系统管理员，我需要通过管理后台发送自定义邮件给用户，以便进行系统通知、营销活动或重要公告。

#### 验收标准

1. THE System SHALL 提供管理员邮件发送 API 端点接受 AdminSendEmailRequest 请求
2. WHEN 管理员发送邮件 THEN THE System SHALL 验证管理员权限
3. THE System SHALL 支持批量发送邮件给多个收件人（最多 50 个）
4. THE System SHALL 支持抄送（CC）和密送（BCC）功能
5. WHEN 邮件发送失败 THEN THE System SHALL 记录详细错误日志并返回失败原因
6. THE System SHALL 记录所有管理员发送的邮件到审计日志

### 需求 6: 邮件发送监控和日志

**用户故事:** 作为运维人员，我需要监控邮件发送状态和查看详细日志，以便及时发现和解决邮件发送问题。

#### 验收标准

1. WHEN 邮件发送成功 THEN THE System SHALL 记录邮件 ID、收件人、主题和发送时间到日志
2. WHEN 邮件发送失败 THEN THE System SHALL 记录错误详情、收件人和失败原因到错误日志
3. THE System SHALL 在 Resend Dashboard 中提供邮件发送统计和送达率报告
4. THE System SHALL 记录每次邮件发送的响应时间以监控服务性能
5. WHEN 邮件服务不可用 THEN THE System SHALL 记录警告日志并返回友好的错误消息
6. THE System SHALL 提供邮件发送历史查询接口供管理员使用

### 需求 7: 邮件发送测试

**用户故事:** 作为开发人员，我需要编写单元测试和集成测试验证邮件发送功能，以确保代码质量和功能正确性。

#### 验收标准

1. THE System SHALL 提供单元测试验证邮件模板生成的正确性
2. THE System SHALL 提供单元测试验证邮件发送请求的参数校验
3. THE System SHALL 提供集成测试验证与 Resend API 的交互
4. THE System SHALL 在测试环境中使用 Mock 对象避免实际发送邮件
5. THE System SHALL 提供手动测试端点供开发人员验证邮件发送功能
6. THE System SHALL 在 CI/CD 流程中自动运行邮件服务相关测试

### 需求 8: 错误处理和重试机制

**用户故事:** 作为系统架构师，我需要实现健壮的错误处理和重试机制，以提高邮件发送的可靠性。

#### 验收标准

1. WHEN Resend API 返回临时错误（如 429 限流、503 服务不可用）THEN THE System SHALL 自动重试最多 3 次
2. WHEN 邮件发送失败且重试次数耗尽 THEN THE System SHALL 记录失败详情并返回错误响应
3. THE System SHALL 在重试之间使用指数退避策略（1 秒、2 秒、4 秒）
4. WHEN API Key 无效或过期 THEN THE System SHALL 记录严重错误并通知管理员
5. WHEN 收件人邮箱地址无效 THEN THE System SHALL 返回明确的验证错误消息
6. THE System SHALL 捕获所有 ResendException 并转换为统一的错误响应格式

### 需求 9: 生产环境部署配置

**用户故事:** 作为运维人员，我需要完整的生产环境部署清单和配置指南，以确保邮件服务在生产环境中稳定运行。

#### 验收标准

1. THE System SHALL 提供生产环境部署清单包含所有必需的配置步骤
2. THE System SHALL 在生产环境中使用环境变量存储敏感信息（API Key）
3. THE System SHALL 在生产环境配置文件中启用邮件服务（resend.enabled=true）
4. THE System SHALL 验证生产环境的 DNS 记录配置正确
5. THE System SHALL 在部署前进行邮件发送功能的冒烟测试
6. THE System SHALL 提供回滚方案以应对部署失败情况

### 需求 10: 邮件发送限流和配额管理

**用户故事:** 作为系统管理员，我需要管理邮件发送频率和配额，以避免超出 Resend 服务限制并控制成本。

#### 验收标准

1. THE System SHALL 记录每日邮件发送数量并在接近配额限制时发出警告
2. WHEN 单个用户在短时间内请求多次邮件发送 THEN THE System SHALL 实施限流保护
3. THE System SHALL 在配置中定义每小时最大邮件发送数量
4. WHEN 达到发送限制 THEN THE System SHALL 返回明确的限流错误消息
5. THE System SHALL 提供管理员接口查看当前邮件发送配额使用情况
6. THE System SHALL 在 Resend Dashboard 中监控账户配额和计费状态
