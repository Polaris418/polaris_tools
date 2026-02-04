# 架构对齐文档

## 概述

本文档说明 `aws-ses-email-integration` 规范如何遵循 `backend-refactoring` 规范定义的插件化架构模式。

## 架构对齐原则

### 1. 实体层对齐

**backend-refactoring 要求**:
- 所有实体类必须继承 `BaseEntity`
- 移除重复字段：`id`, `createdAt`, `updatedAt`, `deleted`
- 使用 `@EqualsAndHashCode(callSuper = true)` 注解

**aws-ses-email-integration 实现**:

```java
@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "email_audit_log")
public class EmailAuditLog extends BaseEntity {
    // 业务字段
    private String recipient;
    private String subject;
    private String emailType;
    private EmailStatus status;
    private String messageId;
    private String errorCode;
    private String errorMessage;
    private LocalDateTime sentAt;
    
    // id, createdAt, updatedAt, deleted 由 BaseEntity 提供
}
```

**对齐状态**: ✅ 已对齐

### 2. DTO 层对齐

**backend-refactoring 要求**:
- 查询请求 DTO 继承 `BaseRequest`（提供 page, size 字段）
- 响应 DTO 继承 `BaseResponse`（提供 id, createdAt, updatedAt 字段）

**aws-ses-email-integration 实现**:

EmailAuditLog 模块可以选择性地实现 DTO 层：

```java
// 查询请求
@Data
@EqualsAndHashCode(callSuper = true)
public class EmailAuditLogQueryRequest extends BaseRequest {
    private String recipient;
    private EmailStatus status;
    private String emailType;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    // page, size 由 BaseRequest 提供
}

// 响应 DTO
@Data
@EqualsAndHashCode(callSuper = true)
public class EmailAuditLogResponse extends BaseResponse {
    private String recipient;
    private String subject;
    private String emailType;
    private EmailStatus status;
    private String messageId;
    private String errorCode;
    private String errorMessage;
    private LocalDateTime sentAt;
    // id, createdAt, updatedAt 由 BaseResponse 提供
}
```

**对齐状态**: ⚠️ 可选实现（当前设计中未使用标准 DTO 模式，但可以在未来添加）

### 3. 服务层对齐

**backend-refactoring 要求**:
- 服务接口继承 `BaseService<E, R, C, U, Q>`
- 服务实现继承 `BaseServiceImpl<E, R, C, U, Q>`
- 实现必需方法：`getMapper()`, `getConverter()`, `getResourceName()`

**aws-ses-email-integration 实现**:

EmailAuditLog 模块的服务层设计有所不同：
- `EmailService` 是业务服务，负责发送邮件（不适合继承 BaseService）
- `EmailAuditLogService` 可以选择性地继承 BaseService 以提供标准 CRUD 操作

**可选实现**:

```java
// 服务接口
public interface EmailAuditLogService extends BaseService<
    EmailAuditLog,                  // Entity
    EmailAuditLogResponse,          // Response DTO
    EmailAuditLogCreateRequest,     // Create Request DTO
    EmailAuditLogUpdateRequest,     // Update Request DTO
    EmailAuditLogQueryRequest       // Query Request DTO
> {
    // 扩展方法
    List<EmailAuditLogResponse> findByRecipient(String recipient);
    EmailStatistics getStatistics(LocalDateTime startDate, LocalDateTime endDate);
}

// 服务实现
@Service
public class EmailAuditLogServiceImpl 
    extends BaseServiceImpl<
        EmailAuditLog,
        EmailAuditLogResponse,
        EmailAuditLogCreateRequest,
        EmailAuditLogUpdateRequest,
        EmailAuditLogQueryRequest
    > 
    implements EmailAuditLogService {
    
    @Override
    protected BaseMapper<EmailAuditLog> getMapper() {
        return emailAuditLogMapper;
    }
    
    @Override
    protected BaseConverter<EmailAuditLog, EmailAuditLogResponse, 
                           EmailAuditLogCreateRequest, EmailAuditLogUpdateRequest> getConverter() {
        return emailAuditLogConverter;
    }
    
    @Override
    protected String getResourceName() {
        return "邮件审计日志";
    }
    
    @Override
    protected LambdaQueryWrapper<EmailAuditLog> buildQueryWrapper(EmailAuditLogQueryRequest query) {
        LambdaQueryWrapper<EmailAuditLog> wrapper = new LambdaQueryWrapper<>();
        
        if (query.getRecipient() != null) {
            wrapper.like(EmailAuditLog::getRecipient, query.getRecipient());
        }
        if (query.getStatus() != null) {
            wrapper.eq(EmailAuditLog::getStatus, query.getStatus());
        }
        if (query.getEmailType() != null) {
            wrapper.eq(EmailAuditLog::getEmailType, query.getEmailType());
        }
        if (query.getStartDate() != null) {
            wrapper.ge(EmailAuditLog::getCreatedAt, query.getStartDate());
        }
        if (query.getEndDate() != null) {
            wrapper.le(EmailAuditLog::getCreatedAt, query.getEndDate());
        }
        
        wrapper.orderByDesc(EmailAuditLog::getCreatedAt);
        return wrapper;
    }
    
    // 实现扩展方法
    @Override
    public List<EmailAuditLogResponse> findByRecipient(String recipient) {
        // 实现逻辑
    }
    
    @Override
    public EmailStatistics getStatistics(LocalDateTime startDate, LocalDateTime endDate) {
        // 实现逻辑
    }
}
```

**对齐状态**: ⚠️ 可选实现（当前设计使用简化的 EmailAuditLogger，但可以升级为完整的 BaseService 实现）

### 4. 控制器层对齐

**backend-refactoring 要求**:
- 控制器继承 `BaseController<E, R, C, U, Q>`
- 实现必需方法：`getService()`, `getResourceName()`
- 自动获得标准 REST API 端点

**aws-ses-email-integration 实现**:

**可选实现**:

```java
@RestController
@RequestMapping("/api/v1/email-audit-logs")
@RequiredArgsConstructor
public class EmailAuditLogController 
    extends BaseController<
        EmailAuditLog,
        EmailAuditLogResponse,
        EmailAuditLogCreateRequest,
        EmailAuditLogUpdateRequest,
        EmailAuditLogQueryRequest
    > {
    
    private final EmailAuditLogService emailAuditLogService;
    
    @Override
    protected BaseService<EmailAuditLog, EmailAuditLogResponse, 
                         EmailAuditLogCreateRequest, EmailAuditLogUpdateRequest, 
                         EmailAuditLogQueryRequest> getService() {
        return emailAuditLogService;
    }
    
    @Override
    protected String getResourceName() {
        return "邮件审计日志";
    }
    
    // 自动获得以下端点：
    // GET    /api/v1/email-audit-logs       - 列表查询
    // GET    /api/v1/email-audit-logs/{id}  - 获取详情
    // POST   /api/v1/email-audit-logs       - 创建（通常不需要）
    // PUT    /api/v1/email-audit-logs/{id}  - 更新（通常不需要）
    // DELETE /api/v1/email-audit-logs/{id}  - 删除（通常不需要）
    
    // 扩展端点
    @GetMapping("/statistics")
    public Result<EmailStatistics> getStatistics(
            @RequestParam LocalDateTime startDate,
            @RequestParam LocalDateTime endDate) {
        EmailStatistics stats = emailAuditLogService.getStatistics(startDate, endDate);
        return Result.success(stats);
    }
}
```

**对齐状态**: ⚠️ 可选实现（当前设计中未提供 REST API，但可以在未来添加）

### 5. 转换器层对齐

**backend-refactoring 要求**:
- 转换器接口继承 `BaseConverter<E, R, C, U>`
- 使用 MapStruct 自动生成实现
- 实现 `toResponse()`, `toEntity()`, `updateEntity()` 方法

**aws-ses-email-integration 实现**:

**可选实现**:

```java
@Mapper(componentModel = "spring")
public interface EmailAuditLogConverter 
    extends BaseConverter<
        EmailAuditLog,                  // Entity
        EmailAuditLogResponse,          // Response DTO
        EmailAuditLogCreateRequest,     // Create Request DTO
        EmailAuditLogUpdateRequest      // Update Request DTO
    > {
    
    @Override
    EmailAuditLogResponse toResponse(EmailAuditLog entity);
    
    @Override
    EmailAuditLog toEntity(EmailAuditLogCreateRequest request);
    
    @Override
    void updateEntity(@MappingTarget EmailAuditLog entity, EmailAuditLogUpdateRequest request);
}
```

**对齐状态**: ⚠️ 可选实现（当前设计中未使用 MapStruct，但可以在未来添加）

## 对齐总结

| 层级 | backend-refactoring 要求 | aws-ses-email-integration 实现 | 对齐状态 |
|------|-------------------------|-------------------------------|---------|
| **实体层** | 继承 BaseEntity | ✅ EmailAuditLog 继承 BaseEntity | ✅ 已对齐 |
| **DTO 层** | 继承 BaseRequest/BaseResponse | ⚠️ 可选实现 | ⚠️ 部分对齐 |
| **服务层** | 继承 BaseService/BaseServiceImpl | ⚠️ 可选实现 | ⚠️ 部分对齐 |
| **控制器层** | 继承 BaseController | ⚠️ 可选实现 | ⚠️ 部分对齐 |
| **转换器层** | 继承 BaseConverter | ⚠️ 可选实现 | ⚠️ 部分对齐 |

## 实施建议

### 阶段 1: 核心对齐（必需）✅
- [x] EmailAuditLog 实体继承 BaseEntity
- [x] 移除重复字段（id, createdAt, updatedAt, deleted）
- [x] 更新数据库迁移脚本

### 阶段 2: 完整对齐（可选）⚠️
- [ ] 创建 EmailAuditLogQueryRequest 继承 BaseRequest
- [ ] 创建 EmailAuditLogResponse 继承 BaseResponse
- [ ] 创建 EmailAuditLogConverter 继承 BaseConverter
- [ ] EmailAuditLogService 继承 BaseService
- [ ] EmailAuditLogServiceImpl 继承 BaseServiceImpl
- [ ] 创建 EmailAuditLogController 继承 BaseController

### 阶段 3: 模块注册（可选）⚠️
- [ ] 在 ToolModuleRegistry 中注册 EmailAuditLog 模块
- [ ] 配置模块元数据（moduleId, moduleName, apiPrefix 等）

## 为什么部分对齐是可选的？

EmailAuditLog 模块与其他业务模块（Tool、Category、Document）有所不同：

1. **只读性质**: 审计日志通常是只读的，不需要完整的 CRUD 操作
2. **内部使用**: 审计日志主要供内部系统使用，不一定需要暴露 REST API
3. **简化设计**: 当前的 EmailAuditLogger 设计已经满足需求，过度工程化可能增加复杂度

**建议**:
- **短期**: 保持当前简化设计，仅确保实体层对齐（已完成）
- **长期**: 如果需要提供审计日志查询 API 或管理界面，再升级为完整的 BaseService 实现

## 数据库迁移脚本更新

确保数据库迁移脚本与 BaseEntity 字段对齐：

```sql
CREATE TABLE email_audit_log (
    -- BaseEntity 字段
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT NOT NULL DEFAULT 0,
    
    -- 业务字段
    recipient VARCHAR(500) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    email_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    message_id VARCHAR(200),
    error_code VARCHAR(100),
    error_message VARCHAR(1000),
    sent_at DATETIME,
    
    -- 索引
    INDEX idx_recipient (recipient),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_email_type (email_type),
    INDEX idx_deleted (deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 结论

`aws-ses-email-integration` 规范已经在**实体层**完全对齐 `backend-refactoring` 架构模式。其他层级的对齐是可选的，可以根据实际需求在未来逐步实现。

**核心原则**: 保持架构一致性，但避免过度工程化。
