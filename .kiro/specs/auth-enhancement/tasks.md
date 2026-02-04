# Implementation Plan: 认证增强功能

## Overview

本实现计划将 Polaris Tools 的认证系统进行全面增强，提供更好的用户体验和安全性。主要包括游客模式、Token 自动刷新、记住我功能、会话超时提醒等核心功能。

**当前状态**: 基础认证功能已完成（任务 1.1 和 1.2 已完成），现在需要继续完善游客模式和其他增强功能。

实现策略：
1. **优先实现 P0 功能** - 游客模式和加载状态优化
2. **然后实现 P1 功能** - Token 自动刷新和记住我功能
3. **最后实现 P2/P3 功能** - 会话超时提醒、测试和文档
4. 每个阶段完成后进行测试验证
5. 使用 checkpoint 任务确保阶段性验证

## Tasks

- [x] 1. 修改 AppContext 支持游客模式
  - 添加 `isGuest` 状态
  - 实现 `canAccessFeature` 权限检查函数
  - 实现 `promptLogin` 登录提示函数
  - 移除强制登录检查，允许未登录访问
  - _Requirements: 1.1, 1.2, 1.4, 1.6_

- [x] 2. 修改 App.tsx 路由逻辑
  - 移除未登录强制跳转到登录页的逻辑
  - 添加功能权限检查
  - 游客访问受限功能时显示登录提示
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 3. 修改 Header 组件
  - 游客模式显示"登录"和"注册"按钮
  - 登录用户显示"通知"和"退出"按钮
  - 优化按钮样式和布局
  - _Requirements: 1.5_

- [x] 4. 修改 Sidebar 组件
  - 定义菜单项的 `guestAllowed` 属性
  - 根据游客模式过滤菜单项
  - 添加游客登录提示卡片
  - _Requirements: 1.6_

- [x] 5. 创建 LoginPrompt 组件
  - 设计登录提示对话框 UI
  - 实现"立即登录"和"稍后再说"按钮
  - 集成到 AppContext
  - _Requirements: 1.4_

- [x] 6. 后端支持匿名统计
  - 修改工具使用统计 API，支持可选的 Authorization header
  - 区分登录用户和匿名用户的统计记录
  - 测试匿名统计功能
  - _Requirements: 1.3, 1.7_

- [x] 7. 实现游客使用次数限制
  - [x] 7.1 创建 GuestUsageManager 工具类
    - 实现使用次数记录和检查逻辑
    - 实现剩余次数计算
    - _Requirements: 1.8, 1.9_
  
  - [x] 7.2 实现每日重置功能（可选）
    - _Requirements: 1.8_
  
  - [ ]* 7.3 添加单元测试
    - 测试使用次数记录
    - 测试限制检查
    - _Requirements: 1.8, 1.9_

- [x] 8. 创建 GuestLimitDialog 组件
  - 设计游客限制对话框 UI
  - 实现警告模式（剩余次数提醒）
  - 实现阻止模式（强制登录）
  - 显示登录注册的好处列表
  - 集成登录和注册按钮
  - _Requirements: 1.9, 1.10_

- [x] 9. 集成游客限制到 AppContext
  - 添加 guestUsage 状态
  - 实现 checkGuestUsage 方法
  - 实现 recordGuestToolUsage 方法
  - 登录后清除游客使用记录
  - 渲染 GuestLimitDialog
  - _Requirements: 1.8, 1.9_

- [x] 10. 工具页面集成使用限制
  - 在工具使用前检查游客限制
  - 记录每次工具使用
  - 达到限制时阻止使用
  - 测试各个工具的限制功能
  - _Requirements: 1.8, 1.9_

- [x] 11. Header 显示剩余次数
  - 游客模式显示剩余使用次数徽章
  - 优化徽章样式和位置
  - 点击徽章显示详细信息
  - _Requirements: 1.10_


- [x] 12. Checkpoint - 验证游客模式功能
  - 确保游客可以访问基础功能
  - 测试使用次数限制
  - 验证登录提示功能

- [x] 13. 创建 LoadingScreen 组件
  - 设计品牌化的加载屏幕
  - 添加 Logo 动画
  - 支持自定义加载提示文本
  - 可选的进度条显示
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 14. 创建 Skeleton Screen 组件
  - 创建 SkeletonCard 组件
  - 创建 SkeletonList 组件
  - 添加脉冲动画效果
  - _Requirements: 5.6_

- [x] 15. 集成加载状态到应用
  - App.tsx 初始化使用 LoadingScreen
  - Dashboard 页面使用 SkeletonList
  - 其他页面添加适当的加载状态
  - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [x] 16. 优化加载体验
  - 添加加载超时提示（3秒后）
  - 添加加载失败重试功能
  - 优化动画性能
  - _Requirements: 5.5, 5.7_

- [x] 17. Checkpoint - 验证加载状态优化
  - 测试各种加载场景
  - 验证动画性能
  - 确保用户体验流畅

- [x] 18. 创建 TokenManager 工具类
  - [x] 18.1 实现 `parseToken` 方法（解析 JWT）
    - _Requirements: 2.1, 2.2_
  
  - [x] 18.2 实现 `getTimeUntilExpiry` 方法
    - _Requirements: 2.1_
  
  - [x] 18.3 实现 `getLifetimePercentage` 方法
    - _Requirements: 2.1_
  
  - [x] 18.4 实现 `shouldRefresh` 方法
    - _Requirements: 2.1_
  
  - [x] 18.5 实现 `startAutoRefresh` 方法
    - _Requirements: 2.1, 2.4_
  
  - [x] 18.6 实现 `stopAutoRefresh` 方法
    - _Requirements: 2.1_
  
  - [x] 18.7 添加单元测试
    - 测试 Token 解析
    - 测试过期时间计算
    - _Requirements: 2.1_

- [x] 19. 修改 API Client 添加拦截器
  - [x] 19.1 实现 401 错误拦截
    - _Requirements: 2.5_
  
  - [x] 19.2 实现 `handleUnauthorized` 方法
    - _Requirements: 2.5_
  
  - [x] 19.3 实现刷新队列机制（避免并发刷新）
    - _Requirements: 2.5_
  
  - [x] 19.4 实现请求重试逻辑
    - _Requirements: 2.5_
  
  - [x] 19.5 添加集成测试
    - 测试 Token 刷新流程
    - 测试并发请求处理
    - _Requirements: 2.5_

- [x] 20. 集成 TokenManager 到 AppContext
  - 登录时启动 TokenManager
  - 实现 `handleTokenRefresh` 方法
  - 刷新成功后更新状态
  - 刷新失败后清理状态并退出
  - 退出登录时停止 TokenManager
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 21. 后端支持 Token 刷新
  - 实现 `/api/v1/auth/refresh` 端点
  - 验证 Refresh Token 有效性
  - 生成新的 Access Token
  - 添加 API 测试
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 22. Checkpoint - 验证 Token 自动刷新
  - 测试 Token 自动刷新功能
  - 验证 401 错误处理
  - 确保刷新失败时正确退出

- [x] 23. 修改 Login 页面
  - 添加"记住我"复选框
  - 更新表单状态管理
  - 传递 `rememberMe` 参数到登录函数
  - 优化 UI 样式
  - _Requirements: 3.1_

- [x] 24. 修改 AppContext login 方法
  - 接收 `rememberMe` 参数
  - 传递参数到 API
  - 存储 `rememberMe` 状态到 localStorage
  - 根据状态设置不同的 Token 过期时间
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 25. 后端支持记住我
  - 修改 `UserLoginRequest` 添加 `rememberMe` 字段
  - 根据 `rememberMe` 设置不同的 Token 过期时间
  - 更新 JWT 生成逻辑
  - 添加 API 测试
  - _Requirements: 3.1, 3.2_

- [x] 26. Settings 页面管理记住我
  - 显示当前"记住我"状态
  - 允许用户修改设置
  - 修改后重新登录生效
  - _Requirements: 3.5, 3.6_

- [x] 27. Checkpoint - 验证记住我功能
  - 测试记住我登录流程
  - 验证 Token 过期时间
  - 确保设置页面功能正常

- [x] 28. 创建 SessionTimeoutDialog 组件
  - 设计对话框 UI
  - 实现倒计时显示
  - 实现"继续使用"按钮
  - 实现"退出登录"按钮
  - 实现关闭按钮
  - 添加滑入动画
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 29. 创建 useSessionTimeout Hook
  - 实现超时检测逻辑
  - 实现 `handleContinue` 方法
  - 实现 `handleLogout` 方法
  - 实现 `handleClose` 方法
  - 添加单元测试
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 30. 集成会话超时到 AppContext
  - 添加 `sessionExpiresAt` 状态
  - 添加 `showSessionTimeout` 用户偏好
  - 使用 useSessionTimeout Hook
  - 渲染 SessionTimeoutDialog
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 31. Settings 页面配置会话超时
  - 添加"会话超时提醒"开关
  - 保存用户偏好到 localStorage
  - 实时生效
  - _Requirements: 4.7_

- [x] 32. Checkpoint - 验证会话超时功能
  - 测试超时提醒显示
  - 验证继续使用功能
  - 确保用户偏好保存正确

- [x] 33. 编写单元测试
  - [x] 33.1 TokenManager 测试
    - _Requirements: 2.1_
  
  - [x] 33.2 权限检查函数测试
    - _Requirements: 1.1, 1.2, 1.4_
  
  - [x] 33.3 useSessionTimeout Hook 测试
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 34. 编写集成测试
  - [x] 34.1 游客模式功能测试
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_
  
  - [x] 34.2 Token 自动刷新测试
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [x] 34.3 记住我功能测试
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 34.4 会话超时测试
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 35. 编写 E2E 测试
  - [x] 35.1 游客使用工具流程
    - _Requirements: 1.1, 1.2, 1.3, 1.8, 1.9_
  
  - [x] 35.2 完整登录到退出流程
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4_
  
  - [x] 35.3 Token 过期场景
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 35.4 多设备登录场景
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 36. 性能优化
  - [x] 36.1 优化 Token 刷新性能
    - _Requirements: 2.1, 2.4_
  
  - [x] 36.2 优化加载动画性能
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_
  
  - [x] 36.3 减少不必要的重渲染
    - _Requirements: 1.1, 1.2, 2.1, 2.4_

- [-] 37. 安全审计
  - [x] 37.1 XSS 防护检查
    - _Requirements: 2.6_
  
  - [x] 37.2 CSRF 防护检查
    - _Requirements: 2.6_
  
  - [x] 37.3 Token 安全性检查
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

- [ ]* 38. 更新用户文档
  - [ ]* 38.1 游客模式使用指南
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_
  
  - [ ]* 38.2 "记住我"功能说明
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ]* 38.3 会话管理最佳实践
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ]* 39. 更新开发文档
  - [ ]* 39.1 API 集成指南
    - _Requirements: 1.3, 1.7, 2.1, 2.2, 2.3_
  
  - [ ]* 39.2 Token 管理最佳实践
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ]* 39.3 故障排查指南
    - _Requirements: 2.5, 2.6_

- [ ] 40. 部署准备
  - [ ] 40.1 配置环境变量
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 40.2 数据库迁移（如需要）
    - _Requirements: 1.3, 1.7_
  
  - [ ] 40.3 准备回滚计划
    - _Requirements: 所有_

- [x] 41. 监控设置
  - [x] 41.1 配置 Token 刷新监控
    - _Requirements: 2.1, 2.4, 2.5_
  
  - [x] 41.2 配置会话超时监控
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 41.3 配置游客转化率监控
    - _Requirements: 1.8, 1.9, 1.10_

- [ ] 42. Final Checkpoint - 完整系统测试
  - 确保所有测试通过
  - 手动测试所有功能
  - 验证性能和安全性
  - 准备部署

## Notes

- 标记 `*` 的任务为可选任务，可以根据时间和优先级决定是否实现
- 标记 `[x]` 的子任务表示已完成（如 TokenManager 和 API Client 的部分功能）
- 每个 Checkpoint 任务确保阶段性验证，发现问题及时修复
- 单元测试使用 Vitest 框架
- E2E 测试使用 Playwright 或 Cypress
- 所有任务都引用了对应的需求编号，确保可追溯性
- P0 任务（1-17）为最高优先级，必须完成
- P1 任务（18-27）为高优先级，应该完成
- P2 任务（28-32）为中优先级，建议完成
- P3 任务（33-42）为低优先级，可选完成
