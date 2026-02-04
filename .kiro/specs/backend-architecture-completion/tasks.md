# Implementation Plan: Backend Architecture Completion

## Overview

本实施计划将系统地完成 Polaris Tools Platform 后端的基础类架构重构。按照设计文档中的优先级矩阵，我们将分 7 个 Phase 逐步重构，每个 Phase 完成后进行验证。

重构遵循以下原则：
- 保持向后兼容性（API 和数据库）
- 分阶段执行，降低风险
- 充分测试，确保功能正常
- 不强制所有文件都继承基类

## Tasks

### Phase 1: 实体层重构（高优先级）

- [x] 1. 重构 UserFavorite 实体
  - [x] 1.1 创建数据库迁移脚本
    - 创建 `backend/src/main/resources/sql/migrate_user_favorite.sql`
    - 添加 `updated_at` 和 `deleted` 字段到 `t_user_favorite` 表
    - _Requirements: 1.2, 8.1_
  
  - [x] 1.2 修改 UserFavorite 实体类
    - 继承 BaseEntity
    - 移除重复的 id 和 createdAt 字段
    - 保留 userId 和 toolId 字段
    - _Requirements: 1.2, 1.3_
  
  - [x] 1.3 验证 UserFavoriteMapper 正常工作
    - 运行相关单元测试
    - 验证 MyBatis 映射正确
    - _Requirements: 1.5_
  
  - [ ]* 1.4 编写集成测试
    - 测试 UserFavorite 的 CRUD 操作
    - 验证软删除功能
    - _Requirements: 1.5_

- [x] 2. 重构 EmailAuditLog 实体
  - [x] 2.1 创建数据库迁移脚本
    - 创建 `backend/src/main/resources/sql/migrate_email_audit_log.sql`
    - 添加 `updated_at` 和 `deleted` 字段到 `email_audit_log` 表
    - _Requirements: 1.2, 8.1_
  
  - [x] 2.2 修改 EmailAuditLog 实体类
    - 继承 BaseEntity
    - 移除重复的 id 和 createdAt 字段
    - 保留所有特殊字段（recipient、subject、status 等）
    - _Requirements: 1.2, 1.3_
  
  - [x] 2.3 验证 EmailAuditLogMapper 正常工作
    - 运行相关单元测试
    - 验证 MyBatis 映射正确
    - _Requirements: 1.5_
  
  - [ ]* 2.4 编写集成测试
    - 测试 EmailAuditLog 的 CRUD 操作
    - 验证软删除功能
    - _Requirements: 1.5_

- [x] 3. Checkpoint - 验证实体层重构
  - 运行所有单元测试
  - 运行集成测试
  - 验证数据库迁移脚本
  - 询问用户是否有问题

### Phase 2: DTO 层重构（高优先级）

- [x] 4. 重构 NotificationQueryRequest
  - [x] 4.1 修改 NotificationQueryRequest 类
    - 继承 BaseRequest
    - 移除重复的 page 和 size 字段
    - 保留筛选条件字段（read、type）
    - _Requirements: 2.2, 2.4_
  
  - [x] 4.2 更新使用该 DTO 的 Controller
    - 验证 NotificationController 中的使用
    - 确保分页参数正确传递
    - _Requirements: 2.5_
  
  - [ ]* 4.3 编写 API 测试
    - 测试分页参数是否正常工作
    - 验证请求格式向后兼容
    - _Requirements: 2.5, 8.2_

- [x] 5. 重构 EmailAuditLogResponse
  - [x] 5.1 修改 EmailAuditLogResponse 类
    - 继承 BaseResponse
    - 移除重复的 id、createdAt、updatedAt 字段
    - 保留所有特殊字段
    - _Requirements: 3.2, 3.5_
  
  - [x] 5.2 更新 EmailAuditLogConverter
    - 确保转换器正确映射基类字段
    - 验证特殊字段的转换
    - _Requirements: 3.5_
  
  - [ ]* 5.3 编写 API 测试
    - 测试响应格式是否向后兼容
    - 验证所有字段都正确返回
    - _Requirements: 8.2_

- [x] 6. Checkpoint - 验证 DTO 层重构
  - 运行所有单元测试
  - 运行 API 测试
  - 验证请求和响应格式
  - 询问用户是否有问题

### Phase 3: 转换器层重构（高优先级）

- [x] 7. 重构 UserConverter
  - [x] 7.1 修改 UserConverter 接口
    - 继承 BaseConverter<User, UserResponse, UserRegisterRequest, UserUpdateRequest>
    - 保留现有的特殊转换方法（如 toUserResponse）
    - 确保 MapStruct 注解正确
    - _Requirements: 4.2, 4.3_
  
  - [x] 7.2 验证转换器方法
    - 测试 toResponse 方法
    - 测试 toEntity 方法
    - 测试 updateEntity 方法
    - _Requirements: 4.4, 4.5_
  
  - [ ]* 7.3 编写单元测试
    - 测试基类字段的转换
    - 测试特殊字段的转换
    - 验证 null 值处理
    - _Requirements: 4.4, 4.5_

- [x] 8. Checkpoint - 验证转换器层重构
  - 运行所有单元测试
  - 验证转换逻辑正确
  - 询问用户是否有问题

### Phase 4: 服务层重构（高优先级）

- [x] 9. 重构 EmailAuditLogServiceImpl
  - [x] 9.1 修改 EmailAuditLogServiceImpl 类
    - 继承 BaseServiceImpl
    - 注入 EmailAuditLogMapper 和 EmailAuditLogConverter
    - 保留特殊业务方法（如统计查询）
    - _Requirements: 5.2, 5.5_
  
  - [x] 9.2 更新 EmailAuditLogService 接口
    - 继承 BaseService
    - 保留特殊方法签名
    - _Requirements: 5.2_
  
  - [ ]* 9.3 编写单元测试
    - 测试 CRUD 操作
    - 测试特殊业务方法
    - _Requirements: 5.5_

- [x] 10. 重构 FavoriteServiceImpl
  - [x] 10.1 修改 FavoriteServiceImpl 类
    - 继承 BaseServiceImpl
    - 注入 UserFavoriteMapper 和相关 Converter
    - 保留特殊方法（addFavorite、removeFavorite、isFavorited）
    - _Requirements: 5.2, 5.5_
  
  - [x] 10.2 更新 FavoriteService 接口
    - 继承 BaseService
    - 保留特殊方法签名
    - _Requirements: 5.2_
  
  - [ ]* 10.3 编写单元测试
    - 测试添加收藏
    - 测试删除收藏
    - 测试查询收藏状态
    - _Requirements: 5.5_

- [x] 11. 重构 NotificationServiceImpl
  - [x] 11.1 修改 NotificationServiceImpl 类
    - 继承 BaseServiceImpl
    - 注入 NotificationMapper 和 NotificationConverter
    - 保留特殊业务方法
    - _Requirements: 5.2, 5.5_
  
  - [x] 11.2 更新 NotificationService 接口
    - 继承 BaseService
    - 保留特殊方法签名
    - _Requirements: 5.2_
  
  - [ ]* 11.3 编写单元测试
    - 测试 CRUD 操作
    - 测试通知标记为已读
    - _Requirements: 5.5_

- [x] 12. Checkpoint - 验证服务层重构（高优先级）
  - 运行所有单元测试
  - 运行集成测试
  - 验证业务逻辑正确
  - 询问用户是否有问题

### Phase 5: 控制器层重构（高优先级）

- [x] 13. 重构 FavoriteController
  - [x] 13.1 修改 FavoriteController 类
    - 继承 BaseController
    - 注入 FavoriteService
    - 保留特殊端点（addFavorite、removeFavorite）
    - _Requirements: 6.2, 6.5_
  
  - [x] 13.2 验证 API 端点
    - 确保端点路径不变
    - 确保请求和响应格式不变
    - _Requirements: 8.4_
  
  - [ ]* 13.3 编写 API 测试
    - 测试所有端点
    - 验证向后兼容性
    - _Requirements: 8.4_

- [x] 14. 重构 NotificationController
  - [x] 14.1 修改 NotificationController 类
    - 继承 BaseController
    - 注入 NotificationService
    - 保留特殊端点
    - _Requirements: 6.2, 6.5_
  
  - [x] 14.2 验证 API 端点
    - 确保端点路径不变
    - 确保请求和响应格式不变
    - _Requirements: 8.4_
  
  - [ ]* 14.3 编写 API 测试
    - 测试所有端点
    - 验证向后兼容性
    - _Requirements: 8.4_

- [x] 15. Checkpoint - 验证控制器层重构（高优先级）
  - 运行所有 API 测试
  - 使用 Postman 手动测试
  - 验证向后兼容性
  - 询问用户是否有问题

### Phase 6: 中优先级重构

- [x] 16. 重构 ToolUsage 实体（需要数据库迁移）
  - [x] 16.1 创建数据库迁移脚本
    - 创建 `backend/src/main/resources/sql/migrate_tool_usage.sql`
    - 添加 `created_at`、`updated_at` 和 `deleted` 字段
    - 考虑 `used_at` 字段的处理策略
    - _Requirements: 1.2, 8.1_
  
  - [x] 16.2 修改 ToolUsage 实体类
    - 继承 BaseEntity
    - 移除重复的 id 字段
    - 保留 usedAt 作为特殊字段
    - 保留所有其他字段
    - _Requirements: 1.2, 1.3, 1.4_
  
  - [x] 16.3 验证 ToolUsageMapper 正常工作
    - 运行相关单元测试
    - 验证 MyBatis 映射正确
    - _Requirements: 1.5_
  
  - [ ]* 16.4 编写集成测试
    - 测试 ToolUsage 的 CRUD 操作
    - 验证 usedAt 字段的语义
    - _Requirements: 1.5_

- [x] 17. 重构 UsageServiceImpl
  - [x] 17.1 修改 UsageServiceImpl 类
    - 继承 BaseServiceImpl
    - 注入 ToolUsageMapper 和相关 Converter
    - 保留统计和查询方法
    - _Requirements: 5.2, 5.5_
  
  - [x] 17.2 更新 UsageService 接口
    - 继承 BaseService
    - 保留特殊方法签名
    - _Requirements: 5.2_
  
  - [ ]* 17.3 编写单元测试
    - 测试使用记录的创建
    - 测试统计查询
    - _Requirements: 5.5_

- [x] 18. 重构 UsageController
  - [x] 18.1 修改 UsageController 类
    - 继承 BaseController
    - 注入 UsageService
    - 保留统计端点
    - _Requirements: 6.2, 6.5_
  
  - [x] 18.2 验证 API 端点
    - 确保端点路径不变
    - 确保请求和响应格式不变
    - _Requirements: 8.4_
  
  - [ ]* 18.3 编写 API 测试
    - 测试所有端点
    - 验证向后兼容性
    - _Requirements: 8.4_

- [x] 19. 重构 AdminUserServiceImpl
  - [x] 19.1 修改 AdminUserServiceImpl 类
    - 继承 BaseServiceImpl
    - 注入 UserMapper 和 UserConverter
    - 保留管理员特有方法
    - _Requirements: 5.2, 5.5_
  
  - [x] 19.2 更新 AdminUserService 接口
    - 继承 BaseService
    - 保留特殊方法签名
    - _Requirements: 5.2_
  
  - [ ]* 19.3 编写单元测试
    - 测试用户管理操作
    - 测试权限控制
    - _Requirements: 5.5_

- [x] 20. 重构 VersionServiceImpl
  - [x] 20.1 修改 VersionServiceImpl 类
    - 继承 BaseServiceImpl
    - 注入 VersionMapper 和 VersionConverter
    - 保留版本管理方法
    - _Requirements: 5.2, 5.5_
  
  - [x] 20.2 更新 VersionService 接口
    - 继承 BaseService
    - 保留特殊方法签名
    - _Requirements: 5.2_
  
  - [ ]* 20.3 编写单元测试
    - 测试版本 CRUD 操作
    - 测试版本比较逻辑
    - _Requirements: 5.5_

- [x] 21. 重构 ModuleController
  - [x] 21.1 修改 ModuleController 类
    - 继承 BaseController
    - 注入 ModuleService
    - 保留特殊端点
    - _Requirements: 6.2, 6.5_
  
  - [x] 21.2 验证 API 端点
    - 确保端点路径不变
    - 确保请求和响应格式不变
    - _Requirements: 8.4_
  
  - [ ]* 21.3 编写 API 测试
    - 测试所有端点
    - 验证向后兼容性
    - _Requirements: 8.4_

- [x] 22. 重构 VersionController
  - [x] 22.1 修改 VersionController 类
    - 继承 BaseController
    - 注入 VersionService
    - 保留特殊端点
    - _Requirements: 6.2, 6.5_
  
  - [x] 22.2 验证 API 端点
    - 确保端点路径不变
    - 确保请求和响应格式不变
    - _Requirements: 8.4_
  
  - [ ]* 22.3 编写 API 测试
    - 测试所有端点
    - 验证向后兼容性
    - _Requirements: 8.4_

- [x] 23. Checkpoint - 验证中优先级重构
  - 运行所有单元测试
  - 运行所有 API 测试
  - 验证数据库迁移
  - 询问用户是否有问题

### Phase 7: 低优先级重构

- [x] 24. 重构 DocumentExportServiceImpl
  - [x] 24.1 评估重构方案
    - 分析 DocumentExportService 的业务逻辑
    - 确定哪些方法可以继承自 BaseServiceImpl
    - 确定哪些方法需要保持独立
    - _Requirements: 5.2, 5.5_
  
  - [x] 24.2 修改 DocumentExportServiceImpl 类
    - 继承 BaseServiceImpl（如果适合）
    - 注入必要的 Mapper 和 Converter
    - 保留导出相关方法
    - _Requirements: 5.2, 5.5_
  
  - [x] 24.3 更新 DocumentExportService 接口
    - 继承 BaseService（如果适合）
    - 保留特殊方法签名
    - _Requirements: 5.2_
  
  - [ ]* 24.4 编写单元测试
    - 测试文档导出功能
    - 测试各种导出格式
    - _Requirements: 5.5_

- [x] 25. Checkpoint - 验证低优先级重构
  - 运行所有单元测试
  - 测试导出功能
  - 询问用户是否有问题

### Phase 8: 代码质量和文档

- [x] 26. 代码质量检查
  - [x] 26.1 运行静态代码分析
    - 使用 SonarQube 或类似工具
    - 检查代码规范
    - 检查潜在问题
    - _Requirements: 9.5_
  
  - [x] 26.2 验证命名约定
    - 检查所有重构的类是否遵循命名约定
    - 确保一致性
    - _Requirements: 9.1_
  
  - [x] 26.3 验证 JavaDoc 注释
    - 检查所有重构的类是否有适当的注释
    - 补充缺失的注释
    - _Requirements: 9.2_

- [x] 27. 更新文档
  - [x] 27.1 更新架构文档
    - 记录新的基类继承关系
    - 更新架构图
    - _Requirements: 10.1_
  
  - [x] 27.2 创建或更新开发指南
    - 说明如何使用基类
    - 提供代码示例
    - _Requirements: 10.2_
  
  - [x] 27.3 记录重构决策
    - 记录哪些文件已重构
    - 记录哪些文件保持独立以及原因
    - 提供重构前后的对比
    - _Requirements: 10.3, 10.4_
  
  - [x] 27.4 更新 API 文档（如果需要）
    - 检查 API 是否有变化
    - 更新 Swagger/OpenAPI 文档
    - _Requirements: 10.5_

- [ ] 28. 最终验证
  - 运行完整的测试套件
  - 执行回归测试
  - 验证所有功能正常
  - 准备部署

## Notes

- 任务标记 `*` 的为可选任务（主要是测试相关），可以跳过以加快 MVP 开发
- 每个 Checkpoint 都需要暂停并询问用户是否有问题
- 数据库迁移脚本需要在测试环境先验证
- 保持向后兼容性是最高优先级
- 如果发现问题，可以回滚到上一个 Checkpoint
- 建议每个 Phase 完成后提交到版本控制
- AuthService、EmailService、AdminService 等保持独立，不在本计划中重构
