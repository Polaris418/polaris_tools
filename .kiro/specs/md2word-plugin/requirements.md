# Requirements Document: MD2Word Plugin

## Introduction

本文档定义了将 MD2Word 功能集成到 Polaris Tools Platform 的需求。MD2Word 是一个专业的 Markdown 到 Word 文档转换工具，提供实时编辑、云端同步、版本历史和多格式导出功能。该工具将作为独立工具页面集成到平台中，使用后端插件化架构实现，并支持会员和免费用户的差异化功能。

## Glossary

- **MD2Word_System**: Markdown 到 Word 转换工具系统
- **Document_Manager**: 文档管理模块，负责文档的 CRUD 操作
- **Editor**: Markdown 编辑器组件
- **Export_Service**: 导出服务，负责将 Markdown 转换为各种格式
- **Version_Manager**: 版本管理模块，负责文档版本历史
- **Folder_Manager**: 文件夹管理模块，负责文档组织
- **User**: 使用系统的用户
- **Premium_User**: 付费会员用户
- **Free_User**: 免费用户
- **Document**: 用户创建的 Markdown 文档
- **Template**: 文档模板
- **Export_Format**: 导出格式（DOCX, PDF, HTML, Markdown, LaTeX）
- **Retention_Period**: 文档保存期限
- **Backend_Plugin**: 后端插件化架构组件

## Requirements

### Requirement 1: 用户认证与授权集成

**User Story:** 作为用户，我希望使用 Polaris 平台的统一认证系统，以便无缝访问 MD2Word 工具。

#### Acceptance Criteria

1. WHEN a user accesses MD2Word tool, THE MD2Word_System SHALL verify user authentication status using Polaris authentication system
2. WHEN an unauthenticated user attempts to access MD2Word, THE MD2Word_System SHALL redirect to login page
3. WHEN a user logs in successfully, THE MD2Word_System SHALL retrieve user membership type from Polaris user system
4. THE MD2Word_System SHALL support two membership types: Premium_User and Free_User
5. WHEN determining user permissions, THE MD2Word_System SHALL apply different feature limits based on membership type

### Requirement 2: 文档管理（CRUD 操作）

**User Story:** 作为用户，我希望能够创建、查看、编辑和删除我的 Markdown 文档，以便管理我的内容。

#### Acceptance Criteria

1. WHEN a user creates a new document, THE Document_Manager SHALL save the document to database with user_id, title, content, and creation timestamp
2. WHEN a user creates a document, THE Document_Manager SHALL set expiration time based on membership type
3. WHERE user is Premium_User, THE Document_Manager SHALL set expiration time to 30 days from creation
4. WHERE user is Free_User, THE Document_Manager SHALL set expiration time to 3 days from creation
5. WHEN a user requests document list, THE Document_Manager SHALL return only non-expired documents owned by the user
6. WHEN a user updates a document, THE Document_Manager SHALL update content and updated_at timestamp
7. WHEN a user deletes a document, THE Document_Manager SHALL perform soft delete by setting deleted flag to 1
8. WHEN querying documents, THE Document_Manager SHALL exclude documents with deleted flag set to 1

### Requirement 3: 文档版本历史

**User Story:** 作为用户，我希望能够查看和恢复文档的历史版本，以便在需要时回滚到之前的状态。

#### Acceptance Criteria

1. WHEN a user saves a document, THE Version_Manager SHALL create a new version record with content snapshot
2. WHEN creating a version, THE Version_Manager SHALL set expiration time based on membership type
3. WHERE user is Premium_User, THE Version_Manager SHALL set version expiration to 30 days from creation
4. WHERE user is Free_User, THE Version_Manager SHALL set version expiration to 3 days from creation
5. WHEN a user requests version history, THE Version_Manager SHALL return only non-expired versions ordered by creation time descending
6. WHEN a user restores a version, THE Version_Manager SHALL update current document content with selected version content
7. WHEN a user restores a version, THE Version_Manager SHALL create a new version record for the restoration

### Requirement 4: 文件夹管理

**User Story:** 作为用户，我希望能够创建文件夹来组织我的文档，以便更好地管理大量文档。

#### Acceptance Criteria

1. WHEN a user creates a folder, THE Folder_Manager SHALL save folder with user_id, name, and parent_id
2. THE Folder_Manager SHALL support hierarchical folder structure with parent-child relationships
3. WHEN a user moves a document to a folder, THE Document_Manager SHALL update document folder_id
4. WHEN a user deletes a folder, THE Folder_Manager SHALL check if folder contains documents
5. IF a folder contains documents, THEN THE Folder_Manager SHALL prevent deletion and return error message
6. WHEN a user renames a folder, THE Folder_Manager SHALL update folder name
7. WHEN querying folders, THE Folder_Manager SHALL return folders ordered by sort_order then name

### Requirement 5: Markdown 编辑器功能

**User Story:** 作为用户，我希望使用功能丰富的 Markdown 编辑器，以便高效地编写和格式化文档。

#### Acceptance Criteria

1. THE Editor SHALL provide real-time preview of Markdown content
2. THE Editor SHALL support three view modes: split, source, and preview
3. WHEN a user types in editor, THE Editor SHALL update preview within 100 milliseconds
4. THE Editor SHALL provide formatting toolbar with buttons for bold, italic, heading, link, image, code, and formula
5. THE Editor SHALL support syntax highlighting for code blocks
6. THE Editor SHALL support LaTeX formula rendering
7. THE Editor SHALL support image preview and insertion
8. THE Editor SHALL auto-save document content every 30 seconds
9. WHEN auto-save completes, THE Editor SHALL display save status indicator

### Requirement 6: 文档导出功能

**User Story:** 作为用户，我希望能够将 Markdown 文档导出为多种格式，以便在不同场景下使用。

#### Acceptance Criteria

1. THE Export_Service SHALL support exporting documents to DOCX format
2. THE Export_Service SHALL support exporting documents to PDF format
3. THE Export_Service SHALL support exporting documents to HTML format
4. THE Export_Service SHALL support exporting documents to plain Markdown format
5. THE Export_Service SHALL support exporting documents to LaTeX format
6. WHEN exporting to DOCX or PDF, THE Export_Service SHALL allow user to configure image quality from 0 to 100 percent
7. WHEN exporting to DOCX, THE Export_Service SHALL allow user to enable mirror margins
8. WHEN export completes, THE Export_Service SHALL record export in t_document_export table with document_id, user_id, format, file_size, and file_url

### Requirement 7: 批量导出功能

**User Story:** 作为用户，我希望能够一次导出多个文档，以便批量处理文档。

#### Acceptance Criteria

1. WHEN a user selects multiple documents for export, THE Export_Service SHALL validate selection count against membership limit
2. WHERE user is Premium_User, THE Export_Service SHALL allow maximum 20 documents in single batch export
3. WHERE user is Free_User, THE Export_Service SHALL allow maximum 3 documents in single batch export
4. IF selection exceeds limit, THEN THE Export_Service SHALL return error message with membership limit information
5. WHEN batch export starts, THE Export_Service SHALL generate unique batch_id for the operation
6. WHEN batch export completes, THE Export_Service SHALL package all exported files into ZIP archive
7. WHEN batch export completes, THE Export_Service SHALL record each export with same batch_id in t_document_export table

### Requirement 8: 文档搜索功能

**User Story:** 作为用户，我希望能够搜索我的文档，以便快速找到需要的内容。

#### Acceptance Criteria

1. WHEN a user enters search query, THE Document_Manager SHALL search in document title and content
2. THE Document_Manager SHALL support full-text search using database FULLTEXT index
3. WHEN searching, THE Document_Manager SHALL return only non-expired and non-deleted documents
4. WHEN searching, THE Document_Manager SHALL return results ordered by relevance score descending
5. THE Document_Manager SHALL support filtering search results by folder
6. THE Document_Manager SHALL support filtering search results by tags
7. WHEN search returns no results, THE Document_Manager SHALL return empty list with appropriate message

### Requirement 9: 文档标签系统

**User Story:** 作为用户，我希望能够为文档添加标签，以便更灵活地分类和查找文档。

#### Acceptance Criteria

1. WHEN a user adds tags to document, THE Document_Manager SHALL store tags as comma-separated string in tags column
2. THE Document_Manager SHALL allow maximum 10 tags per document
3. WHEN a user adds duplicate tag, THE Document_Manager SHALL ignore duplicate and maintain unique tags
4. WHEN a user removes tag, THE Document_Manager SHALL update tags string removing specified tag
5. WHEN querying documents by tag, THE Document_Manager SHALL return all documents containing specified tag
6. THE Document_Manager SHALL support querying documents with multiple tags using AND logic

### Requirement 10: 文档模板系统

**User Story:** 作为用户，我希望能够使用和创建文档模板，以便快速开始新文档。

#### Acceptance Criteria

1. WHEN a user marks document as template, THE Document_Manager SHALL set is_template flag to 1
2. WHEN querying templates, THE Document_Manager SHALL return only documents with is_template flag set to 1
3. WHEN a user creates document from template, THE Document_Manager SHALL copy template content to new document
4. WHEN a user creates document from template, THE Document_Manager SHALL not copy template metadata like view_count or export_count
5. THE Document_Manager SHALL provide system default templates for common document types
6. THE Document_Manager SHALL allow users to create custom templates from their documents

### Requirement 11: 文档统计信息

**User Story:** 作为用户，我希望能够查看文档的统计信息，以便了解文档的使用情况。

#### Acceptance Criteria

1. WHEN a user views document, THE Document_Manager SHALL increment view_count by 1
2. WHEN a user exports document, THE Document_Manager SHALL increment export_count by 1
3. THE Document_Manager SHALL display view_count and export_count in document list
4. THE Document_Manager SHALL calculate and display document word count
5. THE Document_Manager SHALL calculate and display document character count
6. THE Document_Manager SHALL calculate and display estimated reading time based on word count
7. THE Document_Manager SHALL display document creation time and last update time

### Requirement 12: 后端插件化架构集成

**User Story:** 作为开发者，我希望 MD2Word 后端使用插件化架构，以便快速开发和维护。

#### Acceptance Criteria

1. THE Backend_Plugin SHALL define UserDocument entity extending BaseEntity
2. THE Backend_Plugin SHALL define DocumentFolder entity extending BaseEntity
3. THE Backend_Plugin SHALL define DocumentVersion entity extending BaseEntity
4. THE Backend_Plugin SHALL define DocumentExport entity extending BaseEntity
5. THE Backend_Plugin SHALL implement DocumentService extending BaseService interface
6. THE Backend_Plugin SHALL implement DocumentController extending BaseController
7. THE Backend_Plugin SHALL register module in ToolModuleRegistry with module_id "md2word"
8. WHEN registering module, THE Backend_Plugin SHALL configure API prefix as "/api/v1/documents"
9. WHEN registering module, THE Backend_Plugin SHALL enable CRUD operations
10. WHEN registering module, THE Backend_Plugin SHALL enable soft delete functionality
11. WHEN registering module, THE Backend_Plugin SHALL enable versioning functionality
12. WHEN registering module, THE Backend_Plugin SHALL enable export functionality

### Requirement 13: 前端组件集成

**User Story:** 作为开发者，我希望 MD2Word 前端组件能够无缝集成到 Polaris Tools Platform，以便提供统一的用户体验。

#### Acceptance Criteria

1. THE MD2Word_System SHALL create dedicated page component at polaris-tools/pages/Md2Word.tsx
2. THE MD2Word_System SHALL create specialized components in polaris-tools/components/md2word/ directory
3. WHEN user clicks MD2Word tool card on dashboard, THE MD2Word_System SHALL navigate to full-screen MD2Word page
4. THE MD2Word_System SHALL use Polaris design system colors and styles
5. THE MD2Word_System SHALL use primary color #667eea instead of #3b82f6
6. THE MD2Word_System SHALL use dark background color #0f172a instead of #0d1218
7. THE MD2Word_System SHALL use surface color #1e293b instead of #161d26
8. THE MD2Word_System SHALL synchronize theme with Polaris platform theme settings
9. THE MD2Word_System SHALL provide "Return to Dashboard" button in header

### Requirement 14: 快捷键支持

**User Story:** 作为用户，我希望能够使用快捷键操作编辑器，以便提高编辑效率。

#### Acceptance Criteria

1. WHEN user presses Ctrl+B, THE Editor SHALL toggle bold formatting for selected text
2. WHEN user presses Ctrl+I, THE Editor SHALL toggle italic formatting for selected text
3. WHEN user presses Ctrl+K, THE Editor SHALL open link insertion dialog
4. WHEN user presses Ctrl+S, THE Editor SHALL save document immediately
5. WHEN user presses Ctrl+/, THE Editor SHALL display keyboard shortcuts help panel
6. WHEN user presses Ctrl+F, THE Editor SHALL open find and replace dialog
7. WHEN user presses Ctrl+Z, THE Editor SHALL undo last edit operation
8. WHEN user presses Ctrl+Y, THE Editor SHALL redo last undone operation

### Requirement 15: 响应式设计

**User Story:** 作为用户，我希望能够在不同设备上使用 MD2Word，以便随时随地编辑文档。

#### Acceptance Criteria

1. WHEN viewport width is greater than 1280px, THE MD2Word_System SHALL display three-column layout with file manager, editor, and style panel
2. WHEN viewport width is between 768px and 1280px, THE MD2Word_System SHALL display two-column layout with collapsible sidebars
3. WHEN viewport width is less than 768px, THE MD2Word_System SHALL display single-column layout with drawer-style sidebars
4. WHEN on mobile device, THE MD2Word_System SHALL display bottom toolbar for formatting actions
5. WHEN on mobile device, THE MD2Word_System SHALL support touch gestures for common operations
6. THE MD2Word_System SHALL maintain functionality across all viewport sizes

### Requirement 16: 错误处理和用户反馈

**User Story:** 作为用户，我希望系统能够清晰地提示错误和操作结果，以便我了解系统状态。

#### Acceptance Criteria

1. WHEN an operation fails, THE MD2Word_System SHALL display error message with clear description
2. WHEN a document save fails, THE MD2Word_System SHALL preserve unsaved content and allow retry
3. WHEN export fails, THE MD2Word_System SHALL display error message with failure reason
4. WHEN network connection is lost, THE MD2Word_System SHALL display offline indicator
5. WHEN network connection is restored, THE MD2Word_System SHALL automatically sync pending changes
6. WHEN operation succeeds, THE MD2Word_System SHALL display success notification
7. WHEN user quota is exceeded, THE MD2Word_System SHALL display clear message with upgrade option

### Requirement 17: 性能优化

**User Story:** 作为用户，我希望系统响应迅速，以便流畅地编辑和管理文档。

#### Acceptance Criteria

1. WHEN loading MD2Word page, THE MD2Word_System SHALL complete initial render within 2 seconds
2. WHEN user types in editor, THE MD2Word_System SHALL update preview within 100 milliseconds
3. WHEN loading document list, THE MD2Word_System SHALL use pagination with maximum 20 documents per page
4. WHEN rendering large documents, THE MD2Word_System SHALL use virtual scrolling to maintain performance
5. WHEN exporting document, THE MD2Word_System SHALL process export asynchronously without blocking UI
6. THE MD2Word_System SHALL cache frequently accessed data in browser local storage
7. THE MD2Word_System SHALL use debouncing for auto-save to reduce server requests

### Requirement 18: 数据库表结构

**User Story:** 作为开发者，我希望数据库表结构能够支持所有功能需求，以便正确存储和查询数据。

#### Acceptance Criteria

1. THE Backend_Plugin SHALL create t_user_document table with columns: id, user_id, title, content, format, folder_id, tags, is_template, view_count, export_count, expire_at, created_at, updated_at, deleted
2. THE Backend_Plugin SHALL create t_document_folder table with columns: id, user_id, name, parent_id, sort_order, created_at
3. THE Backend_Plugin SHALL create t_document_version table with columns: id, document_id, content, version_number, expire_at, created_at
4. THE Backend_Plugin SHALL create t_document_export table with columns: id, document_id, user_id, format, file_size, file_url, batch_id, created_at
5. THE Backend_Plugin SHALL create index on user_id column in all tables for query performance
6. THE Backend_Plugin SHALL create index on expire_at column for efficient expiration queries
7. THE Backend_Plugin SHALL create FULLTEXT index on title and content columns in t_user_document for search functionality
8. THE Backend_Plugin SHALL create foreign key constraints to maintain referential integrity

