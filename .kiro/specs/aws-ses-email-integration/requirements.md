# 需求文档

## 简介

本文档描述了将 Polaris Tools 项目的邮箱服务从 Resend 迁移到 AWS SES (Simple Email Service) 的功能需求，以及构建完整的业务层邮件管理系统。AWS SES 是一个可扩展、成本效益高的邮件发送服务，支持事务性邮件和营销邮件的发送。

**重要说明 - 架构一致性**: 本规范的实现必须遵循 `backend-refactoring` 规范定义的插件化架构模式。所有实体类应继承 `BaseEntity`，所有 DTO 应继承 `BaseRequest` 和 `BaseResponse`，以保持代码库的一致性和可维护性。

本次迁移和系统建设的主要目标是：
1. 替换现有的 Resend 邮件服务为 AWS SES
2. 保持现有的邮件服务接口不变，确保业务代码无需修改
3. 增强邮件发送的可靠性、可观测性和安全性
4. 实现完整的错误处理、重试机制和审计日志
5. 配置 AWS SES 域名验证和 DNS 记录以提高邮件送达率
6. **遵循 backend-refactoring 架构模式，确保代码一致性**
7. **构建业务层邮件管理系统，包括：**
   - Token 体系（邮箱验证和密码重置）
   - 退信和投诉处理（抑制列表）
   - 用户邮箱状态管理
   - 邮件模板管理系统
   - 异步邮件发送队列
   - 监控和告警系统
   - 订阅和退订管理
   - 多发件人地址支持

**重要说明**: AWS SES 只负责"把邮件发出去 + 回传事件"，但完整的邮件系统还需要业务层的支持，否则会遇到重复发送、收不到/进垃圾箱、无法排查、投诉率上升等问题。本需求文档涵盖了从 MVP 到完善的所有必要功能。

## 术语表

- **AWS_SES**: Amazon Simple Email Service，AWS 提供的邮件发送服务
- **Email_Service**: 邮件服务接口，定义了发送各类邮件的方法
- **SES_Client**: AWS SDK for Java 提供的 SES 客户端，用于与 AWS SES API 交互
- **Domain_Verification**: 域名验证，证明域名所有权以便使用该域名发送邮件
- **SPF_Record**: Sender Policy Framework 记录，DNS 记录类型，用于防止邮件伪造
- **DKIM_Record**: DomainKeys Identified Mail 记录，DNS 记录类型，用于邮件签名验证
- **DMARC_Record**: Domain-based Message Authentication, Reporting & Conformance 记录，DNS 记录类型，用于邮件认证策略
- **Configuration_Set**: AWS SES 配置集，用于跟踪邮件发送事件和指标
- **Email_Audit_Log**: 邮件审计日志，记录所有邮件发送活动的详细信息
- **Rate_Limiter**: 限流器，控制邮件发送速率以避免超出 AWS SES 配额
- **Retry_Policy**: 重试策略，定义邮件发送失败时的重试行为
- **IAM_Role**: AWS Identity and Access Management 角色，用于授予应用程序访问 AWS SES 的权限
- **Sandbox_Mode**: AWS SES 沙箱模式，新账户的默认模式，限制邮件发送到已验证的邮箱地址
- **Production_Access**: AWS SES 生产访问权限，允许向任意邮箱地址发送邮件
- **Token_System**: Token 体系，用于邮箱验证和密码重置的安全令牌管理
- **Suppression_List**: 抑制列表，记录不应发送邮件的邮箱地址（因退信或投诉）
- **Hard_Bounce**: 硬退信，永久性投递失败（如邮箱不存在）
- **Soft_Bounce**: 软退信，临时性投递失败（如邮箱已满）
- **Complaint**: 投诉，收件人将邮件标记为垃圾邮件
- **Template_System**: 模板系统，集中管理邮件模板和支持多语言
- **Queue_System**: 队列系统，异步处理邮件发送请求
- **Monitoring_System**: 监控系统，跟踪邮件发送指标和触发告警
- **Subscription_System**: 订阅系统，管理用户的邮件订阅偏好

## 需求

### 需求 1: AWS SES 客户端配置

**用户故事:** 作为系统管理员，我希望能够配置 AWS SES 客户端连接参数，以便应用程序能够与 AWS SES 服务通信。

#### 验收标准

1. THE Configuration_System SHALL 从配置文件或环境变量读取 AWS 访问密钥 ID
2. THE Configuration_System SHALL 从配置文件或环境变量读取 AWS 秘密访问密钥
3. THE Configuration_System SHALL 从配置文件读取 AWS 区域配置
4. THE Configuration_System SHALL 从配置文件读取发件人邮箱地址
5. THE Configuration_System SHALL 从配置文件读取邮件服务启用/禁用标志
6. WHEN 配置参数缺失或无效时，THEN THE Configuration_System SHALL 抛出明确的配置错误异常
7. THE Configuration_System SHALL 创建并注册 SES_Client Bean 供依赖注入使用

### 需求 2: 基本邮件发送功能

**用户故事:** 作为开发者，我希望能够使用 AWS SES 发送各种类型的邮件，以便向用户传递重要信息。

#### 验收标准

1. WHEN 调用发送邮件方法时，THE Email_Service SHALL 使用 SES_Client 发送邮件
2. WHEN 邮件发送成功时，THEN THE Email_Service SHALL 返回包含消息 ID 的成功响应
3. WHEN 邮件发送失败时，THEN THE Email_Service SHALL 返回包含错误信息的失败响应
4. THE Email_Service SHALL 支持发送 HTML 格式的邮件内容
5. THE Email_Service SHALL 支持发送纯文本格式的邮件内容
6. THE Email_Service SHALL 支持同时发送 HTML 和纯文本内容（多部分邮件）
7. THE Email_Service SHALL 支持设置邮件主题
8. THE Email_Service SHALL 支持设置收件人地址（单个或多个）
9. THE Email_Service SHALL 支持设置抄送地址（CC）
10. THE Email_Service SHALL 支持设置密送地址（BCC）
11. THE Email_Service SHALL 支持设置回复地址（Reply-To）

### 需求 3: 模板邮件发送

**用户故事:** 作为开发者，我希望能够发送预定义模板的邮件，以便快速发送常见类型的通知邮件。

#### 验收标准

1. THE Email_Service SHALL 提供发送欢迎邮件的方法
2. THE Email_Service SHALL 提供发送密码重置邮件的方法
3. THE Email_Service SHALL 提供发送邮箱验证邮件的方法
4. THE Email_Service SHALL 提供发送登录通知邮件的方法
5. WHEN 发送模板邮件时，THE Email_Service SHALL 使用模板变量替换生成最终邮件内容
6. THE Email_Service SHALL 保持与现有 Resend 实现相同的邮件模板样式和内容

### 需求 4: 错误处理和重试机制

**用户故事:** 作为系统管理员，我希望邮件发送失败时能够自动重试，以便提高邮件送达的可靠性。

#### 验收标准

1. WHEN AWS SES 返回临时错误（如限流、服务不可用）时，THEN THE Email_Service SHALL 自动重试发送
2. THE Retry_Policy SHALL 使用指数退避策略计算重试间隔
3. THE Retry_Policy SHALL 限制最大重试次数为 3 次
4. WHEN 达到最大重试次数后仍然失败时，THEN THE Email_Service SHALL 记录错误日志并返回失败响应
5. WHEN AWS SES 返回永久错误（如邮箱地址无效）时，THEN THE Email_Service SHALL 不进行重试
6. THE Email_Service SHALL 捕获并处理所有 AWS SDK 异常
7. THE Email_Service SHALL 将异常信息转换为用户友好的错误消息

### 需求 5: 邮件发送审计日志

**用户故事:** 作为系统管理员，我希望记录所有邮件发送活动，以便进行审计和问题排查。

#### 验收标准

1. WHEN 邮件发送请求被处理时，THE Email_Audit_Log SHALL 记录发送时间戳
2. THE Email_Audit_Log SHALL 记录收件人邮箱地址
3. THE Email_Audit_Log SHALL 记录邮件主题
4. THE Email_Audit_Log SHALL 记录邮件类型（欢迎邮件、密码重置等）
5. THE Email_Audit_Log SHALL 记录发送状态（成功、失败、重试中）
6. THE Email_Audit_Log SHALL 记录 AWS SES 返回的消息 ID
7. WHEN 邮件发送失败时，THE Email_Audit_Log SHALL 记录错误原因
8. THE Email_Audit_Log SHALL 将审计记录持久化到数据库
9. THE Email_Audit_Log SHALL 支持按时间范围、收件人、状态等条件查询审计记录

### 需求 6: 限流保护机制

**用户故事:** 作为系统管理员，我希望控制邮件发送速率，以便避免超出 AWS SES 配额限制。

#### 验收标准

1. THE Rate_Limiter SHALL 限制每秒最大邮件发送数量
2. THE Rate_Limiter SHALL 限制每日最大邮件发送数量
3. WHEN 达到速率限制时，THEN THE Email_Service SHALL 延迟发送请求而不是拒绝
4. THE Rate_Limiter SHALL 使用令牌桶算法或滑动窗口算法实现限流
5. THE Rate_Limiter SHALL 从配置文件读取限流参数
6. THE Rate_Limiter SHALL 记录限流事件到日志

### 需求 7: AWS SES 域名验证配置

**用户故事:** 作为系统管理员，我希望配置域名验证，以便能够使用自定义域名发送邮件。

#### 验收标准

1. THE Domain_Verification SHALL 支持验证 polaristools.online 域名
2. THE Domain_Verification SHALL 提供 DNS 验证记录的配置指南
3. THE Domain_Verification SHALL 支持通过 AWS 控制台或 API 验证域名状态
4. WHEN 域名验证成功后，THE Email_Service SHALL 能够使用该域名作为发件人地址

### 需求 8: DNS 记录配置

**用户故事:** 作为系统管理员，我希望配置 SPF、DKIM 和 DMARC 记录，以便提高邮件送达率和防止邮件被标记为垃圾邮件。

#### 验收标准

1. THE SPF_Record SHALL 包含 AWS SES 的邮件服务器 IP 地址
2. THE DKIM_Record SHALL 使用 AWS SES 提供的 DKIM 签名密钥
3. THE DMARC_Record SHALL 定义邮件认证失败时的处理策略
4. THE DNS_Configuration SHALL 提供详细的 DNS 记录配置文档
5. THE DNS_Configuration SHALL 提供 DNS 记录验证工具或命令

### 需求 9: IAM 权限配置

**用户故事:** 作为系统管理员，我希望配置最小权限的 IAM 角色，以便应用程序能够安全地访问 AWS SES。

#### 验收标准

1. THE IAM_Role SHALL 仅授予发送邮件所需的最小权限
2. THE IAM_Role SHALL 包含 ses:SendEmail 权限
3. THE IAM_Role SHALL 包含 ses:SendRawEmail 权限
4. THE IAM_Role SHALL 限制可发送邮件的源地址范围
5. THE IAM_Role SHALL 提供详细的权限配置文档

### 需求 10: 沙箱模式和生产访问

**用户故事:** 作为系统管理员，我希望了解 AWS SES 沙箱模式的限制，并能够申请生产访问权限。

#### 验收标准

1. WHEN AWS SES 账户处于 Sandbox_Mode 时，THE Email_Service SHALL 仅能发送邮件到已验证的邮箱地址
2. THE Documentation SHALL 提供申请 Production_Access 的详细步骤
3. THE Documentation SHALL 说明沙箱模式和生产模式的区别
4. THE Email_Service SHALL 在沙箱模式下发送失败时提供清晰的错误提示

### 需求 11: 配置集成和事件跟踪

**用户故事:** 作为系统管理员，我希望配置 AWS SES 配置集，以便跟踪邮件发送、送达、打开和点击等事件。

#### 验收标准

1. THE Configuration_Set SHALL 跟踪邮件发送事件
2. THE Configuration_Set SHALL 跟踪邮件送达事件
3. THE Configuration_Set SHALL 跟踪邮件退信事件
4. THE Configuration_Set SHALL 跟踪邮件投诉事件
5. WHERE 需要跟踪邮件打开和点击事件，THE Configuration_Set SHALL 支持配置事件目的地（如 CloudWatch、SNS、Kinesis）

### 需求 12: 向后兼容性

**用户故事:** 作为开发者，我希望迁移到 AWS SES 后现有的业务代码无需修改，以便降低迁移风险。

#### 验收标准

1. THE Email_Service SHALL 保持与现有 EmailService 接口完全一致
2. THE Email_Service SHALL 保持所有公共方法的签名不变
3. THE Email_Service SHALL 保持返回值类型不变
4. THE Email_Service SHALL 保持异常处理行为一致
5. WHEN 邮件服务被禁用时，THE Email_Service SHALL 返回与 Resend 实现相同的响应

### 需求 13: 日志记录和监控

**用户故事:** 作为系统管理员，我希望记录详细的日志信息，以便监控邮件服务的运行状态和排查问题。

#### 验收标准

1. WHEN 邮件发送成功时，THE Email_Service SHALL 记录 INFO 级别日志
2. WHEN 邮件发送失败时，THE Email_Service SHALL 记录 ERROR 级别日志
3. WHEN 邮件服务被禁用时，THE Email_Service SHALL 记录 WARN 级别日志
4. THE Email_Service SHALL 在日志中包含邮件主题、收件人和消息 ID
5. THE Email_Service SHALL 在日志中包含请求耗时信息
6. THE Email_Service SHALL 使用结构化日志格式便于日志分析

### 需求 14: 测试覆盖

**用户故事:** 作为开发者，我希望编写完整的测试用例，以便确保邮件服务的正确性和可靠性。

#### 验收标准

1. THE Test_Suite SHALL 包含单元测试验证各个方法的基本功能
2. THE Test_Suite SHALL 包含属性测试验证邮件发送的通用属性
3. THE Test_Suite SHALL 包含集成测试验证与 AWS SES 的实际交互
4. THE Test_Suite SHALL 使用 Mock 对象模拟 AWS SES 客户端
5. THE Test_Suite SHALL 测试错误处理和重试逻辑
6. THE Test_Suite SHALL 测试限流机制
7. THE Test_Suite SHALL 测试审计日志记录
8. THE Test_Suite SHALL 达到至少 80% 的代码覆盖率

### 需求 15: 邮件验证 Token 体系

**用户故事:** 作为系统管理员，我希望实现安全的邮件验证和密码重置 Token 体系，以便保护用户账户安全。

#### 验收标准

1. THE Token_System SHALL 生成高熵随机 Token（至少 32 字节）
2. THE Token_System SHALL 存储 Token 的哈希值而非明文
3. THE Token_System SHALL 记录 Token 的用户 ID、用途（verify/reset）、过期时间、是否已使用
4. THE Token_System SHALL 支持验证邮箱 Token（有效期 24 小时）
5. THE Token_System SHALL 支持密码重置 Token（有效期 1 小时）
6. WHEN Token 被使用后，THE Token_System SHALL 标记为已使用并拒绝再次使用
7. WHEN Token 过期后，THE Token_System SHALL 拒绝使用并返回明确的错误信息
8. THE Token_System SHALL 支持同一用户同时存在多个未使用的 Token（但同一用途只保留最新的）
9. THE Token_System SHALL 定期清理过期的 Token（超过 7 天）

### 需求 16: 邮件发送限流增强

**用户故事:** 作为系统管理员，我希望实现更细粒度的限流保护，以便防止滥用和骚扰。

#### 验收标准

1. THE Rate_Limiter SHALL 限制同一邮箱地址 60 秒内最多发送 1 次验证/重置邮件
2. THE Rate_Limiter SHALL 限制同一 IP 地址 60 秒内最多发送 3 次邮件请求
3. THE Rate_Limiter SHALL 限制同一用户每日最多发送 5 次验证/重置邮件
4. WHEN 达到限流限制时，THE Rate_Limiter SHALL 返回明确的错误信息和剩余冷却时间
5. THE Rate_Limiter SHALL 记录所有限流事件到日志
6. THE Rate_Limiter SHALL 支持管理员手动重置限流计数器

### 需求 17: 退信和投诉处理（抑制列表）

**用户故事:** 作为系统管理员，我希望自动处理退信和投诉事件，以便维护良好的发送信誉和避免 AWS SES 账户被限制。

#### 验收标准

1. THE Suppression_System SHALL 接收并处理 AWS SES 的 Bounce 事件
2. THE Suppression_System SHALL 接收并处理 AWS SES 的 Complaint 事件
3. WHEN 收到硬退信（Hard Bounce）时，THE Suppression_System SHALL 立即将邮箱地址加入抑制列表
4. WHEN 收到投诉（Complaint）时，THE Suppression_System SHALL 立即将邮箱地址加入抑制列表
5. WHEN 收到软退信（Soft Bounce）时，THE Suppression_System SHALL 计数，超过 3 次后加入抑制列表
6. THE Suppression_System SHALL 在发送邮件前检查抑制列表
7. WHEN 邮箱地址在抑制列表中时，THE Suppression_System SHALL 拒绝发送并记录原因
8. THE Suppression_System SHALL 记录抑制原因（bounce/complaint）、来源、时间、备注
9. THE Suppression_System SHALL 支持管理员手动添加/移除抑制列表条目
10. THE Suppression_System SHALL 提供抑制列表查询和导出功能

### 需求 18: 用户邮箱状态管理

**用户故事:** 作为用户，我希望能够管理我的邮箱验证状态，以便确保账户安全和接收重要通知。

#### 验收标准

1. THE User_System SHALL 记录用户邮箱的验证状态（未验证/已验证）
2. THE User_System SHALL 提供重新发送验证邮件的功能
3. WHEN 用户请求重新发送验证邮件时，THE User_System SHALL 检查冷却时间（60 秒）
4. THE User_System SHALL 提供修改邮箱地址的功能
5. WHEN 用户修改邮箱地址时，THE User_System SHALL 将新邮箱标记为未验证
6. WHEN 用户修改邮箱地址时，THE User_System SHALL 发送验证邮件到新邮箱
7. THE User_System SHALL 支持邮箱修改的二次验证（需要旧邮箱确认或密码验证）
8. THE User_System SHALL 在用户资料页显示邮箱验证状态
9. THE User_System SHALL 在用户资料页显示重新发送验证邮件按钮（带冷却时间提示）

### 需求 19: 邮件模板管理系统

**用户故事:** 作为系统管理员，我希望能够集中管理邮件模板，以便提高可维护性和支持多语言。

#### 验收标准

1. THE Template_System SHALL 支持 HTML 和纯文本两种格式的模板
2. THE Template_System SHALL 支持模板变量替换（使用 ${variableName} 语法）
3. THE Template_System SHALL 支持多语言模板（中文、英文）
4. THE Template_System SHALL 根据用户语言偏好选择对应的模板
5. THE Template_System SHALL 支持模板版本管理（记录修改历史）
6. THE Template_System SHALL 提供模板预览功能（填充示例数据）
7. THE Template_System SHALL 验证模板语法的正确性
8. THE Template_System SHALL 支持管理员在线编辑模板
9. THE Template_System SHALL 缓存已加载的模板以提高性能

### 需求 20: 邮件发送队列系统

**用户故事:** 作为系统管理员，我希望实现异步邮件发送队列，以便提高系统响应速度和可靠性。

#### 验收标准

1. THE Queue_System SHALL 将邮件发送请求写入队列而非同步发送
2. THE Queue_System SHALL 使用数据库表作为队列存储（支持持久化）
3. THE Queue_System SHALL 使用后台 Worker 线程处理队列中的邮件
4. THE Queue_System SHALL 支持配置 Worker 线程数量
5. THE Queue_System SHALL 记录邮件在队列中的状态（pending/processing/sent/failed）
6. WHEN 邮件发送失败时，THE Queue_System SHALL 支持自动重试（最多 3 次）
7. THE Queue_System SHALL 支持邮件优先级（高/中/低）
8. THE Queue_System SHALL 优先处理高优先级邮件
9. THE Queue_System SHALL 提供队列监控接口（队列长度、处理速度、失败率）
10. THE Queue_System SHALL 支持手动重试失败的邮件

### 需求 21: 邮件发送监控和告警

**用户故事:** 作为系统管理员，我希望监控邮件发送的关键指标并在异常时收到告警，以便及时发现和解决问题。

#### 验收标准

1. THE Monitoring_System SHALL 统计邮件发送成功率（成功数/总数）
2. THE Monitoring_System SHALL 统计邮件发送失败率（失败数/总数）
3. THE Monitoring_System SHALL 统计退信率（Bounce Rate）
4. THE Monitoring_System SHALL 统计投诉率（Complaint Rate）
5. THE Monitoring_System SHALL 统计平均发送延迟
6. WHEN 发送成功率低于 95% 时，THE Monitoring_System SHALL 触发告警
7. WHEN 退信率超过 5% 时，THE Monitoring_System SHALL 触发告警
8. WHEN 投诉率超过 0.1% 时，THE Monitoring_System SHALL 触发告警并自动暂停发送
9. THE Monitoring_System SHALL 提供实时监控仪表板
10. THE Monitoring_System SHALL 支持配置告警通知方式（邮件/Slack/钉钉）

### 需求 22: 邮件订阅和退订管理

**用户故事:** 作为用户，我希望能够管理我的邮件订阅偏好，以便只接收我感兴趣的通知。

#### 验收标准

1. THE Subscription_System SHALL 区分事务性邮件（验证/重置）和通知性邮件
2. THE Subscription_System SHALL 允许用户设置通知邮件的订阅偏好
3. THE Subscription_System SHALL 支持按邮件类型设置订阅（系统通知/营销邮件/产品更新）
4. THE Subscription_System SHALL 在通知邮件底部提供一键退订链接
5. WHEN 用户点击退订链接时，THE Subscription_System SHALL 自动取消对应类型的订阅
6. THE Subscription_System SHALL 记录用户的订阅偏好变更历史
7. THE Subscription_System SHALL 在发送通知邮件前检查用户的订阅偏好
8. THE Subscription_System SHALL 提供订阅偏好管理页面
9. THE Subscription_System SHALL 确保事务性邮件（验证/重置）不受退订影响

### 需求 23: 多发件人地址支持

**用户故事:** 作为系统管理员，我希望支持多个发件人地址，以便不同类型的邮件使用不同的发件人身份。

#### 验收标准

1. THE Email_System SHALL 支持配置多个发件人地址
2. THE Email_System SHALL 支持为不同邮件类型配置不同的发件人地址
3. THE Email_System SHALL 支持 noreply@polaristools.online（系统通知）
4. THE Email_System SHALL 支持 support@polaristools.online（客户支持）
5. THE Email_System SHALL 支持 security@polaristools.online（安全通知）
6. THE Email_System SHALL 根据邮件类型自动选择合适的发件人地址
7. THE Email_System SHALL 支持配置不同的 Reply-To 地址
8. THE Email_System SHALL 验证所有发件人地址都已在 AWS SES 中验证
