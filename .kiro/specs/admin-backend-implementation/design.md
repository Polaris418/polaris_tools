# Design Document

## Overview

本设计文档描述了Polaris Tools平台后端管理员功能的技术实现方案。该功能基于Spring Boot框架，采用分层架构设计，提供RESTful API接口供前端调用。设计遵循现有代码库的架构模式和编码规范。

## Architecture

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│                  Admin Dashboard UI                          │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST API
┌──────────────────────┴──────────────────────────────────────┐
│                   Controller Layer                           │
│              AdminController (REST Endpoints)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                    Service Layer                             │
│  AdminService, AdminUserService, AdminStatisticsService      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                   Mapper Layer                               │
│     UserMapper, ToolMapper, CategoryMapper, etc.             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                    Database (MySQL)                          │
│         t_user, t_tool, t_category, t_tool_usage            │
└─────────────────────────────────────────────────────────────┘
```

### 分层职责

1. **Controller Layer**: 处理HTTP请求，参数验证，调用Service层
2. **Service Layer**: 业务逻辑处理，事务管理
3. **Mapper Layer**: 数据访问层，使用MyBatis-Plus
4. **Entity Layer**: 数据库实体映射
5. **DTO Layer**: 数据传输对象，用于API请求和响应

## Components and Interfaces

### 1. AdminController

管理员控制器，提供所有管理员API端点。

```java
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController extends BaseController {
    
    private final AdminService adminService;
    private final AdminUserService adminUserService;
    private final AdminStatisticsService adminStatisticsService;
    
    // Dashboard Statistics
    @GetMapping("/stats")
    public Result<DashboardStatsResponse> getStats();
    
    // User Management
    @GetMapping("/users")
    public Result<PageResult<AdminUserResponse>> listUsers(AdminUserQueryRequest request);
    
    @GetMapping("/users/{id}")
    public Result<AdminUserResponse> getUser(@PathVariable Long id);
    
    @PutMapping("/users/{id}")
    public Result<AdminUserResponse> updateUser(@PathVariable Long id, @RequestBody AdminUserUpdateRequest request);
    
    @DeleteMapping("/users/{id}")
    public Result<Void> deleteUser(@PathVariable Long id);
    
    @PutMapping("/users/{id}/status")
    public Result<Void> toggleUserStatus(@PathVariable Long id, @RequestBody UserStatusRequest request);
    
    // Tool Management
    @GetMapping("/tools")
    public Result<PageResult<ToolResponse>> listTools(ToolQueryRequest request);
    
    @GetMapping("/tools/{id}")
    public Result<ToolResponse> getTool(@PathVariable Long id);
    
    @PostMapping("/tools")
    public Result<ToolResponse> createTool(@RequestBody ToolCreateRequest request);
    
    @PutMapping("/tools/{id}")
    public Result<ToolResponse> updateTool(@PathVariable Long id, @RequestBody ToolUpdateRequest request);
    
    @DeleteMapping("/tools/{id}")
    public Result<Void> deleteTool(@PathVariable Long id);
    
    // Category Management
    @GetMapping("/categories")
    public Result<List<CategoryResponse>> listCategories(@RequestParam(required = false) Integer status);
    
    @GetMapping("/categories/{id}")
    public Result<CategoryResponse> getCategory(@PathVariable Long id);
    
    @PostMapping("/categories")
    public Result<CategoryResponse> createCategory(@RequestBody CategoryCreateRequest request);
    
    @PutMapping("/categories/{id}")
    public Result<CategoryResponse> updateCategory(@PathVariable Long id, @RequestBody CategoryUpdateRequest request);
    
    @DeleteMapping("/categories/{id}")
    public Result<Void> deleteCategory(@PathVariable Long id);
    
    // Statistics
    @GetMapping("/statistics/usage-trend")
    public Result<List<TrendDataPoint>> getUsageTrend(@RequestParam(defaultValue = "30") Integer days);
    
    @GetMapping("/statistics/user-trend")
    public Result<List<TrendDataPoint>> getUserTrend(@RequestParam(defaultValue = "30") Integer days);
    
    @GetMapping("/statistics/popular-tools")
    public Result<List<PopularToolData>> getPopularTools(@RequestParam(defaultValue = "10") Integer limit);
}
```

### 2. AdminService

管理员核心服务，处理仪表盘统计数据。

```java
public interface AdminService {
    /**
     * 获取仪表盘统计数据
     */
    DashboardStatsResponse getDashboardStats();
}

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminServiceImpl implements AdminService {
    
    private final UserMapper userMapper;
    private final ToolMapper toolMapper;
    private final CategoryMapper categoryMapper;
    private final ToolUsageMapper toolUsageMapper;
    
    @Override
    public DashboardStatsResponse getDashboardStats() {
        DashboardStatsResponse stats = new DashboardStatsResponse();
        
        // 总用户数
        stats.setTotalUsers(userMapper.selectCount(null));
        
        // 活跃用户数（最近30天有登录）
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        stats.setActiveUsers(userMapper.countActiveUsers(thirtyDaysAgo));
        
        // 工具总数
        stats.setTotalTools(toolMapper.selectCount(null));
        
        // 分类总数
        stats.setTotalCategories(categoryMapper.selectCount(null));
        
        // 总使用次数
        stats.setTotalUsage(toolUsageMapper.selectCount(null));
        
        // 今日新增用户
        LocalDateTime todayStart = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        stats.setNewUsersToday(userMapper.countNewUsers(todayStart));
        
        // 本周新增用户
        LocalDateTime weekStart = LocalDateTime.now().minusDays(7);
        stats.setNewUsersThisWeek(userMapper.countNewUsers(weekStart));
        
        // 今日使用次数
        stats.setUsageToday(toolUsageMapper.countUsageAfter(todayStart));
        
        return stats;
    }
}
```

### 3. AdminUserService

管理员用户管理服务。

```java
public interface AdminUserService {
    /**
     * 分页查询用户列表
     */
    PageResult<AdminUserResponse> listUsers(AdminUserQueryRequest request);
    
    /**
     * 获取用户详情
     */
    AdminUserResponse getUser(Long id);
    
    /**
     * 更新用户信息
     */
    AdminUserResponse updateUser(Long id, AdminUserUpdateRequest request);
    
    /**
     * 删除用户
     */
    void deleteUser(Long id);
    
    /**
     * 切换用户状态
     */
    void toggleUserStatus(Long id, Integer status);
}

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminUserServiceImpl implements AdminUserService {
    
    private final UserMapper userMapper;
    private final UserConverter userConverter;
    private final UserContext userContext;
    
    @Override
    public PageResult<AdminUserResponse> listUsers(AdminUserQueryRequest request) {
        // 构建查询条件
        Page<User> page = new Page<>(request.getPage(), request.getSize());
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        
        // 关键词搜索（用户名或邮箱）
        if (StringUtils.hasText(request.getKeyword())) {
            wrapper.and(w -> w.like("username", request.getKeyword())
                             .or()
                             .like("email", request.getKeyword()));
        }
        
        // 状态过滤
        if (request.getStatus() != null) {
            wrapper.eq("status", request.getStatus());
        }
        
        // 套餐类型过滤
        if (request.getPlanType() != null) {
            wrapper.eq("plan_type", request.getPlanType());
        }
        
        // 排序
        wrapper.orderByDesc("created_at");
        
        // 执行查询
        Page<User> userPage = userMapper.selectPage(page, wrapper);
        
        // 转换为响应DTO
        List<AdminUserResponse> responses = userPage.getRecords().stream()
            .map(userConverter::toAdminUserResponse)
            .collect(Collectors.toList());
        
        return PageResult.of(responses, userPage.getTotal(), userPage.getPages());
    }
    
    @Override
    public AdminUserResponse getUser(Long id) {
        User user = userMapper.selectById(id);
        if (user == null || user.getDeleted() == 1) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return userConverter.toAdminUserResponse(user);
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public AdminUserResponse updateUser(Long id, AdminUserUpdateRequest request) {
        User user = userMapper.selectById(id);
        if (user == null || user.getDeleted() == 1) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        
        // 更新字段
        if (StringUtils.hasText(request.getNickname())) {
            user.setNickname(request.getNickname());
        }
        
        if (StringUtils.hasText(request.getEmail())) {
            // 验证邮箱唯一性
            User existingUser = userMapper.findByEmail(request.getEmail());
            if (existingUser != null && !existingUser.getId().equals(id)) {
                throw new BusinessException(ErrorCode.EMAIL_EXISTS);
            }
            user.setEmail(request.getEmail());
        }
        
        if (request.getPlanType() != null) {
            user.setPlanType(request.getPlanType());
        }
        
        if (request.getPlanExpiredAt() != null) {
            user.setPlanExpiredAt(request.getPlanExpiredAt());
        }
        
        if (request.getStatus() != null) {
            user.setStatus(request.getStatus());
        }
        
        userMapper.updateById(user);
        
        log.info("管理员更新用户信息: userId={}, adminId={}", id, userContext.getCurrentUserId());
        
        return userConverter.toAdminUserResponse(user);
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteUser(Long id) {
        // 不能删除自己
        if (id.equals(userContext.getCurrentUserId())) {
            throw new BusinessException(ErrorCode.CANNOT_DELETE_SELF);
        }
        
        User user = userMapper.selectById(id);
        if (user == null || user.getDeleted() == 1) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        
        // 软删除
        userMapper.deleteById(id);
        
        log.info("管理员删除用户: userId={}, adminId={}", id, userContext.getCurrentUserId());
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void toggleUserStatus(Long id, Integer status) {
        User user = userMapper.selectById(id);
        if (user == null || user.getDeleted() == 1) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        
        user.setStatus(status);
        userMapper.updateById(user);
        
        log.info("管理员切换用户状态: userId={}, status={}, adminId={}", id, status, userContext.getCurrentUserId());
    }
}
```

### 4. AdminStatisticsService

管理员统计服务。

```java
public interface AdminStatisticsService {
    /**
     * 获取使用趋势数据
     */
    List<TrendDataPoint> getUsageTrend(Integer days);
    
    /**
     * 获取用户增长趋势
     */
    List<TrendDataPoint> getUserTrend(Integer days);
    
    /**
     * 获取热门工具
     */
    List<PopularToolData> getPopularTools(Integer limit);
}

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminStatisticsServiceImpl implements AdminStatisticsService {
    
    private final ToolUsageMapper toolUsageMapper;
    private final UserMapper userMapper;
    private final ToolMapper toolMapper;
    
    @Override
    public List<TrendDataPoint> getUsageTrend(Integer days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        
        // 查询每日使用量
        List<Map<String, Object>> dailyUsage = toolUsageMapper.getDailyUsageCount(startDate);
        
        // 转换为响应格式
        return dailyUsage.stream()
            .map(map -> {
                TrendDataPoint point = new TrendDataPoint();
                point.setDate(map.get("date").toString());
                point.setCount(((Number) map.get("count")).intValue());
                return point;
            })
            .collect(Collectors.toList());
    }
    
    @Override
    public List<TrendDataPoint> getUserTrend(Integer days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        
        // 查询每日注册量
        List<Map<String, Object>> dailyRegistrations = userMapper.getDailyRegistrationCount(startDate);
        
        // 转换为响应格式
        return dailyRegistrations.stream()
            .map(map -> {
                TrendDataPoint point = new TrendDataPoint();
                point.setDate(map.get("date").toString());
                point.setCount(((Number) map.get("count")).intValue());
                return point;
            })
            .collect(Collectors.toList());
    }
    
    @Override
    public List<PopularToolData> getPopularTools(Integer limit) {
        // 查询使用次数最多的工具
        List<Map<String, Object>> popularTools = toolUsageMapper.getPopularTools(limit);
        
        // 转换为响应格式
        return popularTools.stream()
            .map(map -> {
                PopularToolData data = new PopularToolData();
                data.setToolId(((Number) map.get("tool_id")).longValue());
                data.setToolName(map.get("tool_name").toString());
                data.setCount(((Number) map.get("count")).intValue());
                return data;
            })
            .collect(Collectors.toList());
    }
}
```

### 5. Security Configuration

管理员权限验证。

```java
@Component
@RequiredArgsConstructor
public class AdminAuthorizationAspect {
    
    private final UserContext userContext;
    private final UserMapper userMapper;
    
    @Before("@annotation(RequireAdmin)")
    public void checkAdminPermission() {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        User user = userMapper.selectById(userId);
        if (user == null || user.getDeleted() == 1) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        
        // 检查是否为管理员（这里假设planType=2为管理员）
        if (user.getPlanType() != 2) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "需要管理员权限");
        }
    }
}

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireAdmin {
}
```

## Data Models

### Request DTOs

```java
// 管理员用户查询请求
@Data
public class AdminUserQueryRequest extends BaseRequest {
    private String keyword;      // 搜索关键词
    private Integer status;      // 状态过滤
    private Integer planType;    // 套餐类型过滤
    private Integer page = 1;    // 页码
    private Integer size = 10;   // 每页大小
}

// 管理员用户更新请求
@Data
public class AdminUserUpdateRequest {
    private String nickname;
    private String email;
    private Integer planType;
    private LocalDateTime planExpiredAt;
    private Integer status;
}

// 用户状态请求
@Data
public class UserStatusRequest {
    @NotNull(message = "状态不能为空")
    private Integer status;
}
```

### Response DTOs

```java
// 管理员用户响应（包含更多信息）
@Data
@EqualsAndHashCode(callSuper = true)
public class AdminUserResponse extends BaseResponse {
    private String username;
    private String email;
    private String nickname;
    private String avatar;
    private Integer planType;
    private LocalDateTime planExpiredAt;
    private Integer status;
    private LocalDateTime lastLoginAt;
    private String lastLoginIp;
}

// 仪表盘统计响应
@Data
public class DashboardStatsResponse {
    private Long totalUsers;
    private Long activeUsers;
    private Long totalTools;
    private Long totalCategories;
    private Long totalUsage;
    private Long newUsersToday;
    private Long newUsersThisWeek;
    private Long usageToday;
}

// 趋势数据点
@Data
public class TrendDataPoint {
    private String date;
    private Integer count;
}

// 热门工具数据
@Data
public class PopularToolData {
    private Long toolId;
    private String toolName;
    private Integer count;
}
```

### Mapper Extensions

需要在现有Mapper中添加统计查询方法：

```java
// UserMapper 扩展
public interface UserMapper extends BaseMapper<User> {
    // 现有方法...
    
    /**
     * 统计活跃用户数（指定时间后有登录）
     */
    @Select("SELECT COUNT(*) FROM t_user WHERE last_login_at >= #{since} AND deleted = 0")
    Long countActiveUsers(@Param("since") LocalDateTime since);
    
    /**
     * 统计新增用户数（指定时间后注册）
     */
    @Select("SELECT COUNT(*) FROM t_user WHERE created_at >= #{since} AND deleted = 0")
    Long countNewUsers(@Param("since") LocalDateTime since);
    
    /**
     * 获取每日注册量
     */
    @Select("SELECT DATE(created_at) as date, COUNT(*) as count " +
            "FROM t_user " +
            "WHERE created_at >= #{startDate} AND deleted = 0 " +
            "GROUP BY DATE(created_at) " +
            "ORDER BY date")
    List<Map<String, Object>> getDailyRegistrationCount(@Param("startDate") LocalDateTime startDate);
}

// ToolUsageMapper 扩展
public interface ToolUsageMapper extends BaseMapper<ToolUsage> {
    // 现有方法...
    
    /**
     * 统计指定时间后的使用次数
     */
    @Select("SELECT COUNT(*) FROM t_tool_usage WHERE created_at >= #{since}")
    Long countUsageAfter(@Param("since") LocalDateTime since);
    
    /**
     * 获取每日使用量
     */
    @Select("SELECT DATE(created_at) as date, COUNT(*) as count " +
            "FROM t_tool_usage " +
            "WHERE created_at >= #{startDate} " +
            "GROUP BY DATE(created_at) " +
            "ORDER BY date")
    List<Map<String, Object>> getDailyUsageCount(@Param("startDate") LocalDateTime startDate);
    
    /**
     * 获取热门工具
     */
    @Select("SELECT t.id as tool_id, t.name as tool_name, COUNT(*) as count " +
            "FROM t_tool_usage u " +
            "JOIN t_tool t ON u.tool_id = t.id " +
            "WHERE t.deleted = 0 " +
            "GROUP BY u.tool_id " +
            "ORDER BY count DESC " +
            "LIMIT #{limit}")
    List<Map<String, Object>> getPopularTools(@Param("limit") Integer limit);
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Admin Role Verification

*For any* request to admin endpoints with a valid user token, the system should verify the user has admin role (planType=2) before allowing access.

**Validates: Requirements 1.1**

### Property 2: Non-Admin Access Denial

*For any* request to admin endpoints from a non-admin user, the system should return 403 Forbidden error.

**Validates: Requirements 1.2**

### Property 3: Dashboard Statistics Completeness

*For any* dashboard statistics request, the response should contain all required fields: totalUsers, activeUsers, totalTools, totalCategories, totalUsage, newUsersToday, newUsersThisWeek, and usageToday.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**

### Property 4: User List Pagination

*For any* valid page request, the user list response should contain pagination metadata (page, size, total, totalPages) and the number of returned items should not exceed the requested page size.

**Validates: Requirements 3.1**

### Property 5: User Search Filtering

*For any* keyword search, all returned users should have the keyword present in either their username or email field.

**Validates: Requirements 3.2**

### Property 6: User Status Filtering

*For any* status filter value, all returned users should have exactly that status value.

**Validates: Requirements 3.3**

### Property 7: User Plan Type Filtering

*For any* plan type filter value, all returned users should have exactly that plan type value.

**Validates: Requirements 3.4**

### Property 8: User Retrieval by ID

*For any* valid user ID, requesting that user should return a user object with matching ID.

**Validates: Requirements 3.5**

### Property 9: User Update Validation

*For any* user update request with invalid data (invalid email format, duplicate email, invalid plan type), the system should reject the request with appropriate error message.

**Validates: Requirements 4.1, 4.3**

### Property 10: User Update Round Trip

*For any* valid user update (nickname, email, planType), updating a user then retrieving it should return the updated values.

**Validates: Requirements 4.2, 4.4**

### Property 11: User Status Toggle

*For any* user, toggling status from active to disabled then back to active should result in the original active status.

**Validates: Requirements 4.5**

### Property 12: User Deletion

*For any* existing user (except the current admin), after deletion, attempting to retrieve that user should return 404 Not Found error.

**Validates: Requirements 5.1**

### Property 13: Tool List Pagination

*For any* valid page request, the tool list response should contain pagination metadata and the number of returned items should not exceed the requested page size.

**Validates: Requirements 6.1**

### Property 14: Tool Search Filtering

*For any* keyword search, all returned tools should have the keyword present in either their name or description field.

**Validates: Requirements 6.2**

### Property 15: Tool Category Filtering

*For any* category filter value, all returned tools should belong to that category.

**Validates: Requirements 6.3**

### Property 16: Tool Status Filtering

*For any* status filter value, all returned tools should have exactly that status value.

**Validates: Requirements 6.4**

### Property 17: Tool Retrieval by ID

*For any* valid tool ID, requesting that tool should return a tool object with matching ID.

**Validates: Requirements 6.5**

### Property 18: Tool Creation Validation

*For any* tool creation request with missing required fields or invalid data, the system should reject the request with appropriate error message.

**Validates: Requirements 7.1**

### Property 19: Tool ID Uniqueness

*For any* two tools created in the system, they should have different IDs.

**Validates: Requirements 7.2**

### Property 20: Tool Name Uniqueness

*For any* tool update or creation with a name that already exists, the system should reject the request.

**Validates: Requirements 7.4**

### Property 21: Tool Category Validation

*For any* tool update or creation with a non-existent category ID, the system should reject the request.

**Validates: Requirements 7.5**

### Property 22: Tool Deletion Preserves Usage History

*For any* tool with usage history, after deleting the tool, the usage records should still exist in the database.

**Validates: Requirements 8.2**

### Property 23: Category Status Filtering

*For any* status filter value, all returned categories should have exactly that status value.

**Validates: Requirements 9.2**

### Property 24: Category Retrieval by ID

*For any* valid category ID, requesting that category should return a category object with matching ID.

**Validates: Requirements 9.3**

### Property 25: Category Tool Count Accuracy

*For any* category, the tool count in the response should equal the actual number of tools in that category.

**Validates: Requirements 9.4**

### Property 26: Category Creation Validation

*For any* category creation request with missing required fields, the system should reject the request with appropriate error message.

**Validates: Requirements 10.1**

### Property 27: Category ID Uniqueness

*For any* two categories created in the system, they should have different IDs.

**Validates: Requirements 10.2**

### Property 28: Category Name Uniqueness

*For any* category update or creation with a name that already exists, the system should reject the request.

**Validates: Requirements 10.4**

### Property 29: Category Sort Order

*For any* category list request, categories should be returned in the order specified by their sortOrder field.

**Validates: Requirements 10.5**

### Property 30: Category Deletion with Tools

*For any* category that has tools associated with it, attempting to delete the category should return 400 Bad Request error.

**Validates: Requirements 11.2**

### Property 31: Category Deletion without Tools

*For any* category with no tools, after deletion, attempting to retrieve that category should return 404 Not Found error.

**Validates: Requirements 11.1**

### Property 32: Usage Trend Date Range

*For any* usage trend request with a specified time range, all returned data points should have dates within that range.

**Validates: Requirements 12.2**

### Property 33: Usage Trend Date Uniqueness

*For any* usage trend data, each date should appear at most once in the result set.

**Validates: Requirements 12.3**

### Property 34: User Trend Date Range

*For any* user trend request with a specified time range, all returned data points should have dates within that range.

**Validates: Requirements 13.2**

### Property 35: User Trend Date Uniqueness

*For any* user trend data, each date should appear at most once in the result set.

**Validates: Requirements 13.3**

### Property 36: Popular Tools Sort Order

*For any* popular tools result list, each tool's usage count should be greater than or equal to the next tool's usage count (descending order).

**Validates: Requirements 14.1**

### Property 37: Popular Tools Limit

*For any* popular tools request with a specified limit N, the result should contain at most N tools.

**Validates: Requirements 14.2**

### Property 38: Input Validation

*For any* admin API request with invalid input (invalid email format, out-of-range numeric values, invalid enum values, missing required fields), the system should return 400 Bad Request with detailed validation error messages.

**Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5, 16.6**

## Error Handling

### Error Response Format

所有错误响应遵循统一格式：

```json
{
  "code": 40001,
  "message": "用户名已存在",
  "data": null,
  "timestamp": "2024-01-20T10:30:00"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| 40001 | 400 | 请求参数验证失败 |
| 40101 | 401 | 未认证 |
| 40301 | 403 | 无权限访问 |
| 40401 | 404 | 资源不存在 |
| 40901 | 409 | 资源冲突（如用户名已存在） |
| 50001 | 500 | 服务器内部错误 |

### Exception Handling

使用Spring的`@ControllerAdvice`统一处理异常：

```java
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Result<Void>> handleBusinessException(BusinessException e) {
        log.warn("业务异常: {}", e.getMessage());
        return ResponseEntity
            .status(e.getErrorCode().getHttpStatus())
            .body(Result.error(e.getErrorCode(), e.getMessage()));
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Result<Void>> handleValidationException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getAllErrors().stream()
            .map(DefaultMessageSourceResolvable::getDefaultMessage)
            .collect(Collectors.joining(", "));
        log.warn("参数验证失败: {}", message);
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(Result.error(ErrorCode.INVALID_PARAMS, message));
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleException(Exception e) {
        log.error("系统异常", e);
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Result.error(ErrorCode.SYSTEM_ERROR, "系统错误，请稍后重试"));
    }
}
```

## Testing Strategy

### Unit Testing

使用JUnit 5和Mockito进行单元测试：

- **Service层测试**: Mock Mapper层，测试业务逻辑
- **Controller层测试**: 使用MockMvc测试HTTP接口
- **Mapper层测试**: 使用H2内存数据库测试SQL查询

示例：

```java
@SpringBootTest
@AutoConfigureMockMvc
class AdminControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private AdminService adminService;
    
    @Test
    void testGetDashboardStats() throws Exception {
        // Given
        DashboardStatsResponse stats = new DashboardStatsResponse();
        stats.setTotalUsers(100L);
        when(adminService.getDashboardStats()).thenReturn(stats);
        
        // When & Then
        mockMvc.perform(get("/api/v1/admin/stats")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalUsers").value(100));
    }
}
```

### Property-Based Testing

使用jqwik进行基于属性的测试，验证系统的通用属性：

配置：每个属性测试运行至少100次迭代

示例：

```java
@PropertyTest
@Tag("Feature: admin-backend-implementation, Property 5: User Search Filtering")
void userSearchShouldReturnMatchingUsers(@ForAll @AlphaChars @StringLength(min = 3, max = 10) String keyword) {
    // Given: Create users with various usernames and emails
    List<User> users = createTestUsers();
    
    // When: Search with keyword
    AdminUserQueryRequest request = new AdminUserQueryRequest();
    request.setKeyword(keyword);
    PageResult<AdminUserResponse> result = adminUserService.listUsers(request);
    
    // Then: All returned users should match the keyword
    for (AdminUserResponse user : result.getList()) {
        boolean matches = user.getUsername().contains(keyword) || 
                         user.getEmail().contains(keyword);
        assertThat(matches).isTrue();
    }
}

@PropertyTest
@Tag("Feature: admin-backend-implementation, Property 10: User Update Round Trip")
void userUpdateShouldPersist(@ForAll @AlphaChars String nickname, 
                             @ForAll @Email String email) {
    // Given: An existing user
    User user = createTestUser();
    
    // When: Update user
    AdminUserUpdateRequest request = new AdminUserUpdateRequest();
    request.setNickname(nickname);
    request.setEmail(email);
    adminUserService.updateUser(user.getId(), request);
    
    // Then: Retrieve should return updated values
    AdminUserResponse retrieved = adminUserService.getUser(user.getId());
    assertThat(retrieved.getNickname()).isEqualTo(nickname);
    assertThat(retrieved.getEmail()).isEqualTo(email);
}
```

### Integration Testing

使用Testcontainers进行集成测试，测试完整的API流程：

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class AdminIntegrationTest {
    
    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0");
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    void testCompleteUserManagementFlow() {
        // 1. Login as admin
        String adminToken = loginAsAdmin();
        
        // 2. Create user
        // 3. Update user
        // 4. Delete user
        // Verify each step
    }
}
```

### Test Coverage Goals

- 单元测试覆盖率: ≥ 80%
- 属性测试: 覆盖所有核心业务逻辑
- 集成测试: 覆盖所有API端点的主要流程
