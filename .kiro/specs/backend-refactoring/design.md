# 设计文档：后端插件化架构重构

## 概述

本文档描述了 Polaris Tools Platform 后端插件化架构的详细设计。重构目标是建立一套标准化的开发框架，使添加新工具功能从 2-3 天缩短到 4-6 小时，代码量减少 60%，样板代码减少 90%。

### 核心目标

- **开发效率提升 75%** - 从 2-3 天缩短到 4-6 小时
- **代码量减少 60%** - 从 ~800 行减少到 ~300 行
- **样板代码减少 90%** - 消除重复的 CRUD 代码
- **学习成本降低 70%** - 统一的架构模式
- **维护成本降低 60%** - 集中管理通用逻辑

### 技术栈

**后端框架**：
- Spring Boot 3.2.5
- MyBatis-Plus 3.5.6
- MapStruct（对象转换）
- Lombok（减少样板代码）

**架构模式**：
- 插件化架构
- 模板方法模式
- 策略模式
- 工厂模式

## 架构设计

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                  Polaris Tools Platform                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              插件化架构层                               │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  BaseController  │  BaseService  │  BaseEntity         │ │
│  │  BaseConverter   │  BaseRequest  │  BaseResponse       │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ▲                                    │
│                          │ 继承/实现                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              工具模块层                                 │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  ToolModule  │  CategoryModule  │  DocumentModule      │ │
│  │  - Entity    │  - Entity        │  - Entity            │ │
│  │  - DTO       │  - DTO           │  - DTO               │ │
│  │  - Mapper    │  - Mapper        │  - Mapper            │ │
│  │  - Converter │  - Converter     │  - Converter         │ │
│  │  - Service   │  - Service       │  - Service           │ │
│  │  - Controller│  - Controller    │  - Controller        │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ▲                                    │
│                          │ 注册                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              模块注册表                                 │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  ToolModuleRegistry                                     │ │
│  │  - register(ToolModuleConfig)                           │ │
│  │  - getModule(moduleId)                                  │ │
│  │  - getAllModules()                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 组件和接口

### 1. 基础架构组件

#### 1.1 BaseEntity（通用实体基类）

```java
@Data
public abstract class BaseEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    
    @TableLogic
    private Integer deleted;
}
```

**设计说明**：
- 所有实体类继承此类
- 自动管理 ID、时间戳、软删除
- 使用 MyBatis-Plus 注解实现自动填充



#### 1.2 BaseRequest 和 BaseResponse

```java
@Data
public abstract class BaseRequest {
    private Integer page = 1;
    private Integer size = 20;
}

@Data
public abstract class BaseResponse {
    private Long id;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

**设计说明**：
- BaseRequest 提供统一的分页参数
- BaseResponse 提供统一的公共字段
- 减少 DTO 类的重复代码

#### 1.3 BaseConverter（通用转换器接口）

```java
public interface BaseConverter<E, R, C, U> {
    R toResponse(E entity);
    E toEntity(C request);
    void updateEntity(@MappingTarget E entity, U request);
}
```

**设计说明**：
- 定义标准的转换方法
- 使用 MapStruct 自动生成实现
- 支持 Entity ↔ DTO 双向转换

#### 1.4 BaseService（通用服务接口）

```java
public interface BaseService<E, R, C, U, Q> {
    PageResult<R> list(Q query);
    long count(Q query);
    R getById(Long id);
    R create(C request);
    R update(Long id, U request);
    void delete(Long id);
    void batchDelete(List<Long> ids);
}
```

**设计说明**：
- 定义标准的 CRUD 操作
- 支持泛型，适用于所有实体类型
- 提供分页查询和批量操作

#### 1.5 BaseServiceImpl（通用服务实现）

```java
@Slf4j
public abstract class BaseServiceImpl<E extends BaseEntity, R, C, U, Q extends BaseRequest> 
        implements BaseService<E, R, C, U, Q> {
    
    // 子类必须实现
    protected abstract BaseMapper<E> getMapper();
    protected abstract BaseConverter<E, R, C, U> getConverter();
    protected abstract String getResourceName();
    
    // 默认实现（子类可覆盖）
    public PageResult<R> list(Q query) { ... }
    public long count(Q query) { ... }
    public R getById(Long id) { ... }
    public R create(C request) { ... }
    public R update(Long id, U request) { ... }
    public void delete(Long id) { ... }
    public void batchDelete(List<Long> ids) { ... }
    
    // 钩子方法（子类可覆盖）
    protected LambdaQueryWrapper<E> buildQueryWrapper(Q query) { ... }
    protected R convertToResponse(E entity) { ... }
    protected void validateGetById(E entity) { ... }
    protected void validateCreate(C request) { ... }
    protected void beforeCreate(E entity, C request) { ... }
    protected void afterCreate(E entity, C request) { ... }
    protected void validateUpdate(E entity, U request) { ... }
    protected void beforeUpdate(E entity, U request) { ... }
    protected void afterUpdate(E entity, U request) { ... }
    protected void validateDelete(E entity) { ... }
    protected void beforeDelete(E entity) { ... }
    protected void afterDelete(E entity) { ... }
}
```

**设计说明**：
- 提供默认的 CRUD 实现
- 使用模板方法模式
- 支持钩子方法自定义业务逻辑
- 统一的错误处理和日志记录



#### 1.6 BaseController（通用控制器）

```java
@Slf4j
public abstract class BaseController<E, R, C, U, Q> {
    
    protected abstract BaseService<E, R, C, U, Q> getService();
    protected abstract String getResourceName();
    
    @GetMapping
    public Result<PageResult<R>> list(@Valid Q query) { ... }
    
    @GetMapping("/{id}")
    public Result<R> getById(@PathVariable Long id) { ... }
    
    @PostMapping
    public Result<R> create(@Valid @RequestBody C request) { ... }
    
    @PutMapping("/{id}")
    public Result<R> update(@PathVariable Long id, @Valid @RequestBody U request) { ... }
    
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) { ... }
    
    @DeleteMapping("/batch")
    public Result<Void> batchDelete(@RequestBody List<Long> ids) { ... }
}
```

**设计说明**：
- 提供标准的 REST API 端点
- 自动集成 Swagger 文档
- 统一的请求验证和响应格式
- 统一的日志记录

### 2. 模块注册表系统

#### 2.1 ToolModuleConfig（工具模块配置）

```java
@Data
@Builder
public class ToolModuleConfig {
    // 基本信息
    private String moduleId;
    private String moduleName;
    private String moduleNameZh;
    private String description;
    private String apiPrefix;
    
    // 类型信息
    private Class<?> entityClass;
    private Class<?> responseClass;
    private Class<?> createRequestClass;
    private Class<?> updateRequestClass;
    private Class<?> queryRequestClass;
    private Class<?> serviceClass;
    private Class<?> serviceImplClass;
    private Class<?> controllerClass;
    
    // 功能开关
    private boolean enableCRUD = true;
    private boolean enableBatchDelete = true;
    private boolean enableSoftDelete = true;
    private boolean enableVersioning = false;
    private boolean enableExport = false;
    
    // 权限配置
    private String[] requiredRoles;
    private boolean requireAuth = true;
}
```

**设计说明**：
- 集中管理模块元数据
- 支持功能开关
- 支持权限配置
- 使用 Builder 模式简化创建

#### 2.2 ToolModuleRegistry（工具模块注册表）

```java
@Component
public class ToolModuleRegistry {
    private final Map<String, ToolModuleConfig> modules = new HashMap<>();
    
    public void register(ToolModuleConfig config) { ... }
    public ToolModuleConfig getModule(String moduleId) { ... }
    public Collection<ToolModuleConfig> getAllModules() { ... }
    
    @PostConstruct
    public void init() {
        // 注册所有工具模块
        registerToolModule();
        registerCategoryModule();
        registerDocumentModule();
        // ... 更多模块
    }
}
```

**设计说明**：
- 集中管理所有工具模块
- 应用启动时自动注册
- 支持动态查询模块信息
- 为未来的动态加载做准备

## 数据模型

### 重构前后对比

**重构前**：
```java
@Data
@TableName("t_user_document")
public class UserDocument {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String title;
    // ... 其他字段
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
```

**重构后**：
```java
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_user_document")
public class UserDocument extends BaseEntity {
    private Long userId;
    private String title;
    // ... 其他字段
    // id, createdAt, updatedAt, deleted 由 BaseEntity 提供
}
```

**优势**：
- 减少 4 个字段定义
- 减少 3 个注解
- 代码更简洁
- 统一管理公共字段

