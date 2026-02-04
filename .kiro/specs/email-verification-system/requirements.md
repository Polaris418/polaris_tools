# 邮件验证系统需求文档

## 简介

本文档描述了 Polaris Tools 项目的完整邮件验证系统需求，包括基于验证码的注册、登录、密码重置等功能。该系统将替换现有的基于 Token 链接的验证方式，改为更现代的验证码方式，提升用户体验和安全性。

**重要说明 - 架构一致性**: 本规范的实现必须遵循 `backend-refactoring` 规范定义的插件化架构模式。所有实体类应继承 `BaseEntity`，所有 DTO 应继承 `BaseRequest` 和 `BaseResponse`，以保持代码库的一致性和可维护性。

本系统的主要目标是：
1. 实现基于邮件验证码的用户注册流程
2. 实现基于邮件验证码的用户登录功能（无密码登录）
3. 实现基于邮件验证码的密码重置功能
4. 实现邮箱修改验证功能
5. 保持与现有 AWS SES 邮件系统的集成
6. 提供完善的验证码管理和安全机制
7. 支持多语言邮件模板
8. 实现完整的限流和防滥用机制

## 术语表

- **Verification_Code**: 验证码，6位数字，用于验证用户身份
- **Code_Purpose**: 验证码用途，包括：register（注册）、login（登录）、reset（密码重置）、verify（邮箱验证）、change（邮箱修改）
- **Code_Expiry**: 验证码有效期，默认 10 分钟
- **Rate_Limit**: 限流机制，防止验证码滥用
- **Email_Template**: 邮件模板，支持多语言和变量替换
- **Verification_Session**: 验证会话，记录验证码发送和验证过程

## 核心功能需求

### 需求 1: 验证码生成和存储

**用户故事:** 作为系统，我需要生成安全的验证码并安全存储，以便用户进行身份验证。

#### 验收标准

1. THE Verification_Code_Generator SHALL 生成 6 位随机数字验证码
2. THE Verification_Code_Generator SHALL 确保验证码的随机性和不可预测性
3. THE Verification_Code_Storage SHALL 存储验证码的哈希值而非明文
4. THE Verification_Code_Storage SHALL 记录验证码的创建时间、过期时间、用途、关联邮箱
5. THE Verification_Code_Storage SHALL 支持同一邮箱同一用途只保留最新的验证码
6. WHEN 生成新验证码时，THE System SHALL 自动使旧验证码失效
7. THE Verification_Code SHALL 默认有效期为 10 分钟
8. THE System SHALL 定期清理过期的验证码（超过 24 小时）

### 需求 2: 验证码邮件发送

**用户故事:** 作为用户，我希望能够快速收到验证码邮件，以便完成身份验证。

#### 验收标准

1. THE Email_Service SHALL 使用 AWS SES 发送验证码邮件
2. THE Email_Template SHALL 包含清晰的验证码显示（大字体、高对比度）
3. THE Email_Template SHALL 显示验证码的有效期（10 分钟）
4. THE Email_Template SHALL 包含安全提示（如果不是本人操作请忽略）
5. THE Email_Template SHALL 支持中英文双语
6. THE Email_Service SHALL 根据用户语言偏好选择对应模板
7. THE Email_Service SHALL 在邮件中包含验证码用途说明
8. THE Email_Service SHALL 记录所有验证码邮件发送日志

### 需求 3: 用户注册流程（验证码方式）

**用户故事:** 作为新用户，我希望使用邮箱验证码完成注册，以便快速创建账户。

#### 验收标准

1. THE Registration_API SHALL 提供 `POST /api/auth/register/send-code` 端点发送注册验证码
2. WHEN 用户请求发送注册验证码时，THE System SHALL 验证邮箱格式
3. WHEN 用户请求发送注册验证码时，THE System SHALL 检查邮箱是否已注册
4. WHEN 邮箱已注册时，THE System SHALL 返回明确的错误信息
5. THE System SHALL 生成 6 位验证码并发送到用户邮箱
6. THE Registration_API SHALL 提供 `POST /api/auth/register/verify` 端点完成注册
7. WHEN 用户提交注册信息和验证码时，THE System SHALL 验证验证码的有效性
8. WHEN 验证码正确时，THE System SHALL 创建用户账户
9. THE System SHALL 自动标记新注册用户的邮箱为已验证状态
10. THE System SHALL 返回 JWT Token 供用户直接登录

### 需求 4: 邮箱验证码登录

**用户故事:** 作为用户，我希望使用邮箱验证码登录，以便在忘记密码时也能访问账户。

#### 验收标准

1. THE Login_API SHALL 提供 `POST /api/auth/login/send-code` 端点发送登录验证码
2. WHEN 用户请求发送登录验证码时，THE System SHALL 验证邮箱是否已注册
3. WHEN 邮箱未注册时，THE System SHALL 返回明确的错误信息
4. THE System SHALL 生成 6 位验证码并发送到用户邮箱
5. THE Login_API SHALL 提供 `POST /api/auth/login/verify-code` 端点验证登录
6. WHEN 用户提交邮箱和验证码时，THE System SHALL 验证验证码的有效性
7. WHEN 验证码正确时，THE System SHALL 生成 JWT Token
8. THE System SHALL 更新用户的最后登录时间
9. THE System SHALL 支持 rememberMe 选项（30 天 vs 1 天 Token 有效期）
10. THE System SHALL 记录登录日志

### 需求 5: 密码重置流程（验证码方式）

**用户故事:** 作为用户，我希望使用邮箱验证码重置密码，以便在忘记密码时恢复账户访问。

#### 验收标准

1. THE Password_Reset_API SHALL 提供 `POST /api/auth/password/send-reset-code` 端点发送重置验证码
2. WHEN 用户请求发送重置验证码时，THE System SHALL 验证邮箱是否已注册
3. WHEN 邮箱未注册时，THE System SHALL 返回通用提示（避免泄露用户信息）
4. THE System SHALL 生成 6 位验证码并发送到用户邮箱
5. THE Password_Reset_API SHALL 提供 `POST /api/auth/password/verify-code` 端点验证验证码
6. WHEN 用户提交验证码时，THE System SHALL 验证验证码的有效性
7. WHEN 验证码正确时，THE System SHALL 返回临时重置 Token（有效期 5 分钟）
8. THE Password_Reset_API SHALL 提供 `POST /api/auth/password/reset` 端点完成密码重置
9. WHEN 用户提交重置 Token 和新密码时，THE System SHALL 验证 Token 有效性
10. WHEN Token 有效时，THE System SHALL 更新用户密码并使所有旧 Token 失效

### 需求 6: 邮箱修改验证

**用户故事:** 作为用户，我希望修改邮箱时需要验证新邮箱，以便确保邮箱所有权。

#### 验收标准

1. THE Email_Change_API SHALL 提供 `POST /api/user/email/send-change-code` 端点发送修改验证码
2. WHEN 用户请求修改邮箱时，THE System SHALL 要求输入当前密码
3. THE System SHALL 验证当前密码的正确性
4. THE System SHALL 验证新邮箱格式和唯一性
5. THE System SHALL 生成 6 位验证码并发送到新邮箱
6. THE Email_Change_API SHALL 提供 `POST /api/user/email/verify-change` 端点完成修改
7. WHEN 用户提交验证码时，THE System SHALL 验证验证码的有效性
8. WHEN 验证码正确时，THE System SHALL 更新用户邮箱
9. THE System SHALL 标记新邮箱为已验证状态
10. THE System SHALL 发送通知邮件到旧邮箱告知邮箱已修改

### 需求 7: 验证码验证和使用

**用户故事:** 作为系统，我需要安全地验证验证码，以便防止暴力破解和滥用。

#### 验收标准

1. THE Verification_Service SHALL 验证验证码的格式（6 位数字）
2. THE Verification_Service SHALL 验证验证码是否存在
3. THE Verification_Service SHALL 验证验证码是否过期
4. THE Verification_Service SHALL 验证验证码是否已使用
5. THE Verification_Service SHALL 验证验证码的用途是否匹配
6. THE Verification_Service SHALL 验证验证码的关联邮箱是否匹配
7. WHEN 验证码验证失败时，THE System SHALL 记录失败次数
8. WHEN 验证码验证失败超过 5 次时，THE System SHALL 使验证码失效
9. WHEN 验证码验证成功时，THE System SHALL 标记验证码为已使用
10. THE System SHALL 防止验证码被重复使用

### 需求 8: 限流和防滥用机制

**用户故事:** 作为系统管理员，我希望实现严格的限流机制，以便防止验证码滥用和攻击。

#### 验收标准

1. THE Rate_Limiter SHALL 限制同一邮箱 60 秒内最多发送 1 次验证码
2. THE Rate_Limiter SHALL 限制同一邮箱每日最多发送 10 次验证码
3. THE Rate_Limiter SHALL 限制同一 IP 地址 60 秒内最多发送 3 次验证码请求
4. THE Rate_Limiter SHALL 限制同一 IP 地址每日最多发送 20 次验证码请求
5. WHEN 达到限流限制时，THE System SHALL 返回明确的错误信息和剩余冷却时间
6. THE Rate_Limiter SHALL 使用 Redis 存储限流计数器
7. THE Rate_Limiter SHALL 记录所有限流事件到日志
8. THE Rate_Limiter SHALL 支持管理员手动重置限流计数器
9. THE System SHALL 在验证码验证失败 5 次后锁定该验证码
10. THE System SHALL 在验证码验证失败 10 次后临时封禁该邮箱（1 小时）

### 需求 9: 验证码邮件模板

**用户故事:** 作为用户，我希望收到清晰美观的验证码邮件，以便快速完成验证。

#### 验收标准

1. THE Email_Template SHALL 使用响应式 HTML 设计
2. THE Email_Template SHALL 在邮件顶部突出显示验证码（大字体、居中、高对比度）
3. THE Email_Template SHALL 显示验证码的有效期（10 分钟）
4. THE Email_Template SHALL 包含验证码用途说明（注册/登录/重置密码/修改邮箱）
5. THE Email_Template SHALL 包含安全提示（如果不是本人操作请忽略）
6. THE Email_Template SHALL 包含品牌标识和样式
7. THE Email_Template SHALL 支持深色模式适配
8. THE Email_Template SHALL 提供中文和英文两个版本
9. THE Email_Template SHALL 包含联系支持的链接
10. THE Email_Template SHALL 在邮件底部包含退订链接（仅营销邮件）

### 需求 10: 数据库设计

**用户故事:** 作为开发者，我需要设计合理的数据库表结构，以便存储验证码相关数据。

#### 验收标准

1. THE Database SHALL 创建 `email_verification_code` 表存储验证码
2. THE Table SHALL 包含字段：id, code_hash, email, purpose, expires_at, used, used_at, fail_count, created_at, updated_at
3. THE Table SHALL 在 email + purpose 字段上创建索引
4. THE Table SHALL 在 expires_at 字段上创建索引（用于清理过期数据）
5. THE Table SHALL 在 created_at 字段上创建索引（用于统计）
6. THE Database SHALL 创建 `email_verification_log` 表记录验证日志
7. THE Log_Table SHALL 包含字段：id, email, purpose, action, ip_address, user_agent, success, error_message, created_at
8. THE Database SHALL 支持自动清理过期数据（超过 24 小时的验证码）
9. THE Database SHALL 支持自动清理旧日志（超过 90 天的日志）
10. THE Database SHALL 遵循 BaseEntity 基类设计（包含 deleted 软删除字段）

### 需求 11: API 端点设计

**用户故事:** 作为前端开发者，我需要清晰的 API 端点，以便实现验证码功能。

#### 验收标准

1. THE API SHALL 提供 `POST /api/auth/register/send-code` - 发送注册验证码
   - 请求参数：email
   - 响应：success, message, cooldownSeconds
2. THE API SHALL 提供 `POST /api/auth/register/verify` - 验证注册
   - 请求参数：email, code, username, password, nickname
   - 响应：success, token, refreshToken, user
3. THE API SHALL 提供 `POST /api/auth/login/send-code` - 发送登录验证码
   - 请求参数：email
   - 响应：success, message, cooldownSeconds
4. THE API SHALL 提供 `POST /api/auth/login/verify-code` - 验证码登录
   - 请求参数：email, code, rememberMe
   - 响应：success, token, refreshToken, user
5. THE API SHALL 提供 `POST /api/auth/password/send-reset-code` - 发送密码重置验证码
   - 请求参数：email
   - 响应：success, message, cooldownSeconds
6. THE API SHALL 提供 `POST /api/auth/password/verify-code` - 验证重置验证码
   - 请求参数：email, code
   - 响应：success, resetToken
7. THE API SHALL 提供 `POST /api/auth/password/reset` - 重置密码
   - 请求参数：resetToken, newPassword
   - 响应：success, message
8. THE API SHALL 提供 `POST /api/user/email/send-change-code` - 发送邮箱修改验证码
   - 请求参数：newEmail, password
   - 响应：success, message, cooldownSeconds
9. THE API SHALL 提供 `POST /api/user/email/verify-change` - 验证邮箱修改
   - 请求参数：newEmail, code
   - 响应：success, message
10. THE API SHALL 所有端点返回统一的 Result 格式（code, message, data）

### 需求 12: 安全性要求

**用户故事:** 作为系统管理员，我需要确保验证码系统的安全性，以便保护用户账户。

#### 验收标准

1. THE System SHALL 存储验证码的 SHA-256 哈希值而非明文
2. THE System SHALL 使用加盐哈希防止彩虹表攻击
3. THE System SHALL 在验证失败 5 次后使验证码失效
4. THE System SHALL 在验证失败 10 次后临时封禁邮箱（1 小时）
5. THE System SHALL 记录所有验证码操作的 IP 地址和 User-Agent
6. THE System SHALL 检测异常行为（如短时间内大量请求）
7. THE System SHALL 在检测到异常行为时触发告警
8. THE System SHALL 防止时序攻击（使用常量时间比较）
9. THE System SHALL 在邮件中不包含敏感信息（如用户 ID）
10. THE System SHALL 定期审计验证码使用情况

### 需求 13: 监控和日志

**用户故事:** 作为系统管理员，我需要监控验证码系统的运行状况，以便及时发现和解决问题。

#### 验收标准

1. THE System SHALL 记录所有验证码发送请求（成功和失败）
2. THE System SHALL 记录所有验证码验证请求（成功和失败）
3. THE System SHALL 统计验证码发送成功率
4. THE System SHALL 统计验证码验证成功率
5. THE System SHALL 统计平均验证时间（从发送到验证）
6. THE System SHALL 统计限流触发次数
7. THE System SHALL 统计异常行为检测次数
8. THE System SHALL 提供实时监控仪表板
9. WHEN 验证码发送失败率超过 5% 时，THE System SHALL 触发告警
10. WHEN 验证码验证失败率超过 30% 时，THE System SHALL 触发告警

### 需求 14: 向后兼容性

**用户故事:** 作为开发者，我希望新的验证码系统能与现有系统兼容，以便平滑过渡。

#### 验收标准

1. THE System SHALL 保留现有的 Token 链接验证方式（用于邮箱验证）
2. THE System SHALL 同时支持验证码和 Token 两种验证方式
3. THE System SHALL 允许用户选择使用验证码或密码登录
4. THE System SHALL 保持现有 API 端点不变
5. THE System SHALL 在新端点中使用 `/v2/` 前缀（如需要）
6. THE System SHALL 保持数据库表结构向后兼容
7. THE System SHALL 支持逐步迁移用户到新验证方式
8. THE System SHALL 提供配置开关控制验证码功能的启用/禁用
9. THE System SHALL 在文档中说明新旧方式的区别
10. THE System SHALL 提供迁移指南

### 需求 15: 前端集成

**用户故事:** 作为前端开发者，我需要清晰的前端集成指南，以便实现验证码功能。

#### 验收标准

1. THE Frontend SHALL 提供验证码输入组件（6 位数字，自动聚焦）
2. THE Frontend SHALL 显示验证码倒计时（10 分钟）
3. THE Frontend SHALL 显示重新发送按钮（带冷却时间）
4. THE Frontend SHALL 在验证码输入完成后自动提交
5. THE Frontend SHALL 显示清晰的错误提示
6. THE Frontend SHALL 支持键盘导航（Tab、方向键）
7. THE Frontend SHALL 支持粘贴验证码（自动分割）
8. THE Frontend SHALL 在移动端优化输入体验（数字键盘）
9. THE Frontend SHALL 提供无障碍支持（ARIA 标签）
10. THE Frontend SHALL 提供加载状态和成功/失败反馈

## 实现优先级

### P0 - 核心功能（第一阶段）
1. 验证码生成和存储（需求 1）
2. 验证码邮件发送（需求 2）
3. 验证码验证和使用（需求 7）
4. 数据库设计（需求 10）
5. API 端点设计（需求 11）

### P1 - 安全和限流（第二阶段）
1. 限流和防滥用机制（需求 8）
2. 安全性要求（需求 12）
3. 监控和日志（需求 13）

### P2 - 业务功能（第三阶段）
1. 用户注册流程（需求 3）
2. 邮箱验证码登录（需求 4）
3. 密码重置流程（需求 5）
4. 邮箱修改验证（需求 6）

### P3 - 优化和完善（第四阶段）
1. 验证码邮件模板（需求 9）
2. 向后兼容性（需求 14）
3. 前端集成（需求 15）

## 技术栈

### 后端
- Java 17+
- Spring Boot 3.x
- MyBatis Plus
- Redis（限流和缓存）
- AWS SES（邮件发送）
- MySQL 8.0+

### 前端
- React 18+
- TypeScript
- Tailwind CSS
- React Hook Form（表单验证）

## 非功能性需求

### 性能要求
1. 验证码生成时间 < 100ms
2. 验证码验证时间 < 200ms
3. 邮件发送时间 < 3s
4. API 响应时间 < 500ms（P95）
5. 支持并发 1000 TPS

### 可用性要求
1. 系统可用性 > 99.9%
2. 邮件送达率 > 95%
3. 验证码验证成功率 > 95%

### 可扩展性要求
1. 支持水平扩展
2. 支持多区域部署
3. 支持多语言扩展
4. 支持多邮件服务商切换

## 测试要求

### 单元测试
1. 验证码生成逻辑测试
2. 验证码验证逻辑测试
3. 限流机制测试
4. 哈希算法测试

### 集成测试
1. 完整注册流程测试
2. 完整登录流程测试
3. 完整密码重置流程测试
4. 邮件发送集成测试

### 端到端测试
1. 用户注册 E2E 测试
2. 用户登录 E2E 测试
3. 密码重置 E2E 测试
4. 邮箱修改 E2E 测试

### 性能测试
1. 并发验证码生成测试
2. 并发验证码验证测试
3. 限流机制压力测试
4. 邮件发送性能测试

### 安全测试
1. 暴力破解测试
2. 时序攻击测试
3. SQL 注入测试
4. XSS 攻击测试

## 文档要求

1. API 文档（OpenAPI/Swagger）
2. 数据库设计文档
3. 部署文档
4. 运维手册
5. 用户使用指南
6. 开发者集成指南
7. 安全最佳实践文档
8. 故障排查指南

## 依赖关系

### 依赖的现有功能
1. AWS SES 邮件服务（aws-ses-email-integration 规范）
2. 用户认证系统（AuthService）
3. Redis 缓存服务
4. 邮件模板系统

### 被依赖的功能
1. 用户注册流程
2. 用户登录流程
3. 密码重置流程
4. 邮箱修改流程

## 风险和挑战

### 技术风险
1. 验证码可能被机器人自动识别
2. 邮件可能进入垃圾箱
3. Redis 故障可能导致限流失效
4. 高并发下可能出现性能瓶颈

### 业务风险
1. 用户可能不习惯验证码方式
2. 验证码有效期过短可能影响用户体验
3. 限流过严可能影响正常用户使用

### 缓解措施
1. 实现图形验证码作为备选方案
2. 配置 SPF/DKIM/DMARC 提高邮件送达率
3. 实现 Redis 集群和持久化
4. 实现缓存和异步处理优化性能
5. 提供用户反馈渠道
6. 支持动态调整验证码有效期
7. 实现智能限流（区分正常用户和攻击者）

## 成功指标

1. 验证码发送成功率 > 95%
2. 验证码验证成功率 > 90%
3. 用户注册转化率提升 > 10%
4. 用户登录成功率 > 95%
5. 密码重置成功率 > 90%
6. 系统响应时间 < 500ms（P95）
7. 用户满意度 > 4.0/5.0
8. 安全事件数量 = 0
