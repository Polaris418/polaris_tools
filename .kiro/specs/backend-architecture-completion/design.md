# Design Document: Backend Architecture Completion

## Overview

本设计文档描述如何系统地完成 Polaris Tools Platform 后端的基础类架构重构。在 Phase 1-6 中，我们已经创建了基础类体系并重构了核心模块。现在需要评估并重构剩余的文件，使其符合插件化架构标准。

本设计采用评估优先的方法：不是所有文件都适合继承基类。我们将根据每个文件的特点和业务逻辑，决定是否重构以及如何重构。

### 设计原则

1. **评估优先**：先评估文件是否适合重构，再决定重构方案
2. **向后兼容**：确保重构不影响现有功能和 API
3. **渐进式重构**：按优先级分阶段执行，降低风险
4. **代码质量**：提高代码一致性和可维护性
5. **实用主义**：不强制所有文件都继承基类，保持灵活性

## Architecture

### 基础类体系回顾

```
BaseEntity (实体基类)
├── id: Long
├── createdAt: LocalDateTime
├── updatedAt: LocalDateTime
└── deleted: Integer

BaseRequest (请求 DTO 基类)
├── page: Integer
└── size: Integer

BaseResponse (响应 DTO 基类)
├── id: Long
├── createdAt: LocalDateTime
└── updatedAt: LocalDateTime

BaseConverter<E, R, C, U> (转换器基类)
├── toResponse(E entity): R
├── toEntity(C request): E
└── updateEntity(E entity, U request): void

BaseService<E, R, C, U> (服务接口基类)
└── 定义标准 CRUD 操作

BaseServiceImpl<E, R, C, U> (服务实现基类)
└── 提供标准 CRUD 操作的默认实现

BaseController<R, C, U> (控制器基类)
└── 提供标准 RESTful API 端点
```

### 重构分类策略


我们将文件分为三类：

1. **适合重构**：文件符合基类设计模式，重构后能提高代码质量
2. **部分重构**：文件有特殊需求，但可以部分继承基类
3. **保持独立**：文件有特殊业务逻辑，继承基类会增加复杂性

### 重构优先级

- **高优先级**：简单实体、标准 CRUD 服务、标准 RESTful 控制器
- **中优先级**：有少量特殊逻辑的服务和控制器
- **低优先级**：复杂业务逻辑的服务（如认证、邮件）

## Components and Interfaces

### 1. 实体层重构

#### 1.1 ToolUsage 实体

**当前状态**：
- 未继承 BaseEntity
- 自定义 id、usedAt 字段
- 数据库表只有 id 和 usedAt，没有 createdAt/updatedAt/deleted

**评估结果**：部分重构
- **问题**：数据库表结构与 BaseEntity 不匹配
- **方案**：需要先迁移数据库表，添加 createdAt、updatedAt、deleted 字段
- **优先级**：中

**重构方案**：
```java
@Data
@TableName("t_tool_usage")
public class ToolUsage extends BaseEntity {
    // 继承 id, createdAt, updatedAt, deleted
    
    private Long userId;
    private Long toolId;
    
    @TableField("used_at")
    private LocalDateTime usedAt;  // 保留特殊字段
    
    private Integer duration;
    private String ipAddress;
    private String userAgent;
    
    @TableField(exist = false)
    private String toolName;
    
    @TableField(exist = false)
    private String toolNameZh;
    
    @TableField(exist = false)
    private String toolIcon;
}
```

**数据库迁移**：
```sql
ALTER TABLE t_tool_usage 
ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN deleted TINYINT DEFAULT 0;

-- 将 used_at 映射为 created_at（如果需要）
-- 或者保持 used_at 作为独立字段
```

#### 1.2 UserFavorite 实体

**当前状态**：
- 未继承 BaseEntity
- 自定义 id、createdAt 字段
- 数据库表只有 id 和 createdAt，没有 updatedAt 和 deleted

**评估结果**：部分重构
- **问题**：数据库表缺少 updatedAt 和 deleted 字段
- **方案**：添加缺失字段，继承 BaseEntity
- **优先级**：高

**重构方案**：
```java
@Data
@TableName("t_user_favorite")
public class UserFavorite extends BaseEntity {
    // 继承 id, createdAt, updatedAt, deleted
    
    private Long userId;
    private Long toolId;
}
```

**数据库迁移**：
```sql
ALTER TABLE t_user_favorite 
ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN deleted TINYINT DEFAULT 0;
```

#### 1.3 EmailAuditLog 实体

**当前状态**：
- 未继承 BaseEntity
- 自定义 id、createdAt 字段
- 有特殊字段：sentAt、status、messageId 等

**评估结果**：适合重构
- **方案**：继承 BaseEntity，保留特殊字段
- **优先级**：高

**重构方案**：
```java
@Data
@TableName("email_audit_log")
public class EmailAuditLog extends BaseEntity {
    // 继承 id, createdAt, updatedAt, deleted
    
    @TableField("recipient")
    private String recipient;
    
    @TableField("subject")
    private String subject;
    
    @TableField("email_type")
    private String emailType;
    
    @TableField("status")
    private EmailStatus status;
    
    @TableField("message_id")
    private String messageId;
    
    @TableField("error_code")
    private String errorCode;
    
    @TableField("error_message")
    private String errorMessage;
    
    @TableField("sent_at")
    private LocalDateTime sentAt;  // 保留特殊字段
}
```

**数据库迁移**：
```sql
ALTER TABLE email_audit_log 
ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN deleted TINYINT DEFAULT 0;
```

### 2. DTO 层重构

#### 2.1 请求 DTO

**NotificationQueryRequest**

**当前状态**：
- 未继承 BaseRequest
- 自定义 page、size 字段

**评估结果**：适合重构
- **方案**：继承 BaseRequest，移除重复的分页字段
- **优先级**：高

**重构方案**：
```java
@Data
public class NotificationQueryRequest extends BaseRequest {
    // 继承 page, size
    
    private Boolean read;  // 筛选条件
    private String type;   // 通知类型
}
```

#### 2.2 响应 DTO

我们需要评估每个响应 DTO 是否适合继承 BaseResponse：

**DashboardStatsResponse**

**评估结果**：保持独立
- **原因**：这是统计数据响应，不表示持久化实体
- **方案**：不继承 BaseResponse
- **优先级**：N/A

**LoginResponse**

**评估结果**：保持独立
- **原因**：这是认证响应，包含 token 和用户信息，不是实体响应
- **方案**：不继承 BaseResponse
- **优先级**：N/A

**EmailAuditLogResponse**

**评估结果**：适合重构
- **原因**：表示 EmailAuditLog 实体的响应
- **方案**：继承 BaseResponse
- **优先级**：高

**重构方案**：
```java
@Data
public class EmailAuditLogResponse extends BaseResponse {
    // 继承 id, createdAt, updatedAt
    
    private String recipient;
    private String subject;
    private String emailType;
    private EmailStatus status;
    private String messageId;
    private String errorCode;
    private String errorMessage;
    private LocalDateTime sentAt;
}
```

**EmailStatisticsResponse**

**评估结果**：保持独立
- **原因**：这是统计数据响应，不表示持久化实体
- **方案**：不继承 BaseResponse
- **优先级**：N/A

**SendEmailResponse**

**评估结果**：保持独立
- **原因**：这是操作结果响应，不表示持久化实体
- **方案**：不继承 BaseResponse
- **优先级**：N/A

### 3. 转换器层重构

#### 3.1 UserConverter

**当前状态**：
- 未继承 BaseConverter
- 使用 MapStruct 定义转换方法

**评估结果**：适合重构
- **方案**：继承 BaseConverter
- **优先级**：高

**重构方案**：
```java
@Mapper(componentModel = "spring")
public interface UserConverter extends BaseConverter<User, UserResponse, UserRegisterRequest, UserUpdateRequest> {
    // 继承基础转换方法
    // toResponse(User entity): UserResponse
    // toEntity(UserRegisterRequest request): User
    // updateEntity(User entity, UserUpdateRequest request): void
    
    // 可以添加特殊转换方法
    UserResponse toUserResponse(User user);
}
```

### 4. 服务层重构


服务层需要仔细评估，因为很多服务有特殊业务逻辑。

#### 4.1 适合重构的服务

**EmailAuditLogServiceImpl**

**评估结果**：适合重构
- **原因**：执行标准 CRUD 操作
- **方案**：继承 BaseServiceImpl
- **优先级**：高

**UsageServiceImpl**

**评估结果**：适合重构
- **原因**：主要是查询和统计操作，可以继承基类
- **方案**：继承 BaseServiceImpl，添加特殊方法
- **优先级**：中

**FavoriteServiceImpl**

**评估结果**：适合重构
- **原因**：执行标准 CRUD 操作（添加、删除、查询收藏）
- **方案**：继承 BaseServiceImpl
- **优先级**：高

**NotificationServiceImpl**

**评估结果**：适合重构
- **原因**：执行标准 CRUD 操作
- **方案**：继承 BaseServiceImpl
- **优先级**：高

#### 4.2 部分重构的服务

**AdminUserServiceImpl**

**评估结果**：部分重构
- **原因**：有用户管理的特殊逻辑，但也有标准 CRUD
- **方案**：继承 BaseServiceImpl，添加管理员特有方法
- **优先级**：中

**VersionServiceImpl**

**评估结果**：部分重构
- **原因**：版本管理有特殊逻辑，但基础操作可以继承
- **方案**：继承 BaseServiceImpl
- **优先级**：中

**DocumentExportServiceImpl**

**评估结果**：部分重构
- **原因**：导出功能是特殊操作，但可以利用基类的查询方法
- **方案**：继承 BaseServiceImpl，添加导出方法
- **优先级**：低

#### 4.3 保持独立的服务

**AuthServiceImpl**

**评估结果**：保持独立
- **原因**：认证服务有特殊的业务逻辑（登录、注册、token 管理）
- **方案**：不继承 BaseServiceImpl，保持独立
- **优先级**：N/A
- **理由**：
  - 不执行标准 CRUD 操作
  - 方法签名与 BaseService 不匹配
  - 继承会引入不必要的方法和复杂性

**EmailServiceImpl**

**评估结果**：保持独立
- **原因**：邮件发送服务有特殊的业务逻辑（AWS SES 集成、限流）
- **方案**：不继承 BaseServiceImpl，保持独立
- **优先级**：N/A
- **理由**：
  - 不执行标准 CRUD 操作
  - 主要是发送邮件的操作逻辑
  - 继承基类没有实际价值

**AdminServiceImpl**

**评估结果**：保持独立
- **原因**：管理员服务包含多种管理操作，不是单一实体的 CRUD
- **方案**：不继承 BaseServiceImpl，保持独立
- **优先级**：N/A

**AdminStatisticsServiceImpl**

**评估结果**：保持独立
- **原因**：统计服务主要是聚合查询，不是 CRUD 操作
- **方案**：不继承 BaseServiceImpl，保持独立
- **优先级**：N/A

### 5. 控制器层重构

#### 5.1 适合重构的控制器

**FavoriteController**

**评估结果**：适合重构
- **原因**：提供标准 RESTful CRUD 端点
- **方案**：继承 BaseController
- **优先级**：高

**NotificationController**

**评估结果**：适合重构
- **原因**：提供标准 RESTful CRUD 端点
- **方案**：继承 BaseController
- **优先级**：高

**UsageController**

**评估结果**：适合重构
- **原因**：主要是查询端点，可以继承基类
- **方案**：继承 BaseController
- **优先级**：中

#### 5.2 部分重构的控制器

**ModuleController**

**评估结果**：部分重构
- **原因**：有标准 CRUD 端点，也有特殊端点
- **方案**：继承 BaseController，添加特殊端点
- **优先级**：中

**VersionController**

**评估结果**：部分重构
- **原因**：版本管理有特殊端点，但基础操作可以继承
- **方案**：继承 BaseController
- **优先级**：中

#### 5.3 保持独立的控制器

**AuthController**

**评估结果**：保持独立
- **原因**：认证端点（登录、注册、刷新 token）与标准 CRUD 不同
- **方案**：不继承 BaseController，保持独立
- **优先级**：N/A

**AdminController**

**评估结果**：保持独立
- **原因**：管理员端点包含多种管理操作，不是单一资源的 CRUD
- **方案**：不继承 BaseController，保持独立
- **优先级**：N/A

**DocumentExportController**

**评估结果**：保持独立
- **原因**：导出端点是特殊操作，不是标准 CRUD
- **方案**：不继承 BaseController，保持独立
- **优先级**：N/A

**EmailController**

**评估结果**：保持独立
- **原因**：邮件管理端点有特殊逻辑（发送、审计日志查询）
- **方案**：不继承 BaseController，保持独立
- **优先级**：N/A

## Data Models

### 重构优先级矩阵

| 文件 | 类型 | 重构方案 | 优先级 | 复杂度 |
|------|------|----------|--------|--------|
| UserFavorite.java | 实体 | 继承 BaseEntity | 高 | 低 |
| EmailAuditLog.java | 实体 | 继承 BaseEntity | 高 | 低 |
| ToolUsage.java | 实体 | 继承 BaseEntity + 数据库迁移 | 中 | 中 |
| NotificationQueryRequest.java | 请求 DTO | 继承 BaseRequest | 高 | 低 |
| EmailAuditLogResponse.java | 响应 DTO | 继承 BaseResponse | 高 | 低 |
| UserConverter.java | 转换器 | 继承 BaseConverter | 高 | 低 |
| EmailAuditLogServiceImpl.java | 服务 | 继承 BaseServiceImpl | 高 | 中 |
| FavoriteServiceImpl.java | 服务 | 继承 BaseServiceImpl | 高 | 中 |
| NotificationServiceImpl.java | 服务 | 继承 BaseServiceImpl | 高 | 中 |
| FavoriteController.java | 控制器 | 继承 BaseController | 高 | 中 |
| NotificationController.java | 控制器 | 继承 BaseController | 高 | 中 |
| UsageServiceImpl.java | 服务 | 继承 BaseServiceImpl | 中 | 中 |
| UsageController.java | 控制器 | 继承 BaseController | 中 | 中 |
| AdminUserServiceImpl.java | 服务 | 继承 BaseServiceImpl | 中 | 中 |
| VersionServiceImpl.java | 服务 | 继承 BaseServiceImpl | 中 | 中 |
| ModuleController.java | 控制器 | 继承 BaseController | 中 | 中 |
| VersionController.java | 控制器 | 继承 BaseController | 中 | 中 |
| DocumentExportServiceImpl.java | 服务 | 继承 BaseServiceImpl | 低 | 高 |
| AuthServiceImpl.java | 服务 | 保持独立 | N/A | N/A |
| EmailServiceImpl.java | 服务 | 保持独立 | N/A | N/A |
| AdminServiceImpl.java | 服务 | 保持独立 | N/A | N/A |
| AdminStatisticsServiceImpl.java | 服务 | 保持独立 | N/A | N/A |
| AuthController.java | 控制器 | 保持独立 | N/A | N/A |
| AdminController.java | 控制器 | 保持独立 | N/A | N/A |
| DocumentExportController.java | 控制器 | 保持独立 | N/A | N/A |
| EmailController.java | 控制器 | 保持独立 | N/A | N/A |
| DashboardStatsResponse.java | 响应 DTO | 保持独立 | N/A | N/A |
| LoginResponse.java | 响应 DTO | 保持独立 | N/A | N/A |
| EmailStatisticsResponse.java | 响应 DTO | 保持独立 | N/A | N/A |
| SendEmailResponse.java | 响应 DTO | 保持独立 | N/A | N/A |

### 数据库迁移策略

对于需要数据库迁移的实体，我们将创建迁移脚本：

1. **UserFavorite 表迁移**：
   - 添加 updated_at 字段
   - 添加 deleted 字段

2. **EmailAuditLog 表迁移**：
   - 添加 updated_at 字段
   - 添加 deleted 字段

3. **ToolUsage 表迁移**：
   - 添加 updated_at 字段
   - 添加 deleted 字段
   - 考虑是否需要重命名或映射字段

## Correctness Properties


属性（Property）是指在所有有效执行中都应该成立的特征或行为——本质上是关于系统应该做什么的正式陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。

基于需求分析，本规范主要关注重构过程的正确性验证，而不是运行时行为的属性测试。大多数需求是关于重构过程和设计决策的，不适合编写属性测试。但我们可以为以下方面编写验证测试：

### Property 1: 转换器字段映射完整性

*For any* 继承 BaseConverter 的转换器，当将实体转换为响应 DTO 时，BaseEntity 的所有通用字段（id、createdAt、updatedAt）都应该正确映射到 BaseResponse 的对应字段。

**Validates: Requirements 4.5**

### Property 2: API 响应格式向后兼容性

*For any* 重构后的控制器端点，其响应的 JSON 格式应该与重构前保持一致（字段名称、类型、结构）。

**Validates: Requirements 8.2, 8.4**

## Error Handling

### 重构过程中的错误处理

1. **编译错误**：
   - 重构后必须确保代码能够编译通过
   - 使用 IDE 的重构工具减少手动错误
   - 每次重构后立即编译验证

2. **运行时错误**：
   - 运行所有现有单元测试
   - 运行集成测试验证端到端流程
   - 使用 Postman 或类似工具测试 API 端点

3. **数据库迁移错误**：
   - 在测试环境先执行迁移脚本
   - 验证迁移后的数据完整性
   - 准备回滚脚本以防出错

4. **向后兼容性错误**：
   - 使用 API 测试验证端点路径和参数
   - 验证响应格式是否改变
   - 检查方法签名是否保持一致

### 回滚策略

1. **Git 版本控制**：
   - 每个重构任务创建独立分支
   - 提交前进行充分测试
   - 出现问题时可以快速回滚

2. **数据库回滚**：
   - 为每个迁移脚本准备回滚脚本
   - 在生产环境执行前在测试环境验证

3. **分阶段部署**：
   - 先部署到测试环境
   - 验证通过后再部署到生产环境
   - 保留旧版本以便快速回滚

## Testing Strategy

### 测试方法

本规范采用双重测试方法：

1. **单元测试**：验证具体示例、边缘情况和错误条件
2. **集成测试**：验证重构后的组件在整个系统中正常工作

### 单元测试重点

- 验证实体类正确继承 BaseEntity
- 验证 DTO 正确继承 BaseRequest/BaseResponse
- 验证转换器正确继承 BaseConverter 并正确映射字段
- 验证服务类正确继承 BaseServiceImpl
- 验证控制器正确继承 BaseController

### 集成测试重点

- 验证重构后的实体在 Mapper 中正常工作
- 验证重构后的 DTO 在 Controller 和 Service 中正常工作
- 验证重构后的服务在整个业务流程中正常工作
- 验证重构后的控制器端点正常响应请求

### API 测试

- 使用 Postman 或 REST Assured 测试所有重构的端点
- 验证请求和响应格式是否改变
- 验证端点路径和参数是否保持一致

### 数据库测试

- 验证数据库迁移脚本正确执行
- 验证迁移后的数据完整性
- 验证实体类与数据库表的映射关系

### 回归测试

- 运行所有现有测试套件
- 确保重构没有破坏现有功能
- 特别关注与重构文件相关的测试

### 测试覆盖率

- 目标：重构的代码保持或提高测试覆盖率
- 为新增的基类方法编写测试
- 确保所有重构的类都有相应的测试

## Implementation Notes

### 重构顺序

建议按以下顺序进行重构，以降低风险：

**Phase 1: 实体层（高优先级）**
1. UserFavorite.java
2. EmailAuditLog.java

**Phase 2: DTO 层（高优先级）**
1. NotificationQueryRequest.java
2. EmailAuditLogResponse.java

**Phase 3: 转换器层（高优先级）**
1. UserConverter.java

**Phase 4: 服务层（高优先级）**
1. EmailAuditLogServiceImpl.java
2. FavoriteServiceImpl.java
3. NotificationServiceImpl.java

**Phase 5: 控制器层（高优先级）**
1. FavoriteController.java
2. NotificationController.java

**Phase 6: 中优先级重构**
1. ToolUsage.java（需要数据库迁移）
2. UsageServiceImpl.java
3. UsageController.java
4. AdminUserServiceImpl.java
5. VersionServiceImpl.java
6. ModuleController.java
7. VersionController.java

**Phase 7: 低优先级重构**
1. DocumentExportServiceImpl.java

### 每个 Phase 的验证步骤

1. 编译代码确保没有语法错误
2. 运行单元测试
3. 运行集成测试
4. 手动测试相关功能
5. 代码审查
6. 提交到版本控制

### 注意事项

1. **不要一次性重构所有文件**：分阶段进行，每个阶段验证后再继续
2. **保持向后兼容性**：确保 API 和数据库不发生破坏性变更
3. **充分测试**：每次重构后都要运行完整的测试套件
4. **代码审查**：重构代码需要经过团队审查
5. **文档更新**：及时更新相关文档

### 数据库迁移注意事项

1. **备份数据**：在执行迁移前备份数据库
2. **测试环境先行**：在测试环境验证迁移脚本
3. **准备回滚脚本**：为每个迁移准备回滚方案
4. **监控迁移过程**：记录迁移日志，监控执行时间
5. **验证数据完整性**：迁移后验证数据是否正确

### 特殊情况处理

1. **ToolUsage 实体**：
   - 需要评估是否保留 usedAt 字段还是使用 createdAt
   - 如果保留 usedAt，需要在代码中明确其语义
   - 数据库迁移需要特别小心，因为这是使用记录表

2. **UserConverter**：
   - 可能有多个转换方法（toUserResponse、toResponse）
   - 需要确保所有转换方法都正确处理基类字段
   - 考虑是否需要统一方法命名

3. **FavoriteServiceImpl**：
   - 收藏服务的业务逻辑比较特殊（添加、删除、查询）
   - 需要评估是否所有方法都适合继承自 BaseServiceImpl
   - 可能需要覆盖某些基类方法

## Architecture Decision Records

### ADR-1: 不强制所有文件都继承基类

**决策**：不是所有文件都适合继承基类，保持灵活性。

**理由**：
- 某些服务（如 AuthService、EmailService）有特殊业务逻辑
- 强制继承会引入不必要的方法和复杂性
- 实用主义优于教条主义

**影响**：
- 架构不是完全统一的，但更加实用
- 需要在文档中明确说明哪些文件保持独立以及原因

### ADR-2: 数据库迁移采用增量方式

**决策**：为需要迁移的表添加字段，而不是重建表。

**理由**：
- 降低数据丢失风险
- 保持向后兼容性
- 可以逐步迁移，不影响现有功能

**影响**：
- 某些表会有冗余字段（如 ToolUsage 的 usedAt 和 createdAt）
- 需要在代码中明确字段的语义

### ADR-3: 分阶段重构，降低风险

**决策**：按优先级分阶段重构，每个阶段验证后再继续。

**理由**：
- 降低一次性重构的风险
- 可以及时发现和修复问题
- 团队可以逐步适应新架构

**影响**：
- 重构周期较长
- 在过渡期间会有新旧架构并存的情况

### ADR-4: 保持 API 向后兼容性

**决策**：重构不改变 API 端点路径、参数和响应格式。

**理由**：
- 避免影响前端和其他客户端
- 降低部署风险
- 保持系统稳定性

**影响**：
- 某些重构可能受限于现有 API 设计
- 需要编写 API 测试验证兼容性
