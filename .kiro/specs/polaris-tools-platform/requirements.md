# Requirements Document - Polaris Tools Platform

## Introduction

Polaris Tools Platform（北极星工具箱）是一个现代化的开发工具导航网站，为开发者和创作者提供集中化的工具管理和发现平台。系统采用前后端分离架构，后端使用 Spring Boot 3.2.5 + MyBatis-Plus 3.5.6 + MySQL 8.0 技术栈，前端使用 React 19.2.3 + TypeScript 5.8.2 + Vite 6.2.0 技术栈。

### 当前项目状态

**已实现的基础架构**:
- ✅ 后端基础框架配置（Spring Boot, MyBatis-Plus, Security）
- ✅ 数据库表结构设计（5 个核心表）
- ✅ 实体类定义（User, Tool, Category, UserFavorite, ToolUsage）
- ✅ JWT 认证机制（JwtTokenProvider, JwtAuthenticationFilter）
- ✅ 全局异常处理（GlobalExceptionHandler, BusinessException）
- ✅ 统一响应格式（Result, PageResult）
- ✅ CORS 跨域配置
- ✅ 前端基础组件（Sidebar, Header, Hero, ToolCard）
- ✅ 国际化支持（中英文切换）
- ✅ 主题切换（深色/浅色模式）
- ✅ 前端路由导航（Dashboard, Favorites, Settings, Profile）

**待实现的核心功能**:
- ❌ Controller 层（所有 REST API 端点）
- ❌ Service 层（业务逻辑）
- ❌ Mapper 层（数据访问）
- ❌ DTO 类（请求/响应对象）
- ❌ Redis 缓存集成
- ❌ 前端 API 客户端
- ❌ 前端数据获取和状态管理
- ❌ 测试代码

## Glossary

- **System**: Polaris Tools Platform 整体系统
- **Backend_API**: 后端 RESTful API 服务（待实现）
- **Frontend_App**: 前端 React 应用
- **Database**: MySQL 8.0+ 数据库
- **Redis_Cache**: Redis 缓存系统（待集成）
- **User**: 注册用户
- **Guest**: 未登录的访客用户
- **Tool**: 开发工具实体
- **Category**: 工具分类
- **JWT_Token**: JSON Web Token 身份认证令牌
- **Favorite**: 用户收藏的工具
- **Usage_Record**: 工具使用记录
- **Admin**: 系统管理员
- **Mapper**: MyBatis-Plus 数据访问接口
- **DTO**: Data Transfer Object 数据传输对象

## Requirements

### Requirement 1: 用户认证与授权系统

**User Story:** 作为用户，我希望能够注册、登录和管理我的账户，以便使用个性化功能和保护我的数据。

#### Acceptance Criteria

1. WHEN 用户提交注册请求 THEN THE System SHALL 验证用户名和邮箱的唯一性
2. WHEN 用户名或邮箱已存在 THEN THE System SHALL 返回 BusinessException 包含错误信息
3. WHEN 注册信息有效 THEN THE System SHALL 使用 BCrypt 加密密码并保存到 t_user 表
4. WHEN 用户提交登录请求 THEN THE System SHALL 验证用户名和密码匹配
5. WHEN 登录成功 THEN THE JwtTokenProvider SHALL 生成包含 userId 和 username 的 JWT Token
6. WHEN 请求包含 Authorization Bearer Token THEN THE JwtAuthenticationFilter SHALL 验证 Token 并设置 SecurityContext
7. WHEN JWT Token 过期或签名无效 THEN THE System SHALL 拒绝请求并返回 401 状态码
8. WHEN 用户请求受保护的资源 THEN THE SecurityConfig SHALL 验证用户认证状态

### Requirement 2: 工具管理功能

**User Story:** 作为管理员，我希望能够创建、编辑、删除和管理工具信息，以便维护工具库的准确性和完整性。

#### Acceptance Criteria

1. WHEN 管理员创建工具 THEN THE System SHALL 验证必填字段（name, categoryId, icon）
2. WHEN 工具数据有效 THEN THE System SHALL 保存到 t_tool 表并自动填充 createdAt 和 updatedAt
3. WHEN 管理员更新工具 THEN THE System SHALL 验证工具 ID 存在并更新 updatedAt 字段
4. WHEN 管理员删除工具 THEN THE System SHALL 设置 deleted=1 执行逻辑删除
5. WHEN 查询工具列表 THEN THE System SHALL 使用 MyBatis-Plus 分页插件返回 PageResult
6. WHEN 查询工具 THEN THE System SHALL 排除 deleted=1 的记录
7. WHEN 工具包含中英文字段 THEN THE System SHALL 根据语言参数返回 name/nameZh 和 description/descriptionZh
8. WHEN 工具被访问 THEN THE System SHALL 原子性增加 view_count 字段

### Requirement 3: 分类管理功能

**User Story:** 作为管理员，我希望能够管理工具分类，以便组织和展示工具。

#### Acceptance Criteria

1. WHEN 管理员创建分类 THEN THE System SHALL 验证分类名称唯一性
2. WHEN 分类名称重复 THEN THE System SHALL 抛出 BusinessException
3. WHEN 分类数据有效 THEN THE System SHALL 保存到 t_category 表并设置默认 sort_order
4. WHEN 查询分类列表 THEN THE System SHALL 按 sort_order 升序排序
5. WHEN 查询分类详情 THEN THE System SHALL 关联查询该分类下的工具数量
6. WHEN 删除分类 THEN THE System SHALL 检查 t_tool 表中是否存在 category_id 关联
7. IF 分类下存在工具 THEN THE System SHALL 拒绝删除并返回错误信息

### Requirement 4: 工具搜索与过滤

**User Story:** 作为用户，我希望能够搜索和过滤工具，以便快速找到我需要的工具。

#### Acceptance Criteria

1. WHEN 用户输入搜索关键词 THEN THE System SHALL 使用 MySQL FULLTEXT 索引在 name, name_zh, description, description_zh 中搜索
2. WHEN 搜索关键词为空 THEN THE System SHALL 返回所有未删除的工具
3. WHEN 用户选择分类过滤 THEN THE System SHALL 添加 category_id 条件到查询
4. WHEN 用户选择多个过滤条件 THEN THE System SHALL 使用 MyBatis-Plus LambdaQueryWrapper 组合 AND 条件
5. WHEN 查询工具列表 THEN THE System SHALL 使用 PaginationInnerInterceptor 实现分页
6. WHEN 分页参数无效 THEN THE System SHALL 使用默认值 page=1, size=20
7. WHEN 查询结果为空 THEN THE System SHALL 返回空的 PageResult 对象

### Requirement 5: 用户收藏功能

**User Story:** 作为用户，我希望能够收藏我常用的工具，以便快速访问。

#### Acceptance Criteria

1. WHEN 用户收藏工具 THEN THE UserContext SHALL 验证 getCurrentUserId() 不为 null
2. WHEN 用户未登录 THEN THE System SHALL 返回 401 Unauthorized
3. WHEN 用户收藏工具 THEN THE System SHALL 检查 t_user_favorite 表中是否存在 (user_id, tool_id) 记录
4. WHEN 工具已被收藏 THEN THE System SHALL 返回提示信息不创建重复记录
5. WHEN 工具未被收藏 THEN THE System SHALL 插入记录到 t_user_favorite 表
6. WHEN 用户取消收藏 THEN THE System SHALL 从 t_user_favorite 表删除记录
7. WHEN 查询用户收藏列表 THEN THE System SHALL 关联查询 t_tool 表返回完整工具信息
8. WHEN 查询收藏列表 THEN THE System SHALL 按 created_at 降序排序

### Requirement 6: 使用统计与分析

**User Story:** 作为系统管理员，我希望能够追踪工具使用情况，以便了解用户行为和优化工具推荐。

#### Acceptance Criteria

1. WHEN 用户使用工具 THEN THE System SHALL 插入记录到 t_tool_usage 表包含 user_id, tool_id, used_at
2. WHEN 记录使用行为 THEN THE System SHALL 从 HttpServletRequest 获取 ip_address 和 user_agent
3. WHEN 用户未登录使用工具 THEN THE System SHALL 设置 user_id=0 记录匿名使用
4. WHEN 工具被使用 THEN THE System SHALL 原子性增加 t_tool 表的 use_count 字段
5. WHEN 查询用户使用历史 THEN THE System SHALL 按 used_at 降序返回 t_tool_usage 记录
6. WHEN 查询最近使用的工具 THEN THE System SHALL 使用 LIMIT 子句限制返回数量
7. WHEN 查询热门工具 THEN THE System SHALL 按 use_count 降序排序 t_tool 表


### Requirement 7: 数据持久化与自动填充

**User Story:** 作为系统架构师，我希望系统能够自动管理时间戳字段，以便简化代码并保证数据一致性。

#### Acceptance Criteria

1. WHEN 插入新记录 THEN THE MyBatisPlusConfig MetaObjectHandler SHALL 自动填充 createdAt 和 updatedAt 为当前时间
2. WHEN 更新记录 THEN THE MetaObjectHandler SHALL 自动更新 updatedAt 为当前时间
3. WHEN 执行分页查询 THEN THE PaginationInnerInterceptor SHALL 自动添加 LIMIT 和 OFFSET 子句
4. WHEN 使用 @TableLogic 注解 THEN THE MyBatis-Plus SHALL 自动在查询中添加 deleted=0 条件
5. WHEN 执行删除操作 THEN THE MyBatis-Plus SHALL 自动执行 UPDATE 设置 deleted=1
6. WHEN 使用 BaseMapper THEN THE System SHALL 继承基础 CRUD 方法
7. WHEN 配置 MapperScan THEN THE System SHALL 扫描 com.polaris.mapper 包下的所有 Mapper 接口

### Requirement 8: API 接口规范与响应格式

**User Story:** 作为前端开发者，我希望后端提供标准化的 RESTful API，以便集成和调用。

#### Acceptance Criteria

1. WHEN API 返回成功响应 THEN THE System SHALL 使用 Result<T> 包装数据包含 code, message, data, timestamp
2. WHEN API 返回分页数据 THEN THE System SHALL 使用 PageResult<T> 包含 list, total, pages, pageNum, pageSize
3. WHEN API 返回错误 THEN THE GlobalExceptionHandler SHALL 捕获异常并返回统一的 Result 格式
4. WHEN 参数验证失败 THEN THE System SHALL 返回 400 状态码和 MethodArgumentNotValidException 错误详情
5. WHEN 业务逻辑错误 THEN THE System SHALL 抛出 BusinessException 并被 GlobalExceptionHandler 捕获
6. WHEN 系统异常发生 THEN THE GlobalExceptionHandler SHALL 记录日志并返回 500 错误
7. WHEN 跨域请求 THEN THE CorsFilter SHALL 允许所有来源、方法和头部

### Requirement 9: 前端用户界面与交互

**User Story:** 作为用户，我希望有一个美观、响应式的界面，以便在不同设备上使用。

#### Acceptance Criteria

1. WHEN 用户访问网站 THEN THE Frontend_App SHALL 渲染 Sidebar, Header 和 Dashboard 组件
2. WHEN 用户点击主题切换按钮 THEN THE AppContext SHALL 调用 toggleTheme() 在 dark 和 light 之间切换
3. WHEN 主题改变 THEN THE System SHALL 添加或移除 document.documentElement 的 dark 类
4. WHEN 用户点击语言切换按钮 THEN THE AppContext SHALL 调用 toggleLanguage() 在 en 和 zh 之间切换
5. WHEN 语言改变 THEN THE System SHALL 使用 t() 函数从 translations 对象获取对应语言的文本
6. WHEN 用户点击导航项 THEN THE AppContext SHALL 调用 navigate() 更新 page 状态
7. WHEN page 状态改变 THEN THE System SHALL 重新渲染对应的页面组件
8. WHEN 渲染工具卡片 THEN THE System SHALL 根据 language 显示 title/title_zh 和 description/description_zh
9. WHEN 用户悬停工具卡片 THEN THE System SHALL 应用 hover 样式和 bgHoverClass 背景色

### Requirement 10: 安全性与数据保护

**User Story:** 作为系统管理员，我希望系统能够保护用户数据和防止安全威胁，以便维护系统安全。

#### Acceptance Criteria

1. WHEN 存储用户密码 THEN THE System SHALL 使用 BCryptPasswordEncoder 加密
2. WHEN 生成 JWT Token THEN THE JwtTokenProvider SHALL 使用 Keys.hmacShaKeyFor() 创建安全密钥
3. WHEN 验证 JWT Token THEN THE System SHALL 使用 Jwts.parser().verifyWith(key) 验证签名
4. WHEN Token 验证失败 THEN THE System SHALL 捕获 JwtException 并拒绝请求
5. WHEN 配置 Security THEN THE SecurityConfig SHALL 禁用 CSRF 并使用 STATELESS 会话策略
6. WHEN 配置公开接口 THEN THE SecurityConfig SHALL 使用 permitAll() 允许 /api/v1/auth/**, /api/v1/categories/**, /api/v1/tools/** GET 请求
7. WHEN 配置受保护接口 THEN THE SecurityConfig SHALL 使用 authenticated() 要求认证

### Requirement 11: 错误处理与日志记录

**User Story:** 作为开发者，我希望系统能够记录详细的日志和错误信息，以便调试和监控。

#### Acceptance Criteria

1. WHEN 发生业务异常 THEN THE GlobalExceptionHandler SHALL 捕获 BusinessException 并记录 WARN 级别日志
2. WHEN 发生参数验证异常 THEN THE GlobalExceptionHandler SHALL 捕获 MethodArgumentNotValidException 并提取第一个字段错误
3. WHEN 发生绑定异常 THEN THE GlobalExceptionHandler SHALL 捕获 BindException 并提取字段错误
4. WHEN 发生未捕获异常 THEN THE GlobalExceptionHandler SHALL 捕获 Exception 并记录 ERROR 级别日志
5. WHEN 记录日志 THEN THE System SHALL 使用 @Slf4j 注解自动注入 Logger
6. WHEN 配置日志级别 THEN THE application.yml SHALL 设置 root: INFO 和 com.polaris: DEBUG
7. WHEN 异常包含堆栈跟踪 THEN THE System SHALL 完整记录到日志文件

### Requirement 12: 国际化支持

**User Story:** 作为国际用户，我希望能够使用我的母语浏览网站，以便更好地理解内容。

#### Acceptance Criteria

1. WHEN 系统存储工具信息 THEN THE t_tool 表 SHALL 包含 name, name_zh, description, description_zh 字段
2. WHEN 系统存储分类信息 THEN THE t_category 表 SHALL 包含 name, name_zh 字段
3. WHEN 前端初始化 THEN THE AppContext SHALL 提供 language 状态和 toggleLanguage 方法
4. WHEN 前端渲染文本 THEN THE System SHALL 使用 t(key) 函数从 translations 对象获取翻译
5. WHEN 前端渲染工具 THEN THE System SHALL 根据 language 选择显示中文或英文字段
6. WHEN 翻译键不存在 THEN THE t() 函数 SHALL 返回键本身作为回退
7. WHEN 用户切换语言 THEN THE System SHALL 更新所有使用 t() 函数的文本

### Requirement 13: 前端路由与导航

**User Story:** 作为用户，我希望能够在不同页面之间导航，以便访问不同的功能。

#### Acceptance Criteria

1. WHEN 用户点击 Sidebar 导航项 THEN THE AppContext SHALL 更新 page 状态
2. WHEN page 状态为 'dashboard' THEN THE System SHALL 渲染 Dashboard 组件
3. WHEN page 状态为 'favorites' THEN THE System SHALL 渲染 Favorites 组件（待实现）
4. WHEN page 状态为 'settings' THEN THE System SHALL 渲染 Settings 组件（待实现）
5. WHEN page 状态为 'profile' THEN THE System SHALL 渲染 Profile 组件（待实现）
6. WHEN page 状态为 'notifications' THEN THE System SHALL 渲染 Notifications 组件（待实现）
7. WHEN page 状态为 'login' THEN THE System SHALL 渲染 Login 组件（待实现）
8. WHEN 导航项激活 THEN THE System SHALL 应用 active 样式类

### Requirement 14: 前端组件设计

**User Story:** 作为前端开发者，我希望有可复用的组件，以便快速构建界面。

#### Acceptance Criteria

1. WHEN 渲染 Sidebar THEN THE System SHALL 显示品牌 Logo、搜索框、导航菜单、分类列表和用户信息
2. WHEN 渲染 Header THEN THE System SHALL 显示面包屑导航、主题切换、语言切换、通知和登出按钮
3. WHEN 渲染 Hero THEN THE System SHALL 显示标题、副标题和 CTA 按钮
4. WHEN 渲染 RecentToolCard THEN THE System SHALL 显示工具图标、名称和最后使用时间
5. WHEN 渲染 StandardToolCard THEN THE System SHALL 显示工具图标、名称和描述
6. WHEN 渲染 Icon THEN THE System SHALL 使用 Material Symbols 字体显示图标
7. WHEN Icon 设置 filled=true THEN THE System SHALL 添加 'material-symbols-filled' 类

### Requirement 15: 数据库表结构与索引

**User Story:** 作为数据库管理员，我希望有优化的表结构和索引，以便提高查询性能。

#### Acceptance Criteria

1. WHEN 创建 t_user 表 THEN THE System SHALL 添加 UNIQUE 索引到 username 和 email 字段
2. WHEN 创建 t_tool 表 THEN THE System SHALL 添加 FULLTEXT 索引到 name, name_zh, description, description_zh 字段
3. WHEN 创建 t_tool 表 THEN THE System SHALL 添加普通索引到 category_id, status, sort_order 字段
4. WHEN 创建 t_user_favorite 表 THEN THE System SHALL 添加 UNIQUE 索引到 (user_id, tool_id) 组合
5. WHEN 创建 t_tool_usage 表 THEN THE System SHALL 添加索引到 (user_id, used_at) 和 tool_id 字段
6. WHEN 定义外键关系 THEN THE System SHALL 在 t_tool 表添加 FOREIGN KEY 到 t_category(id)
7. WHEN 定义外键关系 THEN THE System SHALL 在 t_user_favorite 表添加 FOREIGN KEY 到 t_user(id) 和 t_tool(id)

### Requirement 16: 环境配置与部署

**User Story:** 作为运维工程师，我希望系统易于配置和部署，以便快速上线和维护。

#### Acceptance Criteria

1. WHEN 配置数据库连接 THEN THE application.yml SHALL 支持环境变量 DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
2. WHEN 配置 Redis 连接 THEN THE application.yml SHALL 支持环境变量 REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
3. WHEN 配置 JWT 密钥 THEN THE application.yml SHALL 支持环境变量 JWT_SECRET
4. WHEN 配置数据库连接池 THEN THE System SHALL 使用 HikariCP 配置 minimum-idle, maximum-pool-size, idle-timeout
5. WHEN 启动应用 THEN THE System SHALL 在 8080 端口监听 HTTP 请求
6. WHEN 初始化数据库 THEN THE System SHALL 执行 init.sql 脚本创建表结构和初始数据
7. WHEN 构建前端 THEN THE System SHALL 使用 Vite 生成优化的生产构建到 dist 目录

### Requirement 17: 测试与质量保证

**User Story:** 作为质量保证工程师，我希望系统有完善的测试覆盖，以便确保代码质量。

#### Acceptance Criteria

1. WHEN 开发新功能 THEN THE System SHALL 编写单元测试覆盖 Service 层核心逻辑
2. WHEN 测试 API 接口 THEN THE System SHALL 编写集成测试验证端到端流程
3. WHEN 测试数据库操作 THEN THE System SHALL 使用 @SpringBootTest 和 Testcontainers
4. WHEN 测试前端组件 THEN THE System SHALL 使用 Vitest 和 React Testing Library
5. WHEN 运行测试 THEN THE System SHALL 生成测试覆盖率报告
6. WHEN 测试失败 THEN THE System SHALL 提供清晰的失败原因和堆栈跟踪
7. WHEN 提交代码 THEN THE System SHALL 通过所有测试用例

### Requirement 18: 会员系统（预留设计）

**User Story:** 作为用户，我希望能够升级到高级会员，以便获得更多功能和更好的体验。

#### Acceptance Criteria

1. WHEN 用户注册 THEN THE System SHALL 默认设置 plan_type=0 (Free Plan)
2. WHEN 用户升级会员 THEN THE System SHALL 更新 plan_type 字段（0: Free, 1: Pro, 2: Enterprise）
3. WHEN 查询用户信息 THEN THE System SHALL 返回 plan_type 和对应的权限信息
4. WHEN 用户使用高级功能 THEN THE System SHALL 验证 plan_type 是否满足要求
5. WHEN 会员到期 THEN THE System SHALL 自动降级 plan_type 到 Free
6. WHEN 记录会员订阅 THEN THE System SHALL 在 t_user_subscription 表记录订阅历史（待创建）
7. WHEN 处理支付 THEN THE System SHALL 集成第三方支付接口（待实现）

**预留数据库字段（t_user 表）**:
- `plan_type` TINYINT - 已存在，会员类型（0: Free, 1: Pro, 2: Enterprise）
- `plan_expired_at` DATETIME - 待添加，会员到期时间
- `total_usage_count` BIGINT - 待添加，总使用次数（用于限额）
- `monthly_usage_count` BIGINT - 待添加，本月使用次数
- `last_reset_at` DATETIME - 待添加，上次重置使用次数的时间

**新增表设计（t_user_subscription）**:
```sql
CREATE TABLE t_user_subscription (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  plan_type TINYINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_id VARCHAR(100),
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  status TINYINT DEFAULT 1,  -- 0: Cancelled, 1: Active, 2: Expired
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  FOREIGN KEY (user_id) REFERENCES t_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Requirement 19: 广告系统（预留设计）

**User Story:** 作为平台运营者，我希望能够展示广告，以便实现平台盈利。

#### Acceptance Criteria

1. WHEN 用户访问页面 THEN THE System SHALL 根据用户 plan_type 决定是否展示广告
2. WHEN 用户为 Free Plan THEN THE System SHALL 展示广告位
3. WHEN 用户为 Pro/Enterprise Plan THEN THE System SHALL 隐藏广告
4. WHEN 查询广告 THEN THE System SHALL 从 t_advertisement 表获取激活的广告
5. WHEN 展示广告 THEN THE System SHALL 记录展示次数到 t_ad_impression 表
6. WHEN 用户点击广告 THEN THE System SHALL 记录点击次数到 t_ad_click 表
7. WHEN 广告到期 THEN THE System SHALL 自动设置 status=0 停止展示

**新增表设计（t_advertisement）**:
```sql
CREATE TABLE t_advertisement (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  image_url VARCHAR(500),
  target_url VARCHAR(500) NOT NULL,
  ad_type TINYINT NOT NULL,  -- 0: Banner, 1: Sidebar, 2: Popup, 3: Native
  position VARCHAR(50),  -- 广告位置标识
  priority INT DEFAULT 0,  -- 优先级，数字越大优先级越高
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  daily_budget DECIMAL(10,2),  -- 每日预算
  total_budget DECIMAL(10,2),  -- 总预算
  cost_per_click DECIMAL(10,2),  -- 每次点击成本
  impression_count BIGINT DEFAULT 0,  -- 展示次数
  click_count BIGINT DEFAULT 0,  -- 点击次数
  status TINYINT DEFAULT 1,  -- 0: Inactive, 1: Active, 2: Paused
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status_priority (status, priority DESC),
  INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**新增表设计（t_ad_impression）**:
```sql
CREATE TABLE t_ad_impression (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ad_id BIGINT NOT NULL,
  user_id BIGINT DEFAULT 0,  -- 0 表示匿名用户
  ip_address VARCHAR(50),
  user_agent VARCHAR(500),
  page_url VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ad (ad_id),
  INDEX idx_created (created_at),
  FOREIGN KEY (ad_id) REFERENCES t_advertisement(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**新增表设计（t_ad_click）**:
```sql
CREATE TABLE t_ad_click (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ad_id BIGINT NOT NULL,
  user_id BIGINT DEFAULT 0,
  ip_address VARCHAR(50),
  user_agent VARCHAR(500),
  referrer_url VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ad (ad_id),
  INDEX idx_created (created_at),
  FOREIGN KEY (ad_id) REFERENCES t_advertisement(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Requirement 20: 单体应用架构与模块化设计

**User Story:** 作为系统架构师，我希望使用单体应用架构快速开发和验证业务，同时保持代码模块化以便未来扩展。

#### Acceptance Criteria

1. WHEN 开发系统 THEN THE System SHALL 使用单体应用架构部署在单个进程中
2. WHEN 组织代码 THEN THE System SHALL 按业务领域划分包结构（controller, service, mapper, entity, dto）
3. WHEN 模块间调用 THEN THE System SHALL 通过接口隔离，避免直接依赖实现类
4. WHEN 设计数据库 THEN THE System SHALL 避免过度使用外键约束，为未来拆分做准备
5. WHEN 处理异步任务 THEN THE System SHALL 预留消息队列接口，当前可使用 @Async 注解
6. WHEN 系统规模扩大 THEN THE System SHALL 支持平滑迁移到微服务架构
7. WHEN 部署应用 THEN THE System SHALL 打包为单个 JAR 文件，简化部署流程

**当前架构方案: 单体应用**

**选择理由**:
- ✅ 初期开发，快速验证业务模式
- ✅ 团队规模小，沟通成本低
- ✅ 业务逻辑相对简单
- ✅ 开发和部署效率高
- ✅ 无需考虑分布式事务和服务治理
- ✅ 调试和测试容易

**模块化设计原则**:
- 按业务领域划分包结构
- 使用接口隔离模块依赖
- 避免循环依赖
- 数据库设计避免强耦合
- 为未来拆分预留扩展点

**未来微服务拆分方案（参考）**:

当满足以下条件时，可考虑拆分为微服务：
- 用户量达到 10万+
- 团队规模 > 10人
- 业务模块复杂度高
- 需要独立扩展某些模块

**可能的服务拆分建议**:

1. **用户服务 (User Service)**
   - 用户注册、登录、认证
   - 用户信息管理
   - 会员订阅管理
   - 数据库: t_user, t_user_subscription
   - 端口: 8081

2. **工具服务 (Tool Service)**
   - 工具 CRUD 操作
   - 工具搜索和过滤
   - 工具分类管理
   - 数据库: t_tool, t_category
   - 端口: 8082

3. **收藏服务 (Favorite Service)**
   - 用户收藏管理
   - 收藏列表查询
   - 数据库: t_user_favorite
   - 端口: 8083

4. **统计服务 (Analytics Service)**
   - 工具使用记录
   - 使用统计分析
   - 热门工具排行
   - 数据库: t_tool_usage
   - 端口: 8084

5. **广告服务 (Advertisement Service)**
   - 广告管理
   - 广告展示和点击追踪
   - 数据库: t_advertisement, t_ad_impression, t_ad_click
   - 端口: 8085

6. **API 网关 (API Gateway)**
   - 统一入口
   - 路由转发
   - 认证鉴权
   - 限流熔断
   - 端口: 8080

**技术栈建议**:
- Spring Cloud Gateway - API 网关
- Spring Cloud OpenFeign - 服务间调用
- Spring Cloud Alibaba Nacos - 服务注册与配置中心
- Spring Cloud Alibaba Sentinel - 流量控制和熔断降级
- RabbitMQ/Kafka - 消息队列（异步通信）
- Seata - 分布式事务（如需要）

**数据库策略**:
- 每个服务独立数据库（推荐）
- 或共享数据库，逻辑隔离（简化方案）

**当前阶段实施计划**:
1. **第一阶段（当前）**: 使用单体应用架构，实现核心功能
   - 用户认证与授权
   - 工具管理和搜索
   - 收藏和使用统计
   - 基础的前端界面

2. **第二阶段**: 完善功能和优化性能
   - 集成 Redis 缓存
   - 实现会员系统
   - 添加广告系统
   - 性能优化和压力测试

3. **第三阶段**: 根据业务增长评估是否需要微服务
   - 监控系统性能指标
   - 评估团队规模和业务复杂度
   - 如需要，逐步拆分为微服务

**预留设计原则**:
- 保持代码模块化，按业务领域划分包结构
- 避免跨模块直接调用，使用接口隔离
- 数据库设计避免跨表关联，为未来拆分做准备
- 使用消息队列处理异步任务，降低耦合

### Requirement 21: 工具评分与评论系统（预留设计）

**User Story:** 作为用户，我希望能够对工具进行评分和评论，以便帮助其他用户选择合适的工具。

#### Acceptance Criteria

1. WHEN 用户使用工具后 THEN THE System SHALL 允许用户评分（1-5星）
2. WHEN 用户提交评分 THEN THE System SHALL 更新工具的平均评分
3. WHEN 用户提交评论 THEN THE System SHALL 保存到 t_tool_review 表
4. WHEN 查询工具详情 THEN THE System SHALL 返回平均评分和评论数量
5. WHEN 查询评论列表 THEN THE System SHALL 支持分页和排序（最新、最热）
6. WHEN 用户点赞评论 THEN THE System SHALL 增加评论的点赞数
7. WHEN 管理员审核评论 THEN THE System SHALL 支持审核通过或拒绝

**预留数据库字段（t_tool 表）**:
- `rating_score` DECIMAL(3,2) - 待添加，平均评分（0.00-5.00）
- `rating_count` BIGINT - 待添加，评分人数
- `review_count` BIGINT - 待添加，评论数量

**新增表设计（t_tool_review）**:
```sql
CREATE TABLE t_tool_review (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tool_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  rating TINYINT NOT NULL,  -- 1-5 星评分
  title VARCHAR(100),
  content TEXT,
  helpful_count INT DEFAULT 0,  -- 有帮助的点赞数
  status TINYINT DEFAULT 0,  -- 0: Pending, 1: Approved, 2: Rejected
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tool (tool_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_rating (rating),
  FOREIGN KEY (tool_id) REFERENCES t_tool(id),
  FOREIGN KEY (user_id) REFERENCES t_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Requirement 22: 工具标签系统（预留设计）

**User Story:** 作为用户，我希望能够通过标签筛选工具，以便更精确地找到我需要的工具。

#### Acceptance Criteria

1. WHEN 管理员创建工具 THEN THE System SHALL 允许添加多个标签
2. WHEN 用户搜索工具 THEN THE System SHALL 支持按标签过滤
3. WHEN 查询标签 THEN THE System SHALL 返回标签下的工具数量
4. WHEN 展示工具 THEN THE System SHALL 显示关联的标签
5. WHEN 点击标签 THEN THE System SHALL 显示该标签下的所有工具
6. WHEN 管理标签 THEN THE System SHALL 支持标签的合并和删除
7. WHEN 标签被删除 THEN THE System SHALL 自动解除工具关联

**新增表设计（t_tag）**:
```sql
CREATE TABLE t_tag (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  name_zh VARCHAR(50),
  color VARCHAR(20),  -- 标签颜色
  icon VARCHAR(50),
  tool_count INT DEFAULT 0,  -- 关联的工具数量
  sort_order INT DEFAULT 0,
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_name (name),
  INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**新增表设计（t_tool_tag）**:
```sql
CREATE TABLE t_tool_tag (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tool_id BIGINT NOT NULL,
  tag_id BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tool_tag (tool_id, tag_id),
  INDEX idx_tool (tool_id),
  INDEX idx_tag (tag_id),
  FOREIGN KEY (tool_id) REFERENCES t_tool(id),
  FOREIGN KEY (tag_id) REFERENCES t_tag(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Requirement 23: 系统通知与消息中心（预留设计）

**User Story:** 作为用户，我希望能够接收系统通知，以便及时了解重要信息。

#### Acceptance Criteria

1. WHEN 系统发送通知 THEN THE System SHALL 保存到 t_notification 表
2. WHEN 用户登录 THEN THE System SHALL 显示未读通知数量
3. WHEN 用户查看通知 THEN THE System SHALL 标记为已读
4. WHEN 用户删除通知 THEN THE System SHALL 执行逻辑删除
5. WHEN 会员到期 THEN THE System SHALL 自动发送提醒通知
6. WHEN 工具更新 THEN THE System SHALL 通知收藏该工具的用户
7. WHEN 评论被回复 THEN THE System SHALL 通知评论作者

**新增表设计（t_notification）**:
```sql
CREATE TABLE t_notification (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type VARCHAR(50) NOT NULL,  -- system, subscription, tool_update, comment_reply
  title VARCHAR(100) NOT NULL,
  content TEXT,
  link_url VARCHAR(500),  -- 点击通知跳转的链接
  is_read TINYINT DEFAULT 0,  -- 0: Unread, 1: Read
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME,
  deleted TINYINT DEFAULT 0,
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created (created_at),
  FOREIGN KEY (user_id) REFERENCES t_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 架构决策记录

### ADR-001: 采用单体应用架构

**状态**: 已接受

**背景**: 
- 项目处于初期开发阶段
- 团队规模较小
- 业务逻辑相对简单
- 需要快速验证产品和市场
- 用户量预期在初期不会超过 10万

**决策**: 
采用单体应用架构，所有功能模块部署在单个应用中，但严格遵循模块化设计原则，为未来可能的微服务拆分做准备。

**后果**:
- ✅ 开发速度快，可以快速迭代和验证业务
- ✅ 部署简单，只需要一个 JAR 文件和一个数据库
- ✅ 调试方便，无需处理分布式系统的复杂性
- ✅ 性能开销小，无服务间网络调用
- ⚠️ 扩展性受限，但当前阶段完全可接受
- ⚠️ 需要注意代码模块化，避免过度耦合
- 📋 迁移路径: 当业务增长到一定规模时，可以逐步拆分为微服务

### ADR-002: 预留会员系统和广告系统的数据库设计

**状态**: 已接受

**背景**:
- 未来需要实现盈利模式
- 会员系统和广告系统是常见的盈利方式
- 提前设计可以避免后期大规模重构

**决策**:
在当前数据库设计中预留相关字段和表结构，但暂不实现业务逻辑。

**后果**:
- 优点: 为未来扩展做好准备，减少重构成本
- 缺点: 增加了一些暂时用不到的字段和表
- 实施: 在 init.sql 中添加相关表的 CREATE TABLE 语句，但标记为可选

### ADR-003: 数据库设计避免强外键约束

**状态**: 建议

**背景**:
- 考虑未来可能拆分为微服务
- 强外键约束会增加服务间的耦合
- 分布式环境下外键约束难以维护

**决策**:
在数据库设计中定义外键关系（用于文档和理解），但在实际创建表时可以选择不添加 FOREIGN KEY 约束，改为在应用层保证数据一致性。

**后果**:
- 优点: 为微服务拆分提供灵活性
- 缺点: 需要在应用层保证数据一致性
- 实施: 在 init.sql 中将 FOREIGN KEY 语句注释掉，或提供两个版本的脚本
