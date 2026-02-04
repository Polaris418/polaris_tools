# Implementation Plan: Admin Backend Implementation

## Overview

本实现计划将后端管理员功能分解为一系列可执行的编码任务。实现将基于现有的Spring Boot架构，遵循分层设计模式，确保代码质量和可测试性。

## Tasks

- [x] 1. 创建管理员相关的DTO类
  - 创建AdminUserQueryRequest、AdminUserUpdateRequest、UserStatusRequest
  - 创建AdminUserResponse、DashboardStatsResponse、TrendDataPoint、PopularToolData
  - 添加必要的验证注解（@NotNull, @Email等）
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [ ]* 1.1 为DTO类编写单元测试
  - 测试验证注解是否正确工作
  - 测试DTO的序列化和反序列化
  - _Requirements: 16.1, 16.2, 16.3_

- [x] 2. 扩展Mapper接口添加统计查询方法
  - [x] 2.1 在UserMapper中添加统计方法
    - 添加countActiveUsers方法（统计活跃用户）
    - 添加countNewUsers方法（统计新增用户）
    - 添加getDailyRegistrationCount方法（每日注册量）
    - _Requirements: 2.2, 2.6, 2.7, 13.1_

  - [x] 2.2 在ToolUsageMapper中添加统计方法
    - 添加countUsageAfter方法（统计使用次数）
    - 添加getDailyUsageCount方法（每日使用量）
    - 添加getPopularTools方法（热门工具）
    - _Requirements: 2.5, 2.8, 12.1, 14.1_

- [ ]* 2.3 为Mapper方法编写集成测试
  - 使用H2内存数据库测试SQL查询
  - 验证统计数据的准确性
  - _Requirements: 12.1, 13.1, 14.1_

- [x] 3. 实现AdminService核心服务
  - [x] 3.1 创建AdminService接口和实现类
    - 实现getDashboardStats方法
    - 聚合各类统计数据
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [ ]* 3.2 为AdminService编写属性测试
  - **Property 3: Dashboard Statistics Completeness**
  - **Validates: Requirements 2.1-2.8**
  - 验证仪表盘响应包含所有必需字段
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 4. 实现AdminUserService用户管理服务
  - [x] 4.1 创建AdminUserService接口和实现类
    - 实现listUsers方法（分页查询）
    - 实现getUser方法（获取详情）
    - 实现updateUser方法（更新用户）
    - 实现deleteUser方法（删除用户）
    - 实现toggleUserStatus方法（切换状态）
    - _Requirements: 3.1, 3.5, 4.2, 5.1, 4.5_

  - [x] 4.2 实现用户查询过滤逻辑
    - 实现关键词搜索（username或email）
    - 实现状态过滤
    - 实现套餐类型过滤
    - _Requirements: 3.2, 3.3, 3.4_

  - [x] 4.3 实现用户更新验证逻辑
    - 验证邮箱格式和唯一性
    - 验证套餐类型有效性
    - 防止管理员删除自己
    - _Requirements: 4.1, 4.3, 5.4_

- [ ]* 4.4 为AdminUserService编写属性测试
  - **Property 4: User List Pagination**
  - **Validates: Requirements 3.1**
  - **Property 5: User Search Filtering**
  - **Validates: Requirements 3.2**
  - **Property 6: User Status Filtering**
  - **Validates: Requirements 3.3**
  - **Property 7: User Plan Type Filtering**
  - **Validates: Requirements 3.4**
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 4.5 为用户更新编写属性测试
  - **Property 10: User Update Round Trip**
  - **Validates: Requirements 4.2, 4.4**
  - **Property 11: User Status Toggle**
  - **Validates: Requirements 4.5**
  - _Requirements: 4.2, 4.4, 4.5_

- [ ]* 4.6 为用户删除编写属性测试
  - **Property 12: User Deletion**
  - **Validates: Requirements 5.1**
  - _Requirements: 5.1_

- [x] 5. 实现AdminStatisticsService统计服务
  - [x] 5.1 创建AdminStatisticsService接口和实现类
    - 实现getUsageTrend方法（使用趋势）
    - 实现getUserTrend方法（用户增长）
    - 实现getPopularTools方法（热门工具）
    - _Requirements: 12.1, 13.1, 14.1_

  - [x] 5.2 实现趋势数据处理逻辑
    - 按日期聚合数据
    - 填充缺失日期的零值
    - 格式化日期输出
    - _Requirements: 12.3, 12.4, 13.3, 13.4_

- [ ]* 5.3 为统计服务编写属性测试
  - **Property 32: Usage Trend Date Range**
  - **Validates: Requirements 12.2**
  - **Property 33: Usage Trend Date Uniqueness**
  - **Validates: Requirements 12.3**
  - **Property 36: Popular Tools Sort Order**
  - **Validates: Requirements 14.1**
  - _Requirements: 12.2, 12.3, 14.1_

- [ ] 6. 实现管理员权限验证
  - [x] 6.1 创建@RequireAdmin注解
    - 定义注解接口
    - 设置Target和Retention
    - _Requirements: 1.1_

  - [x] 6.2 创建AdminAuthorizationAspect切面
    - 实现权限检查逻辑
    - 验证用户是否为管理员（planType=2）
    - 抛出适当的异常
    - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 6.3 为权限验证编写属性测试
  - **Property 1: Admin Role Verification**
  - **Validates: Requirements 1.1**
  - **Property 2: Non-Admin Access Denial**
  - **Validates: Requirements 1.2**
  - _Requirements: 1.1, 1.2_

- [x] 7. 实现AdminController控制器
  - [x] 7.1 创建AdminController类
    - 添加@RestController和@RequestMapping注解
    - 注入所需的Service依赖
    - 添加@RequireAdmin注解到类级别
    - _Requirements: 1.1_

  - [x] 7.2 实现仪表盘统计端点
    - 实现GET /api/v1/admin/stats
    - 调用AdminService.getDashboardStats
    - 返回Result<DashboardStatsResponse>
    - _Requirements: 2.1_

  - [x] 7.3 实现用户管理端点
    - 实现GET /api/v1/admin/users（列表查询）
    - 实现GET /api/v1/admin/users/{id}（获取详情）
    - 实现PUT /api/v1/admin/users/{id}（更新用户）
    - 实现DELETE /api/v1/admin/users/{id}（删除用户）
    - 实现PUT /api/v1/admin/users/{id}/status（切换状态）
    - _Requirements: 3.1, 3.5, 4.2, 5.1, 4.5_

  - [x] 7.4 实现工具管理端点
    - 实现GET /api/v1/admin/tools（列表查询）
    - 实现GET /api/v1/admin/tools/{id}（获取详情）
    - 实现POST /api/v1/admin/tools（创建工具）
    - 实现PUT /api/v1/admin/tools/{id}（更新工具）
    - 实现DELETE /api/v1/admin/tools/{id}（删除工具）
    - _Requirements: 6.1, 6.5, 7.1, 7.3, 8.1_

  - [x] 7.5 实现分类管理端点
    - 实现GET /api/v1/admin/categories（列表查询）
    - 实现GET /api/v1/admin/categories/{id}（获取详情）
    - 实现POST /api/v1/admin/categories（创建分类）
    - 实现PUT /api/v1/admin/categories/{id}（更新分类）
    - 实现DELETE /api/v1/admin/categories/{id}（删除分类）
    - _Requirements: 9.1, 9.3, 10.1, 10.3, 11.1_

  - [x] 7.6 实现统计数据端点
    - 实现GET /api/v1/admin/statistics/usage-trend
    - 实现GET /api/v1/admin/statistics/user-trend
    - 实现GET /api/v1/admin/statistics/popular-tools
    - _Requirements: 12.1, 13.1, 14.1_

- [ ]* 7.7 为Controller编写集成测试
  - 使用MockMvc测试所有端点
  - 验证HTTP状态码和响应格式
  - 测试权限验证
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 8. 实现错误处理和验证
  - [x] 8.1 扩展ErrorCode枚举
    - 添加管理员相关的错误码
    - CANNOT_DELETE_SELF, CATEGORY_HAS_TOOLS等
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 8.2 在GlobalExceptionHandler中添加异常处理
    - 处理管理员特定的业务异常
    - 返回统一的错误响应格式
    - _Requirements: 15.1, 15.6_

  - [x] 8.3 添加请求参数验证
    - 在DTO类上添加验证注解
    - 在Controller方法参数上添加@Valid
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ]* 8.4 为错误处理编写属性测试
  - **Property 38: Input Validation**
  - **Validates: Requirements 16.1-16.6**
  - 测试各种无效输入场景
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

- [x] 9. 添加日志记录
  - 在所有Service方法中添加操作日志
  - 记录管理员ID、操作类型、操作对象
  - 记录错误和异常信息
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 10. Checkpoint - 确保所有测试通过
  - 运行所有单元测试
  - 运行所有属性测试
  - 运行所有集成测试
  - 确保测试覆盖率达到80%以上
  - 如有问题，请向用户报告

- [x] 11. 前后端集成验证
  - [x] 11.1 验证API端点与前端调用匹配
    - 检查URL路径是否一致
    - 检查请求/响应格式是否匹配
    - 检查错误处理是否符合前端预期
    - _Requirements: 所有需求_

  - [x] 11.2 更新API文档
    - 使用Swagger/OpenAPI注解
    - 生成API文档
    - 确保文档准确完整

- [x] 12. 最终检查和优化
  - 代码审查和重构
  - 性能优化（如添加索引、优化查询）
  - 安全检查（SQL注入、XSS等）
  - 确保所有日志记录完整

## Notes

- 标记为`*`的任务是可选的测试任务，可以根据项目进度决定是否实施
- 每个任务都引用了具体的需求编号，便于追溯
- 属性测试使用jqwik框架，每个测试至少运行100次迭代
- 单元测试和集成测试使用JUnit 5和Spring Boot Test
- 所有测试都应该标注对应的设计文档属性编号
- Checkpoint任务确保增量验证，及时发现问题
