# Implementation Plan: Deleted Data Operations

## Overview

本实现计划将为管理后台的三个页面（用户管理、工具管理、分类管理）添加已删除数据的操作功能。实现将分为后端API开发、前端组件开发、集成和测试四个主要阶段。

实现策略：
1. 先实现后端API（恢复和永久删除端点）
2. 创建可复用的前端组件（确认对话框）
3. 在三个管理页面中集成新功能
4. 添加国际化支持
5. 编写测试验证功能

## Tasks

- [x] 1. 实现后端恢复和永久删除API
  - [x] 1.1 为UserController添加恢复和永久删除端点
    - 添加 PUT /api/v1/admin/users/{id}/restore 端点
    - 修改 DELETE /api/v1/admin/users/{id} 端点，支持 permanent=true 参数
    - 添加 @PreAuthorize("hasRole('ADMIN')") 权限验证
    - _Requirements: 2.8, 3.10, 4.2, 4.3, 4.4_
  
  - [x] 1.2 为UserService实现恢复和永久删除逻辑
    - 实现 restoreUser(Long id) 方法：设置 deleted=0
    - 实现 hardDeleteUser(Long id) 方法：物理删除记录
    - 添加验证逻辑：检查记录存在性、删除状态、唯一性约束
    - 使用 @Transactional 确保原子性
    - _Requirements: 2.3, 3.6, 6.1, 6.2, 6.5_
  
  - [x] 1.3 为UserMapper添加自定义查询方法
    - 添加 existsByUsernameAndDeletedNot 方法用于唯一性验证
    - _Requirements: 6.2_
  
  - [ ]* 1.4 为User相关API编写单元测试
    - 测试恢复操作成功场景
    - 测试永久删除成功场景
    - 测试权限验证（非管理员被拒绝）
    - 测试错误场景（记录不存在、验证失败）
    - _Requirements: 2.3, 3.6, 4.2, 4.3, 4.4_
  
  - [x] 1.5 为ToolController添加恢复和永久删除端点
    - 添加 PUT /api/v1/admin/tools/{id}/restore 端点
    - 修改 DELETE /api/v1/admin/tools/{id} 端点，支持 permanent=true 参数
    - 添加权限验证
    - _Requirements: 2.9, 3.11_
  
  - [x] 1.6 为ToolService实现恢复和永久删除逻辑
    - 实现 restoreTool 和 hardDeleteTool 方法
    - 添加验证和事务支持
    - _Requirements: 2.3, 3.6, 6.1, 6.2_
  
  - [x] 1.7 为CategoryController添加恢复和永久删除端点
    - 添加 PUT /api/v1/admin/categories/{id}/restore 端点
    - 修改 DELETE /api/v1/admin/categories/{id} 端点，支持 permanent=true 参数
    - 添加权限验证
    - _Requirements: 2.10, 3.12_
  
  - [x] 1.8 为CategoryService实现恢复和永久删除逻辑
    - 实现 restoreCategory 和 hardDeleteCategory 方法
    - 添加验证和事务支持
    - 处理外键约束（分类可能被工具引用）
    - _Requirements: 2.3, 3.6, 6.1, 6.2, 6.3_
  
  - [ ]* 1.9 编写后端属性测试
    - **Property 4: Restore Operation Changes Deleted Field**
    - **Validates: Requirements 2.3**
  
  - [ ]* 1.10 编写后端属性测试
    - **Property 6: Permanent Delete Removes Record**
    - **Validates: Requirements 3.6**
  
  - [ ]* 1.11 编写后端属性测试
    - **Property 12: Field Validation on Data Modification**
    - **Validates: Requirements 6.1, 6.2**

- [x] 2. Checkpoint - 验证后端API
  - 确保所有后端测试通过
  - 使用Postman或curl测试API端点
  - 如有问题请询问用户

- [x] 3. 创建前端可复用组件
  - [x] 3.1 创建ConfirmationDialog组件
    - 创建 polaris-tools/components/ConfirmationDialog.tsx
    - 实现Props接口：isOpen, title, message, confirmText, cancelText, onConfirm, onCancel, isDangerous
    - 使用Tailwind CSS实现样式（危险操作使用红色主题）
    - 支持国际化（使用i18n）
    - _Requirements: 3.2, 3.3, 3.4, 5.5_
  
  - [ ]* 3.2 为ConfirmationDialog编写单元测试
    - 测试对话框显示和隐藏
    - 测试确认和取消按钮功能
    - 测试危险模式样式
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [x] 3.3 创建DeletedDataActions组件
    - 创建 polaris-tools/components/DeletedDataActions.tsx
    - 实现Props接口：record, onEdit, onRestore, onPermanentDelete, isDeleted
    - 根据isDeleted条件渲染不同的操作按钮
    - 使用国际化文本
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1_
  
  - [ ]* 3.4 为DeletedDataActions编写单元测试
    - 测试已删除记录显示三个操作按钮
    - 测试正常记录显示常规操作按钮
    - 测试按钮点击触发正确的回调
    - _Requirements: 1.1, 2.1, 3.1_

- [x] 4. 在AdminUsers页面集成已删除数据操作
  - [x] 4.1 修改AdminUsers.tsx添加操作函数
    - 添加 handleRestore 函数：调用 PUT /api/v1/admin/users/{id}/restore
    - 添加 handlePermanentDelete 函数：显示确认对话框
    - 添加 confirmPermanentDelete 函数：调用 DELETE API with permanent=true
    - 修改 handleEdit 函数：允许编辑已删除记录
    - 添加加载状态和错误处理
    - _Requirements: 1.4, 1.6, 2.2, 2.3, 3.5, 3.6_
  
  - [x] 4.2 在AdminUsers.tsx中集成DeletedDataActions组件
    - 在表格的操作列中使用DeletedDataActions组件
    - 传递正确的props和回调函数
    - _Requirements: 1.1, 2.1, 3.1_
  
  - [x] 4.3 在AdminUsers.tsx中集成ConfirmationDialog组件
    - 添加deleteConfirmation状态
    - 在页面底部渲染ConfirmationDialog
    - 配置对话框文本和回调
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [x] 4.4 添加操作反馈和状态管理
    - 操作期间显示加载指示器
    - 成功时显示success toast
    - 失败时显示error toast
    - 操作后刷新列表并保持过滤状态
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7_
  
  - [ ]* 4.5 为AdminUsers页面编写集成测试
    - 测试编辑已删除用户
    - 测试恢复用户
    - 测试永久删除用户（包含确认流程）
    - 测试错误处理
    - _Requirements: 1.6, 2.3, 3.6_

- [x] 5. 在AdminTools页面集成已删除数据操作
  - [x] 5.1 修改AdminTools.tsx添加操作函数
    - 添加 handleRestore、handlePermanentDelete、confirmPermanentDelete 函数
    - 修改 handleEdit 函数
    - 添加加载状态和错误处理
    - _Requirements: 1.4, 1.6, 2.2, 2.3, 3.5, 3.6_
  
  - [x] 5.2 在AdminTools.tsx中集成组件
    - 集成DeletedDataActions组件
    - 集成ConfirmationDialog组件
    - 添加操作反馈
    - _Requirements: 1.2, 2.1, 3.1, 3.2, 5.1, 5.2, 5.3_
  
  - [ ]* 5.3 为AdminTools页面编写集成测试
    - 测试工具的编辑、恢复、永久删除操作
    - _Requirements: 1.6, 2.3, 3.6_

- [x] 6. 在AdminCategories页面集成已删除数据操作
  - [x] 6.1 修改AdminCategories.tsx添加操作函数
    - 添加 handleRestore、handlePermanentDelete、confirmPermanentDelete 函数
    - 修改 handleEdit 函数
    - 添加加载状态和错误处理
    - _Requirements: 1.4, 1.6, 2.2, 2.3, 3.5, 3.6_
  
  - [x] 6.2 在AdminCategories.tsx中集成组件
    - 集成DeletedDataActions组件
    - 集成ConfirmationDialog组件
    - 添加操作反馈
    - _Requirements: 1.3, 2.1, 3.1, 3.2, 5.1, 5.2, 5.3_
  
  - [ ]* 6.3 为AdminCategories页面编写集成测试
    - 测试分类的编辑、恢复、永久删除操作
    - 测试外键约束处理
    - _Requirements: 1.6, 2.3, 3.6, 6.3_

- [x] 7. Checkpoint - 验证前端功能
  - 确保所有前端测试通过
  - 手动测试三个管理页面的所有操作
  - 验证国际化文本显示正确
  - 如有问题请询问用户

- [x] 8. 添加国际化支持
  - [x] 8.1 添加中文翻译
    - 在 polaris-tools/i18n/locales 中添加翻译键值
    - 包含：edit, restore, permanentDelete, restoreSuccess, restoreFailed, permanentDeleteSuccess, permanentDeleteFailed, confirmPermanentDelete, permanentDeleteWarning
    - _Requirements: 5.4_
  
  - [x] 8.2 添加英文翻译
    - 在 polaris-tools/i18n/locales 中添加翻译键值
    - 确保与中文翻译键名一致
    - _Requirements: 5.4_
  
  - [ ]* 8.3 编写国际化属性测试
    - **Property 9: Internationalization Support**
    - **Validates: Requirements 5.4**

- [ ] 9. 编写前端属性测试
  - [ ]* 9.1 编写属性测试
    - **Property 1: Deleted Record Actions Visibility**
    - **Validates: Requirements 1.1, 2.1, 3.1**
  
  - [ ]* 9.2 编写属性测试
    - **Property 3: Deleted Status Preservation During Edit**
    - **Validates: Requirements 1.6**
  
  - [ ]* 9.3 编写属性测试
    - **Property 5: View Filtering After Restore**
    - **Validates: Requirements 2.5, 2.6**
  
  - [ ]* 9.4 编写属性测试
    - **Property 8: Operation Feedback Messages**
    - **Validates: Requirements 5.2, 5.3**
  
  - [ ]* 9.5 编写属性测试
    - **Property 10: Filter State Preservation**
    - **Validates: Requirements 5.6**
  
  - [ ]* 9.6 编写属性测试
    - **Property 11: Pagination Preservation**
    - **Validates: Requirements 5.7**

- [ ] 10. 最终集成和验证
  - [x] 10.1 端到端测试
    - 测试完整的用户工作流：查看已删除 → 编辑 → 保存
    - 测试完整的恢复工作流：查看已删除 → 恢复 → 验证出现在正常列表
    - 测试完整的永久删除工作流：查看已删除 → 删除 → 确认 → 验证从数据库移除
    - 在三个管理页面上重复测试
    - _Requirements: 1.6, 2.3, 2.5, 2.6, 3.6_
  
  - [ ] 10.2 权限测试
    - 使用非管理员账户测试，验证操作被拒绝
    - 验证后端返回403错误
    - 验证前端显示权限错误消息
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ] 10.3 错误场景测试
    - 测试网络错误处理
    - 测试并发操作（同时编辑和删除）
    - 测试验证错误（恢复时用户名冲突）
    - 测试外键约束错误（删除被引用的分类）
    - _Requirements: 1.8, 2.7, 3.9, 6.3, 6.4_

- [ ] 11. Final Checkpoint - 确保所有测试通过
  - 运行所有单元测试
  - 运行所有属性测试
  - 运行所有集成测试
  - 确认所有功能正常工作
  - 如有问题请询问用户

## Notes

- 任务标记 `*` 的为可选测试任务，可以跳过以加快MVP开发
- 每个任务都引用了具体的需求编号以确保可追溯性
- Checkpoint任务确保增量验证
- 属性测试验证通用正确性属性（最少100次迭代）
- 单元测试验证具体示例和边缘情况
- 后端使用jqwik进行属性测试，前端使用fast-check
