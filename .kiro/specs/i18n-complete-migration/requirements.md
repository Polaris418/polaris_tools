# Requirements Document

## Introduction

本文档定义了 Polaris Tools 项目完整 i18n 国际化迁移的需求。目标是将所有前端组件从内联三元运算符（`language === 'zh' ? '中文' : 'English'`）迁移到统一的 i18n 系统，实现可维护、可扩展的国际化解决方案。

## Glossary

- **i18n System**: 国际化系统，提供类型安全的翻译函数和参数替换功能
- **Translation Key**: 翻译键，用于标识特定翻译文本的唯一标识符
- **Component**: React 组件，需要进行 i18n 迁移的前端组件
- **Legacy Code**: 遗留代码，使用内联三元运算符的旧式国际化代码
- **Migration**: 迁移，将遗留代码转换为使用 i18n 系统的过程

## Requirements

### Requirement 1: 管理后台模态框组件迁移

**User Story:** 作为开发者，我希望管理后台的所有模态框组件使用 i18n 系统，以便统一管理翻译文本。

#### Acceptance Criteria

1. WHEN ToolFormModal 组件渲染时，THE System SHALL 使用 i18n 翻译键显示所有文本
2. WHEN CategoryFormModal 组件渲染时，THE System SHALL 使用 i18n 翻译键显示所有文本
3. WHEN UserFormModal 组件渲染时，THE System SHALL 使用 i18n 翻译键显示所有文本
4. WHEN 表单验证失败时，THE System SHALL 使用 i18n 翻译键显示错误消息
5. WHEN 表单提交成功时，THE System SHALL 使用 i18n 翻译键显示成功消息

### Requirement 2: 管理后台其他页面迁移

**User Story:** 作为开发者，我希望管理后台的仪表盘和统计页面使用 i18n 系统，以便提供一致的用户体验。

#### Acceptance Criteria

1. WHEN AdminDashboard 页面渲染时，THE System SHALL 使用 i18n 翻译键显示所有统计卡片标题和标签
2. WHEN AdminStatistics 页面渲染时，THE System SHALL 使用 i18n 翻译键显示所有图表标题和说明
3. WHEN 数据加载失败时，THE System SHALL 使用 i18n 翻译键显示错误消息
4. WHEN 用户切换语言时，THE System SHALL 立即更新所有显示的文本

### Requirement 3: 用户面板核心页面迁移

**User Story:** 作为用户，我希望登录、注册和仪表盘页面支持多语言，以便使用我熟悉的语言。

#### Acceptance Criteria

1. WHEN Login 页面渲染时，THE System SHALL 使用 i18n 翻译键显示所有表单标签和按钮
2. WHEN Register 页面渲染时，THE System SHALL 使用 i18n 翻译键显示所有表单标签和按钮
3. WHEN Dashboard 页面渲染时，THE System SHALL 使用 i18n 翻译键显示所有分类和工具名称
4. WHEN Settings 页面渲染时，THE System SHALL 使用 i18n 翻译键显示所有设置项标签
5. WHEN 管理员选择对话框显示时，THE System SHALL 使用 i18n 翻译键显示选项文本

### Requirement 4: 通用组件迁移

**User Story:** 作为开发者，我希望所有通用组件使用 i18n 系统，以便在整个应用中保持一致性。

#### Acceptance Criteria

1. WHEN Sidebar 组件渲染时，THE System SHALL 使用 i18n 翻译键显示所有导航菜单项
2. WHEN Header 组件渲染时，THE System SHALL 使用 i18n 翻译键显示所有按钮和下拉菜单
3. WHEN ToolLayout 组件渲染时，THE System SHALL 使用 i18n 翻译键显示面包屑导航
4. WHEN StandardToolCard 组件渲染时，THE System SHALL 正确显示工具的本地化名称和描述
5. WHEN 组件需要显示工具提示时，THE System SHALL 使用 i18n 翻译键

### Requirement 5: 工具页面组件迁移

**User Story:** 作为用户，我希望所有工具页面支持多语言，以便更好地理解和使用工具。

#### Acceptance Criteria

1. WHEN WordCounter 工具渲染时，THE System SHALL 使用 i18n 翻译键显示所有界面文本
2. WHEN 其他工具页面渲染时，THE System SHALL 使用 i18n 翻译键显示所有界面文本
3. WHEN 工具显示帮助信息时，THE System SHALL 使用 i18n 翻译键
4. WHEN 工具显示错误消息时，THE System SHALL 使用 i18n 翻译键
5. WHEN 工具显示成功消息时，THE System SHALL 使用 i18n 翻译键

### Requirement 6: 翻译键完整性验证

**User Story:** 作为开发者，我希望确保所有翻译键都已定义，以便避免运行时错误。

#### Acceptance Criteria

1. WHEN 组件使用翻译键时，THE System SHALL 在编译时验证键是否存在
2. WHEN 添加新翻译键时，THE System SHALL 同时在中文和英文翻译文件中定义
3. WHEN 翻译键缺失时，THE System SHALL 在开发环境中显示警告
4. WHEN 翻译键使用参数时，THE System SHALL 验证参数名称的正确性
5. WHEN 运行测试时，THE System SHALL 验证所有翻译键的完整性

### Requirement 7: 条件渲染支持

**User Story:** 作为开发者，我希望保留 language 属性用于条件渲染，以便正确显示本地化的数据库内容。

#### Acceptance Criteria

1. WHEN 显示工具名称时，THE System SHALL 根据 language 属性选择 nameZh 或 name
2. WHEN 显示分类名称时，THE System SHALL 根据 language 属性选择 nameZh 或 name
3. WHEN 显示工具描述时，THE System SHALL 根据 language 属性选择 descriptionZh 或 description
4. WHEN 显示用户套餐名称时，THE System SHALL 根据 language 属性选择本地化名称
5. WHEN 数据库内容没有本地化版本时，THE System SHALL 回退到默认语言版本

### Requirement 8: 参数替换功能

**User Story:** 作为开发者，我希望翻译支持参数替换，以便动态显示数据。

#### Acceptance Criteria

1. WHEN 翻译文本包含参数占位符时，THE System SHALL 正确替换参数值
2. WHEN 参数为数字时，THE System SHALL 正确格式化数字
3. WHEN 参数为字符串时，THE System SHALL 正确转义特殊字符
4. WHEN 参数缺失时，THE System SHALL 保留占位符或显示默认值
5. WHEN 使用多个参数时，THE System SHALL 按顺序替换所有参数

### Requirement 9: 向后兼容性

**User Story:** 作为开发者，我希望迁移过程不影响未迁移的组件，以便逐步完成迁移。

#### Acceptance Criteria

1. WHEN 未迁移的组件使用 tLegacy 函数时，THE System SHALL 正常工作
2. WHEN 已迁移的组件使用 t 函数时，THE System SHALL 正常工作
3. WHEN 混合使用 t 和 tLegacy 时，THE System SHALL 不产生冲突
4. WHEN 语言切换时，THE System SHALL 同时更新使用 t 和 tLegacy 的组件
5. WHEN 所有组件迁移完成后，THE System SHALL 允许移除 tLegacy 函数

### Requirement 10: 性能优化

**User Story:** 作为用户，我希望语言切换快速响应，以便获得流畅的用户体验。

#### Acceptance Criteria

1. WHEN 用户切换语言时，THE System SHALL 在 100ms 内完成界面更新
2. WHEN 组件首次渲染时，THE System SHALL 不产生额外的性能开销
3. WHEN 翻译函数被调用时，THE System SHALL 使用缓存避免重复计算
4. WHEN 应用启动时，THE System SHALL 预加载所有翻译文件
5. WHEN 翻译文件较大时，THE System SHALL 支持按需加载

### Requirement 11: 测试覆盖

**User Story:** 作为开发者，我希望所有迁移的组件都有测试覆盖，以便确保功能正确性。

#### Acceptance Criteria

1. WHEN 组件迁移完成时，THE System SHALL 包含单元测试验证翻译键的使用
2. WHEN 翻译函数被调用时，THE System SHALL 有测试验证参数替换的正确性
3. WHEN 语言切换时，THE System SHALL 有集成测试验证界面更新
4. WHEN 翻译键缺失时，THE System SHALL 有测试验证错误处理
5. WHEN 运行测试套件时，THE System SHALL 达到 80% 以上的代码覆盖率

### Requirement 12: 文档完整性

**User Story:** 作为开发者，我希望有完整的文档指导 i18n 系统的使用，以便快速上手。

#### Acceptance Criteria

1. WHEN 开发者查阅文档时，THE System SHALL 提供完整的 API 参考
2. WHEN 开发者需要添加新翻译时，THE System SHALL 提供清晰的步骤说明
3. WHEN 开发者需要迁移组件时，THE System SHALL 提供迁移模式和示例
4. WHEN 开发者遇到问题时，THE System SHALL 提供故障排除指南
5. WHEN 文档更新时，THE System SHALL 保持与代码实现的同步
