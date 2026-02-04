# Requirements Document

## Introduction

本文档定义了管理后台已删除数据操作功能的需求。当前系统支持软删除（通过deleted字段标记），并可以通过"已删除"筛选查看已删除数据，但无法对这些数据进行操作。本功能将为已删除数据添加编辑、恢复和永久删除三个核心操作，使管理员能够完整管理数据生命周期。

## Glossary

- **System**: 管理后台系统（包含用户管理、工具管理、分类管理三个模块）
- **Admin**: 具有管理权限的用户
- **Soft_Delete**: 软删除操作，将数据库记录的deleted字段设置为1，数据仍保留在数据库中
- **Hard_Delete**: 永久删除操作，从数据库中物理删除记录
- **Restore**: 恢复操作，将deleted字段从1改为0，使数据重新出现在正常列表中
- **Deleted_Record**: 已删除记录，deleted字段值为1的数据库记录
- **Normal_Record**: 正常记录，deleted字段值为0的数据库记录
- **Edit_Modal**: 编辑模态框，用于编辑数据的UI组件
- **Confirmation_Dialog**: 确认对话框，用于二次确认危险操作的UI组件

## Requirements

### Requirement 1: 编辑已删除数据

**User Story:** 作为管理员，我希望能够编辑已删除数据的所有字段，以便在恢复前修正数据错误或更新信息。

#### Acceptance Criteria

1. WHEN an Admin views a Deleted_Record in the user management page, THE System SHALL display an edit button
2. WHEN an Admin views a Deleted_Record in the tool management page, THE System SHALL display an edit button
3. WHEN an Admin views a Deleted_Record in the category management page, THE System SHALL display an edit button
4. WHEN an Admin clicks the edit button on a Deleted_Record, THE System SHALL open the Edit_Modal with all current field values
5. WHEN an Admin modifies fields in the Edit_Modal for a Deleted_Record, THE System SHALL allow editing all fields that are editable for Normal_Records
6. WHEN an Admin saves changes to a Deleted_Record, THE System SHALL persist the changes to the database while maintaining deleted=1
7. WHEN an Admin saves changes to a Deleted_Record, THE System SHALL refresh the list and display a success message
8. WHEN the save operation fails, THE System SHALL display an error message and keep the Edit_Modal open

### Requirement 2: 恢复已删除数据

**User Story:** 作为管理员，我希望能够恢复已删除的数据，以便将误删除或需要重新启用的数据恢复到正常状态。

#### Acceptance Criteria

1. WHEN an Admin views a Deleted_Record, THE System SHALL display a restore button
2. WHEN an Admin clicks the restore button, THE System SHALL send a restore request to the backend API
3. WHEN the restore request is successful, THE System SHALL update the deleted field from 1 to 0
4. WHEN the restore operation completes, THE System SHALL refresh the list and display a success message
5. WHEN the restore operation completes and the Admin is viewing deleted records, THE System SHALL remove the restored record from the current view
6. WHEN the restore operation completes and the Admin is viewing all records, THE System SHALL show the restored record in the normal list
7. WHEN the restore operation fails, THE System SHALL display an error message
8. THE System SHALL provide a restore API endpoint at PUT /api/v1/admin/users/{id}/restore for user records
9. THE System SHALL provide a restore API endpoint at PUT /api/v1/admin/tools/{id}/restore for tool records
10. THE System SHALL provide a restore API endpoint at PUT /api/v1/admin/categories/{id}/restore for category records

### Requirement 3: 永久删除已删除数据

**User Story:** 作为管理员，我希望能够永久删除已删除的数据，以便彻底清理不再需要的数据并释放存储空间。

#### Acceptance Criteria

1. WHEN an Admin views a Deleted_Record, THE System SHALL display a permanent delete button
2. WHEN an Admin clicks the permanent delete button, THE System SHALL display a Confirmation_Dialog
3. THE Confirmation_Dialog SHALL clearly indicate that this is a permanent deletion operation
4. THE Confirmation_Dialog SHALL require explicit confirmation before proceeding
5. WHEN an Admin confirms permanent deletion in the Confirmation_Dialog, THE System SHALL send a hard delete request to the backend API
6. WHEN the hard delete request is successful, THE System SHALL physically remove the record from the database
7. WHEN the permanent delete operation completes, THE System SHALL refresh the list and display a success message
8. WHEN the permanent delete operation completes, THE System SHALL remove the record from the current view
9. WHEN the permanent delete operation fails, THE System SHALL display an error message
10. THE System SHALL provide a permanent delete API endpoint at DELETE /api/v1/admin/users/{id}?permanent=true for user records
11. THE System SHALL provide a permanent delete API endpoint at DELETE /api/v1/admin/tools/{id}?permanent=true for tool records
12. THE System SHALL provide a permanent delete API endpoint at DELETE /api/v1/admin/categories/{id}?permanent=true for category records

### Requirement 4: 权限控制

**User Story:** 作为系统架构师，我希望确保只有管理员可以操作已删除数据，以便保护数据安全和系统完整性。

#### Acceptance Criteria

1. WHEN a non-Admin user attempts to access deleted records, THE System SHALL deny access
2. WHEN a non-Admin user attempts to edit a Deleted_Record, THE System SHALL return an authorization error
3. WHEN a non-Admin user attempts to restore a Deleted_Record, THE System SHALL return an authorization error
4. WHEN a non-Admin user attempts to permanently delete a Deleted_Record, THE System SHALL return an authorization error
5. THE System SHALL validate Admin permissions on the backend for all deleted data operations

### Requirement 5: 用户界面和反馈

**User Story:** 作为管理员，我希望获得清晰的操作反馈和直观的用户界面，以便高效安全地管理已删除数据。

#### Acceptance Criteria

1. WHEN an Admin performs any operation on a Deleted_Record, THE System SHALL display a loading indicator during the operation
2. WHEN an operation succeeds, THE System SHALL display a success toast message in the user's language
3. WHEN an operation fails, THE System SHALL display an error toast message with the failure reason in the user's language
4. THE System SHALL support both Chinese and English for all UI text and messages
5. WHEN displaying the Confirmation_Dialog for permanent deletion, THE System SHALL use warning colors and clear warning text
6. WHEN an Admin performs an operation, THE System SHALL maintain the current filter state (showing deleted or all records)
7. WHEN the list refreshes after an operation, THE System SHALL preserve the user's current page position when possible

### Requirement 6: 数据一致性

**User Story:** 作为系统架构师，我希望确保所有操作保持数据一致性，以便系统数据始终处于有效状态。

#### Acceptance Criteria

1. WHEN a Deleted_Record is edited, THE System SHALL validate all field constraints before saving
2. WHEN a Deleted_Record is restored, THE System SHALL ensure the record meets all validation rules for Normal_Records
3. WHEN a permanent delete operation is performed, THE System SHALL handle any foreign key constraints appropriately
4. WHEN any operation fails due to validation errors, THE System SHALL provide specific error messages
5. THE System SHALL use database transactions for all delete and restore operations to ensure atomicity
