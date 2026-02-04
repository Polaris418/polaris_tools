# 实施计划：后端插件化架构重构

## 概述

本实施计划将 Polaris Tools Platform 后端重构为插件化架构。采用渐进式重构策略，确保向后兼容，不影响现有功能。

**当前状态**：
- ✅ **Phase 1 完成**：基础架构组件已创建（BaseEntity, BaseRequest, BaseResponse, BaseConverter, BaseService, BaseServiceImpl, BaseController）
- ✅ **Phase 2 完成**：DocumentService 已重构（所有实体、DTO、Service、Controller 已迁移到插件化架构）
- ✅ **Phase 3 完成**：ToolService 已重构（所有实体、DTO、Converter、Service、Controller 已迁移到插件化架构）
- ✅ **Phase 4 完成**：CategoryService 已重构（所有实体、DTO、Converter、Service、Controller 已迁移到插件化架构）
- ✅ **Phase 5 完成**：其他服务已评估（User、UserFavorite 实体已重构；FavoriteService 和 UsageService 保持现有实现，因其业务逻辑特殊）
- ✅ **Phase 6 完成**：模块注册表系统已创建（ToolModuleConfig、ToolModuleRegistry、ModuleController）
- ⏳ **Phase 7 待完成**：测试和文档

**实施策略**：
1. **Phase 1**: 创建基础架构组件 ✅
2. **Phase 2**: 重构 DocumentService ✅
3. **Phase 3**: 重构 ToolService ✅
4. **Phase 4**: 重构 CategoryService ✅
5. **Phase 5**: 重构其他服务 ✅
6. **Phase 6**: 创建模块注册表 ✅
7. **Phase 7**: 测试和文档（待完成）

## 任务列表

### Phase 1: 创建基础架构组件（已完成 ✅）

- [x] 1.1 创建 BaseEntity
  - 定义 id, createdAt, updatedAt, deleted 字段
  - 添加 MyBatis-Plus 注解
  - _Requirements: 1.1_

- [x] 1.2 创建 BaseRequest 和 BaseResponse
  - BaseRequest 包含 page, size 字段
  - BaseResponse 包含 id, createdAt, updatedAt 字段
  - _Requirements: 1.2, 1.3_

- [x] 1.3 创建 BaseConverter 接口
  - 定义 toResponse(), toEntity(), updateEntity() 方法
  - _Requirements: 1.4_

- [x] 1.4 创建 BaseService 接口
  - 定义标准 CRUD 方法
  - _Requirements: 1.5_

- [x] 1.5 创建 BaseServiceImpl 抽象类
  - 实现默认 CRUD 操作
  - 提供钩子方法
  - _Requirements: 1.6, 7.1-7.14_

- [x] 1.6 创建 BaseController 抽象类
  - 实现标准 REST API 端点
  - _Requirements: 1.7_

### Phase 2: 重构 DocumentService（已完成 ✅）

- [x] 2.1 重构 UserDocument 实体
  - 继承 BaseEntity
  - 移除重复字段
  - _Requirements: 2.6_

- [x] 2.2 重构 DocumentFolder 实体
  - 继承 BaseEntity
  - 移除重复字段
  - _Requirements: 2.7_

- [x] 2.3 重构 DocumentVersion 实体
  - 继承 BaseEntity
  - 移除重复字段
  - _Requirements: 2.8_

- [x] 2.4 重构 DocumentExport 实体
  - 继承 BaseEntity
  - 移除重复字段
  - _Requirements: 2.9_

- [x] 2.5 重构 DocumentQueryRequest
  - 继承 BaseRequest
  - 移除 page, size 字段
  - _Requirements: 3.3_

- [x] 2.6 重构 DocumentResponse
  - 继承 BaseResponse
  - 移除重复字段
  - _Requirements: 3.6_

- [x] 2.7 重构 FolderResponse
  - 继承 BaseResponse
  - 移除重复字段
  - _Requirements: 3.6_

- [x] 2.8 重构 DocumentService 接口
  - 继承 BaseService
  - 保留扩展方法
  - _Requirements: 4.5_

- [x] 2.9 重构 DocumentServiceImpl 实现
  - 继承 BaseServiceImpl
  - 实现必需方法
  - 覆盖钩子方法
  - _Requirements: 4.6, 4.7, 4.8, 4.9, 4.10_

- [x] 2.10 验证编译和测试
  - 确保所有代码编译通过
  - 运行现有测试

### Phase 3: 重构 ToolService（已完成 ✅）

- [x] 3.1 重构 Tool 实体
  - 继承 BaseEntity
  - 移除重复字段（id, createdAt, updatedAt, deleted）
  - 保留 @TableField(exist = false) 的临时字段
  - _Requirements: 2.2_

- [x] 3.2 重构 ToolUsage 实体
  - 继承 BaseEntity
  - 移除重复字段（id）
  - 注意：ToolUsage 没有 createdAt/updatedAt，只有 usedAt
  - _Requirements: 2.5_

- [x] 3.3 重构 ToolQueryRequest
  - 继承 BaseRequest
  - 移除 page, size 字段
  - 保留其他查询字段（keyword, categoryId, toolType, isFeatured, sortBy, sortOrder）
  - _Requirements: 3.1_

- [x] 3.4 重构 ToolResponse
  - 继承 BaseResponse
  - 移除重复字段（id, createdAt, updatedAt）
  - 保留其他响应字段
  - _Requirements: 3.4_

- [x] 3.5 创建 ToolConverter 接口
  - 继承 BaseConverter
  - 使用 MapStruct @Mapper 注解
  - 实现 toResponse(), toEntity(), updateEntity() 方法
  - _Requirements: 6.1_

- [x] 3.6 重构 ToolService 接口
  - 继承 BaseService<Tool, ToolResponse, ToolCreateRequest, ToolUpdateRequest, ToolQueryRequest>
  - 保留扩展方法（incrementViewCount, recordToolUsage）
  - 移除已由 BaseService 提供的方法（listTools → list, getToolById → getById, createTool → create, updateTool → update, deleteTool → delete）
  - _Requirements: 4.1_

- [x] 3.7 重构 ToolServiceImpl 实现
  - 继承 BaseServiceImpl<Tool, ToolResponse, ToolCreateRequest, ToolUpdateRequest, ToolQueryRequest>
  - 实现 getMapper(), getConverter(), getResourceName()
  - 覆盖 buildQueryWrapper() 实现搜索和过滤（keyword, categoryId, toolType, isFeatured, sortBy）
  - 覆盖 validateCreate() 验证分类存在
  - 实现扩展方法（incrementViewCount, recordToolUsage）
  - _Requirements: 4.2, 4.7, 4.8, 4.9, 4.10_

- [x] 3.8 重构 ToolController
  - 继承 BaseController<Tool, ToolResponse, ToolCreateRequest, ToolUpdateRequest, ToolQueryRequest>
  - 实现 getService(), getResourceName()
  - 移除已由 BaseController 提供的端点（GET /, GET /{id}, POST /, PUT /{id}, DELETE /{id}）
  - 保留自定义端点（POST /{id}/view, POST /{id}/use）
  - _Requirements: 5.1, 5.4, 5.5, 5.6_

- [x] 3.9 验证编译和测试
  - 确保所有代码编译通过
  - 运行现有测试
  - 手动测试 API 端点（特别是搜索、过滤、排序功能）

### Phase 4: 重构 CategoryService（已完成 ✅）

- [x] 4.1 重构 Category 实体
  - 继承 BaseEntity
  - 移除重复字段（id, createdAt, updatedAt, deleted）
  - 保留 @TableField(exist = false) 的 toolCount 字段
  - _Requirements: 2.3_

- [x] 4.2 创建 CategoryQueryRequest
  - 继承 BaseRequest
  - 添加查询字段（keyword, status 等）
  - _Requirements: 3.2_

- [x] 4.3 重构 CategoryResponse
  - 继承 BaseResponse
  - 移除重复字段（id, createdAt, updatedAt）
  - 保留其他响应字段（name, nameZh, icon, accentColor, description, sortOrder, status, toolCount）
  - _Requirements: 3.5_

- [x] 4.4 创建 CategoryConverter 接口
  - 继承 BaseConverter
  - 使用 MapStruct @Mapper 注解
  - 实现 toResponse(), toEntity(), updateEntity() 方法
  - _Requirements: 6.2_

- [x] 4.5 重构 CategoryService 接口
  - 继承 BaseService<Category, CategoryResponse, CategoryCreateRequest, CategoryUpdateRequest, CategoryQueryRequest>
  - 移除已由 BaseService 提供的方法（getCategoryById → getById, createCategory → create, updateCategory → update, deleteCategory → delete）
  - 保留 listCategories() 方法（返回所有分类，按 sortOrder 排序）
  - _Requirements: 4.3_

- [x] 4.6 重构 CategoryServiceImpl 实现
  - 继承 BaseServiceImpl<Category, CategoryResponse, CategoryCreateRequest, CategoryUpdateRequest, CategoryQueryRequest>
  - 实现 getMapper(), getConverter(), getResourceName()
  - 覆盖 buildQueryWrapper() 实现查询条件（按 sortOrder 排序）
  - 覆盖 validateCreate() 验证名称唯一性
  - 覆盖 validateDelete() 检查是否有关联工具
  - 覆盖 convertToResponse() 添加 toolCount 字段
  - 实现 listCategories() 方法
  - _Requirements: 4.4, 4.7, 4.8, 4.9, 4.10_

- [x] 4.7 重构 CategoryController
  - 继承 BaseController<Category, CategoryResponse, CategoryCreateRequest, CategoryUpdateRequest, CategoryQueryRequest>
  - 实现 getService(), getResourceName()
  - 移除已由 BaseController 提供的端点（GET /{id}, POST /, PUT /{id}, DELETE /{id}）
  - 保留 GET / 端点（调用 listCategories() 而不是 list()）
  - _Requirements: 5.2, 5.4, 5.5, 5.6_

- [x] 4.8 验证编译和测试
  - 确保所有代码编译通过
  - 运行现有测试
  - 手动测试 API 端点

### Phase 5: 重构其他服务（已完成 ✅）

- [x] 5.1 重构 User 实体
  - 继承 BaseEntity
  - 移除重复字段（id, createdAt, updatedAt, deleted）
  - 保留其他字段（username, password, email, nickname, avatar, planType, planExpiredAt, status, lastLoginAt, lastLoginIp）
  - _Requirements: 2.1_

- [x] 5.2 重构 UserFavorite 实体
  - 继承 BaseEntity
  - 移除重复字段（id）
  - 注意：UserFavorite 只有 createdAt，没有 updatedAt 和 deleted
  - 保留其他字段（userId, toolId, createdAt）
  - _Requirements: 2.4_

- [x] 5.3 重构 UserResponse
  - 继承 BaseResponse
  - 移除重复字段（id, createdAt, updatedAt）
  - 保留其他响应字段
  - _Requirements: 3.7_

- [x] 5.4 UserConverter 已存在
  - 使用 MapStruct @Mapper 注解
  - 注意：User 实体主要用于认证，不需要完整的 BaseConverter 实现
  - _Requirements: 6.4_

- [x] 5.5 FavoriteService 保持现有实现
  - FavoriteService 的业务逻辑特殊（收藏关系管理），不适合继承 BaseService
  - 保留现有方法（addFavorite, removeFavorite, isFavorited, listFavorites）
  - _Requirements: 4.7, 4.8, 4.9, 4.10_

- [x] 5.6 UsageService 保持现有实现
  - UsageService 的业务逻辑特殊（统计查询），不适合继承 BaseService
  - 保留现有方法（getRecentTools, getPopularTools, getUserHistory）
  - _Requirements: 4.7, 4.8, 4.9, 4.10_

- [x] 5.7 验证所有服务
  - 确保所有代码编译通过
  - 运行完整测试套件
  - 手动测试所有 API 端点

### Phase 6: 创建模块注册表（已完成 ✅）

- [x] 6.1 创建 ToolModuleConfig 类
  - 创建 com.polaris.config.module.ToolModuleConfig 类
  - 定义模块配置字段（moduleId, moduleName, moduleNameZh, description, apiPrefix）
  - 定义类型信息字段（entityClass, responseClass, createRequestClass, updateRequestClass, queryRequestClass, serviceClass, serviceImplClass, controllerClass）
  - 定义功能开关字段（enableCRUD, enableBatchDelete, enableSoftDelete, enableVersioning, enableExport）
  - 定义权限配置字段（requiredRoles, requireAuth）
  - 使用 @Builder 和 @Data 注解
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 6.2 创建 ToolModuleRegistry 类
  - 创建 com.polaris.config.module.ToolModuleRegistry 类
  - 使用 @Component 注解
  - 实现 register(ToolModuleConfig) 方法
  - 实现 getModule(String moduleId) 方法
  - 实现 getAllModules() 方法
  - 使用 Map<String, ToolModuleConfig> 存储模块配置
  - _Requirements: 8.6, 8.7, 8.8, 8.9_

- [x] 6.3 注册所有工具模块
  - 在 ToolModuleRegistry 的 @PostConstruct init() 方法中注册所有模块
  - 注册 Tool 模块（moduleId: "tool"）
  - 注册 Category 模块（moduleId: "category"）
  - 注册 Document 模块（moduleId: "document"）
  - _Requirements: 8.10_

- [x] 6.4 创建模块查询 API
  - 创建 ModuleController 类
  - 实现 GET /api/v1/modules - 获取所有模块列表
  - 实现 GET /api/v1/modules/{moduleId} - 获取模块详情
  - 添加 Swagger 文档注解
  - _Requirements: 8.8, 8.9_

- [x] 6.5 验证模块注册表
  - 确保所有代码编译通过
  - 测试模块注册和查询功能
  - 验证所有模块正确注册

### Phase 7: 测试和文档

- [ ] 7.1 编写 BaseServiceImpl 单元测试
  - 创建 BaseServiceImplTest 测试类
  - 测试 list() 方法（分页查询）
  - 测试 count() 方法（统计数量）
  - 测试 getById() 方法（获取详情、不存在情况）
  - 测试 create() 方法（创建成功、验证钩子方法调用）
  - 测试 update() 方法（更新成功、实体不存在情况）
  - 测试 delete() 方法（删除成功、实体不存在情况）
  - 测试 batchDelete() 方法（批量删除）
  - 使用 Mockito 模拟 Mapper 和 Converter
  - _Requirements: 11.1_

- [ ] 7.2 编写 BaseController 单元测试
  - 创建 BaseControllerTest 测试类
  - 测试 GET / 端点（列表查询）
  - 测试 GET /{id} 端点（获取详情）
  - 测试 POST / 端点（创建）
  - 测试 PUT /{id} 端点（更新）
  - 测试 DELETE /{id} 端点（删除）
  - 测试 DELETE /batch 端点（批量删除）
  - 使用 MockMvc 进行 API 测试
  - 验证 Result 响应格式
  - _Requirements: 11.2_

- [ ] 7.3 编写 ToolServiceImpl 单元测试
  - 创建 ToolServiceImplTest 测试类
  - 测试 buildQueryWrapper() 方法（搜索、过滤、排序）
  - 测试 validateCreate() 方法（分类存在性验证）
  - 测试 incrementViewCount() 方法
  - 测试 recordToolUsage() 方法
  - 使用 Mockito 模拟依赖
  - _Requirements: 11.3_

- [ ] 7.4 编写 CategoryServiceImpl 单元测试
  - 创建 CategoryServiceImplTest 测试类
  - 测试 listCategories() 方法（按 sortOrder 排序）
  - 测试 validateCreate() 方法（名称唯一性验证）
  - 测试 validateDelete() 方法（关联工具检查）
  - 测试 convertToResponse() 方法（toolCount 字段）
  - 使用 Mockito 模拟依赖
  - _Requirements: 11.3_

- [ ] 7.5 编写 DocumentServiceImpl 单元测试
  - 创建 DocumentServiceImplTest 测试类
  - 测试自定义业务逻辑方法
  - 测试钩子方法覆盖
  - 使用 Mockito 模拟依赖
  - _Requirements: 11.3_

- [ ] 7.6 编写集成测试
  - 创建 ToolControllerIntegrationTest 测试类
  - 测试完整的 CRUD 流程（创建 → 查询 → 更新 → 删除）
  - 测试分页查询功能
  - 测试搜索和过滤功能
  - 测试事务管理和回滚
  - 使用 @SpringBootTest 和真实数据库（H2 或 TestContainers）
  - _Requirements: 11.4_

- [ ] 7.7 性能测试和优化
  - 创建性能测试脚本（JMeter 或 Gatling）
  - 测试分页查询性能（1000+ 条记录）
  - 测试搜索和过滤性能
  - 对比重构前后的响应时间
  - 识别慢查询并优化（添加索引）
  - 验证 MyBatis-Plus 查询效率
  - 记录性能测试结果
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 7.8 更新架构设计文档
  - 更新 BACKEND-PLUGIN-ARCHITECTURE.md
  - 添加实际实现的代码示例
  - 更新架构图（反映当前实现）
  - 添加钩子方法使用说明
  - 添加最佳实践章节
  - 添加常见问题解答（FAQ）
  - _Requirements: 12.1, 12.2, 12.6, 12.7_

- [ ] 7.9 更新快速开始指南
  - 更新 BACKEND-PLUGIN-QUICK-START.md
  - 验证所有代码示例可运行
  - 添加更多实际案例（基于现有模块）
  - 添加故障排查章节
  - 添加开发技巧和提示
  - _Requirements: 12.3, 12.6, 12.7_

- [ ] 7.10 编写最佳实践文档
  - 创建 BACKEND-PLUGIN-BEST-PRACTICES.md
  - 编写命名规范（Entity、DTO、Service、Controller）
  - 编写钩子方法使用指南
  - 编写错误处理最佳实践
  - 编写日志记录最佳实践
  - 编写性能优化建议
  - 编写安全性最佳实践
  - 添加代码示例和反例
  - _Requirements: 12.4, 12.6, 12.7, 12.8_

- [ ] 7.11 更新 API 文档
  - 检查所有 Controller 的 Swagger 注解完整性
  - 为 BaseController 添加详细的 @Operation 注解
  - 为所有 DTO 添加 @Schema 注解
  - 验证 Swagger UI 显示正确
  - 生成 OpenAPI 3.0 规范文件
  - 添加 API 使用示例
  - _Requirements: 12.5_

- [ ] 7.12 代码质量审查
  - 检查所有类的 JavaDoc 注释完整性
  - 检查命名规范一致性（类名、方法名、变量名）
  - 检查错误处理（BusinessException 使用）
  - 检查日志记录（log.info、log.debug、log.error）
  - 检查代码格式（使用 Checkstyle 或 SpotBugs）
  - 修复所有代码质量问题
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 7.13 最终验证和回归测试
  - 运行完整单元测试套件（确保 80%+ 覆盖率）
  - 运行完整集成测试套件
  - 手动测试所有 API 端点（Tool、Category、Document）
  - 验证 CRUD 操作正常工作
  - 验证搜索、过滤、排序功能
  - 验证分页功能
  - 验证软删除功能
  - 检查向后兼容性（API 端点、请求/响应格式）
  - 验证数据库 schema 未改变
  - 验证性能无回退
  - 验证模块注册表功能正常
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 11.5, 11.6, 11.7_

## 注意事项

- 每个 Phase 完成后进行验证
- 保持向后兼容，不破坏现有功能
- 渐进式重构，一次一个模块
- 及时更新文档
- 保持代码质量标准
- 定期提交代码，便于回滚

## 预期收益

| 维度 | 重构前 | 重构后 | 改进 |
|------|--------|--------|------|
| **开发时间** | 2-3 天 | 4-6 小时 | ⬇️ 75% |
| **代码行数** | ~800 行 | ~300 行 | ⬇️ 60% |
| **样板代码** | 大量 | 几乎没有 | ⬇️ 90% |
| **学习成本** | 高 | 低 | ⬇️ 70% |
| **维护成本** | 高 | 低 | ⬇️ 60% |
| **测试覆盖** | 60% | 80% | ⬆️ 33% |
