# Requirements Document

## Introduction

本规范旨在完成 Polaris Tools Platform 后端的基础类架构重构。在 Phase 1-6 中，我们已经创建了基础类（BaseEntity、BaseRequest、BaseResponse、BaseConverter、BaseService、BaseServiceImpl、BaseController）并重构了核心模块（Tool、Category、Document、Folder）。现在需要系统地重构剩余的文件，使其符合插件化架构标准。

本规范将评估每个未重构的文件，确定是否适合重构以及如何重构，特别考虑具有特殊业务逻辑的服务和特殊用途的 DTO。

## Glossary

- **System**: Polaris Tools Platform 后端系统
- **BaseEntity**: 实体基类，提供 id、createdAt、updatedAt、deletedAt 等通用字段
- **BaseRequest**: 请求 DTO 基类，提供分页参数（page、size、sortBy、sortOrder）
- **BaseResponse**: 响应 DTO 基类，提供 id、createdAt、updatedAt 等通用字段
- **BaseConverter**: 转换器基类，提供实体与 DTO 之间的转换方法
- **BaseService**: 服务接口基类，定义 CRUD 操作
- **BaseServiceImpl**: 服务实现基类，提供 CRUD 操作的默认实现
- **BaseController**: 控制器基类，提供 RESTful API 的标准端点
- **Special_Service**: 具有特殊业务逻辑的服务，可能不适合完全继承 BaseService
- **Special_DTO**: 特殊用途的 DTO，可能不需要继承 BaseRequest/BaseResponse
- **Refactoring_Candidate**: 需要评估是否适合重构的文件

## Requirements

### Requirement 1: 实体层架构统一

**User Story:** 作为开发者，我希望所有实体类都继承 BaseEntity，以便统一管理通用字段和行为。

#### Acceptance Criteria

1. WHEN 评估实体类时，THE System SHALL 确定该实体是否包含 id、createdAt、updatedAt 等通用字段
2. WHEN 实体类包含通用字段时，THE System SHALL 重构该实体以继承 BaseEntity
3. WHEN 实体类有特殊字段需求时，THE System SHALL 保留特殊字段并仅继承基础字段
4. THE System SHALL 重构 ToolUsage、UserFavorite、EmailAuditLog 实体类
5. WHEN 重构实体类后，THE System SHALL 确保所有相关的 Mapper、Service、Controller 正常工作

### Requirement 2: 请求 DTO 架构统一

**User Story:** 作为开发者，我希望所有请求 DTO 都继承 BaseRequest，以便统一管理分页和排序参数。

#### Acceptance Criteria

1. WHEN 评估请求 DTO 时，THE System SHALL 确定该 DTO 是否包含分页参数（page、size、sortBy、sortOrder）
2. WHEN 请求 DTO 包含分页参数时，THE System SHALL 重构该 DTO 以继承 BaseRequest
3. WHEN 请求 DTO 不需要分页时，THE System SHALL 评估是否仍需继承 BaseRequest 以保持架构一致性
4. THE System SHALL 重构 NotificationQueryRequest 以继承 BaseRequest
5. WHEN 重构请求 DTO 后，THE System SHALL 确保所有使用该 DTO 的 Controller 和 Service 正常工作

### Requirement 3: 响应 DTO 架构评估

**User Story:** 作为开发者，我希望评估响应 DTO 是否适合继承 BaseResponse，以便在保持架构一致性的同时满足特殊业务需求。

#### Acceptance Criteria

1. WHEN 评估响应 DTO 时，THE System SHALL 确定该 DTO 是否表示持久化实体的响应
2. WHEN 响应 DTO 表示持久化实体时，THE System SHALL 重构该 DTO 以继承 BaseResponse
3. WHEN 响应 DTO 是特殊用途（如登录响应、统计响应）时，THE System SHALL 评估继承 BaseResponse 是否合理
4. IF 继承 BaseResponse 会引入不必要的字段，THEN THE System SHALL 保持该 DTO 独立
5. THE System SHALL 评估并重构以下响应 DTO：DashboardStatsResponse、LoginResponse、EmailAuditLogResponse、EmailStatisticsResponse、SendEmailResponse

### Requirement 4: 转换器层架构统一

**User Story:** 作为开发者，我希望所有转换器都继承 BaseConverter，以便统一实体与 DTO 之间的转换逻辑。

#### Acceptance Criteria

1. WHEN 评估转换器时，THE System SHALL 确定该转换器是否执行实体与 DTO 之间的转换
2. WHEN 转换器执行标准转换时，THE System SHALL 重构该转换器以继承 BaseConverter
3. THE System SHALL 重构 UserConverter 以继承 BaseConverter
4. WHEN 重构转换器后，THE System SHALL 确保所有使用该转换器的 Service 正常工作
5. THE System SHALL 确保转换器正确处理 BaseEntity 和 BaseResponse 的通用字段

### Requirement 5: 服务层架构评估与重构

**User Story:** 作为开发者，我希望评估服务实现类是否适合继承 BaseServiceImpl，以便在保持架构一致性的同时满足特殊业务逻辑需求。

#### Acceptance Criteria

1. WHEN 评估服务实现类时，THE System SHALL 确定该服务是否执行标准 CRUD 操作
2. WHEN 服务执行标准 CRUD 操作时，THE System SHALL 重构该服务以继承 BaseServiceImpl
3. WHEN 服务有特殊业务逻辑（如认证、邮件发送）时，THE System SHALL 评估是否适合继承 BaseServiceImpl
4. IF 继承 BaseServiceImpl 会引入不必要的方法或复杂性，THEN THE System SHALL 保持该服务独立
5. THE System SHALL 评估并重构以下服务：AdminServiceImpl、AdminUserServiceImpl、AdminStatisticsServiceImpl、AuthServiceImpl、VersionServiceImpl、DocumentExportServiceImpl、EmailAuditLogServiceImpl、EmailServiceImpl、UsageServiceImpl、FavoriteServiceImpl、NotificationServiceImpl

### Requirement 6: 控制器层架构评估与重构

**User Story:** 作为开发者，我希望评估控制器是否适合继承 BaseController，以便在保持架构一致性的同时满足特殊 API 需求。

#### Acceptance Criteria

1. WHEN 评估控制器时，THE System SHALL 确定该控制器是否提供标准 RESTful CRUD 端点
2. WHEN 控制器提供标准 CRUD 端点时，THE System SHALL 重构该控制器以继承 BaseController
3. WHEN 控制器有特殊端点（如登录、统计、导出）时，THE System SHALL 评估是否适合继承 BaseController
4. IF 继承 BaseController 会引入不必要的端点或复杂性，THEN THE System SHALL 保持该控制器独立
5. THE System SHALL 评估并重构以下控制器：AuthController、AdminController、DocumentExportController、EmailController、FavoriteController、NotificationController、ModuleController、UsageController、VersionController

### Requirement 7: 重构优先级与分阶段执行

**User Story:** 作为项目经理，我希望按优先级分阶段执行重构，以便降低风险并确保系统稳定性。

#### Acceptance Criteria

1. THE System SHALL 将重构任务分为高、中、低优先级
2. WHEN 确定优先级时，THE System SHALL 考虑文件的使用频率、复杂度和业务重要性
3. THE System SHALL 优先重构简单且影响范围小的文件
4. THE System SHALL 在每个阶段完成后进行测试验证
5. WHEN 发现重构问题时，THE System SHALL 提供回滚机制

### Requirement 8: 向后兼容性保证

**User Story:** 作为开发者，我希望重构过程保持向后兼容性，以便不影响现有功能和 API。

#### Acceptance Criteria

1. WHEN 重构实体类时，THE System SHALL 确保数据库表结构不变
2. WHEN 重构 DTO 时，THE System SHALL 确保 API 请求和响应格式不变
3. WHEN 重构服务时，THE System SHALL 确保公共方法签名不变
4. WHEN 重构控制器时，THE System SHALL 确保 API 端点路径和参数不变
5. THE System SHALL 在重构后运行所有现有测试以验证兼容性

### Requirement 9: 代码质量与一致性

**User Story:** 作为开发者，我希望重构后的代码保持高质量和一致性，以便提高可维护性。

#### Acceptance Criteria

1. THE System SHALL 确保所有重构的类遵循相同的命名约定
2. THE System SHALL 确保所有重构的类包含适当的 JavaDoc 注释
3. THE System SHALL 确保所有重构的类遵循 SOLID 原则
4. THE System SHALL 移除重复代码并提取通用逻辑到基类
5. THE System SHALL 确保重构后的代码通过静态代码分析工具检查

### Requirement 10: 文档更新

**User Story:** 作为开发者，我希望更新相关文档以反映架构变更，以便团队成员了解新的架构标准。

#### Acceptance Criteria

1. WHEN 完成重构后，THE System SHALL 更新架构文档以反映新的基类继承关系
2. THE System SHALL 创建或更新开发指南，说明如何使用基类
3. THE System SHALL 记录哪些文件已重构、哪些文件保持独立以及原因
4. THE System SHALL 提供重构前后的对比示例
5. THE System SHALL 更新 API 文档（如果 API 有变化）
