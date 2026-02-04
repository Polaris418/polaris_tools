# Implementation Plan: Polaris Tools Platform

## Overview

本实现计划将 Polaris Tools Platform 的设计转化为可执行的开发任务。系统采用单体应用架构，使用 Spring Boot 3.2.5 + MyBatis-Plus 3.5.6 作为后端，React 19.2.3 + TypeScript 5.8.2 作为前端。

**当前状态**: 前端页面已部分完成（Sidebar, Header, Hero, Dashboard, ToolCard 等组件），现在需要开发后端 API 来支持前端功能。

实现策略：
1. **优先实现后端 API** - 为已完成的前端页面提供数据支持
2. **核心功能优先** - 认证、工具管理、分类管理、搜索过滤
3. **然后实现扩展功能** - 收藏、统计、缓存
4. **最后完善前端集成** - API 客户端、数据获取、状态管理
5. 每个任务完成后进行测试验证
6. 使用 checkpoint 任务确保阶段性验证

## Tasks

- [x] 1. 完善数据库初始化脚本
  - 更新 init.sql 添加所有核心表和扩展表
  - 添加初始数据（分类、示例工具）
  - 添加索引优化
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

- [x] 2. 实现用户认证与授权模块
  - [x] 2.1 创建 DTO 类（UserRegisterRequest, UserLoginRequest, UserResponse, LoginResponse）
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 2.2 创建 UserMapper 接口
    - 继承 BaseMapper<User>
    - 添加 findByUsername() 和 findByEmail() 方法
    - _Requirements: 1.1, 1.4_
  
  - [x] 2.3 实现 AuthService 接口和实现类
    - register() - 用户注册，验证唯一性，BCrypt 加密密码
    - login() - 用户登录，验证凭证，生成 JWT Token
    - logout() - 用户登出
    - refreshToken() - 刷新 Token
    - getCurrentUser() - 获取当前用户信息
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  
  - [x] 2.4 实现 AuthController
    - POST /api/v1/auth/register
    - POST /api/v1/auth/login
    - POST /api/v1/auth/logout
    - POST /api/v1/auth/refresh
    - GET /api/v1/auth/me
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  
  - [ ]* 2.5 编写 AuthService 单元测试
    - 测试注册成功和失败场景
    - 测试登录成功和失败场景
    - 测试密码加密
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ]* 2.6 编写属性测试：密码 BCrypt 加密存储
    - **Property 2: 密码 BCrypt 加密存储**
    - **Validates: Requirements 1.3**
  
  - [ ]* 2.7 编写属性测试：JWT Token 包含用户信息
    - **Property 4: JWT Token 包含用户信息**
    - **Validates: Requirements 1.5**

- [x] 3. Checkpoint - 验证认证模块
  - 确保所有测试通过
  - 手动测试注册和登录流程
  - 验证 JWT Token 生成和验证

- [x] 4. 实现工具管理模块
  - [x] 4.1 创建 DTO 类（ToolCreateRequest, ToolUpdateRequest, ToolQueryRequest, ToolResponse）
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  
  - [x] 4.2 创建 ToolMapper 接口
    - 继承 BaseMapper<Tool>
    - 添加 searchTools() 全文搜索方法
    - 添加 getPopularTools() 热门工具方法
    - 添加 incrementViewCount() 增加浏览计数方法
    - 添加 incrementUseCount() 增加使用计数方法
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [x] 4.3 实现 ToolService 接口和实现类
    - listTools() - 获取工具列表（支持分页、搜索、过滤）
    - getToolById() - 获取工具详情
    - createTool() - 创建工具（验证分类存在）
    - updateTool() - 更新工具
    - deleteTool() - 逻辑删除工具
    - incrementViewCount() - 增加浏览计数
    - recordToolUsage() - 记录工具使用
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  
  - [x] 4.4 实现 ToolController
    - GET /api/v1/tools - 获取工具列表
    - GET /api/v1/tools/{id} - 获取工具详情
    - POST /api/v1/tools - 创建工具（管理员）
    - PUT /api/v1/tools/{id} - 更新工具（管理员）
    - DELETE /api/v1/tools/{id} - 删除工具（管理员）
    - POST /api/v1/tools/{id}/view - 记录工具浏览
    - POST /api/v1/tools/{id}/use - 记录工具使用
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  
  - [ ]* 4.5 编写 ToolService 单元测试
    - 测试创建工具成功和失败场景
    - 测试更新工具
    - 测试逻辑删除
    - 测试查询排除已删除工具
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ]* 4.6 编写属性测试：查询排除已删除工具
    - **Property 13: 查询排除已删除工具**
    - **Validates: Requirements 2.6**
  
  - [ ]* 4.7 编写属性测试：浏览计数原子性增加
    - **Property 15: 浏览计数原子性增加**
    - **Validates: Requirements 2.8**

- [x] 5. 实现分类管理模块
  - [x] 5.1 创建 DTO 类（CategoryCreateRequest, CategoryUpdateRequest, CategoryResponse）
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [x] 5.2 创建 CategoryMapper 接口
    - 继承 BaseMapper<Category>
    - 添加 listCategoriesWithToolCount() 方法
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 5.3 实现 CategoryService 接口和实现类
    - listCategories() - 获取分类列表（按 sort_order 排序）
    - getCategoryById() - 获取分类详情（包含工具数量）
    - createCategory() - 创建分类（验证名称唯一性）
    - updateCategory() - 更新分类
    - deleteCategory() - 删除分类（检查是否有关联工具）
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [x] 5.4 实现 CategoryController
    - GET /api/v1/categories - 获取分类列表
    - GET /api/v1/categories/{id} - 获取分类详情
    - POST /api/v1/categories - 创建分类（管理员）
    - PUT /api/v1/categories/{id} - 更新分类（管理员）
    - DELETE /api/v1/categories/{id} - 删除分类（管理员）
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [ ]* 5.5 编写属性测试：分类列表按 sort_order 排序
    - **Property 18: 分类列表按 sort_order 排序**
    - **Validates: Requirements 3.4**
  
  - [ ]* 5.6 编写属性测试：分类工具数量统计准确性
    - **Property 19: 分类工具数量统计准确性**
    - **Validates: Requirements 3.5**

- [x] 6. Checkpoint - 验证工具和分类模块
  - 确保所有测试通过
  - 手动测试工具 CRUD 操作
  - 验证分类管理功能

- [x] 7. 实现搜索与过滤功能
  - [x] 7.1 在 ToolService 中实现搜索逻辑
    - 使用 MyBatis-Plus LambdaQueryWrapper
    - 支持关键词搜索（FULLTEXT 索引）
    - 支持分类过滤
    - 支持多条件组合（AND 逻辑）
    - 支持排序（sortOrder, viewCount, useCount, createdAt, rating）
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [ ]* 7.2 编写属性测试：全文搜索匹配
    - **Property 21: 全文搜索匹配**
    - **Validates: Requirements 4.1**
  
  - [ ]* 7.3 编写属性测试：分类过滤准确性
    - **Property 22: 分类过滤准确性**
    - **Validates: Requirements 4.3**
  
  - [ ]* 7.4 编写属性测试：多条件过滤 AND 逻辑
    - **Property 23: 多条件过滤 AND 逻辑**
    - **Validates: Requirements 4.4**

- [x] 8. 实现收藏功能模块
  - [x] 8.1 创建 UserFavoriteMapper 接口
    - 继承 BaseMapper<UserFavorite>
    - 添加 listFavoriteTools() 方法
    - 添加 isFavorited() 方法
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [x] 8.2 实现 FavoriteService 接口和实现类
    - listFavorites() - 获取用户收藏列表（按时间降序）
    - addFavorite() - 添加收藏（检查重复）
    - removeFavorite() - 取消收藏
    - isFavorited() - 检查是否已收藏
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [x] 8.3 实现 FavoriteController
    - GET /api/v1/favorites - 获取用户收藏列表
    - POST /api/v1/favorites - 添加收藏
    - DELETE /api/v1/favorites/{toolId} - 取消收藏
    - GET /api/v1/favorites/check/{toolId} - 检查是否已收藏
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [ ]* 8.4 编写属性测试：收藏列表按时间排序
    - **Property 30: 收藏列表按时间排序**
    - **Validates: Requirements 5.8**

- [x] 9. 实现使用统计模块
  - [x] 9.1 创建 ToolUsageMapper 接口
    - 继承 BaseMapper<ToolUsage>
    - 添加 getRecentTools() 方法
    - 添加 getUserHistory() 方法
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  
  - [x] 9.2 创建 DTO 类（ToolUsageResponse）
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  
  - [x] 9.3 实现 UsageService 接口和实现类
    - getRecentTools() - 获取最近使用的工具
    - getPopularTools() - 获取热门工具（按 use_count 排序）
    - getUserHistory() - 获取用户使用历史（分页）
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  
  - [x] 9.4 实现 UsageController
    - GET /api/v1/usage/recent - 获取最近使用的工具
    - GET /api/v1/usage/popular - 获取热门工具
    - GET /api/v1/usage/history - 获取用户使用历史
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  
  - [ ]* 9.5 编写属性测试：热门工具按使用次数排序
    - **Property 36: 热门工具按使用次数排序**
    - **Validates: Requirements 6.7**

- [x] 10. Checkpoint - 验证搜索、收藏和统计模块
  - 确保所有测试通过
  - 手动测试搜索和过滤功能
  - 验证收藏和统计功能

- [x] 11. 集成 Redis 缓存
  - [x] 11.1 添加 Redis 依赖和配置
    - 在 pom.xml 中已有 spring-boot-starter-data-redis
    - 配置 RedisTemplate 和 CacheManager
    - _Requirements: 7.3, 7.4, 7.5_
  
  - [x] 11.2 在 Service 层添加缓存注解
    - @Cacheable 用于查询方法
    - @CacheEvict 用于修改方法
    - @CachePut 用于更新方法
    - _Requirements: 7.3, 7.4, 7.5_
  
  - [x] 11.3 编写缓存集成测试

    - 测试缓存命中和未命中
    - 测试缓存更新和清除
    - _Requirements: 7.3, 7.4, 7.5_

- [ ] 12. 实现前端 API 客户端
  - [x] 12.1 创建 API 客户端类（api/client.ts）
    - 实现 request() 方法
    - 实现 setToken() 和 clearToken() 方法
    - 实现 auth API 方法
    - 实现 tools API 方法
    - 实现 categories API 方法
    - 实现 favorites API 方法
    - 实现 usage API 方法
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  
  - [x] 12.2 创建类型定义（types.ts）
    - 定义 Result<T> 类型
    - 定义 PageResult<T> 类型
    - 定义请求和响应类型
    - _Requirements: 8.1, 8.2_
  
  - [x] 12.3 创建环境变量配置（.env.local）
    - VITE_API_BASE_URL
    - _Requirements: 16.1, 16.2, 16.3_

- [x] 13. 实现前端数据获取 Hooks
  - [x] 13.1 创建 useTools Hook
    - 获取工具列表
    - 处理加载状态和错误
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  
  - [x] 13.2 创建 useCategories Hook
    - 获取分类列表
    - 处理加载状态和错误
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 13.3 创建 useFavorites Hook
    - 获取收藏列表
    - 添加和取消收藏
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [x] 13.4 更新 AppContext 添加用户认证状态
    - 添加 user, isAuthenticated, login, logout 状态和方法
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 14. 实现前端页面组件
  - [x] 14.1 实现 Login 页面
    - 登录表单
    - 注册表单
    - 错误提示
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 14.2 实现 Favorites 页面
    - 显示收藏列表
    - 取消收藏功能
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [x] 14.3 更新 Dashboard 页面
    - 从 API 获取工具数据
    - 从 API 获取分类数据
    - 显示加载状态
    - 显示错误提示
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 14.4 实现 Settings 页面
    - 用户信息编辑
    - 密码修改
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 15. Checkpoint - 验证前后端集成
  - 确保前后端 API 对接成功
  - 测试完整的用户流程
  - 验证认证和授权功能

- [x] 16. 实现 ErrorCode 枚举和优化异常处理
  - [x] 16.1 创建 ErrorCode 枚举
    - 定义所有错误码
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_
  
  - [x] 16.2 更新 BusinessException 使用 ErrorCode
    - _Requirements: 11.1, 11.2_
  
  - [x] 16.3 在 Service 层使用 ErrorCode 抛出异常
    - _Requirements: 11.1, 11.2_

- [x] 17. 添加 MapStruct 对象映射
  - [x] 17.1 创建 Converter 接口
    - UserConverter
    - ToolConverter
    - CategoryConverter
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  
  - [x] 17.2 在 Service 层使用 Converter
    - 替换手动对象映射
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 18. 添加 SpringDoc OpenAPI 文档
  - [x] 18.1 在 Controller 添加 @Tag 和 @Operation 注解
    - _Requirements: 8.7_
  
  - [x] 18.2 配置 OpenAPI 文档信息
    - 标题、描述、版本
    - _Requirements: 8.7_
  
  - [x] 18.3 访问 Swagger UI 验证文档
    - http://localhost:8080/swagger-ui.html
    - _Requirements: 8.7_

- [ ] 19. 编写集成测试
  - [ ]* 19.1 编写认证模块集成测试
    - 测试注册和登录流程
    - 测试 Token 验证
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  
  - [ ]* 19.2 编写工具管理集成测试
    - 测试工具 CRUD 操作
    - 测试搜索和过滤
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [ ]* 19.3 编写收藏功能集成测试
    - 测试添加和取消收藏
    - 测试收藏列表查询
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [ ] 20. Final Checkpoint - 完整系统测试
  - 确保所有测试通过
  - 手动测试所有功能
  - 验证性能和安全性
  - 准备部署

## Notes

- 标记 `*` 的任务为可选任务，可以根据时间和优先级决定是否实现
- 每个 Checkpoint 任务确保阶段性验证，发现问题及时修复
- 属性测试使用 jqwik 框架，每个测试至少运行 100 次迭代
- 集成测试使用 Testcontainers 提供隔离的测试环境
- 前端测试使用 Vitest 和 React Testing Library
- 所有任务都引用了对应的需求编号，确保可追溯性
