# 邮件验证系统实现任务

## 任务概览

本文档列出了实现邮件验证系统的所有任务，按优先级和依赖关系组织。

## 任务统计

- **P0（基础设施）**: 8 个任务，约 31 小时
- **P1（核心功能）**: 5 个任务，约 26 小时
- **P2（前端集成）**: 6 个任务，约 30 小时
- **P3（优化和上线）**: 9 个任务，约 56 小时

**总计**: 28 个任务，约 143 小时（约 18 个工作日）

## Tasks

### 阶段一：基础设施搭建（P0）

- [x] 1. 数据库表设计和创建
  - [x] 1.1 创建 email_verification_code 表的 SQL 脚本
    - 创建包含所有必需字段的表结构
    - 添加索引：email+purpose, expires_at, created_at
    - 包含软删除字段 deleted
    - _Requirements: 需求10_
  
  - [x] 1.2 创建 email_verification_log 表的 SQL 脚本
    - 创建日志表结构
    - 添加索引：email, created_at, ip_address
    - _Requirements: 需求10_
  
  - [x] 1.3 创建 Flyway 迁移文件 V2.1__create_verification_code_table.sql
    - 将 SQL 脚本放入 Flyway 迁移目录
    - _Requirements: 需求10_
  
  - [x] 1.4 创建 Flyway 迁移文件 V2.2__create_verification_log_table.sql
    - 将日志表 SQL 脚本放入 Flyway 迁移目录
    - _Requirements: 需求10_
  
  - [x] 1.5 在开发环境执行迁移并验证
    - 运行 Flyway 迁移
    - 验证表结构和索引
    - 测试插入和查询操作
    - _Requirements: 需求10_

- [x] 2. 实体类创建
  - [x] 2.1 创建 EmailVerificationCode 实体类
    - 继承 BaseEntity
    - 添加字段：codeHash, email, purpose, expiresAt, used, usedAt, failCount
    - 添加 Lombok 注解：@Data, @EqualsAndHashCode
    - 添加 MyBatis Plus 注解：@TableName
    - _Requirements: 需求10_
  
  - [x] 2.2 创建 EmailVerificationLog 实体类
    - 继承 BaseEntity
    - 添加字段：email, purpose, action, ipAddress, userAgent, success, errorMessage
    - 添加 Lombok 和 MyBatis Plus 注解
    - _Requirements: 需求10_
  
  - [x] 2.3 创建枚举类 VerificationPurpose
    - 定义枚举值：REGISTER, LOGIN, RESET, VERIFY, CHANGE
    - _Requirements: 需求1_


- [x] 3. Mapper 接口创建
  - [x] 3.1 创建 EmailVerificationCodeMapper 接口
    - 继承 BaseMapper<EmailVerificationCode>
    - 添加自定义查询方法
    - _Requirements: 需求10_
  
  - [x] 3.2 创建 EmailVerificationLogMapper 接口
    - 继承 BaseMapper<EmailVerificationLog>
    - _Requirements: 需求10_
  
  - [x] 3.3 添加自定义查询方法
    - findLatestByEmailAndPurpose：按邮箱和用途查询最新验证码
    - findValidByEmailAndPurpose：查询有效的验证码
    - _Requirements: 需求7_
  
  - [ ]* 3.4 创建 XML 映射文件（如需要）
    - 为复杂查询创建 XML 映射
    - _Requirements: 需求10_

- [x] 4. DTO 类创建
  - [x] 4.1 创建验证码发送相关 DTO
    - SendVerificationCodeRequest：继承 BaseRequest，包含 email, purpose
    - SendVerificationCodeResponse：继承 BaseResponse，包含 cooldownSeconds, expiresIn
    - 添加 @NotBlank, @Email 等验证注解
    - _Requirements: 需求11_
  
  - [x] 4.2 创建验证码验证相关 DTO
    - VerifyCodeRequest：email, code, purpose
    - 添加验证注解
    - _Requirements: 需求11_
  
  - [x] 4.3 创建注册相关 DTO
    - RegisterWithCodeRequest：email, code, username, password, nickname
    - 添加密码强度验证
    - _Requirements: 需求3, 需求11_
  
  - [x] 4.4 创建登录相关 DTO
    - LoginWithCodeRequest：email, code, rememberMe
    - _Requirements: 需求4, 需求11_
  
  - [x] 4.5 创建密码重置相关 DTO
    - ResetPasswordRequest：resetToken, newPassword
    - 添加密码验证
    - _Requirements: 需求5, 需求11_
  
  - [x] 4.6 创建邮箱修改相关 DTO
    - ChangeEmailRequest：newEmail, password
    - VerifyEmailChangeRequest：newEmail, code
    - _Requirements: 需求6, 需求11_

- [x] 5. 验证码生成服务实现
  - [x] 5.1 创建 VerificationCodeService 接口
    - 定义 generateAndSendCode 方法
    - 定义 verifyCode 方法
    - 定义 invalidateCode 方法
    - _Requirements: 需求1_
  
  - [x] 5.2 创建 VerificationCodeServiceImpl 实现类
    - 注入必要的依赖
    - _Requirements: 需求1_
  
  - [x] 5.3 实现验证码生成逻辑
    - 生成 6 位随机数字
    - 使用 SecureRandom 确保随机性
    - _Requirements: 需求1_
  
  - [x] 5.4 实现验证码哈希算法
    - 使用 SHA-256 + 盐值
    - 实现安全的哈希存储
    - _Requirements: 需求12_
  
  - [x] 5.5 实现验证码存储逻辑
    - 使旧验证码失效（同邮箱同用途）
    - 保存新验证码到数据库
    - 设置过期时间（10 分钟）
    - _Requirements: 需求1_
  
  - [ ]* 5.6 编写单元测试
    - 测试验证码生成的随机性
    - 测试哈希算法
    - 测试存储逻辑
    - _Requirements: 需求1, 需求12_


- [x] 6. 验证码验证服务实现
  - [x] 6.1 实现 verifyCode 方法
    - 验证码格式验证（6 位数字）
    - 查询数据库获取验证码记录
    - _Requirements: 需求7_
  
  - [x] 6.2 实现验证码检查逻辑
    - 检查验证码是否存在
    - 检查是否过期
    - 检查是否已使用
    - 检查用途是否匹配
    - _Requirements: 需求7_
  
  - [x] 6.3 实现失败次数管理
    - 检查失败次数是否超过限制（5次）
    - 验证失败时增加失败次数
    - _Requirements: 需求7, 需求12_
  
  - [x] 6.4 实现验证码哈希比较
    - 使用常量时间比较防止时序攻击
    - 验证成功后标记为已使用
    - _Requirements: 需求7, 需求12_
  
  - [ ]* 6.5 编写单元测试
    - 测试各种验证场景
    - 测试安全性（时序攻击防护）
    - _Requirements: 需求7, 需求12_

- [x] 7. 限流服务实现
  - [x] 7.1 创建 RateLimiterService 接口
    - 定义 checkEmailRateLimit 方法
    - 定义 checkIpRateLimit 方法
    - 定义 recordAttempt 方法
    - _Requirements: 需求8_
  
  - [x] 7.2 创建 RateLimiterServiceImpl 实现类
    - 注入 RedisTemplate
    - _Requirements: 需求8_
  
  - [x] 7.3 实现邮箱级限流
    - 60 秒冷却时间
    - 每日最多 10 次
    - 使用 Redis 存储计数器
    - _Requirements: 需求8_
  
  - [x] 7.4 实现 IP 级限流
    - 60 秒冷却时间
    - 每日最多 20 次
    - _Requirements: 需求8_
  
  - [x] 7.5 实现获取剩余冷却时间方法
    - 返回剩余秒数
    - _Requirements: 需求8_
  
  - [x] 7.6 实现邮箱临时封禁逻辑
    - 验证失败 10 次后封禁 1 小时
    - _Requirements: 需求8, 需求12_
  
  - [x] 7.7 实现重置限流计数器（管理员功能）

    - 允许管理员手动重置
    - _Requirements: 需求8_
  
  - [ ]* 7.8 编写单元测试
    - 测试限流逻辑
    - 测试 Redis 操作
    - _Requirements: 需求8_

- [x] 8. 邮件模板创建
  - [x] 8.1 创建注册验证码邮件模板
    - 使用响应式 HTML 设计
    - 突出显示验证码
    - 包含有效期和安全提示
    - _Requirements: 需求2, 需求9_
  
  - [x] 8.2 创建登录验证码邮件模板
    - 类似注册模板，调整文案
    - _Requirements: 需求2, 需求9_
  
  - [x] 8.3 创建密码重置验证码邮件模板
    - 强调安全性
    - _Requirements: 需求2, 需求9_
  
  - [x] 8.4 创建邮箱修改验证码邮件模板
    - 发送到新邮箱
    - _Requirements: 需求2, 需求9_
  
  - [x] 8.5 创建邮箱修改通知邮件模板
    - 发送到旧邮箱
    - 告知邮箱已修改
    - _Requirements: 需求6, 需求9_
  
  - [x] 8.6 在数据库中插入模板数据
    - 使用 SQL 脚本插入到 email_template 表
    - _Requirements: 需求9_
  
  - [x] 8.7 测试模板渲染
    - 测试变量替换
    - 测试响应式显示
    - _Requirements: 需求9_


### 阶段二：核心业务功能（P1）

- [x] 9. 注册验证码功能实现
  - [x] 9.1 在 AuthController 添加发送注册验证码端点
    - POST /api/auth/register/send-code
    - 验证邮箱格式
    - 检查邮箱是否已注册
    - _Requirements: 需求3, 需求11_
  
  - [x] 9.2 实现发送注册验证码逻辑
    - 调用限流检查
    - 生成并发送验证码
    - 返回冷却时间
    - _Requirements: 需求3_
  
  - [x] 9.3 在 AuthController 添加验证注册端点
    - POST /api/auth/register/verify
    - 接收验证码和用户信息
    - _Requirements: 需求3, 需求11_
  
  - [x] 9.4 实现验证注册逻辑
    - 验证验证码
    - 创建用户账户
    - 标记邮箱为已验证
    - 生成 JWT Token
    - _Requirements: 需求3_
  
  - [x] 9.5 记录验证日志
    - 异步记录发送和验证日志
    - _Requirements: 需求13_
  
  - [ ]* 9.6 编写集成测试
    - 测试完整注册流程
    - _Requirements: 需求3_

- [x] 10. 登录验证码功能实现
  - [x] 10.1 在 AuthController 添加发送登录验证码端点
    - POST /api/auth/login/send-code
    - 验证邮箱是否已注册
    - _Requirements: 需求4, 需求11_
  
  - [x] 10.2 实现发送登录验证码逻辑
    - 调用限流检查
    - 生成并发送验证码
    - _Requirements: 需求4_
  
  - [x] 10.3 在 AuthController 添加验证码登录端点
    - POST /api/auth/login/verify-code
    - 支持 rememberMe 选项
    - _Requirements: 需求4, 需求11_
  
  - [x] 10.4 实现验证码登录逻辑
    - 验证验证码
    - 生成 JWT Token（根据 rememberMe 设置有效期）
    - 更新最后登录时间
    - _Requirements: 需求4_
  
  - [x] 10.5 记录验证日志
    - 异步记录日志
    - _Requirements: 需求13_
  
  - [ ]* 10.6 编写集成测试
    - 测试完整登录流程
    - _Requirements: 需求4_

- [x] 11. 密码重置功能实现
  - [x] 11.1 在 AuthController 添加发送重置验证码端点
    - POST /api/auth/password/send-reset-code
    - _Requirements: 需求5, 需求11_
  
  - [x] 11.2 实现发送重置验证码逻辑
    - 验证邮箱是否存在（返回通用提示避免泄露信息）
    - 生成并发送验证码
    - _Requirements: 需求5_
  
  - [x] 11.3 在 AuthController 添加验证重置验证码端点
    - POST /api/auth/password/verify-code
    - 返回临时重置 Token
    - _Requirements: 需求5, 需求11_
  
  - [x] 11.4 实现临时重置 Token 生成和存储
    - 使用 Redis 存储，5 分钟有效期
    - _Requirements: 需求5_
  
  - [x] 11.5 在 AuthController 添加重置密码端点
    - POST /api/auth/password/reset
    - 验证重置 Token
    - _Requirements: 需求5, 需求11_
  
  - [x] 11.6 实现密码重置逻辑
    - 验证 Token 有效性
    - 更新用户密码
    - _Requirements: 需求5_
  
  - [x] 11.7 记录验证日志
    - 异步记录日志
    - _Requirements: 需求13_
  
  - [ ]* 11.8 编写集成测试
    - 测试完整密码重置流程
    - _Requirements: 需求5_


- [x] 12. 邮箱修改功能实现
  - [x] 12.1 创建 EmailManagementController
    - 新建控制器类
    - _Requirements: 需求6_
  
  - [x] 12.2 添加发送邮箱修改验证码端点
    - POST /api/user/email/send-change-code
    - 需要认证
    - 验证当前密码
    - _Requirements: 需求6, 需求11_
  
  - [x] 12.3 实现发送邮箱修改验证码逻辑
    - 验证密码正确性
    - 检查新邮箱唯一性
    - 生成并发送验证码到新邮箱
    - _Requirements: 需求6_
  
  - [x] 12.4 添加验证邮箱修改端点
    - POST /api/user/email/verify-change
    - 需要认证
    - _Requirements: 需求6, 需求11_
  
  - [x] 12.5 实现验证邮箱修改逻辑
    - 验证验证码
    - 更新用户邮箱
    - 标记新邮箱为已验证
    - 发送通知邮件到旧邮箱
    - _Requirements: 需求6_
  
  - [x] 12.6 记录验证日志
    - 异步记录日志
    - _Requirements: 需求13_
  
  - [ ]* 12.7 编写集成测试
    - 测试完整邮箱修改流程
    - _Requirements: 需求6_

- [x] 13. 验证日志记录实现
  - [x] 13.1 创建 VerificationLogService 接口
    - 定义日志记录方法
    - _Requirements: 需求13_
  
  - [x] 13.2 创建 VerificationLogServiceImpl 实现类
    - 注入 EmailVerificationLogMapper
    - _Requirements: 需求13_
  
  - [x] 13.3 实现记录发送日志方法
    - 记录验证码发送事件
    - 包含 IP、User-Agent 等信息
    - _Requirements: 需求13_
  
  - [x] 13.4 实现记录验证日志方法
    - 记录验证成功/失败事件
    - _Requirements: 需求13_
  
  - [x] 13.5 配置异步执行
    - 使用 @Async 注解
    - 配置线程池
    - _Requirements: 需求13_
  
  - [x] 13.6 实现日志查询方法
    - 管理员功能
    - 支持分页和筛选
    - _Requirements: 需求13_

### 阶段三：前端集成（P2）

- [x] 14. 验证码输入组件开发
  - [x] 14.1 创建 VerificationCodeInput 组件
    - 创建 React 组件文件
    - _Requirements: 需求15_
  
  - [x] 14.2 实现 6 位数字输入框
    - 使用 6 个独立的 input 元素
    - 限制只能输入数字
    - _Requirements: 需求15_
  
  - [x] 14.3 实现自动聚焦和跳转
    - 输入后自动跳转到下一个输入框
    - 删除时自动跳转到上一个输入框
    - _Requirements: 需求15_
  
  - [x] 14.4 实现粘贴验证码自动分割
    - 监听 paste 事件
    - 自动分割 6 位数字
    - _Requirements: 需求15_
  
  - [x] 14.5 实现键盘导航
    - 支持 Tab、方向键、退格键
    - _Requirements: 需求15_
  
  - [x] 14.6 添加移动端优化
    - 使用 inputMode="numeric" 显示数字键盘
    - _Requirements: 需求15_
  
  - [x] 14.7 添加无障碍支持
    - 添加 ARIA 标签
    - _Requirements: 需求15_
  
  - [x] 14.8 添加样式和动画
    - 使用 Tailwind CSS
    - 添加过渡动画
    - _Requirements: 需求15_
  
  - [ ]* 14.9 编写组件测试
    - 测试组件交互
    - _Requirements: 需求15_


- [x] 15. 注册页面改造
  - [x] 15.1 修改 Register.tsx 页面
    - 添加验证码发送和输入流程
    - _Requirements: 需求3, 需求15_
  
  - [x] 15.2 添加发送验证码按钮
    - 集成到邮箱输入框旁边
    - _Requirements: 需求15_
  
  - [x] 15.3 集成 VerificationCodeInput 组件
    - 在发送验证码后显示
    - _Requirements: 需求15_
  
  - [x] 15.4 实现倒计时显示
    - 显示验证码剩余有效时间（10 分钟）
    - _Requirements: 需求15_
  
  - [x] 15.5 实现重新发送按钮
    - 带冷却时间（60 秒）
    - _Requirements: 需求15_
  
  - [x] 15.6 调用注册验证码 API
    - 集成 API 客户端
    - _Requirements: 需求3, 需求15_
  
  - [x] 15.7 处理错误提示
    - 显示友好的错误信息
    - _Requirements: 需求15_
  
  - [ ]* 15.8 编写 E2E 测试
    - 测试完整注册流程
    - _Requirements: 需求3_

- [x] 16. 登录页面改造
  - [x] 16.1 修改 Login.tsx 页面
    - 添加验证码登录选项卡
    - _Requirements: 需求4, 需求15_
  
  - [x] 16.2 添加验证码登录选项卡
    - 与密码登录并列
    - _Requirements: 需求15_
  
  - [x] 16.3 集成 VerificationCodeInput 组件
    - 在验证码登录选项卡中使用
    - _Requirements: 需求15_
  
  - [x] 16.4 实现倒计时和重新发送
    - 类似注册页面
    - _Requirements: 需求15_
  
  - [x] 16.5 调用登录验证码 API
    - 集成 API 客户端
    - _Requirements: 需求4, 需求15_
  
  - [x] 16.6 处理错误提示
    - 显示友好的错误信息
    - _Requirements: 需求15_
  
  - [ ]* 16.7 编写 E2E 测试
    - 测试验证码登录流程
    - _Requirements: 需求4_

- [x] 17. 密码重置页面开发
  - [x] 17.1 创建 ResetPassword.tsx 页面
    - 创建新页面文件
    - _Requirements: 需求5, 需求15_
  
  - [x] 17.2 实现第一步：输入邮箱
    - 邮箱输入和发送验证码
    - _Requirements: 需求15_
  
  - [x] 17.3 实现第二步：输入验证码
    - 集成 VerificationCodeInput 组件
    - _Requirements: 需求15_
  
  - [x] 17.4 实现第三步：输入新密码
    - 密码输入和确认
    - _Requirements: 需求15_
  
  - [x] 17.5 实现步骤导航
    - 显示当前步骤
    - 支持前进后退
    - _Requirements: 需求15_
  
  - [x] 17.6 调用密码重置 API
    - 集成 API 客户端
    - _Requirements: 需求5, 需求15_
  
  - [x] 17.7 处理错误提示
    - 显示友好的错误信息
    - _Requirements: 需求15_
  
  - [ ]* 17.8 编写 E2E 测试
    - 测试完整密码重置流程
    - _Requirements: 需求5_

- [x] 18. 邮箱修改功能前端实现
  - [x] 18.1 修改 ProfileInfoSection.tsx 组件
    - 改造邮箱修改模态框
    - _Requirements: 需求6, 需求15_
  
  - [x] 18.2 添加验证码输入步骤
    - 在密码验证后添加验证码步骤
    - _Requirements: 需求15_
  
  - [x] 18.3 集成 VerificationCodeInput 组件
    - 在模态框中使用
    - _Requirements: 需求15_
  
  - [x] 18.4 实现倒计时显示
    - 显示验证码有效时间
    - _Requirements: 需求15_
  
  - [x] 18.5 调用邮箱修改 API
    - 集成 API 客户端
    - _Requirements: 需求6, 需求15_
  
  - [x] 18.6 处理错误提示
    - 显示友好的错误信息
    - _Requirements: 需求15_
  
  - [ ]* 18.7 编写组件测试
    - 测试邮箱修改流程
    - _Requirements: 需求6_


- [x] 19. API 客户端封装
  - [x] 19.1 在 api/client.ts 添加验证码相关 API
    - 创建 API 方法定义
    - _Requirements: 需求11, 需求15_
  
  - [x] 19.2 实现注册相关 API 方法
    - sendRegisterCode()
    - verifyRegister()
    - _Requirements: 需求3_
  
  - [x] 19.3 实现登录相关 API 方法
    - sendLoginCode()
    - verifyLoginCode()
    - _Requirements: 需求4_
  
  - [x] 19.4 实现密码重置相关 API 方法
    - sendResetCode()
    - verifyResetCode()
    - resetPassword()
    - _Requirements: 需求5_
  
  - [x] 19.5 实现邮箱修改相关 API 方法
    - sendChangeEmailCode()
    - verifyChangeEmail()
    - _Requirements: 需求6_
  
  - [x] 19.6 添加 TypeScript 类型定义
    - 定义请求和响应类型
    - _Requirements: 需求15_
  
  - [x] 19.7 实现错误处理
    - 统一错误处理逻辑
    - _Requirements: 需求15_
  
  - [ ]* 19.8 编写 API 客户端测试
    - 测试 API 调用
    - _Requirements: 需求15_

### 阶段四：监控和优化（P3 - 可选）

- [x] 20. 监控仪表板开发

  - [x] 20.1 创建 VerificationMonitoring.tsx 页面

    - 管理员专用页面
    - _Requirements: 需求13_
  
  - [x] 20.2 实现验证码发送统计图表

    - 使用图表库展示统计数据
    - _Requirements: 需求13_
  
  - [x] 20.3 实现验证码验证统计图表

    - 展示验证成功率
    - _Requirements: 需求13_
  
  - [x] 20.4 实现成功率趋势图

    - 时间序列图表
    - _Requirements: 需求13_
  
  - [x] 20.5 实现限流触发统计

    - 展示限流事件
    - _Requirements: 需求13_
  
  - [x] 20.6 实现实时日志查看

    - 分页展示日志
    - _Requirements: 需求13_
  
  - [x] 20.7 添加时间范围筛选

    - 支持自定义时间范围
    - _Requirements: 需求13_
  
  - [x] 20.8 添加导出功能

    - 导出统计数据
    - _Requirements: 需求13_
  
  - [x] 20.9 创建后端监控API控制器
  
    - 创建 VerificationMonitoringController
    - 实现统计数据查询接口
    - _Requirements: 需求13_
  
  - [x] 20.10 集成前端API调用
  
    - 更新 adminClient.ts 添加监控API
    - 替换前端mock数据为真实API调用
    - _Requirements: 需求13_

- [x] 21. 告警系统实现



  - [x] 21.1 创建 AlertService 接口

    - 定义告警方法
    - _Requirements: 需求13_

  
  - [x] 21.2 实现告警规则引擎

    - 配置告警规则

    - _Requirements: 需求13_
  
  - [x] 21.3 实现邮件告警


    - 发送告警邮件
    - _Requirements: 需求13_
  
  - [x] 21.4 实现告警配置管理


    - 管理告警规则
    - _Requirements: 需求13_
  
  - [x] 21.5 实现告警历史记录

    - 记录告警事件
    - _Requirements: 需求13_

- [x] 22. 性能优化

  - [x] 22.1 实现验证码 Redis 缓存

    - 优化数据库查询
    - _Requirements: 非功能性需求_
  
  - [x] 22.2 实现邮件异步发送队列

    - 使用消息队列
    - _Requirements: 非功能性需求_
  
  - [x] 22.3 优化数据库查询

    - 添加必要的索引
    - _Requirements: 非功能性需求_
  
  - [x] 22.4 进行性能测试

    - 压力测试（1000 TPS）
    - _Requirements: 非功能性需求_
  
  - [x] 22.5 分析性能瓶颈并优化

    - 根据测试结果优化
    - _Requirements: 非功能性需求_

- [-] 23. 安全加固

  - [-] 23.1 进行安全测试

    - 暴力破解测试
    - 时序攻击测试
    - _Requirements: 需求12_
  
  - [ ] 23.2 进行渗透测试

    - 第三方安全测试
    - _Requirements: 需求12_
  
  - [ ] 23.3 修复安全漏洞

    - 根据测试结果修复
    - _Requirements: 需求12_
  
  - [ ] 23.4 编写安全测试报告

    - 文档化测试结果
    - _Requirements: 需求12_


- [ ]* 24. 文档编写
  - [ ]* 24.1 编写 API 文档
    - 使用 OpenAPI/Swagger
    - _Requirements: 文档要求_
  
  - [ ]* 24.2 编写数据库设计文档
    - 文档化表结构
    - _Requirements: 文档要求_
  
  - [ ]* 24.3 编写部署文档
    - 部署步骤和配置
    - _Requirements: 文档要求_
  
  - [ ]* 24.4 编写运维手册
    - 日常运维指南
    - _Requirements: 文档要求_
  
  - [ ]* 24.5 编写用户使用指南
    - 面向最终用户
    - _Requirements: 文档要求_
  
  - [ ]* 24.6 编写开发者集成指南
    - 面向开发者
    - _Requirements: 文档要求_
  
  - [ ]* 24.7 编写安全最佳实践文档
    - 安全配置建议
    - _Requirements: 文档要求_
  
  - [ ]* 24.8 编写故障排查指南
    - 常见问题和解决方案
    - _Requirements: 文档要求_
  
  - [ ]* 24.9 更新 README
    - 项目概述和快速开始
    - _Requirements: 文档要求_

### 阶段五：测试和上线（P3 - 可选）

- [ ]* 25. 完整测试
  - [ ]* 25.1 执行所有单元测试
    - 运行测试套件
    - _Requirements: 测试要求_
  
  - [ ]* 25.2 执行所有集成测试
    - 测试组件集成
    - _Requirements: 测试要求_
  
  - [ ]* 25.3 执行所有 E2E 测试
    - 端到端测试
    - _Requirements: 测试要求_
  
  - [ ]* 25.4 执行性能测试
    - 压力测试
    - _Requirements: 测试要求_
  
  - [ ]* 25.5 执行安全测试
    - 安全扫描
    - _Requirements: 测试要求_
  
  - [ ]* 25.6 执行兼容性测试
    - 浏览器和设备测试
    - _Requirements: 测试要求_
  
  - [ ]* 25.7 修复测试发现的问题
    - Bug 修复
    - _Requirements: 测试要求_
  
  - [ ]* 25.8 生成测试报告
    - 文档化测试结果
    - _Requirements: 测试要求_

- [ ]* 26. 灰度发布准备
  - [ ]* 26.1 准备生产环境配置
    - 配置文件准备
    - _Requirements: 部署要求_
  
  - [ ]* 26.2 配置数据库迁移
    - Flyway 迁移脚本
    - _Requirements: 部署要求_
  
  - [ ]* 26.3 配置 Redis
    - Redis 集群配置
    - _Requirements: 部署要求_
  
  - [ ]* 26.4 配置 AWS SES
    - SES 配置和验证
    - _Requirements: 部署要求_
  
  - [ ]* 26.5 配置监控和告警
    - 监控系统配置
    - _Requirements: 部署要求_
  
  - [ ]* 26.6 准备回滚方案
    - 回滚步骤文档
    - _Requirements: 部署要求_
  
  - [ ]* 26.7 编写发布检查清单
    - 发布前检查项
    - _Requirements: 部署要求_
  
  - [ ]* 26.8 进行发布演练
    - 模拟发布流程
    - _Requirements: 部署要求_

- [ ]* 27. 灰度发布
  - [ ]* 27.1 发布到灰度环境
    - 10% 用户灰度
    - _Requirements: 部署要求_
  
  - [ ]* 27.2 监控关键指标
    - 实时监控
    - _Requirements: 部署要求_
  
  - [ ]* 27.3 收集用户反馈
    - 用户反馈收集
    - _Requirements: 部署要求_
  
  - [ ]* 27.4 修复发现的问题
    - 快速响应问题
    - _Requirements: 部署要求_
  
  - [ ]* 27.5 扩大灰度范围
    - 50% 用户灰度
    - _Requirements: 部署要求_
  
  - [ ]* 27.6 继续监控和优化
    - 持续监控
    - _Requirements: 部署要求_
  
  - [ ]* 27.7 全量发布
    - 100% 用户发布
    - _Requirements: 部署要求_

- [ ]* 28. 上线后监控
  - [ ]* 28.1 监控系统运行状态
    - 系统健康检查
    - _Requirements: 成功指标_
  
  - [ ]* 28.2 监控关键业务指标
    - 业务指标监控
    - _Requirements: 成功指标_
  
  - [ ]* 28.3 收集用户反馈
    - 持续收集反馈
    - _Requirements: 成功指标_
  
  - [ ]* 28.4 处理用户问题
    - 用户支持
    - _Requirements: 成功指标_
  
  - [ ]* 28.5 优化系统性能
    - 持续优化
    - _Requirements: 成功指标_
  
  - [ ]* 28.6 修复发现的 Bug
    - Bug 修复
    - _Requirements: 成功指标_
  
  - [ ]* 28.7 定期生成运营报告
    - 运营数据报告
    - _Requirements: 成功指标_

## 实施建议

### 关键路径
```
任务 1 → 2 → 3 → 5 → 6 → 9 → 14 → 15
```

预计关键路径耗时：约 60 小时（约 8 个工作日）

### 优先级说明
- **P0（基础设施）**: 必须完成，是后续功能的基础
- **P1（核心功能）**: 必须完成，实现核心业务价值
- **P2（前端集成）**: 必须完成，提供用户界面
- **P3（优化上线）**: 可选任务，用于生产环境优化

### 风险和依赖

**高风险任务**:
1. 任务 7（限流服务）: Redis 依赖，需要确保 Redis 稳定性
2. 任务 11（密码重置）: 涉及安全敏感操作，需要仔细测试
3. 任务 22（性能优化）: 可能需要多次迭代才能达到目标
4. 任务 27（灰度发布）: 可能遇到生产环境问题

**外部依赖**:
1. AWS SES 服务稳定性
2. Redis 服务可用性
3. 数据库性能
4. 网络连接质量

**缓解措施**:
1. 提前进行压力测试
2. 准备详细的回滚方案
3. 实现降级策略
4. 建立应急响应机制

### 下一步行动

1. **立即开始**: 任务 1（数据库表设计）
2. **并行开始**: 任务 4（DTO 类创建）、任务 8（邮件模板创建）
3. **准备工作**: 确认 Redis 环境、AWS SES 配置
4. **团队分工**: 分配任务给团队成员
5. **建立沟通**: 设置每日站会和周报机制
