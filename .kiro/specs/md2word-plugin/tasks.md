# 实施计划：MD2Word 插件

## 概述

本实施计划将 MD2Word 插件的设计转化为可执行的开发任务。系统采用插件化架构，后端使用 Spring Boot 3.2.5 + MyBatis-Plus 3.5.6，前端使用 React 19.2.3 + TypeScript 5.8.2。

**实施策略**：
1. **优先实现后端插件化组件** - 创建实体、服务、控制器
2. **实现核心文档管理功能** - CRUD、版本、文件夹
3. **实现导出功能** - 单个导出和批量导出
4. **实现前端组件** - 页面、编辑器、文件管理器
5. **集成和测试** - 前后端集成、属性测试
6. 每个任务完成后进行测试验证
7. 使用 checkpoint 任务确保阶段性验证

## 任务列表

- [x] 1. 创建数据库表结构
  - 创建 t_user_document 表（包含过期时间字段）
  - 创建 t_document_folder 表
  - 创建 t_document_version 表（包含过期时间字段）
  - 创建 t_document_export 表（包含批次ID字段）
  - 添加索引和外键约束
  - 添加 FULLTEXT 索引用于搜索
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8_

- [x] 2. 实现文档管理后端模块
  - [x] 2.1 创建实体类
    - UserDocument（继承 BaseEntity）
    - DocumentFolder（继承 BaseEntity）
    - DocumentVersion（继承 BaseEntity）
    - DocumentExport（继承 BaseEntity）
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [x] 2.2 创建 DTO 类
    - DocumentCreateRequest、DocumentUpdateRequest、DocumentQueryRequest
    - DocumentResponse（包含 wordCount、charCount、readingTime）
    - FolderCreateRequest、FolderUpdateRequest、FolderResponse
    - VersionResponse、ExportRequest、ExportResponse
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  
  - [x] 2.3 创建 Mapper 接口
    - DocumentMapper（继承 BaseMapper）
    - DocumentFolderMapper（继承 BaseMapper）
    - DocumentVersionMapper（继承 BaseMapper）
    - DocumentExportMapper（继承 BaseMapper）
    - _Requirements: 12.5_
  
  - [x] 2.4 创建 Converter 接口
    - DocumentConverter（使用 MapStruct）
    - FolderConverter（使用 MapStruct）
    - _Requirements: 12.5_
  
  - [x] 2.5 实现 DocumentService
    - createDocument()：创建文档，根据会员类型设置过期时间
    - updateDocument()：更新文档，创建版本快照
    - deleteDocument()：软删除文档
    - searchDocuments()：全文搜索，支持文件夹和标签过滤
    - markAsTemplate()：标记为模板
    - createFromTemplate()：从模板创建文档
    - incrementViewCount()：增加浏览次数
    - incrementExportCount()：增加导出次数
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 8.1, 8.3, 8.4, 8.5, 8.6, 10.1, 10.2, 10.3, 10.4, 11.1, 11.2, 11.4, 11.5, 11.6_
  
  - [ ]* 2.6 编写属性测试：基于会员的文档过期时间
    - **Property 1: 基于会员的文档过期时间**
    - **Validates: Requirements 2.2, 2.3, 2.4**
  
  - [ ]* 2.7 编写属性测试：列表中的非过期文档
    - **Property 2: 列表中的非过期文档**
    - **Validates: Requirements 2.5**
  
  - [ ]* 2.8 编写属性测试：软删除设置删除标记
    - **Property 3: 软删除设置删除标记**
    - **Validates: Requirements 2.7**
  
  - [ ]* 2.9 编写属性测试：查询排除已删除文档
    - **Property 4: 查询排除已删除文档**
    - **Validates: Requirements 2.8**

- [ ] 3. 实现文件夹管理模块
  - [ ] 3.1 实现 FolderService
    - createFolder()：创建文件夹
    - updateFolder()：更新文件夹
    - deleteFolder()：删除文件夹（检查是否包含文档）
    - getFolderHierarchy()：获取文件夹层级结构
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [ ]* 3.2 编写属性测试：文件夹层级完整性
    - **Property 10: 文件夹层级完整性**
    - **Validates: Requirements 4.2**
  
  - [ ]* 3.3 编写属性测试：非空文件夹删除防护
    - **Property 11: 非空文件夹删除防护**
    - **Validates: Requirements 4.4, 4.5**
  
  - [ ]* 3.4 编写属性测试：文件夹排序
    - **Property 12: 文件夹排序**
    - **Validates: Requirements 4.7**

- [ ] 4. 实现版本管理模块
  - [ ] 4.1 实现 VersionService
    - createVersion()：创建版本，根据会员类型设置过期时间
    - getVersionHistory()：获取版本历史（仅非过期版本）
    - restoreVersion()：恢复版本，创建新版本记录
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [ ]* 4.2 编写属性测试：文档保存时创建版本
    - **Property 6: 文档保存时创建版本**
    - **Validates: Requirements 3.1**
  
  - [ ]* 4.3 编写属性测试：基于会员的版本过期时间
    - **Property 7: 基于会员的版本过期时间**
    - **Validates: Requirements 3.2, 3.3, 3.4**
  
  - [ ]* 4.4 编写属性测试：历史中的非过期版本
    - **Property 8: 历史中的非过期版本**
    - **Validates: Requirements 3.5**
  
  - [ ]* 4.5 编写属性测试：版本恢复创建新版本
    - **Property 9: 版本恢复创建新版本**
    - **Validates: Requirements 3.6, 3.7**

- [ ] 5. Checkpoint - 验证文档和版本管理模块
  - 确保所有测试通过
  - 手动测试文档 CRUD 操作
  - 验证版本创建和恢复功能
  - 验证会员差异化逻辑


- [ ] 6. 实现导出功能模块
  - [ ] 6.1 实现 ExportService
    - exportDocument()：导出单个文档，支持多种格式
    - batchExport()：批量导出，验证会员限制
    - validateBatchExportLimit()：验证批量导出限制
    - 支持 DOCX、PDF、HTML、Markdown、LaTeX 格式
    - 支持图片质量和镜像边距配置
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  
  - [ ]* 6.2 编写属性测试：导出记录创建
    - **Property 13: 导出记录创建**
    - **Validates: Requirements 6.8**
  
  - [ ]* 6.3 编写属性测试：批量导出限制执行
    - **Property 14: 批量导出限制执行**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
  
  - [ ]* 6.4 编写属性测试：批量导出唯一 batch_id
    - **Property 15: 批量导出唯一 batch_id**
    - **Validates: Requirements 7.5, 7.7**

- [ ] 7. 实现搜索和标签功能
  - [ ] 7.1 在 DocumentService 中实现搜索逻辑
    - 使用 MyBatis-Plus FULLTEXT 搜索
    - 支持标题和内容搜索
    - 支持文件夹过滤
    - 支持标签过滤
    - 支持多标签 AND 逻辑
    - 按相关性排序
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ]* 7.2 编写属性测试：搜索标题和内容
    - **Property 16: 搜索标题和内容**
    - **Validates: Requirements 8.1**
  
  - [ ]* 7.3 编写属性测试：搜索排除无效文档
    - **Property 17: 搜索排除无效文档**
    - **Validates: Requirements 8.3**
  
  - [ ]* 7.4 编写属性测试：搜索文件夹过滤
    - **Property 18: 搜索文件夹过滤**
    - **Validates: Requirements 8.5**
  
  - [ ]* 7.5 编写属性测试：搜索标签过滤
    - **Property 19: 搜索标签过滤**
    - **Validates: Requirements 8.6**
  
  - [ ]* 7.6 编写属性测试：标签唯一性
    - **Property 20: 标签唯一性**
    - **Validates: Requirements 9.3**
  
  - [ ]* 7.7 编写属性测试：标签数量限制
    - **Property 21: 标签数量限制**
    - **Validates: Requirements 9.2**
  
  - [ ]* 7.8 编写属性测试：多标签查询 AND 逻辑
    - **Property 22: 多标签查询 AND 逻辑**
    - **Validates: Requirements 9.6**

- [ ] 8. 实现模板和统计功能
  - [ ] 8.1 在 DocumentService 中实现模板逻辑
    - markAsTemplate()：标记为模板
    - createFromTemplate()：从模板创建，复制内容但不复制元数据
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [ ] 8.2 在 DocumentService 中实现统计逻辑
    - incrementViewCount()：原子性增加浏览次数
    - incrementExportCount()：原子性增加导出次数
    - calculateWordCount()：计算字数
    - calculateCharCount()：计算字符数
    - calculateReadingTime()：计算阅读时间
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_
  
  - [ ]* 8.3 编写属性测试：模板标记过滤
    - **Property 23: 模板标记过滤**
    - **Validates: Requirements 10.2**
  
  - [ ]* 8.4 编写属性测试：模板内容复制不含元数据
    - **Property 24: 模板内容复制不含元数据**
    - **Validates: Requirements 10.3, 10.4**
  
  - [ ]* 8.5 编写属性测试：浏览次数增加
    - **Property 25: 浏览次数增加**
    - **Validates: Requirements 11.1**
  
  - [ ]* 8.6 编写属性测试：导出次数增加
    - **Property 26: 导出次数增加**
    - **Validates: Requirements 11.2**
  
  - [ ]* 8.7 编写属性测试：字数计算
    - **Property 27: 字数计算**
    - **Validates: Requirements 11.4**
  
  - [ ]* 8.8 编写属性测试：字符数计算
    - **Property 28: 字符数计算**
    - **Validates: Requirements 11.5**
  
  - [ ]* 8.9 编写属性测试：阅读时间计算
    - **Property 29: 阅读时间计算**
    - **Validates: Requirements 11.6**

- [ ] 9. 实现后端控制器
  - [ ] 9.1 实现 DocumentController
    - 继承 BaseController
    - 实现所有 REST API 端点
    - 添加 Swagger 注解
    - _Requirements: 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12_
  
  - [ ] 9.2 实现 FolderController
    - 继承 BaseController
    - 实现文件夹管理端点
    - _Requirements: 12.6_
  
  - [ ] 9.3 实现 VersionController
    - 实现版本历史和恢复端点
    - _Requirements: 12.6_
  
  - [ ] 9.4 实现 ExportController
    - 实现导出端点
    - _Requirements: 12.6_

- [ ] 10. 注册后端模块
  - [ ] 10.1 在 ToolModuleRegistry 中注册 MD2Word 模块
    - 设置 module_id 为 "md2word"
    - 设置 API 前缀为 "/api/v1/documents"
    - 配置所有实体、DTO、服务、控制器类
    - 启用 CRUD、软删除、版本控制、导出功能
    - _Requirements: 12.7, 12.8, 12.9, 12.10, 12.11, 12.12_

- [ ] 11. Checkpoint - 验证后端完整性
  - 确保所有测试通过
  - 使用 Swagger UI 测试所有 API 端点
  - 验证会员差异化逻辑
  - 验证批量导出限制

- [ ] 12. 实现前端工具注册
  - [ ] 12.1 在 TOOL_REGISTRY 中注册 MD2Word 工具
    - 设置 id 为 "md2word"
    - 设置 path 为 "md2word"
    - 设置中英文标题和描述
    - 设置图标和颜色
    - _Requirements: 13.1, 13.2_

- [ ] 13. 实现前端 API 客户端
  - [ ] 13.1 创建 md2word.ts API 客户端
    - 实现文档 API 方法
    - 实现文件夹 API 方法
    - 实现版本 API 方法
    - 实现导出 API 方法
    - _Requirements: 13.1, 13.2_
  
  - [ ] 13.2 创建类型定义
    - Document、Folder、Version、Export 类型
    - Request 和 Response 类型
    - _Requirements: 13.1, 13.2_

- [ ] 14. 实现前端自定义 Hooks
  - [ ] 14.1 创建 useDocument Hook
    - 管理文档列表和当前文档状态
    - 实现 CRUD 操作
    - 实现搜索功能
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  
  - [ ] 14.2 创建 useFolder Hook
    - 管理文件夹列表和层级结构
    - 实现文件夹 CRUD 操作
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [ ] 14.3 创建 useVersion Hook
    - 管理版本历史
    - 实现版本恢复
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [ ] 14.4 创建 useExport Hook
    - 管理导出状态和历史
    - 实现单个和批量导出
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 15. 实现前端核心组件
  - [ ] 15.1 创建 Md2Word 页面组件
    - 使用 ToolLayout 包裹
    - 集成 FileManager、Editor、StylePanel
    - 应用 Polaris 设计系统颜色
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9_
  
  - [ ] 15.2 创建 FileManager 组件
    - 文档列表显示
    - 文件夹树形导航
    - 搜索功能
    - 创建/删除/移动操作
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [ ] 15.3 创建 Editor 组件
    - Markdown 输入区域
    - 实时预览
    - 视图模式切换（分屏/源码/预览）
    - 格式化工具栏
    - 自动保存（每30秒）
    - 字数/字符数显示
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 11.4, 11.5, 11.6_
  
  - [ ] 15.4 创建 Toolbar 组件
    - 格式化按钮（粗体、斜体、标题等）
    - 插入按钮（链接、图片、代码、公式）
    - 撤销/重做按钮
    - 保存按钮
    - _Requirements: 5.4, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_
  
  - [ ] 15.5 创建 StylePanel 组件
    - 导出格式选择器
    - 导出选项配置
    - 导出按钮
    - 导出历史显示
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  
  - [ ] 15.6 创建 ExportPanel 组件
    - 格式选择界面
    - 质量设置
    - 批量导出界面
    - 导出进度指示器
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 16. 实现快捷键支持
  - [ ] 16.1 在 Editor 组件中添加快捷键处理
    - Ctrl+B：粗体
    - Ctrl+I：斜体
    - Ctrl+K：插入链接
    - Ctrl+S：保存
    - Ctrl+/：快捷键帮助
    - Ctrl+F：查找替换
    - Ctrl+Z：撤销
    - Ctrl+Y：重做
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_

- [ ] 17. 实现响应式设计
  - [ ] 17.1 添加响应式布局
    - 桌面端（>1280px）：三栏布局
    - 平板端（768px-1280px）：可折叠侧边栏
    - 移动端（<768px）：单栏布局，抽屉式侧边栏
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [ ] 18. 在 App.tsx 中注册路由
  - [ ] 18.1 导入 Md2Word 组件
  - [ ] 18.2 在 renderTool() 中添加路由分支
    - case 'md2word': return <Md2Word />
    - _Requirements: 13.1, 13.2_

- [ ] 19. Checkpoint - 验证前端完整性
  - 确保所有组件正常渲染
  - 测试文档创建、编辑、删除流程
  - 测试文件夹管理
  - 测试导出功能
  - 测试响应式布局

- [ ] 20. 实现错误处理和用户反馈
  - [ ] 20.1 在前端添加错误处理
    - 显示用户友好的错误消息
    - 提供重试选项
    - 显示会员升级提示
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

- [ ] 21. 性能优化
  - [ ] 21.1 实现前端性能优化
    - 虚拟滚动用于大文档列表
    - 防抖用于自动保存
    - 懒加载用于组件
    - 本地存储缓存
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

- [ ]* 22. 编写集成测试
  - [ ]* 22.1 编写文档管理集成测试
    - 测试完整的文档 CRUD 流程
    - 测试版本创建和恢复
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [ ]* 22.2 编写导出功能集成测试
    - 测试单个导出
    - 测试批量导出
    - 测试会员限制
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 23. Final Checkpoint - 完整系统测试
  - 确保所有测试通过
  - 手动测试所有功能
  - 验证会员差异化功能
  - 验证性能和响应式设计
  - 准备部署
s
## 注意事项

- 标记 `*` 的任务为可选任务，可以根据时间和优先级决定是否实现
- 每个 Checkpoint 任务确保阶段性验证，发现问题及时修复
- 属性测试使用 jqwik 框架，每个测试至少运行 100 次迭代
- 集成测试使用 Testcontainers 提供隔离的测试环境
- 前端测试使用 Vitest 和 React Testing Library
- 所有任务都引用了对应的需求编号，确保可追溯性
- 代码注释和文档使用中文

