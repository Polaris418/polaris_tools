# Design Document - Polaris Tools Platform

## Overview

Polaris Tools Platform（北极星工具箱）是一个现代化的开发工具导航网站，采用单体应用架构，前后端分离设计。系统使用 Spring Boot 3.2.5 作为后端框架，React 19.2.3 作为前端框架，MySQL 8.0+ 作为主数据库，Redis 作为缓存层。

### 设计目标

1. **快速开发**: 使用单体架构，简化开发和部署流程
2. **高性能**: 通过 Redis 缓存和数据库索引优化，确保 API 响应时间 < 200ms
3. **安全性**: JWT 认证、BCrypt 加密、SQL 注入防护
4. **可维护性**: 清晰的分层架构、模块化设计、完善的文档
5. **国际化**: 支持中英文双语，易于扩展其他语言
6. **响应式**: 支持桌面端、平板、移动端多种设备
7. **可扩展性**: 模块化设计，为未来微服务拆分预留扩展点

### 当前项目状态

**已实现的基础架构**:
- ✅ Spring Boot 3.2.5 + MyBatis-Plus 3.5.6 配置
- ✅ Spring Security + JWT 认证机制
- ✅ 全局异常处理和统一响应格式
- ✅ 数据库表结构设计（5 个核心表 + 8 个扩展表）
- ✅ 实体类定义（User, Tool, Category, UserFavorite, ToolUsage）
- ✅ 前端基础组件（Sidebar, Header, Hero, ToolCard）
- ✅ 国际化和主题切换功能

**待实现的核心功能**:
- ❌ Controller 层（REST API 端点）
- ❌ Service 层（业务逻辑）
- ❌ Mapper 层（数据访问）
- ❌ DTO 类（请求/响应对象）
- ❌ Redis 缓存集成
- ❌ 前端 API 客户端和数据获取

## Architecture

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Browser    │  │    Mobile    │  │    Tablet    │      │
│  │  (React App) │  │  (React App) │  │  (React App) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Nginx (Optional)                        │
│                    Static Files + Proxy                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Application Layer                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Spring Boot Application (Port 8080)          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │Controller│→ │ Service  │→ │  Mapper  │            │ │
│  │  └──────────┘  └──────────┘  └──────────┘            │ │
│  │  ┌──────────────────────────────────────┐            │ │
│  │  │     Security Filter Chain            │            │ │
│  │  │  (CORS → JWT Authentication)         │            │ │
│  │  └──────────────────────────────────────┘            │ │
│  │  ┌──────────────────────────────────────┐            │ │
│  │  │     Global Exception Handler         │            │ │
│  │  └──────────────────────────────────────┘            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                    │                    │
                    ▼                    ▼
┌──────────────────────┐    ┌──────────────────────┐
│   MySQL Database     │    │   Redis Cache        │
│   (Primary Storage)  │    │   (Session/Cache)    │
│   Port: 3306         │    │   Port: 6379         │
└──────────────────────┘    └──────────────────────┘
```

### 技术栈

**后端技术栈**:
- Java 17 - 编程语言
- Spring Boot 3.2.5 - 核心框架
- Spring Security - 安全认证
- MyBatis-Plus 3.5.6 - ORM 框架
- MySQL 8.0+ - 关系型数据库
- Redis 7+ - 缓存和会话存储
- JWT (jjwt 0.11.5) - 无状态认证
- Lombok - 代码简化
- MapStruct 1.5.5 - 对象映射
- SpringDoc OpenAPI 2.6.0 - API 文档
- HikariCP - 数据库连接池

**前端技术栈**:
- React 19.2.3 - UI 框架
- TypeScript 5.8.2 - 类型安全
- Vite 6.2.0 - 构建工具
- Tailwind CSS (推断) - 样式框架
- Context API - 状态管理
- Material Symbols - 图标库

**开发工具**:
- Maven - 后端构建工具
- npm - 前端包管理器
- Git - 版本控制


## Components and Interfaces

### 后端分层架构

#### 1. Controller Layer (控制器层)

负责接收 HTTP 请求、参数验证、调用 Service 层、返回响应。

**包结构**: `com.polaris.controller`

**核心 Controller 设计**:

```java
// AuthController - 认证相关
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "用户认证 API")
public class AuthController {
    POST   /register      - 用户注册
    POST   /login         - 用户登录
    POST   /logout        - 用户登出
    POST   /refresh       - 刷新 Token
    GET    /me            - 获取当前用户信息
}

// ToolController - 工具管理
@RestController
@RequestMapping("/api/v1/tools")
@Tag(name = "Tool Management", description = "工具管理 API")
public class ToolController {
    GET    /              - 获取工具列表（支持分页、搜索、过滤）
    GET    /{id}          - 获取工具详情
    POST   /              - 创建工具（管理员）
    PUT    /{id}          - 更新工具（管理员）
    DELETE /{id}          - 删除工具（管理员）
    POST   /{id}/view     - 记录工具浏览
    POST   /{id}/use      - 记录工具使用
}

// CategoryController - 分类管理
@RestController
@RequestMapping("/api/v1/categories")
@Tag(name = "Category Management", description = "分类管理 API")
public class CategoryController {
    GET    /              - 获取分类列表
    GET    /{id}          - 获取分类详情（包含工具数量）
    POST   /              - 创建分类（管理员）
    PUT    /{id}          - 更新分类（管理员）
    DELETE /{id}          - 删除分类（管理员）
}

// FavoriteController - 收藏管理
@RestController
@RequestMapping("/api/v1/favorites")
@Tag(name = "Favorite Management", description = "收藏管理 API")
public class FavoriteController {
    GET    /              - 获取用户收藏列表
    POST   /              - 添加收藏
    DELETE /{toolId}      - 取消收藏
    GET    /check/{toolId} - 检查是否已收藏
}

// UsageController - 使用统计
@RestController
@RequestMapping("/api/v1/usage")
@Tag(name = "Usage Statistics", description = "使用统计 API")
public class UsageController {
    GET    /recent        - 获取最近使用的工具
    GET    /popular       - 获取热门工具
    GET    /history       - 获取用户使用历史
}
```

**统一响应格式**:

```java
// 成功响应
{
  "code": 200,
  "message": "success",
  "data": {...},
  "timestamp": 1705564800000
}

// 分页响应
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [...],
    "total": 100,
    "pages": 5,
    "pageNum": 1,
    "pageSize": 20
  },
  "timestamp": 1705564800000
}

// 错误响应
{
  "code": 400,
  "message": "参数验证失败: name: 工具名称不能为空",
  "data": null,
  "timestamp": 1705564800000
}
```

#### 2. Service Layer (业务逻辑层)

负责核心业务逻辑、事务管理、缓存操作。

**包结构**: `com.polaris.service` 和 `com.polaris.service.impl`

**核心 Service 设计**:

```java
// AuthService - 认证服务
public interface AuthService {
    UserResponse register(UserRegisterRequest request);
    LoginResponse login(UserLoginRequest request);
    void logout();
    String refreshToken(String refreshToken);
    UserResponse getCurrentUser();
}

// ToolService - 工具服务
public interface ToolService {
    PageResult<ToolResponse> listTools(ToolQueryRequest request);
    ToolResponse getToolById(Long id);
    ToolResponse createTool(ToolCreateRequest request);
    ToolResponse updateTool(Long id, ToolUpdateRequest request);
    void deleteTool(Long id);
    void incrementViewCount(Long id);
    void recordToolUsage(Long id, HttpServletRequest request);
}

// CategoryService - 分类服务
public interface CategoryService {
    List<CategoryResponse> listCategories();
    CategoryResponse getCategoryById(Long id);
    CategoryResponse createCategory(CategoryCreateRequest request);
    CategoryResponse updateCategory(Long id, CategoryUpdateRequest request);
    void deleteCategory(Long id);
}

// FavoriteService - 收藏服务
public interface FavoriteService {
    List<ToolResponse> listFavorites();
    void addFavorite(Long toolId);
    void removeFavorite(Long toolId);
    boolean isFavorited(Long toolId);
}

// UsageService - 使用统计服务
public interface UsageService {
    List<ToolResponse> getRecentTools(Integer limit);
    List<ToolResponse> getPopularTools(Integer limit);
    PageResult<ToolUsageResponse> getUserHistory(Integer page, Integer size);
}
```

**缓存策略**:

```java
// 工具列表缓存 - 5分钟过期
@Cacheable(value = "tools:list", key = "#request.hashCode()")
public PageResult<ToolResponse> listTools(ToolQueryRequest request)

// 工具详情缓存 - 10分钟过期
@Cacheable(value = "tools:detail", key = "#id")
public ToolResponse getToolById(Long id)

// 分类列表缓存 - 30分钟过期
@Cacheable(value = "categories:list")
public List<CategoryResponse> listCategories()

// 热门工具缓存 - 1小时过期
@Cacheable(value = "tools:popular", key = "#limit")
public List<ToolResponse> getPopularTools(Integer limit)

// 缓存失效
@CacheEvict(value = "tools:list", allEntries = true)
@CacheEvict(value = "tools:detail", key = "#id")
public ToolResponse updateTool(Long id, ToolUpdateRequest request)
```

#### 3. Mapper Layer (数据访问层)

使用 MyBatis-Plus 提供的 BaseMapper，支持基础 CRUD 和自定义 SQL。

**包结构**: `com.polaris.mapper`

**核心 Mapper 设计**:

```java
@Mapper
public interface UserMapper extends BaseMapper<User> {
    User findByUsername(String username);
    User findByEmail(String email);
}

@Mapper
public interface ToolMapper extends BaseMapper<Tool> {
    // 全文搜索
    List<Tool> searchTools(@Param("keyword") String keyword, 
                          @Param("categoryId") Long categoryId);
    
    // 热门工具
    List<Tool> getPopularTools(@Param("limit") Integer limit);
    
    // 增加浏览计数
    int incrementViewCount(@Param("id") Long id);
    
    // 增加使用计数
    int incrementUseCount(@Param("id") Long id);
}

@Mapper
public interface CategoryMapper extends BaseMapper<Category> {
    // 查询分类及工具数量
    List<Category> listCategoriesWithToolCount();
}

@Mapper
public interface UserFavoriteMapper extends BaseMapper<UserFavorite> {
    // 查询用户收藏的工具列表
    List<Tool> listFavoriteTools(@Param("userId") Long userId);
    
    // 检查是否已收藏
    boolean isFavorited(@Param("userId") Long userId, 
                       @Param("toolId") Long toolId);
}

@Mapper
public interface ToolUsageMapper extends BaseMapper<ToolUsage> {
    // 查询用户最近使用的工具
    List<Tool> getRecentTools(@Param("userId") Long userId, 
                             @Param("limit") Integer limit);
    
    // 查询用户使用历史
    IPage<ToolUsage> getUserHistory(@Param("userId") Long userId, 
                                    Page<ToolUsage> page);
}
```

#### 4. Security Layer (安全层)

**JWT 认证流程**:

```
1. 用户登录 → AuthController.login()
2. AuthService 验证用户名和密码
3. JwtTokenProvider.createToken() 生成 JWT Token
4. 返回 Token 给客户端
5. 客户端在请求头中携带: "Authorization: Bearer {token}"
6. JwtAuthenticationFilter 拦截请求
7. JwtTokenProvider.validateToken() 验证 Token
8. 提取 userId 和 username
9. 设置 SecurityContext
10. 继续请求处理
```

**权限控制**:

```java
// SecurityConfig.java
http.authorizeHttpRequests(auth -> auth
    // 公开接口 - 无需认证
    .requestMatchers("/api/v1/auth/**").permitAll()
    .requestMatchers(HttpMethod.GET, "/api/v1/categories/**").permitAll()
    .requestMatchers(HttpMethod.GET, "/api/v1/tools/**").permitAll()
    .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
    
    // 需要认证的接口
    .requestMatchers("/api/v1/favorites/**").authenticated()
    .requestMatchers("/api/v1/usage/**").authenticated()
    
    // 需要管理员权限（待实现角色系统）
    .requestMatchers(HttpMethod.POST, "/api/v1/tools/**").hasRole("ADMIN")
    .requestMatchers(HttpMethod.PUT, "/api/v1/tools/**").hasRole("ADMIN")
    .requestMatchers(HttpMethod.DELETE, "/api/v1/tools/**").hasRole("ADMIN")
    
    // 其他请求需要认证
    .anyRequest().authenticated()
);
```


### 前端架构设计

#### 1. 组件层次结构

```
App (AppProvider)
├── Sidebar
│   ├── Brand Logo
│   ├── SearchBar
│   ├── Navigation
│   │   ├── Dashboard
│   │   └── Favorites
│   ├── Categories List
│   └── UserProfile
├── Header
│   ├── Breadcrumb
│   ├── ThemeToggle
│   ├── LanguageToggle
│   ├── Notifications
│   └── Logout
└── Pages
    ├── Dashboard
    │   ├── Hero
    │   ├── RecentTools Section
    │   │   └── RecentToolCard[]
    │   ├── Text Utilities Section
    │   │   └── StandardToolCard[]
    │   └── Developer Tools Section
    │       └── StandardToolCard[]
    ├── Favorites (待实现)
    ├── Categories (待实现)
    ├── Settings (待实现)
    ├── Profile (待实现)
    ├── Notifications (待实现)
    └── Login (待实现)
```

#### 2. 状态管理

使用 React Context API 管理全局状态：

```typescript
// AppContext.tsx
interface AppContextType {
  // 主题
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  
  // 语言
  language: 'en' | 'zh';
  toggleLanguage: () => void;
  t: (key: string) => string;
  
  // 路由
  page: string;
  navigate: (page: string) => void;
  
  // 用户（待实现）
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}
```

#### 3. API 客户端设计（待实现）

```typescript
// api/client.ts
class ApiClient {
  private baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<Result<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      ...options?.headers,
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    const result: Result<T> = await response.json();

    if (result.code !== 200) {
      throw new ApiError(result.code, result.message);
    }

    return result;
  }

  // 认证 API
  auth = {
    register: (data: RegisterRequest) => 
      this.request<UserResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    login: (data: LoginRequest) => 
      this.request<LoginResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    logout: () => 
      this.request<void>('/api/v1/auth/logout', {
        method: 'POST',
      }),
    
    getCurrentUser: () => 
      this.request<UserResponse>('/api/v1/auth/me'),
  };

  // 工具 API
  tools = {
    list: (params: ToolQueryParams) => 
      this.request<PageResult<ToolResponse>>(`/api/v1/tools?${new URLSearchParams(params)}`),
    
    get: (id: number) => 
      this.request<ToolResponse>(`/api/v1/tools/${id}`),
    
    create: (data: ToolCreateRequest) => 
      this.request<ToolResponse>('/api/v1/tools', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: number, data: ToolUpdateRequest) => 
      this.request<ToolResponse>(`/api/v1/tools/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: number) => 
      this.request<void>(`/api/v1/tools/${id}`, {
        method: 'DELETE',
      }),
    
    recordView: (id: number) => 
      this.request<void>(`/api/v1/tools/${id}/view`, {
        method: 'POST',
      }),
    
    recordUse: (id: number) => 
      this.request<void>(`/api/v1/tools/${id}/use`, {
        method: 'POST',
      }),
  };

  // 分类 API
  categories = {
    list: () => 
      this.request<CategoryResponse[]>('/api/v1/categories'),
    
    get: (id: number) => 
      this.request<CategoryResponse>(`/api/v1/categories/${id}`),
  };

  // 收藏 API
  favorites = {
    list: () => 
      this.request<ToolResponse[]>('/api/v1/favorites'),
    
    add: (toolId: number) => 
      this.request<void>('/api/v1/favorites', {
        method: 'POST',
        body: JSON.stringify({ toolId }),
      }),
    
    remove: (toolId: number) => 
      this.request<void>(`/api/v1/favorites/${toolId}`, {
        method: 'DELETE',
      }),
    
    check: (toolId: number) => 
      this.request<boolean>(`/api/v1/favorites/check/${toolId}`),
  };

  // 使用统计 API
  usage = {
    recent: (limit: number = 10) => 
      this.request<ToolResponse[]>(`/api/v1/usage/recent?limit=${limit}`),
    
    popular: (limit: number = 10) => 
      this.request<ToolResponse[]>(`/api/v1/usage/popular?limit=${limit}`),
    
    history: (page: number = 1, size: number = 20) => 
      this.request<PageResult<ToolUsageResponse>>(`/api/v1/usage/history?page=${page}&size=${size}`),
  };
}

export const apiClient = new ApiClient();
```

#### 4. 数据获取 Hook 设计（待实现）

```typescript
// hooks/useTools.ts
export function useTools(params: ToolQueryParams) {
  const [data, setData] = useState<PageResult<ToolResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTools() {
      try {
        setLoading(true);
        const result = await apiClient.tools.list(params);
        if (!cancelled) {
          setData(result.data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTools();

    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(params)]);

  return { data, loading, error };
}

// hooks/useCategories.ts
export function useCategories() {
  const [data, setData] = useState<CategoryResponse[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      try {
        setLoading(true);
        const result = await apiClient.categories.list();
        if (!cancelled) {
          setData(result.data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
```

## Data Models

### 核心数据库表设计

#### 1. t_user (用户表)

```sql
CREATE TABLE t_user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT 'BCrypt 加密密码',
  email VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱',
  nickname VARCHAR(50) COMMENT '昵称',
  avatar VARCHAR(500) COMMENT '头像 URL',
  plan_type TINYINT DEFAULT 0 COMMENT '会员类型: 0-Free, 1-Pro, 2-Enterprise',
  plan_expired_at DATETIME COMMENT '会员到期时间',
  status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常',
  last_login_at DATETIME COMMENT '最后登录时间',
  last_login_ip VARCHAR(50) COMMENT '最后登录 IP',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_plan_type (plan_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
```

#### 2. t_category (分类表)

```sql
CREATE TABLE t_category (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL COMMENT '分类名称（英文）',
  name_zh VARCHAR(50) COMMENT '分类名称（中文）',
  icon VARCHAR(50) NOT NULL COMMENT 'Material Symbol 图标名',
  accent_color VARCHAR(50) NOT NULL COMMENT '强调色（CSS 类名）',
  description VARCHAR(255) COMMENT '描述',
  sort_order INT DEFAULT 0 COMMENT '排序值，越小越靠前',
  status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT DEFAULT 0,
  INDEX idx_sort_order (sort_order),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工具分类表';
```

#### 3. t_tool (工具表)

```sql
CREATE TABLE t_tool (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  category_id BIGINT NOT NULL COMMENT '分类 ID',
  name VARCHAR(100) NOT NULL COMMENT '工具名称（英文）',
  name_zh VARCHAR(100) COMMENT '工具名称（中文）',
  description VARCHAR(500) COMMENT '描述（英文）',
  description_zh VARCHAR(500) COMMENT '描述（中文）',
  icon VARCHAR(50) NOT NULL COMMENT 'Material Symbol 图标名',
  url VARCHAR(500) COMMENT '工具链接',
  color_class VARCHAR(100) COMMENT '文字颜色 CSS 类',
  bg_hover_class VARCHAR(100) COMMENT '悬停背景色 CSS 类',
  tool_type TINYINT DEFAULT 0 COMMENT '工具类型: 0-外部链接, 1-内部工具',
  is_featured TINYINT DEFAULT 0 COMMENT '是否精选: 0-否, 1-是',
  view_count BIGINT DEFAULT 0 COMMENT '浏览次数',
  use_count BIGINT DEFAULT 0 COMMENT '使用次数',
  rating_score DECIMAL(3,2) DEFAULT 0.00 COMMENT '平均评分 (0.00-5.00)',
  rating_count BIGINT DEFAULT 0 COMMENT '评分人数',
  review_count BIGINT DEFAULT 0 COMMENT '评论数量',
  sort_order INT DEFAULT 0 COMMENT '排序值',
  status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT DEFAULT 0,
  INDEX idx_category_id (category_id),
  INDEX idx_status_sort (status, sort_order),
  INDEX idx_featured (is_featured),
  INDEX idx_view_count (view_count DESC),
  INDEX idx_use_count (use_count DESC),
  INDEX idx_rating (rating_score DESC),
  FULLTEXT idx_search (name, name_zh, description, description_zh)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工具表';
```

#### 4. t_user_favorite (用户收藏表)

```sql
CREATE TABLE t_user_favorite (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户 ID',
  tool_id BIGINT NOT NULL COMMENT '工具 ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_tool (user_id, tool_id),
  INDEX idx_user_id (user_id),
  INDEX idx_tool_id (tool_id),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏表';
```

#### 5. t_tool_usage (工具使用记录表)

```sql
CREATE TABLE t_tool_usage (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户 ID, 0 表示匿名用户',
  tool_id BIGINT NOT NULL COMMENT '工具 ID',
  used_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '使用时间',
  duration INT COMMENT '使用时长（秒）',
  ip_address VARCHAR(50) COMMENT 'IP 地址',
  user_agent VARCHAR(500) COMMENT 'User-Agent',
  INDEX idx_user_time (user_id, used_at DESC),
  INDEX idx_tool_time (tool_id, used_at DESC),
  INDEX idx_used_at (used_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工具使用记录表';
```


### 扩展数据库表设计（预留）

#### 6. t_user_subscription (用户订阅表)

```sql
CREATE TABLE t_user_subscription (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户 ID',
  plan_type TINYINT NOT NULL COMMENT '订阅类型: 1-Pro, 2-Enterprise',
  amount DECIMAL(10,2) NOT NULL COMMENT '订阅金额',
  payment_method VARCHAR(50) COMMENT '支付方式: alipay, wechat, stripe',
  payment_id VARCHAR(100) COMMENT '支付平台订单号',
  start_date DATETIME NOT NULL COMMENT '订阅开始时间',
  end_date DATETIME NOT NULL COMMENT '订阅结束时间',
  status TINYINT DEFAULT 1 COMMENT '状态: 0-已取消, 1-激活中, 2-已过期',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_end_date (end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户订阅表';
```

#### 7. t_advertisement (广告表)

```sql
CREATE TABLE t_advertisement (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL COMMENT '广告标题',
  description VARCHAR(500) COMMENT '广告描述',
  image_url VARCHAR(500) COMMENT '广告图片 URL',
  target_url VARCHAR(500) NOT NULL COMMENT '点击跳转链接',
  ad_type TINYINT NOT NULL COMMENT '广告类型: 0-Banner, 1-Sidebar, 2-Popup, 3-Native',
  position VARCHAR(50) COMMENT '广告位置标识',
  priority INT DEFAULT 0 COMMENT '优先级，数字越大优先级越高',
  start_date DATETIME NOT NULL COMMENT '投放开始时间',
  end_date DATETIME NOT NULL COMMENT '投放结束时间',
  daily_budget DECIMAL(10,2) COMMENT '每日预算',
  total_budget DECIMAL(10,2) COMMENT '总预算',
  cost_per_click DECIMAL(10,2) COMMENT '每次点击成本 (CPC)',
  impression_count BIGINT DEFAULT 0 COMMENT '展示次数',
  click_count BIGINT DEFAULT 0 COMMENT '点击次数',
  status TINYINT DEFAULT 1 COMMENT '状态: 0-停用, 1-激活, 2-暂停',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status_priority (status, priority DESC),
  INDEX idx_dates (start_date, end_date),
  INDEX idx_position (position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='广告表';
```

#### 8. t_ad_impression (广告展示记录表)

```sql
CREATE TABLE t_ad_impression (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ad_id BIGINT NOT NULL COMMENT '广告 ID',
  user_id BIGINT DEFAULT 0 COMMENT '用户 ID, 0 表示匿名',
  ip_address VARCHAR(50) COMMENT 'IP 地址',
  user_agent VARCHAR(500) COMMENT 'User-Agent',
  page_url VARCHAR(500) COMMENT '展示页面 URL',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ad_id (ad_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='广告展示记录表';
```

#### 9. t_ad_click (广告点击记录表)

```sql
CREATE TABLE t_ad_click (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ad_id BIGINT NOT NULL COMMENT '广告 ID',
  user_id BIGINT DEFAULT 0 COMMENT '用户 ID, 0 表示匿名',
  ip_address VARCHAR(50) COMMENT 'IP 地址',
  user_agent VARCHAR(500) COMMENT 'User-Agent',
  referrer_url VARCHAR(500) COMMENT '来源页面 URL',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ad_id (ad_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='广告点击记录表';
```

#### 10. t_tool_review (工具评论表)

```sql
CREATE TABLE t_tool_review (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tool_id BIGINT NOT NULL COMMENT '工具 ID',
  user_id BIGINT NOT NULL COMMENT '用户 ID',
  rating TINYINT NOT NULL COMMENT '评分: 1-5 星',
  title VARCHAR(100) COMMENT '评论标题',
  content TEXT COMMENT '评论内容',
  helpful_count INT DEFAULT 0 COMMENT '有帮助的点赞数',
  status TINYINT DEFAULT 0 COMMENT '审核状态: 0-待审核, 1-已通过, 2-已拒绝',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tool_id (tool_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_rating (rating),
  INDEX idx_helpful (helpful_count DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工具评论表';
```

#### 11. t_tag (标签表)

```sql
CREATE TABLE t_tag (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL COMMENT '标签名称（英文）',
  name_zh VARCHAR(50) COMMENT '标签名称（中文）',
  color VARCHAR(20) COMMENT '标签颜色（CSS 类名或 HEX）',
  icon VARCHAR(50) COMMENT 'Material Symbol 图标名',
  tool_count INT DEFAULT 0 COMMENT '关联的工具数量',
  sort_order INT DEFAULT 0 COMMENT '排序值',
  status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_name (name),
  INDEX idx_sort_order (sort_order),
  INDEX idx_tool_count (tool_count DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签表';
```

#### 12. t_tool_tag (工具标签关联表)

```sql
CREATE TABLE t_tool_tag (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tool_id BIGINT NOT NULL COMMENT '工具 ID',
  tag_id BIGINT NOT NULL COMMENT '标签 ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tool_tag (tool_id, tag_id),
  INDEX idx_tool_id (tool_id),
  INDEX idx_tag_id (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工具标签关联表';
```

#### 13. t_notification (通知表)

```sql
CREATE TABLE t_notification (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户 ID',
  type VARCHAR(50) NOT NULL COMMENT '通知类型: system, subscription, tool_update, comment_reply',
  title VARCHAR(100) NOT NULL COMMENT '通知标题',
  content TEXT COMMENT '通知内容',
  link_url VARCHAR(500) COMMENT '点击跳转链接',
  is_read TINYINT DEFAULT 0 COMMENT '是否已读: 0-未读, 1-已读',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME COMMENT '阅读时间',
  deleted TINYINT DEFAULT 0 COMMENT '逻辑删除',
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created_at (created_at DESC),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';
```

### DTO 类设计

#### 请求 DTO

```java
// 用户注册请求
@Data
public class UserRegisterRequest {
    @NotBlank(message = "用户名不能为空")
    @Size(min = 3, max = 50, message = "用户名长度必须在 3-50 之间")
    private String username;
    
    @NotBlank(message = "密码不能为空")
    @Size(min = 8, max = 50, message = "密码长度必须在 8-50 之间")
    private String password;
    
    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;
    
    private String nickname;
}

// 用户登录请求
@Data
public class UserLoginRequest {
    @NotBlank(message = "用户名不能为空")
    private String username;
    
    @NotBlank(message = "密码不能为空")
    private String password;
}

// 工具创建请求
@Data
public class ToolCreateRequest {
    @NotNull(message = "分类 ID 不能为空")
    private Long categoryId;
    
    @NotBlank(message = "工具名称不能为空")
    @Size(max = 100, message = "工具名称不能超过 100 个字符")
    private String name;
    
    @Size(max = 100, message = "中文名称不能超过 100 个字符")
    private String nameZh;
    
    @Size(max = 500, message = "描述不能超过 500 个字符")
    private String description;
    
    @Size(max = 500, message = "中文描述不能超过 500 个字符")
    private String descriptionZh;
    
    @NotBlank(message = "图标不能为空")
    private String icon;
    
    @URL(message = "URL 格式不正确")
    private String url;
    
    private String colorClass;
    private String bgHoverClass;
    private Integer toolType;
    private Integer isFeatured;
    private Integer sortOrder;
}

// 工具更新请求
@Data
public class ToolUpdateRequest {
    private Long categoryId;
    private String name;
    private String nameZh;
    private String description;
    private String descriptionZh;
    private String icon;
    private String url;
    private String colorClass;
    private String bgHoverClass;
    private Integer toolType;
    private Integer isFeatured;
    private Integer sortOrder;
    private Integer status;
}

// 工具查询请求
@Data
public class ToolQueryRequest {
    private String keyword;
    private Long categoryId;
    private Integer toolType;
    private Integer isFeatured;
    private String sortBy = "sortOrder";  // sortOrder, viewCount, useCount, createdAt, rating
    private String sortOrder = "asc";     // asc, desc
    
    @Min(value = 1, message = "页码必须大于 0")
    private Integer page = 1;
    
    @Min(value = 1, message = "每页数量必须大于 0")
    @Max(value = 100, message = "每页数量不能超过 100")
    private Integer size = 20;
}

// 分类创建请求
@Data
public class CategoryCreateRequest {
    @NotBlank(message = "分类名称不能为空")
    @Size(max = 50, message = "分类名称不能超过 50 个字符")
    private String name;
    
    @Size(max = 50, message = "中文名称不能超过 50 个字符")
    private String nameZh;
    
    @NotBlank(message = "图标不能为空")
    private String icon;
    
    @NotBlank(message = "强调色不能为空")
    private String accentColor;
    
    private String description;
    private Integer sortOrder;
}
```

#### 响应 DTO

```java
// 用户响应
@Data
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private String nickname;
    private String avatar;
    private Integer planType;
    private LocalDateTime planExpiredAt;
    private Integer status;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
}

// 登录响应
@Data
public class LoginResponse {
    private String token;
    private String refreshToken;
    private UserResponse user;
}

// 工具响应
@Data
public class ToolResponse {
    private Long id;
    private Long categoryId;
    private String categoryName;
    private String categoryNameZh;
    private String name;
    private String nameZh;
    private String description;
    private String descriptionZh;
    private String icon;
    private String url;
    private String colorClass;
    private String bgHoverClass;
    private Integer toolType;
    private Integer isFeatured;
    private Long viewCount;
    private Long useCount;
    private BigDecimal ratingScore;
    private Long ratingCount;
    private Long reviewCount;
    private Boolean isFavorited;  // 当前用户是否已收藏
    private Integer sortOrder;
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

// 分类响应
@Data
public class CategoryResponse {
    private Long id;
    private String name;
    private String nameZh;
    private String icon;
    private String accentColor;
    private String description;
    private Integer toolCount;  // 该分类下的工具数量
    private Integer sortOrder;
    private Integer status;
    private LocalDateTime createdAt;
}

// 工具使用记录响应
@Data
public class ToolUsageResponse {
    private Long id;
    private Long toolId;
    private String toolName;
    private String toolNameZh;
    private String toolIcon;
    private LocalDateTime usedAt;
    private Integer duration;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### 认证与授权属性

**Property 1: 用户名和邮箱唯一性验证**
*For any* 注册请求，如果用户名或邮箱已存在于数据库中，系统应拒绝注册并抛出 BusinessException
**Validates: Requirements 1.1, 1.2**

**Property 2: 密码 BCrypt 加密存储**
*For any* 有效的用户注册，存储到数据库的密码应该是 BCrypt 加密后的哈希值，且能通过 BCryptPasswordEncoder.matches() 验证
**Validates: Requirements 1.3**

**Property 3: 登录凭证验证**
*For any* 登录请求，系统应验证用户名存在且密码匹配，只有两者都正确时才返回 JWT Token
**Validates: Requirements 1.4**

**Property 4: JWT Token 包含用户信息**
*For any* 成功的登录，生成的 JWT Token 应包含 userId 和 username，且能通过 JwtTokenProvider 解析出正确的值
**Validates: Requirements 1.5**

**Property 5: JWT Token 验证和 SecurityContext 设置**
*For any* 包含有效 JWT Token 的请求，JwtAuthenticationFilter 应验证 Token 并设置 SecurityContext，使 UserContext.getCurrentUserId() 返回正确的用户 ID
**Validates: Requirements 1.6**

**Property 6: 无效 Token 拒绝访问**
*For any* 包含过期或签名无效 Token 的请求，系统应拒绝请求并返回 401 状态码
**Validates: Requirements 1.7**

**Property 7: 受保护资源访问控制**
*For any* 受保护的 API 端点请求，如果未提供有效 Token，系统应返回 401 Unauthorized
**Validates: Requirements 1.8**

### 工具管理属性

**Property 8: 工具创建必填字段验证**
*For any* 工具创建请求，如果缺少必填字段（name, categoryId, icon），系统应返回 400 错误和 MethodArgumentNotValidException
**Validates: Requirements 2.1**

**Property 9: 工具创建时间戳自动填充**
*For any* 有效的工具创建请求，保存到数据库的记录应自动填充 createdAt 和 updatedAt 为当前时间
**Validates: Requirements 2.2**

**Property 10: 工具更新时间戳自动更新**
*For any* 工具更新操作，updatedAt 字段应自动更新为当前时间
**Validates: Requirements 2.3**

**Property 11: 逻辑删除实现**
*For any* 工具删除操作，系统应设置 deleted=1 而不是物理删除记录
**Validates: Requirements 2.4**

**Property 12: 分页查询返回 PageResult**
*For any* 工具列表查询，系统应返回 PageResult 对象包含 list, total, pages, pageNum, pageSize 字段
**Validates: Requirements 2.5**

**Property 13: 查询排除已删除工具**
*For any* 工具查询，返回的结果应只包含 deleted=0 的工具
**Validates: Requirements 2.6**

**Property 14: 多语言字段返回**
*For any* 包含中英文字段的工具查询，系统应根据语言参数返回对应语言的 name 和 description
**Validates: Requirements 2.7**

**Property 15: 浏览计数原子性增加**
*For any* 工具访问操作，系统应原子性地增加该工具的 view_count，即使并发访问也不会丢失计数
**Validates: Requirements 2.8**

### 分类管理属性

**Property 16: 分类名称唯一性**
*For any* 分类创建请求，如果分类名称已存在，系统应抛出 BusinessException
**Validates: Requirements 3.1, 3.2**

**Property 17: 分类默认排序值**
*For any* 有效的分类创建，如果未指定 sort_order，系统应设置默认值（如 0）
**Validates: Requirements 3.3**

**Property 18: 分类列表按 sort_order 排序**
*For any* 分类列表查询，返回的分类应按 sort_order 升序排列
**Validates: Requirements 3.4**

**Property 19: 分类工具数量统计准确性**
*For any* 分类详情查询，返回的 toolCount 应等于该分类下未删除工具的实际数量
**Validates: Requirements 3.5**

**Property 20: 分类删除关联检查**
*For any* 分类删除请求，如果该分类下存在工具，系统应拒绝删除并返回错误信息
**Validates: Requirements 3.6, 3.7**

### 搜索与过滤属性

**Property 21: 全文搜索匹配**
*For any* 包含关键词的搜索请求，返回的工具应在 name、name_zh、description 或 description_zh 中包含该关键词
**Validates: Requirements 4.1**

**Property 22: 分类过滤准确性**
*For any* 指定分类 ID 的过滤请求，返回的所有工具的 category_id 应等于指定的分类 ID
**Validates: Requirements 4.3**

**Property 23: 多条件过滤 AND 逻辑**
*For any* 包含多个过滤条件的请求，返回的工具应同时满足所有指定的条件
**Validates: Requirements 4.4**

**Property 24: 分页功能正确性**
*For any* 指定 page 和 size 的查询，返回的工具数量应不超过 size，且 pageNum 应等于请求的 page
**Validates: Requirements 4.5**

### 收藏功能属性

**Property 25: 收藏需要认证**
*For any* 收藏操作请求，如果用户未登录（UserContext.getCurrentUserId() 返回 null），系统应返回 401 错误
**Validates: Requirements 5.1, 5.2**

**Property 26: 重复收藏检查**
*For any* 收藏请求，如果用户已收藏该工具，系统应返回提示信息而不是创建重复记录
**Validates: Requirements 5.3, 5.4**

**Property 27: 收藏记录创建**
*For any* 首次收藏操作，系统应在 t_user_favorite 表中创建包含 user_id 和 tool_id 的记录
**Validates: Requirements 5.5**

**Property 28: 取消收藏删除记录**
*For any* 取消收藏操作，系统应从 t_user_favorite 表中删除对应的记录
**Validates: Requirements 5.6**

**Property 29: 收藏列表完整性**
*For any* 用户收藏列表查询，返回的每个工具应包含完整的工具信息（不仅仅是 ID）
**Validates: Requirements 5.7**

**Property 30: 收藏列表按时间排序**
*For any* 收藏列表查询，返回的工具应按收藏时间（created_at）降序排列
**Validates: Requirements 5.8**

### 使用统计属性

**Property 31: 使用记录完整性**
*For any* 工具使用操作，系统应在 t_tool_usage 表中记录 user_id、tool_id、used_at、ip_address 和 user_agent
**Validates: Requirements 6.1, 6.2**

**Property 32: 匿名使用记录**
*For any* 未登录用户的工具使用，系统应使用 user_id=0 记录匿名使用
**Validates: Requirements 6.3**

**Property 33: 使用计数原子性增加**
*For any* 工具使用操作，系统应原子性地增加该工具的 use_count
**Validates: Requirements 6.4**

**Property 34: 使用历史按时间排序**
*For any* 用户使用历史查询，返回的记录应按 used_at 降序排列
**Validates: Requirements 6.5**

**Property 35: 最近使用限制**
*For any* 查询最近 N 条使用记录的请求，返回的记录数量应不超过 N
**Validates: Requirements 6.6**

**Property 36: 热门工具按使用次数排序**
*For any* 热门工具查询，返回的工具应按 use_count 降序排列
**Validates: Requirements 6.7**

### 数据持久化属性

**Property 37: 插入时自动填充时间戳**
*For any* 新记录插入操作，MyBatisPlusConfig 应自动填充 createdAt 和 updatedAt 为当前时间
**Validates: Requirements 7.1**

**Property 38: 更新时自动更新时间戳**
*For any* 记录更新操作，MyBatisPlusConfig 应自动更新 updatedAt 为当前时间
**Validates: Requirements 7.2**

**Property 39: 分页插件自动添加 LIMIT**
*For any* 分页查询，PaginationInnerInterceptor 应自动添加 LIMIT 和 OFFSET 子句
**Validates: Requirements 7.3**

**Property 40: 逻辑删除自动过滤**
*For any* 查询操作，MyBatis-Plus 应自动在 WHERE 子句中添加 deleted=0 条件
**Validates: Requirements 7.4**

### API 规范属性

**Property 41: 统一响应结构**
*For any* 成功的 API 响应，返回的 JSON 应包含 code、message、data 和 timestamp 字段
**Validates: Requirements 8.1**

**Property 42: 分页响应结构**
*For any* 分页数据响应，data 字段应包含 list、total、pages、pageNum 和 pageSize
**Validates: Requirements 8.2**

**Property 43: 异常统一处理**
*For any* 抛出的 BusinessException，GlobalExceptionHandler 应捕获并返回统一的 Result 格式
**Validates: Requirements 8.3**

**Property 44: 参数验证错误格式**
*For any* 参数验证失败，系统应返回 400 状态码和包含字段错误详情的响应
**Validates: Requirements 8.4**

**Property 45: 系统异常日志记录**
*For any* 未捕获的系统异常，GlobalExceptionHandler 应记录 ERROR 级别日志并返回 500 错误
**Validates: Requirements 8.5, 8.6**

**Property 46: CORS 跨域支持**
*For any* 跨域请求，CorsFilter 应添加正确的 CORS 头允许请求
**Validates: Requirements 8.7**

### 安全性属性

**Property 47: BCrypt 密码加密**
*For any* 用户密码存储，系统应使用 BCryptPasswordEncoder 加密，且加密后的密码应以 $2a$ 开头
**Validates: Requirements 10.1**

**Property 48: JWT Token 签名验证**
*For any* JWT Token 验证，系统应使用 Keys.hmacShaKeyFor() 创建的密钥验证签名
**Validates: Requirements 10.2, 10.3**

**Property 49: 公开接口无需认证**
*For any* 公开接口请求（/api/v1/auth/**, /api/v1/categories/**, /api/v1/tools/** GET），系统应允许访问无需 Token
**Validates: Requirements 10.6**

**Property 50: 受保护接口需要认证**
*For any* 受保护接口请求（/api/v1/favorites/**, /api/v1/usage/**），系统应验证 Token 有效性
**Validates: Requirements 10.7**


## Error Handling

### 异常层次结构

```java
// 自定义业务异常（已实现）
public class BusinessException extends RuntimeException {
    private final Integer code;
    
    public BusinessException(String message) {
        super(message);
        this.code = 400;
    }
    
    public BusinessException(Integer code, String message) {
        super(message);
        this.code = code;
    }
}

// 错误码枚举（待实现）
public enum ErrorCode {
    // 通用错误 1xxx
    SUCCESS(200, "Success"),
    BAD_REQUEST(400, "Bad Request"),
    UNAUTHORIZED(401, "Unauthorized"),
    FORBIDDEN(403, "Forbidden"),
    NOT_FOUND(404, "Resource Not Found"),
    INTERNAL_ERROR(500, "Internal Server Error"),
    
    // 用户相关 2xxx
    USER_NOT_FOUND(2001, "用户不存在"),
    USERNAME_EXISTS(2002, "用户名已存在"),
    EMAIL_EXISTS(2003, "邮箱已存在"),
    INVALID_CREDENTIALS(2004, "用户名或密码错误"),
    TOKEN_EXPIRED(2005, "Token 已过期"),
    TOKEN_INVALID(2006, "Token 无效"),
    
    // 工具相关 3xxx
    TOOL_NOT_FOUND(3001, "工具不存在"),
    TOOL_NAME_EXISTS(3002, "工具名称已存在"),
    INVALID_TOOL_DATA(3003, "工具数据无效"),
    
    // 分类相关 4xxx
    CATEGORY_NOT_FOUND(4001, "分类不存在"),
    CATEGORY_NAME_EXISTS(4002, "分类名称已存在"),
    CATEGORY_HAS_TOOLS(4003, "分类下存在工具，无法删除"),
    
    // 收藏相关 5xxx
    ALREADY_FAVORITED(5001, "已收藏该工具"),
    FAVORITE_NOT_FOUND(5002, "收藏记录不存在");
    
    private final Integer code;
    private final String message;
    
    ErrorCode(Integer code, String message) {
        this.code = code;
        this.message = message;
    }
}
```

### 全局异常处理器（已实现）

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    
    // 业务异常
    @ExceptionHandler(BusinessException.class)
    public Result<?> handleBusinessException(BusinessException e) {
        log.warn("业务异常: {}", e.getMessage());
        return Result.error(e.getCode(), e.getMessage());
    }
    
    // 参数验证异常
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<?> handleValidException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .findFirst()
                .orElse("参数校验失败");
        return Result.error(400, message);
    }
    
    // 绑定异常
    @ExceptionHandler(BindException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<?> handleBindException(BindException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .findFirst()
                .orElse("参数绑定失败");
        return Result.error(400, message);
    }
    
    // 通用异常
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Result<?> handleException(Exception e) {
        log.error("系统异常: ", e);
        return Result.error(500, "服务器内部错误");
    }
}
```

## Testing Strategy

### 测试金字塔

```
        ┌─────────────┐
        │   E2E Tests │  ← 少量端到端测试
        └─────────────┘
       ┌───────────────┐
       │Integration Tests│ ← 适量集成测试
       └───────────────┘
      ┌─────────────────┐
      │   Unit Tests    │  ← 大量单元测试
      └─────────────────┘
     ┌───────────────────┐
     │ Property-Based Tests│ ← 属性测试覆盖核心逻辑
     └───────────────────┘
```

### 单元测试策略

**测试框架**: JUnit 5 + Mockito + AssertJ

**测试覆盖目标**:
- Service 层: 80%+ 代码覆盖率
- Controller 层: 70%+ 代码覆盖率
- Mapper 层: 通过集成测试覆盖

**单元测试示例**:

```java
@ExtendWith(MockitoExtension.class)
class ToolServiceTest {
    
    @Mock
    private ToolMapper toolMapper;
    
    @Mock
    private CategoryMapper categoryMapper;
    
    @Mock
    private RedisTemplate<String, Object> redisTemplate;
    
    @InjectMocks
    private ToolServiceImpl toolService;
    
    @Test
    @DisplayName("创建工具 - 成功场景")
    void createTool_Success() {
        // Given
        ToolCreateRequest request = new ToolCreateRequest();
        request.setName("Test Tool");
        request.setCategoryId(1L);
        request.setIcon("icon");
        
        Category category = new Category();
        category.setId(1L);
        
        when(categoryMapper.selectById(1L)).thenReturn(category);
        when(toolMapper.insert(any(Tool.class))).thenReturn(1);
        
        // When
        ToolResponse result = toolService.createTool(request);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Test Tool");
        verify(toolMapper).insert(any(Tool.class));
    }
    
    @Test
    @DisplayName("创建工具 - 分类不存在")
    void createTool_CategoryNotFound() {
        // Given
        ToolCreateRequest request = new ToolCreateRequest();
        request.setCategoryId(999L);
        
        when(categoryMapper.selectById(999L)).thenReturn(null);
        
        // When & Then
        assertThatThrownBy(() -> toolService.createTool(request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("分类不存在");
    }
}
```

### 属性测试策略

**测试框架**: jqwik (Java Property-Based Testing)

**配置要求**:
- 每个属性测试至少运行 100 次迭代
- 使用自定义生成器生成有效的测试数据
- 每个测试必须引用设计文档中的属性编号

**属性测试示例**:

```java
@PropertyTest
@Tag("Feature: polaris-tools-platform, Property 2: 密码 BCrypt 加密存储")
void passwordShouldBeEncrypted(@ForAll("validUserRegistration") UserRegisterRequest request) {
    // When
    UserResponse user = authService.register(request);
    
    // Then
    User dbUser = userMapper.selectById(user.getId());
    assertThat(dbUser.getPassword()).isNotEqualTo(request.getPassword());
    assertThat(dbUser.getPassword()).startsWith("$2a$");
    assertThat(passwordEncoder.matches(request.getPassword(), dbUser.getPassword())).isTrue();
}

@Provide
Arbitrary<UserRegisterRequest> validUserRegistration() {
    return Combinators.combine(
        Arbitraries.strings().alpha().ofMinLength(3).ofMaxLength(20),
        Arbitraries.strings().ofMinLength(8).ofMaxLength(50),
        Arbitraries.emails()
    ).as((username, password, email) -> {
        UserRegisterRequest request = new UserRegisterRequest();
        request.setUsername(username);
        request.setPassword(password);
        request.setEmail(email);
        return request;
    });
}

@PropertyTest
@Tag("Feature: polaris-tools-platform, Property 13: 查询排除已删除工具")
void queryToolsShouldExcludeDeleted(@ForAll("toolList") List<Tool> tools) {
    // Given - 保存工具，部分标记为已删除
    tools.forEach(tool -> toolMapper.insert(tool));
    
    // When
    ToolQueryRequest request = new ToolQueryRequest();
    PageResult<ToolResponse> result = toolService.listTools(request);
    
    // Then
    assertThat(result.getList()).noneMatch(tool -> tool.getDeleted() == 1);
}
```

### 集成测试策略

**测试框架**: Spring Boot Test + Testcontainers

**测试范围**:
- API 端到端流程
- 数据库操作
- 缓存行为
- 认证授权流程

**集成测试示例**:

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@Testcontainers
class ToolControllerIntegrationTest {
    
    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0");
    
    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
        .withExposedPorts(6379);
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    void createAndGetTool_Success() {
        // Given
        String token = loginAsAdmin();
        ToolCreateRequest request = new ToolCreateRequest();
        request.setName("Integration Test Tool");
        request.setCategoryId(1L);
        request.setIcon("test_icon");
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<ToolCreateRequest> entity = new HttpEntity<>(request, headers);
        
        // When - Create
        ResponseEntity<Result<ToolResponse>> createResponse = restTemplate.exchange(
            "/api/v1/tools", HttpMethod.POST, entity, 
            new ParameterizedTypeReference<Result<ToolResponse>>() {});
        
        // Then - Create
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        Long toolId = createResponse.getBody().getData().getId();
        
        // When - Get
        ResponseEntity<Result<ToolResponse>> getResponse = restTemplate.exchange(
            "/api/v1/tools/" + toolId, HttpMethod.GET, null,
            new ParameterizedTypeReference<Result<ToolResponse>>() {});
        
        // Then - Get
        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getResponse.getBody().getData().getName())
            .isEqualTo("Integration Test Tool");
    }
}
```

### 前端测试策略

**测试框架**: Vitest + React Testing Library

**测试类型**:
1. **组件测试**: 测试组件渲染和交互
2. **Hook 测试**: 测试自定义 Hook 逻辑
3. **API 客户端测试**: 测试 API 调用逻辑

**前端测试示例**:

```typescript
// 组件测试
describe('StandardToolCard', () => {
  it('should render tool information correctly', () => {
    const tool: Tool = {
      id: '1',
      title: 'Test Tool',
      description: 'Test Description',
      icon: 'test_icon',
    };
    
    render(<StandardToolCard tool={tool} />);
    
    expect(screen.getByText('Test Tool')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });
});

// Context 测试
describe('AppContext', () => {
  it('should toggle theme', () => {
    const { result } = renderHook(() => useAppContext(), {
      wrapper: AppProvider,
    });
    
    expect(result.current.theme).toBe('dark');
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.theme).toBe('light');
  });
});
```

## 性能优化方案

### 1. 数据库优化

**索引策略**:
- 已在表设计中添加必要的索引
- 使用 FULLTEXT 索引支持全文搜索
- 使用复合索引优化多条件查询

**查询优化**:
- 使用 MyBatis-Plus 的 Lambda 查询避免 N+1 问题
- 使用分页查询减少数据传输量
- 避免 SELECT * ，只查询需要的字段

### 2. 缓存优化

**Redis 缓存策略**:
- 工具列表缓存: 5 分钟
- 工具详情缓存: 10 分钟
- 分类列表缓存: 30 分钟
- 热门工具缓存: 1 小时

**缓存更新策略**:
- 数据修改时清除相关缓存
- 使用 @CacheEvict 注解自动清除
- 定时任务刷新热点数据

### 3. 前端性能优化

- 代码分割和懒加载
- 图片懒加载
- 防抖和节流
- 虚拟滚动（长列表）
- Service Worker 缓存

## 部署方案

### Docker 化部署

```dockerfile
# Backend Dockerfile
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

# Frontend Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

### Docker Compose

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: polaris
    volumes:
      - mysql_data:/var/lib/mysql
      - ./backend/src/main/resources/db/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  backend:
    build: ./backend
    environment:
      DB_HOST: mysql
      DB_PORT: 3306
      DB_NAME: polaris
      DB_USERNAME: root
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "8080:8080"
    depends_on:
      - mysql
      - redis
  
  frontend:
    build: ./polaris-tools
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mysql_data:
```

## 总结

本设计文档提供了 Polaris Tools Platform 的完整技术架构和实现方案，包括：

1. **清晰的分层架构**: Controller → Service → Mapper 三层架构，职责明确
2. **完善的安全机制**: JWT 认证、BCrypt 加密、权限控制
3. **高性能设计**: Redis 缓存、数据库索引优化、前端性能优化
4. **全面的测试策略**: 单元测试 + 属性测试 + 集成测试
5. **50 个可测试的正确性属性**: 覆盖所有核心功能
6. **详细的数据模型**: 5 个核心表 + 8 个扩展表，支持未来功能扩展
7. **模块化设计**: 为未来可能的微服务拆分做好准备

**下一步**: 根据这个设计文档创建详细的实现任务列表（tasks.md）。
