# AWS SES 邮件集成 - 前端实现任务

## 概述

本文档描述了 AWS SES 邮件集成功能的前端实现任务。后端实现已完成，现在需要实现相应的前端界面来管理和监控邮件系统。

## 前端架构

### 页面结构
```
polaris-tools/pages/admin/
├── AdminEmails.tsx (已存在 - 需要增强)
├── AdminMonitoring.tsx (已存在 - 需要增强)
├── AdminEmailTemplates.tsx (新建)
├── AdminEmailQueue.tsx (新建)
├── AdminSuppressionList.tsx (新建)
└── AdminSubscriptions.tsx (新建)

polaris-tools/pages/
└── EmailPreferences.tsx (新建 - 用户订阅偏好管理)
```

### API 客户端扩展
需要在 `polaris-tools/api/adminClient.ts` 中添加新的 API 端点。

## 任务列表

### 阶段 1: 增强现有页面

- [x] 1. 增强 AdminEmails 页面
  - [x] 1.1 添加邮件详情查看功能
    - 点击邮件记录显示详细信息（完整内容、错误详情、重试历史）
    - 使用 Modal 组件展示详情
    - _需求: 5.9_
  
  - [x] 1.2 添加邮件重发功能
    - 对失败的邮件提供重发按钮
    - 确认对话框
    - _需求: 20.10_
  
  - [x] 1.3 添加批量操作功能
    - 批量删除旧邮件记录
    - 批量重试失败邮件
    - _需求: 5.9_
  
  - [x] 1.4 添加高级筛选
    - 按消息 ID 搜索
    - 按错误代码筛选
    - 导出筛选结果为 CSV
    - _需求: 5.9_

- [x] 2. 增强 AdminMonitoring 页面
  - [x] 2.1 集成邮件监控指标
    - 显示邮件发送成功率
    - 显示退信率和投诉率
    - 显示平均发送延迟
    - _需求: 21.1, 21.2, 21.3, 21.4, 21.5_
  
  - [x] 2.2 添加实时图表
    - 使用 Chart.js 或 Recharts 显示趋势图
    - 每小时发送量趋势
    - 成功率趋势
    - _需求: 21.9_
  
  - [x] 2.3 添加告警配置界面
    - 配置告警阈值
    - 配置通知方式（邮件/Webhook）
    - 查看告警历史
    - _需求: 21.6, 21.7, 21.8, 21.10_
  
  - [x] 2.4 添加队列监控
    - 显示队列长度
    - 显示处理速度
    - 显示失败率
    - _需求: 20.9_

### 阶段 2: 新建管理页面

- [x] 3. 创建 AdminEmailTemplates 页面
  - [x] 3.1 模板列表视图
    - 显示所有邮件模板
    - 支持按语言筛选
    - 支持按模板类型筛选
    - 显示模板状态（启用/禁用）
    - _需求: 19.1, 19.3_
  
  - [x] 3.2 模板编辑器
    - 富文本编辑器（HTML 内容）
    - 纯文本编辑器
    - 变量插入辅助工具
    - 实时预览功能
    - _需求: 19.2, 19.6, 19.8_
  
  - [x] 3.3 模板预览功能
    - 使用示例数据预览模板
    - 支持切换语言预览
    - 发送测试邮件
    - _需求: 19.6_
  
  - [x] 3.4 模板版本管理
    - 查看模板修改历史
    - 回滚到历史版本
    - 比较不同版本
    - _需求: 19.5_
  
  - [x] 3.5 创建默认模板
    - 提供默认模板创建向导
    - 支持从现有模板复制
    - _需求: 19.3_

- [x] 4. 创建 AdminEmailQueue 页面
  - [x] 4.1 队列概览
    - 显示队列长度
    - 显示处理速度（邮件/分钟）
    - 显示失败率
    - 显示平均等待时间
    - _需求: 20.9_
  
  - [x] 4.2 队列项列表
    - 显示待发送邮件
    - 显示正在处理的邮件
    - 显示失败的邮件
    - 支持按优先级排序
    - _需求: 20.5, 20.7_
  
  - [x] 4.3 队列管理操作
    - 手动重试失败邮件
    - 取消待发送邮件
    - 修改邮件优先级
    - 暂停/恢复队列处理
    - _需求: 20.10_
  
  - [x] 4.4 队列配置
    - 配置 Worker 线程数
    - 配置批次大小
    - 配置重试策略
    - _需求: 20.3, 20.4_

- [x] 5. 创建 AdminSuppressionList 页面
  - [x] 5.1 抑制列表视图
    - 显示所有被抑制的邮箱地址
    - 显示抑制原因（硬退信/软退信/投诉）
    - 显示抑制时间
    - 支持搜索和筛选
    - _需求: 17.8, 17.10_
  
  - [x] 5.2 手动添加抑制
    - 添加邮箱到抑制列表
    - 选择抑制原因
    - 添加备注
    - _需求: 17.9_
  
  - [x] 5.3 移除抑制
    - 从抑制列表移除邮箱
    - 确认对话框
    - 记录操作日志
    - _需求: 17.9_
  
  - [x] 5.4 批量操作
    - 批量导入抑制列表（CSV）
    - 批量导出抑制列表
    - 批量移除
    - _需求: 17.10_
  
  - [x] 5.5 软退信统计
    - 显示软退信计数
    - 显示即将被抑制的邮箱（软退信 >= 2 次）
    - _需求: 17.5_

- [x] 6. 创建 AdminSubscriptions 页面
  - [x] 6.1 订阅统计概览
    - 显示总订阅用户数
    - 显示各类型邮件的订阅率
    - 显示退订趋势
    - _需求: 22.2, 22.3_
  
  - [x] 6.2 用户订阅列表
    - 显示所有用户的订阅偏好
    - 支持按订阅状态筛选
    - 支持搜索用户
    - _需求: 22.6_
  
  - [x] 6.3 订阅偏好管理
    - 查看用户的订阅偏好详情
    - 管理员可以代替用户修改订阅偏好
    - 查看订阅变更历史
    - _需求: 22.6_
  
  - [x] 6.4 退订分析
    - 显示退订原因统计
    - 显示退订率趋势
    - 导出退订数据
    - _需求: 22.5_

### 阶段 3: 用户端功能

- [x] 7. 创建 EmailPreferences 页面（用户端）
  - [x] 7.1 订阅偏好设置
    - 显示所有可订阅的邮件类型
    - 切换开关控制订阅状态
    - 保存按钮
    - _需求: 22.8_
  
  - [x] 7.2 邮箱验证状态
    - 显示邮箱验证状态
    - 重新发送验证邮件按钮（带冷却时间）
    - 修改邮箱功能
    - _需求: 18.8, 18.9_
  
  - [x] 7.3 订阅历史
    - 显示订阅偏好变更历史
    - 显示收到的邮件历史
    - _需求: 22.6_

- [x] 8. 更新 Profile 页面
  - [x] 8.1 集成邮箱验证状态
    - 在用户资料页显示邮箱验证状态
    - 显示验证徽章
    - 重新发送验证邮件按钮
    - _需求: 18.8, 18.9_
  
  - [x] 8.2 修改邮箱流程
    - 修改邮箱表单
    - 二次验证（密码确认）
    - 发送验证邮件到新邮箱
    - _需求: 18.4, 18.5, 18.6, 18.7_

### 阶段 4: API 客户端实现

- [x] 9. 扩展 adminClient.ts
  - [x] 9.1 邮件模板 API
    ```typescript
    templates: {
      list: (params) => Promise<TemplateListResponse>
      get: (id) => Promise<TemplateResponse>
      create: (data) => Promise<TemplateResponse>
      update: (id, data) => Promise<TemplateResponse>
      delete: (id) => Promise<void>
      preview: (id, variables) => Promise<PreviewResponse>
      sendTest: (id, email) => Promise<void>
    }
    ```
  
  - [x] 9.2 邮件队列 API
    ```typescript
    queue: {
      stats: () => Promise<QueueStatsResponse>
      list: (params) => Promise<QueueListResponse>
      retry: (id) => Promise<void>
      cancel: (id) => Promise<void>
      updatePriority: (id, priority) => Promise<void>
      configure: (config) => Promise<void>
    }
    ```
  
  - [x] 9.3 抑制列表 API
    ```typescript
    suppression: {
      list: (params) => Promise<SuppressionListResponse>
      add: (data) => Promise<void>
      remove: (email) => Promise<void>
      import: (file) => Promise<ImportResult>
      export: () => Promise<Blob>
    }
    ```
  
  - [x] 9.4 订阅管理 API
    ```typescript
    subscriptions: {
      stats: () => Promise<SubscriptionStatsResponse>
      list: (params) => Promise<SubscriptionListResponse>
      get: (userId) => Promise<SubscriptionResponse>
      update: (userId, preferences) => Promise<void>
      history: (userId) => Promise<SubscriptionHistoryResponse>
    }
    ```
  
  - [x] 9.5 监控 API
    ```typescript
    monitoring: {
      metrics: (timeRange) => Promise<MetricsResponse>
      alerts: () => Promise<AlertsResponse>
      configureAlerts: (config) => Promise<void>
    }
    ```

- [x] 10. 扩展 client.ts（用户端 API）
  - [x] 10.1 邮箱验证 API
    ```typescript
    email: {
      verify: (token) => Promise<void>
      resendVerification: () => Promise<void>
      updateEmail: (newEmail, password) => Promise<void>
    }
    ```
  
  - [x] 10.2 订阅偏好 API
    ```typescript
    preferences: {
      get: () => Promise<PreferencesResponse>
      update: (preferences) => Promise<void>
      unsubscribe: (token, type) => Promise<void>
    }
    ```

### 阶段 5: 类型定义

- [x] 11. 创建类型定义文件
  - [x] 11.1 创建 `polaris-tools/types/email.ts`
    ```typescript
    // 邮件模板类型
    export interface EmailTemplate {
      id: number;
      code: string;
      name: string;
      language: string;
      subject: string;
      htmlContent: string;
      textContent: string;
      variables: string[];
      version: number;
      enabled: boolean;
      createdAt: string;
      updatedAt: string;
    }
    
    // 邮件队列类型
    export interface EmailQueueItem {
      id: number;
      recipient: string;
      subject: string;
      emailType: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
      retryCount: number;
      scheduledAt: string;
      sentAt?: string;
      errorMessage?: string;
    }
    
    // 抑制列表类型
    export interface SuppressionEntry {
      id: number;
      email: string;
      reason: 'HARD_BOUNCE' | 'SOFT_BOUNCE' | 'COMPLAINT';
      source: string;
      softBounceCount: number;
      notes?: string;
      createdAt: string;
      updatedAt: string;
    }
    
    // 订阅偏好类型
    export interface EmailPreferences {
      userId: number;
      systemNotifications: boolean;
      marketingEmails: boolean;
      productUpdates: boolean;
      updatedAt: string;
    }
    
    // 监控指标类型
    export interface EmailMetrics {
      totalSent: number;
      successCount: number;
      failureCount: number;
      bounceCount: number;
      complaintCount: number;
      successRate: number;
      bounceRate: number;
      complaintRate: number;
      averageDelay: number;
    }
    ```

### 阶段 6: 组件开发

- [x] 12. 创建共享组件
  - [x] 12.1 EmailTemplateEditor 组件
    - 富文本编辑器集成（TinyMCE 或 Quill）
    - 变量插入工具
    - 预览面板
    - _需求: 19.6, 19.8_
  
  - [x] 12.2 EmailMetricsChart 组件
    - 使用 Recharts 显示趋势图
    - 支持多种图表类型（折线图、柱状图）
    - 可配置时间范围
    - _需求: 21.9_
  
  - [x] 12.3 EmailStatusBadge 组件
    - 统一的状态徽章样式
    - 支持多种状态类型
    - 带图标和颜色
  
  - [x] 12.4 EmailVerificationBanner 组件
    - 在页面顶部显示邮箱未验证提示
    - 重新发送验证邮件按钮
    - 可关闭
    - _需求: 18.8_

### 阶段 7: 国际化

- [x] 13. 添加国际化文本
  - [x] 13.1 更新 `polaris-tools/i18n/locales/zh-CN.ts`
    - 添加所有新页面的中文文本
    - 添加错误消息
    - 添加成功消息
  
  - [x] 13.2 更新 `polaris-tools/i18n/locales/en-US.ts`
    - 添加所有新页面的英文文本
    - 添加错误消息
    - 添加成功消息

### 阶段 8: 路由配置

- [x] 14. 更新路由配置
  - [x] 14.1 更新 `polaris-tools/App.tsx`
    - 添加新的管理页面路由
    - 添加用户端邮件偏好页面路由
  
  - [x] 14.2 更新 AdminLayout 侧边栏
    - 添加新页面的导航链接
    - 添加图标
    - 更新菜单结构

### 阶段 9: 测试

- [x] 15. 编写测试
  - [x] 15.1 组件单元测试
    - 测试所有新组件的渲染
    - 测试用户交互
    - 测试错误处理
  
  - [x] 15.2 API 客户端测试
    - 测试所有 API 调用
    - 测试错误处理
    - 测试数据转换
  
  - [x] 15.3 集成测试
    - 测试完整的用户流程
    - 测试管理员流程
    - 测试边缘情况

### 阶段 10: 文档和优化

- [ ] 16. 文档更新
  - [ ] 16.1 更新用户文档
    - 邮箱验证流程说明
    - 订阅偏好管理说明
  
  - [ ] 16.2 更新管理员文档
    - 邮件模板管理指南
    - 抑制列表管理指南
    - 监控和告警配置指南

- [x] 17. 性能优化
  - [x] 17.1 实现数据缓存
    - 缓存模板列表
    - 缓存统计数据
  
  - [x] 17.2 实现懒加载
    - 大列表虚拟滚动
    - 图表按需加载
  
  - [x] 17.3 优化 API 调用
    - 防抖和节流
    - 批量请求合并

## 优先级建议

### P0 - 必须实现（MVP）
- 任务 1: 增强 AdminEmails 页面
- 任务 5: 创建 AdminSuppressionList 页面
- 任务 7: 创建 EmailPreferences 页面
- 任务 8: 更新 Profile 页面
- 任务 9-10: API 客户端实现
- 任务 11: 类型定义

### P1 - 强烈建议（稳定投递）
- 任务 3: 创建 AdminEmailTemplates 页面
- 任务 4: 创建 AdminEmailQueue 页面
- 任务 2: 增强 AdminMonitoring 页面
- 任务 12: 创建共享组件

### P2 - 可选（规模化）
- 任务 6: 创建 AdminSubscriptions 页面
- 任务 13: 国际化
- 任务 15: 测试
- 任务 17: 性能优化

## 技术栈

### 依赖库
```json
{
  "dependencies": {
    "recharts": "^2.10.0",  // 图表库
    "react-quill": "^2.0.0",  // 富文本编辑器
    "date-fns": "^2.30.0",  // 日期处理
    "file-saver": "^2.0.5"  // 文件导出
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.5"
  }
}
```

### 代码规范
- 使用 TypeScript 严格模式
- 遵循现有的组件结构和命名规范
- 使用 Tailwind CSS 进行样式设计
- 使用 React Hooks
- 使用 Context API 进行状态管理

## 注意事项

1. **向后兼容**: 确保新功能不影响现有功能
2. **错误处理**: 所有 API 调用都要有完善的错误处理
3. **加载状态**: 所有异步操作都要显示加载状态
4. **响应式设计**: 所有页面都要支持移动端
5. **权限控制**: 管理页面要检查管理员权限
6. **数据验证**: 表单提交前要进行客户端验证
7. **用户体验**: 提供清晰的反馈和提示信息
8. **性能**: 大列表要实现分页或虚拟滚动
9. **安全**: 敏感操作要二次确认
10. **可访问性**: 遵循 WCAG 2.1 标准

## 实施时间估算

- **阶段 1**: 2-3 天
- **阶段 2**: 5-7 天
- **阶段 3**: 2-3 天
- **阶段 4**: 2-3 天
- **阶段 5**: 1 天
- **阶段 6**: 3-4 天
- **阶段 7**: 1 天
- **阶段 8**: 1 天
- **阶段 9**: 3-4 天
- **阶段 10**: 2 天

**总计**: 约 22-31 天（3-4.5 周）

## 下一步

1. 审查本文档，确认需求和优先级
2. 安装必要的依赖库
3. 从 P0 任务开始实施
4. 每完成一个阶段进行代码审查
5. 持续测试和优化
