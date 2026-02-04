# 任务补充 - 业务层邮件管理系统

以下任务需要添加到现有的 tasks.md 文件中。

## 新增任务

### 第一期：MVP 功能（必须实现）

- [x] 16. 实现 Token 体系
  - [x] 16.1 创建 EmailToken 实体类和 EmailTokenRepository
    - 定义所有字段（tokenHash、userId、purpose、expiresAt、used、usedAt、createdAt）
    - 添加索引（user_purpose、expires_at）
    - _需求: 15.1, 15.2, 15.3_
  
  - [x] 16.2 实现 TokenService 服务
    - 实现 generateToken 方法（生成 32 字节随机 Token + SHA-256 哈希）
    - 实现 validateAndUseToken 方法（验证并标记为已使用）
    - 实现作废旧 Token 逻辑（同一用户同一用途只保留最新）
    - _需求: 15.4, 15.5, 15.6, 15.7, 15.8_
  
  - [x] 16.3 实现 Token 清理定时任务
    - 使用 @Scheduled 注解，每天凌晨 2 点执行
    - 清理超过 7 天的过期 Token
    - _需求: 15.9_
  
  - [x] 16.4 集成 Token 到邮件服务
    - 更新 sendEmailVerification 方法使用 Token
    - 更新 sendPasswordResetEmail 方法使用 Token
    - 创建 Token 验证 API 端点
    - _需求: 15.4, 15.5_

- [x] 17. 实现抑制列表系统
  - [x] 17.1 创建 EmailSuppression 实体类和 Repository
    - 定义所有字段（email、reason、source、softBounceCount、notes、createdAt、updatedAt）
    - 添加索引（email、reason）
    - _需求: 17.8_
  
  - [x] 17.2 实现 SuppressionService 服务
    - 实现 isSuppressed 方法（检查邮箱是否在抑制列表）
    - 实现 handleHardBounce 方法（硬退信处理）
    - 实现 handleSoftBounce 方法（软退信计数和处理）
    - 实现 handleComplaint 方法（投诉处理）
    - _需求: 17.3, 17.4, 17.5, 17.6_
  
  - [x] 17.3 实现 AWS SES 事件 Webhook 接收器
    - 创建 SesWebhookController 接收 SNS 通知
    - 实现 SNS 消息签名验证
    - 实现 Bounce 事件处理
    - 实现 Complaint 事件处理
    - 实现 Delivery 事件处理
    - _需求: 17.1, 17.2_
  
  - [x] 17.4 集成抑制列表到邮件发送流程
    - 在发送前检查抑制列表
    - 如果在抑制列表中，拒绝发送并记录原因
    - _需求: 17.6, 17.7_
  
  - [x] 17.5 实现抑制列表管理 API
    - 查询抑制列表（支持分页和筛选）
    - 手动添加/移除抑制列表条目
    - 导出抑制列表
    - _需求: 17.9, 17.10_

- [x] 18. 增强限流机制
  - [x] 18.1 扩展 EmailRateLimiter 支持邮箱级限流
    - 实现同一邮箱 60 秒内最多 1 次验证/重置邮件
    - 实现同一用户每日最多 5 次验证/重置邮件
    - _需求: 16.1, 16.3_
  
  - [x] 18.2 实现 IP 级限流
    - 实现同一 IP 60 秒内最多 3 次邮件请求
    - 使用 Redis 存储限流计数器
    - _需求: 16.2_
  
  - [x] 18.3 优化限流错误提示
    - 返回明确的错误信息和剩余冷却时间
    - 记录所有限流事件到日志
    - _需求: 16.4, 16.5_
  
  - [x] 18.4 实现限流管理 API
    - 支持管理员手动重置限流计数器
    - 查询限流统计信息
    - _需求: 16.6_

- [x] 19. 实现用户邮箱状态管理
  - [x] 19.1 扩展 User 实体
    - 添加 emailVerified 字段（布尔值）
    - 添加 emailVerifiedAt 字段（验证时间）
    - _需求: 18.1_
  
  - [x] 19.2 实现邮箱验证流程
    - 创建验证 API 端点（接收 Token）
    - 验证成功后更新用户邮箱状态
    - 发送验证成功通知
    - _需求: 18.1_
  
  - [x] 19.3 实现重新发送验证邮件功能
    - 检查冷却时间（60 秒）
    - 生成新 Token 并发送邮件
    - _需求: 18.2, 18.3_
  
  - [x] 19.4 实现修改邮箱功能
    - 修改邮箱时标记为未验证
    - 发送验证邮件到新邮箱
    - 支持二次验证（旧邮箱确认或密码验证）
    - _需求: 18.4, 18.5, 18.6, 18.7_
  
  - [x] 19.5 更新用户资料页面
    - 显示邮箱验证状态
    - 显示重新发送验证邮件按钮（带冷却时间）
    - _需求: 18.8, 18.9_

### 第二期：稳定投递（强烈建议）

- [x] 20. 实现邮件模板管理系统
  - [x] 20.1 创建 EmailTemplate 实体类和 Repository
    - 定义所有字段（code、name、language、subject、htmlContent、textContent、variables、version、enabled）
    - 添加索引（code_language）
    - _需求: 19.1, 19.3_
  
  - [x] 20.2 实现 TemplateService 服务
    - 实现 renderTemplate 方法（变量替换）
    - 实现模板缓存机制
    - 实现语言回退逻辑（找不到指定语言时回退到中文）
    - _需求: 19.2, 19.4, 19.9_
  
  - [x] 20.3 创建默认邮件模板
    - 欢迎邮件模板（中文/英文）
    - 密码重置邮件模板（中文/英文）
    - 邮箱验证邮件模板（中文/英文）
    - 登录通知邮件模板（中文/英文）
    - _需求: 19.3_
  
  - [x] 20.4 实现模板管理 API
    - 查询模板列表
    - 创建/更新模板
    - 预览模板（使用示例数据）
    - 模板版本管理
    - _需求: 19.5, 19.6, 19.7, 19.8_
  
  - [x] 20.5 集成模板系统到邮件服务
    - 更新 EmailServiceImpl 使用模板系统
    - 根据用户语言偏好选择模板
    - _需求: 19.4_

- [x] 21. 实现邮件发送队列系统
  - [x] 21.1 创建 EmailQueue 实体类和 Repository
    - 定义所有字段（recipient、subject、htmlContent、textContent、emailType、priority、status、retryCount、scheduledAt、sentAt）
    - 添加索引（status_priority、scheduled_at）
    - _需求: 20.2, 20.5_
  
  - [x] 21.2 实现 EmailQueueService 服务
    - 实现 enqueue 方法（加入队列）
    - 实现 getPendingEmails 方法（按优先级获取待发送邮件）
    - 实现 processQueueItem 方法（处理单个队列项）
    - 实现失败重试逻辑（指数退避）
    - _需求: 20.1, 20.6, 20.7, 20.8_
  
  - [x] 21.3 实现 EmailQueueWorker 后台任务
    - 使用 @Scheduled 定时处理队列（每 10 秒）
    - 使用线程池并发处理邮件
    - 配置 Worker 线程数和批次大小
    - _需求: 20.3, 20.4_
  
  - [x] 21.4 实现队列监控 API
    - 查询队列长度
    - 查询处理速度
    - 查询失败率
    - 手动重试失败的邮件
    - _需求: 20.9, 20.10_
  
  - [x] 21.5 更新邮件服务使用队列
    - 将同步发送改为异步队列
    - 高优先级邮件（验证码、密码重置）立即处理
    - 普通邮件进入队列
    - _需求: 20.1, 20.7_

### 第三期：规模化（可选）

- [x] 22. 实现监控和告警系统
  - [x] 22.1 创建 EmailMetrics 实体类
    - 记录每小时的发送统计（成功数、失败数、退信数、投诉数）
    - _需求: 21.1, 21.2, 21.3, 21.4, 21.5_
  
  - [x] 22.2 实现 MonitoringService 服务
    - 实时统计邮件发送指标
    - 计算成功率、失败率、退信率、投诉率
    - 计算平均发送延迟
    - _需求: 21.1, 21.2, 21.3, 21.4, 21.5_
  
  - [x] 22.3 实现告警规则引擎
    - 发送成功率低于 95% 触发告警
    - 退信率超过 5% 触发告警
    - 投诉率超过 0.1% 触发告警并自动暂停发送
    - _需求: 21.6, 21.7, 21.8_
  
  - [x] 22.4 实现监控仪表板
    - 实时显示关键指标
    - 图表展示趋势
    - _需求: 21.9_
  
  - [x] 22.5 实现告警通知
    - 支持邮件通知
    - 支持 Slack/钉钉 Webhook
    - _需求: 21.10_

- [x] 23. 实现订阅和退订管理
  - [x] 23.1 创建 UserEmailPreference 实体类
    - 记录用户的邮件订阅偏好
    - 支持按邮件类型设置（系统通知/营销邮件/产品更新）
    - _需求: 22.2, 22.3_
  
  - [x] 23.2 实现 SubscriptionService 服务
    - 查询用户订阅偏好
    - 更新订阅偏好
    - 记录变更历史
    - _需求: 22.6_
  
  - [x] 23.3 实现一键退订功能
    - 在通知邮件底部添加退订链接
    - 创建退订页面
    - 处理退订请求
    - _需求: 22.4, 22.5_
  
  - [x] 23.4 集成订阅系统到邮件发送
    - 区分事务性邮件和通知性邮件
    - 发送前检查用户订阅偏好
    - 确保事务性邮件不受退订影响
    - _需求: 22.1, 22.7, 22.9_
  
  - [x] 23.5 实现订阅偏好管理页面
    - 用户可以管理订阅偏好
    - 显示订阅历史
    - _需求: 22.8_

- [x] 24. 实现多发件人地址支持
  - [x] 24.1 扩展配置支持多发件人
    - 配置 noreply@、support@、security@ 等地址
    - 为不同邮件类型配置默认发件人
    - _需求: 23.1, 23.2, 23.3, 23.4, 23.5_
  
  - [x] 24.2 实现发件人自动选择逻辑
    - 根据邮件类型选择合适的发件人
    - 支持配置 Reply-To 地址
    - _需求: 23.6, 23.7_
  
  - [x] 24.3 验证所有发件人地址
    - 在 AWS SES 中验证所有发件人地址
    - 启动时检查验证状态
    - _需求: 23.8_

## 数据库迁移脚本

需要创建以下数据库迁移脚本：

1. `create_email_tokens_table.sql` - 创建 email_tokens 表
2. `create_email_suppression_list_table.sql` - 创建 email_suppression_list 表
3. `create_email_templates_table.sql` - 创建 email_templates 表
4. `create_email_queue_table.sql` - 创建 email_queue 表
5. `create_email_metrics_table.sql` - 创建 email_metrics 表
6. `create_user_email_preferences_table.sql` - 创建 user_email_preferences 表
7. `alter_user_add_email_verified.sql` - 为 user 表添加邮箱验证字段
8. `insert_default_email_templates.sql` - 插入默认邮件模板

## 配置更新

需要在 `application.yml` 中添加以下配置：

```yaml
email:
  queue:
    enabled: true
    worker-threads: 5
    batch-size: 10
  rate-limit:
    email-cooldown-seconds: 60
    ip-cooldown-seconds: 60
    user-daily-limit: 5
  monitoring:
    alert-threshold:
      success-rate: 0.95
      bounce-rate: 0.05
      complaint-rate: 0.001
  senders:
    noreply: "Polaris Tools <noreply@polaristools.online>"
    support: "Polaris Support <support@polaristools.online>"
    security: "Polaris Security <security@polaristools.online>"
```

## 实施建议

1. **第一期（MVP）** 应该在 2-3 周内完成，这些是上线必须的功能
2. **第二期（稳定投递）** 应该在上线后 1 个月内完成，避免送达率问题
3. **第三期（规模化）** 可以根据实际用户量和需求逐步实施

## 注意事项

- 所有新功能都应该编写单元测试
- 关键功能（Token、抑制列表）应该编写集成测试
- 定时任务应该配置合理的执行时间，避免影响业务高峰期
- 队列系统应该监控队列长度，避免积压
- 告警系统应该配置合理的阈值，避免误报
