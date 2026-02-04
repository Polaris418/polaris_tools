# 需求文档：后端插件化架构重构

## 介绍

本文档定义了将 Polaris Tools Platform 后端重构为插件化架构的需求。重构目标是消除重复代码，提高开发效率，建立标准化的开发流程，使添加新工具功能变得简单、快速、标准化。

## 术语表

- **Backend_System**: 后端系统
- **Plugin_Architecture**: 插件化架构
- **Base_Classes**: 基础类（BaseEntity、BaseService、BaseController 等）
- **Tool_Module**: 工具模块（如 MD2Word、PDF Merger 等）
- **CRUD_Operations**: 创建、读取、更新、删除操作
- **Service_Layer**: 服务层
- **Controller_Layer**: 控制器层
- **Entity_Layer**: 实体层
- **DTO_Layer**: 数据传输对象层
- **Mapper_Layer**: 数据访问层
- **Hook_Method**: 钩子方法（生命周期回调）
- **Module_Registry**: 模块注册表

## 需求

### Requirement 1: 创建基础架构组件

**User Story:** 作为开发者，我希望有一套通用的基础类，以便快速开发新功能而不需要重复编写样板代码。

#### Acceptance Criteria

1. THE Backend_System SHALL provide BaseEntity class with common fields: id, createdAt, updatedAt, deleted
2. THE Backend_System SHALL provide BaseRequest class with pagination fields: page, size
3. THE Backend_System SHALL provide BaseResponse class with common fields: id, createdAt, updatedAt
4. THE Backend_System SHALL provide BaseConverter interface for entity-DTO conversion
5. THE Backend_System SHALL provide BaseService interface with standard CRUD operations
6. THE Backend_System SHALL provide BaseServiceImpl abstract class with default CRUD implementations
7. THE Backend_System SHALL provide BaseController abstract class with standard REST API endpoints
8. WHEN a developer creates a new entity, THE entity SHALL extend BaseEntity
9. WHEN a developer creates a new service, THE service SHALL extend BaseServiceImpl

### Requirement 2: 实体层重构

**User Story:** 作为开发者，我希望所有实体类继承 BaseEntity，以便消除重复的字段定义。

#### Acceptance Criteria

1. THE User entity SHALL extend BaseEntity
2. THE Tool entity SHALL extend BaseEntity
3. THE Category entity SHALL extend BaseEntity
4. THE UserFavorite entity SHALL extend BaseEntity
5. THE ToolUsage entity SHALL extend BaseEntity
6. THE UserDocument entity SHALL extend BaseEntity
7. THE DocumentFolder entity SHALL extend BaseEntity
8. THE DocumentVersion entity SHALL extend BaseEntity
9. THE DocumentExport entity SHALL extend BaseEntity
10. WHEN an entity extends BaseEntity, THE entity SHALL not define id, createdAt, updatedAt, deleted fields
11. WHEN an entity is saved, THE createdAt field SHALL be automatically set
12. WHEN an entity is updated, THE updatedAt field SHALL be automatically updated

### Requirement 3: DTO 层重构

**User Story:** 作为开发者，我希望所有查询请求 DTO 继承 BaseRequest，所有响应 DTO 继承 BaseResponse，以便统一分页和公共字段。

#### Acceptance Criteria

1. THE ToolQueryRequest SHALL extend BaseRequest
2. THE CategoryQueryRequest SHALL extend BaseRequest
3. THE DocumentQueryRequest SHALL extend BaseRequest
4. THE ToolResponse SHALL extend BaseResponse
5. THE CategoryResponse SHALL extend BaseResponse
6. THE DocumentResponse SHALL extend BaseResponse
7. THE UserResponse SHALL extend BaseResponse
8. WHEN a query request extends BaseRequest, THE request SHALL not define page, size fields
9. WHEN a response extends BaseResponse, THE response SHALL not define id, createdAt, updatedAt fields

### Requirement 4: 服务层重构

**User Story:** 作为开发者，我希望所有服务类继承 BaseServiceImpl，以便自动获得标准 CRUD 操作。

#### Acceptance Criteria

1. THE ToolService SHALL extend BaseService interface
2. THE ToolServiceImpl SHALL extend BaseServiceImpl abstract class
3. THE CategoryService SHALL extend BaseService interface
4. THE CategoryServiceImpl SHALL extend BaseServiceImpl abstract class
5. THE DocumentService SHALL extend BaseService interface
6. THE DocumentServiceImpl SHALL extend BaseServiceImpl abstract class
7. WHEN a service extends BaseServiceImpl, THE service SHALL implement getMapper(), getConverter(), getResourceName() methods
8. WHEN a service extends BaseServiceImpl, THE service SHALL automatically have list(), count(), getById(), create(), update(), delete(), batchDelete() methods
9. WHEN a service needs custom logic, THE service SHALL override hook methods: validateCreate(), beforeCreate(), afterCreate(), etc.
10. WHEN a service needs custom query conditions, THE service SHALL override buildQueryWrapper() method

### Requirement 5: 控制器层重构

**User Story:** 作为开发者，我希望所有控制器类继承 BaseController，以便自动获得标准 REST API 端点。

#### Acceptance Criteria

1. THE ToolController SHALL extend BaseController abstract class
2. THE CategoryController SHALL extend BaseController abstract class
3. THE DocumentController SHALL extend BaseController abstract class
4. WHEN a controller extends BaseController, THE controller SHALL implement getService(), getResourceName() methods
5. WHEN a controller extends BaseController, THE controller SHALL automatically have GET /, GET /{id}, POST /, PUT /{id}, DELETE /{id}, DELETE /batch endpoints
6. WHEN a controller needs custom endpoints, THE controller SHALL add additional methods with appropriate annotations
7. WHEN a controller endpoint is called, THE endpoint SHALL return Result<T> wrapper
8. WHEN a controller endpoint is called, THE endpoint SHALL log request and response

### Requirement 6: 转换器层重构

**User Story:** 作为开发者，我希望所有转换器接口继承 BaseConverter，以便统一转换逻辑。

#### Acceptance Criteria

1. THE ToolConverter SHALL extend BaseConverter interface
2. THE CategoryConverter SHALL extend BaseConverter interface
3. THE DocumentConverter SHALL extend BaseConverter interface
4. THE UserConverter SHALL extend BaseConverter interface
5. WHEN a converter extends BaseConverter, THE converter SHALL implement toResponse(), toEntity(), updateEntity() methods
6. WHEN a converter uses MapStruct, THE converter SHALL be annotated with @Mapper(componentModel = "spring")

### Requirement 7: 钩子方法支持

**User Story:** 作为开发者，我希望能够通过钩子方法自定义业务逻辑，以便在不修改基础代码的情况下扩展功能。

#### Acceptance Criteria

1. THE BaseServiceImpl SHALL provide validateGetById() hook method
2. THE BaseServiceImpl SHALL provide validateCreate() hook method
3. THE BaseServiceImpl SHALL provide beforeCreate() hook method
4. THE BaseServiceImpl SHALL provide afterCreate() hook method
5. THE BaseServiceImpl SHALL provide validateUpdate() hook method
6. THE BaseServiceImpl SHALL provide beforeUpdate() hook method
7. THE BaseServiceImpl SHALL provide afterUpdate() hook method
8. THE BaseServiceImpl SHALL provide validateDelete() hook method
9. THE BaseServiceImpl SHALL provide beforeDelete() hook method
10. THE BaseServiceImpl SHALL provide afterDelete() hook method
11. THE BaseServiceImpl SHALL provide buildQueryWrapper() hook method
12. THE BaseServiceImpl SHALL provide convertToResponse() hook method
13. WHEN a hook method is not overridden, THE default implementation SHALL be used
14. WHEN a hook method is overridden, THE custom implementation SHALL be executed

### Requirement 8: 模块注册表系统

**User Story:** 作为开发者，我希望有一个模块注册表系统，以便集中管理所有工具模块的配置。

#### Acceptance Criteria

1. THE Backend_System SHALL provide ToolModuleConfig class
2. THE ToolModuleConfig SHALL contain moduleId, moduleName, moduleNameZh, description, apiPrefix fields
3. THE ToolModuleConfig SHALL contain entityClass, responseClass, createRequestClass, updateRequestClass, queryRequestClass fields
4. THE ToolModuleConfig SHALL contain serviceClass, serviceImplClass, controllerClass fields
5. THE ToolModuleConfig SHALL contain feature flags: enableCRUD, enableBatchDelete, enableSoftDelete, enableVersioning, enableExport
6. THE Backend_System SHALL provide ToolModuleRegistry class
7. THE ToolModuleRegistry SHALL provide register() method to register tool modules
8. THE ToolModuleRegistry SHALL provide getModule() method to retrieve module configuration
9. THE ToolModuleRegistry SHALL provide getAllModules() method to list all registered modules
10. WHEN application starts, THE ToolModuleRegistry SHALL initialize and register all tool modules

### Requirement 9: 向后兼容性

**User Story:** 作为开发者，我希望重构过程是渐进式的，不会破坏现有功能。

#### Acceptance Criteria

1. WHEN entities are refactored, THE database schema SHALL remain unchanged
2. WHEN services are refactored, THE API endpoints SHALL remain unchanged
3. WHEN controllers are refactored, THE request/response format SHALL remain unchanged
4. WHEN a module is refactored, THE existing tests SHALL continue to pass
5. THE refactoring SHALL be done incrementally, one module at a time
6. THE refactoring SHALL not require database migration

### Requirement 10: 代码质量标准

**User Story:** 作为开发者，我希望重构后的代码符合高质量标准，以便易于维护和扩展。

#### Acceptance Criteria

1. THE refactored code SHALL have comprehensive JavaDoc comments
2. THE refactored code SHALL follow consistent naming conventions
3. THE refactored code SHALL have proper error handling
4. THE refactored code SHALL have appropriate logging
5. THE refactored code SHALL use Lombok to reduce boilerplate
6. THE refactored code SHALL use MapStruct for object conversion
7. THE refactored code SHALL have transaction management where appropriate
8. THE refactored code SHALL validate input parameters
9. THE refactored code SHALL throw BusinessException with appropriate ErrorCode
10. THE refactored code SHALL be formatted consistently

### Requirement 11: 测试覆盖

**User Story:** 作为开发者，我希望重构后的代码有完整的测试覆盖，以便确保功能正确性。

#### Acceptance Criteria

1. THE BaseServiceImpl SHALL have unit tests for all CRUD operations
2. THE BaseController SHALL have unit tests for all REST endpoints
3. THE refactored services SHALL have unit tests for custom business logic
4. THE refactored services SHALL have integration tests for database operations
5. THE test coverage SHALL be at least 80% for service layer
6. THE test coverage SHALL be at least 70% for controller layer
7. WHEN a test fails, THE error message SHALL be clear and actionable

### Requirement 12: 文档更新

**User Story:** 作为开发者，我希望有完整的文档，以便快速学习和使用插件化架构。

#### Acceptance Criteria

1. THE Backend_System SHALL provide architecture design document
2. THE Backend_System SHALL provide quick start guide
3. THE Backend_System SHALL provide development guide
4. THE Backend_System SHALL provide best practices document
5. THE Backend_System SHALL provide API documentation using Swagger
6. THE documentation SHALL include code examples
7. THE documentation SHALL include diagrams
8. THE documentation SHALL be written in Chinese
9. THE documentation SHALL be kept up-to-date with code changes

### Requirement 13: 性能优化

**User Story:** 作为开发者，我希望重构后的代码性能不低于重构前，以便保证用户体验。

#### Acceptance Criteria

1. THE refactored code SHALL not introduce performance regression
2. THE BaseServiceImpl SHALL use efficient query methods
3. THE BaseServiceImpl SHALL support pagination for large result sets
4. THE BaseServiceImpl SHALL use appropriate database indexes
5. THE BaseServiceImpl SHALL minimize database queries
6. THE BaseServiceImpl SHALL use caching where appropriate
7. WHEN performance issues are detected, THE issues SHALL be documented and addressed

### Requirement 14: 错误处理标准化

**User Story:** 作为开发者，我希望有统一的错误处理机制，以便提供一致的错误响应。

#### Acceptance Criteria

1. THE BaseServiceImpl SHALL throw BusinessException for business errors
2. THE BaseController SHALL catch BusinessException and return appropriate error response
3. THE error response SHALL include error code, error message, and timestamp
4. THE error response SHALL be in Result<T> format
5. THE error messages SHALL be user-friendly
6. THE error messages SHALL be in Chinese
7. THE error logs SHALL include stack trace for debugging
8. THE error logs SHALL include request context

### Requirement 15: 安全性增强

**User Story:** 作为开发者，我希望重构后的代码有更好的安全性，以便保护用户数据。

#### Acceptance Criteria

1. THE BaseServiceImpl SHALL validate user permissions before operations
2. THE BaseServiceImpl SHALL prevent SQL injection through parameterized queries
3. THE BaseServiceImpl SHALL prevent unauthorized access to resources
4. THE BaseServiceImpl SHALL log security-related events
5. THE BaseController SHALL validate input parameters
6. THE BaseController SHALL sanitize user input
7. THE BaseController SHALL enforce rate limiting where appropriate
8. THE BaseController SHALL use HTTPS for all API endpoints
