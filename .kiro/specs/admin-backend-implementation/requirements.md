# Requirements Document

## Introduction

本文档定义了Polaris Tools平台后端管理员功能的需求。该功能将为管理员提供完整的系统管理能力，包括用户管理、工具管理、分类管理和数据统计等功能。前端UI已经部分实现，本需求主要关注后端API的完整实现。

## Glossary

- **Admin_System**: 管理员系统，提供系统管理功能的后端服务
- **User_Manager**: 用户管理器，负责用户账户的增删改查操作
- **Tool_Manager**: 工具管理器，负责工具的管理和配置
- **Category_Manager**: 分类管理器，负责工具分类的管理
- **Statistics_Engine**: 统计引擎，负责生成各类数据统计报表
- **Auth_Guard**: 权限守卫，确保只有管理员可以访问管理功能
- **Dashboard_Service**: 仪表盘服务，提供系统概览数据

## Requirements

### Requirement 1: 管理员身份验证

**User Story:** 作为系统管理员，我希望只有具有管理员权限的用户才能访问管理功能，以确保系统安全。

#### Acceptance Criteria

1. WHEN a user attempts to access admin endpoints, THE Auth_Guard SHALL verify the user has admin role
2. WHEN a non-admin user attempts to access admin endpoints, THE Auth_Guard SHALL return 403 Forbidden error
3. WHEN an unauthenticated user attempts to access admin endpoints, THE Auth_Guard SHALL return 401 Unauthorized error
4. WHEN an admin user successfully authenticates, THE Auth_Guard SHALL allow access to all admin endpoints

### Requirement 2: 仪表盘统计数据

**User Story:** 作为系统管理员，我希望在仪表盘上看到系统的关键统计数据，以便快速了解系统运行状况。

#### Acceptance Criteria

1. WHEN an admin requests dashboard statistics, THE Dashboard_Service SHALL return total user count
2. WHEN an admin requests dashboard statistics, THE Dashboard_Service SHALL return active user count
3. WHEN an admin requests dashboard statistics, THE Dashboard_Service SHALL return total tool count
4. WHEN an admin requests dashboard statistics, THE Dashboard_Service SHALL return total category count
5. WHEN an admin requests dashboard statistics, THE Dashboard_Service SHALL return total usage count
6. WHEN an admin requests dashboard statistics, THE Dashboard_Service SHALL return new users today count
7. WHEN an admin requests dashboard statistics, THE Dashboard_Service SHALL return new users this week count
8. WHEN an admin requests dashboard statistics, THE Dashboard_Service SHALL return usage today count

### Requirement 3: 用户管理 - 查询

**User Story:** 作为系统管理员，我希望能够查看和搜索用户列表，以便管理用户账户。

#### Acceptance Criteria

1. WHEN an admin requests user list, THE User_Manager SHALL return paginated user data
2. WHEN an admin provides a keyword, THE User_Manager SHALL filter users by username or email
3. WHEN an admin provides a status filter, THE User_Manager SHALL return only users with matching status
4. WHEN an admin provides a plan type filter, THE User_Manager SHALL return only users with matching plan type
5. WHEN an admin requests a specific user by ID, THE User_Manager SHALL return detailed user information
6. WHEN an admin requests a non-existent user, THE User_Manager SHALL return 404 Not Found error

### Requirement 4: 用户管理 - 修改

**User Story:** 作为系统管理员，我希望能够修改用户信息和状态，以便管理用户账户。

#### Acceptance Criteria

1. WHEN an admin updates user information, THE User_Manager SHALL validate the input data
2. WHEN an admin updates user nickname, THE User_Manager SHALL save the new nickname
3. WHEN an admin updates user email, THE User_Manager SHALL validate email format and uniqueness
4. WHEN an admin updates user plan type, THE User_Manager SHALL update the plan type and expiration date
5. WHEN an admin toggles user status, THE User_Manager SHALL change the user status between active and disabled
6. WHEN an admin updates a non-existent user, THE User_Manager SHALL return 404 Not Found error

### Requirement 5: 用户管理 - 删除

**User Story:** 作为系统管理员，我希望能够删除用户账户，以便清理无效或违规账户。

#### Acceptance Criteria

1. WHEN an admin deletes a user, THE User_Manager SHALL remove the user from the database
2. WHEN an admin deletes a user, THE User_Manager SHALL also remove related user data
3. WHEN an admin attempts to delete a non-existent user, THE User_Manager SHALL return 404 Not Found error
4. WHEN an admin attempts to delete their own account, THE User_Manager SHALL return 400 Bad Request error

### Requirement 6: 工具管理 - 查询

**User Story:** 作为系统管理员，我希望能够查看和管理系统中的所有工具，以便维护工具库。

#### Acceptance Criteria

1. WHEN an admin requests tool list, THE Tool_Manager SHALL return paginated tool data
2. WHEN an admin provides a keyword, THE Tool_Manager SHALL filter tools by name or description
3. WHEN an admin provides a category filter, THE Tool_Manager SHALL return only tools in that category
4. WHEN an admin provides a status filter, THE Tool_Manager SHALL return only tools with matching status
5. WHEN an admin requests a specific tool by ID, THE Tool_Manager SHALL return detailed tool information

### Requirement 7: 工具管理 - 创建和修改

**User Story:** 作为系统管理员，我希望能够创建和修改工具信息，以便扩展和维护工具库。

#### Acceptance Criteria

1. WHEN an admin creates a new tool, THE Tool_Manager SHALL validate all required fields
2. WHEN an admin creates a new tool, THE Tool_Manager SHALL assign a unique ID
3. WHEN an admin updates tool information, THE Tool_Manager SHALL validate the input data
4. WHEN an admin updates tool name, THE Tool_Manager SHALL ensure name uniqueness
5. WHEN an admin updates tool category, THE Tool_Manager SHALL verify the category exists
6. WHEN an admin updates tool status, THE Tool_Manager SHALL change visibility to users

### Requirement 8: 工具管理 - 删除

**User Story:** 作为系统管理员，我希望能够删除工具，以便移除过时或不再需要的工具。

#### Acceptance Criteria

1. WHEN an admin deletes a tool, THE Tool_Manager SHALL remove the tool from the database
2. WHEN an admin deletes a tool, THE Tool_Manager SHALL preserve usage history for statistics
3. WHEN an admin attempts to delete a non-existent tool, THE Tool_Manager SHALL return 404 Not Found error

### Requirement 9: 分类管理 - 查询

**User Story:** 作为系统管理员，我希望能够查看和管理工具分类，以便组织工具库结构。

#### Acceptance Criteria

1. WHEN an admin requests category list, THE Category_Manager SHALL return all categories
2. WHEN an admin provides a status filter, THE Category_Manager SHALL return only categories with matching status
3. WHEN an admin requests a specific category by ID, THE Category_Manager SHALL return detailed category information
4. WHEN an admin requests a category with tools, THE Category_Manager SHALL include tool count

### Requirement 10: 分类管理 - 创建和修改

**User Story:** 作为系统管理员，我希望能够创建和修改分类，以便优化工具组织结构。

#### Acceptance Criteria

1. WHEN an admin creates a new category, THE Category_Manager SHALL validate all required fields
2. WHEN an admin creates a new category, THE Category_Manager SHALL assign a unique ID
3. WHEN an admin updates category information, THE Category_Manager SHALL validate the input data
4. WHEN an admin updates category name, THE Category_Manager SHALL ensure name uniqueness
5. WHEN an admin updates category sort order, THE Category_Manager SHALL reorder categories accordingly

### Requirement 11: 分类管理 - 删除

**User Story:** 作为系统管理员，我希望能够删除分类，以便清理不再使用的分类。

#### Acceptance Criteria

1. WHEN an admin deletes a category with no tools, THE Category_Manager SHALL remove the category
2. WHEN an admin attempts to delete a category with tools, THE Category_Manager SHALL return 400 Bad Request error
3. WHEN an admin attempts to delete a non-existent category, THE Category_Manager SHALL return 404 Not Found error

### Requirement 12: 数据统计 - 使用趋势

**User Story:** 作为系统管理员，我希望能够查看工具使用趋势，以便了解用户行为和系统使用情况。

#### Acceptance Criteria

1. WHEN an admin requests usage trend data, THE Statistics_Engine SHALL return daily usage counts
2. WHEN an admin specifies a time range, THE Statistics_Engine SHALL return data for that period
3. WHEN an admin requests usage trend, THE Statistics_Engine SHALL aggregate data by date
4. WHEN no usage data exists for a date, THE Statistics_Engine SHALL return zero count

### Requirement 13: 数据统计 - 用户增长

**User Story:** 作为系统管理员，我希望能够查看用户注册趋势，以便了解平台增长情况。

#### Acceptance Criteria

1. WHEN an admin requests user trend data, THE Statistics_Engine SHALL return daily registration counts
2. WHEN an admin specifies a time range, THE Statistics_Engine SHALL return data for that period
3. WHEN an admin requests user trend, THE Statistics_Engine SHALL aggregate data by date
4. WHEN no registrations exist for a date, THE Statistics_Engine SHALL return zero count

### Requirement 14: 数据统计 - 热门工具

**User Story:** 作为系统管理员，我希望能够查看最受欢迎的工具，以便了解用户偏好。

#### Acceptance Criteria

1. WHEN an admin requests popular tools, THE Statistics_Engine SHALL return tools sorted by usage count
2. WHEN an admin specifies a limit, THE Statistics_Engine SHALL return top N tools
3. WHEN an admin requests popular tools, THE Statistics_Engine SHALL include tool name and usage count
4. WHEN no usage data exists, THE Statistics_Engine SHALL return empty list

### Requirement 15: 错误处理

**User Story:** 作为系统管理员，我希望系统能够提供清晰的错误信息，以便快速定位和解决问题。

#### Acceptance Criteria

1. WHEN an error occurs, THE Admin_System SHALL return appropriate HTTP status code
2. WHEN validation fails, THE Admin_System SHALL return 400 Bad Request with detailed error message
3. WHEN resource not found, THE Admin_System SHALL return 404 Not Found with resource identifier
4. WHEN authorization fails, THE Admin_System SHALL return 403 Forbidden with clear message
5. WHEN authentication fails, THE Admin_System SHALL return 401 Unauthorized with clear message
6. WHEN server error occurs, THE Admin_System SHALL return 500 Internal Server Error and log the error

### Requirement 16: 数据验证

**User Story:** 作为系统管理员，我希望系统能够验证所有输入数据，以确保数据完整性和安全性。

#### Acceptance Criteria

1. WHEN receiving user input, THE Admin_System SHALL validate all required fields are present
2. WHEN receiving email input, THE Admin_System SHALL validate email format
3. WHEN receiving numeric input, THE Admin_System SHALL validate value ranges
4. WHEN receiving string input, THE Admin_System SHALL validate length constraints
5. WHEN receiving enum input, THE Admin_System SHALL validate value is in allowed set
6. WHEN validation fails, THE Admin_System SHALL return detailed validation error messages

### Requirement 17: 日志记录

**User Story:** 作为系统管理员，我希望系统能够记录所有管理操作，以便审计和追踪。

#### Acceptance Criteria

1. WHEN an admin performs any operation, THE Admin_System SHALL log the operation details
2. WHEN an admin modifies data, THE Admin_System SHALL log the old and new values
3. WHEN an admin deletes data, THE Admin_System SHALL log the deleted data
4. WHEN an error occurs, THE Admin_System SHALL log the error with stack trace
5. WHEN logging operations, THE Admin_System SHALL include timestamp and admin user information
