# 设计文档：MD2Word 插件

## 概述

MD2Word 是一个专业的 Markdown 到 Word 文档转换工具，作为独立工具页面集成到 Polaris Tools Platform 中。系统提供实时 Markdown 编辑、云端同步、版本历史和多格式导出功能。它利用平台的前后端插件化架构，确保快速开发和可维护性。

### 核心功能

- **Markdown 编辑器**：实时预览，带格式化工具栏、语法高亮和 LaTeX 公式支持
- **文档管理**：CRUD 操作，支持云端同步和基于会员类型的过期时间
- **版本历史**：自动版本快照，基于会员类型的保留期限
- **文件夹组织**：层级文件夹结构用于文档组织
- **多格式导出**：支持 DOCX、PDF、HTML、Markdown 和 LaTeX 格式
- **批量导出**：基于会员的限制（会员：20个文档，免费：3个文档）
- **搜索和过滤**：全文搜索，支持文件夹和标签过滤
- **模板系统**：系统模板和用户自定义模板
- **会员差异化**：会员用户获得30天保留期，免费用户获得3天保留期

### 技术栈

**后端**：
- Spring Boot 3.2.5
- MyBatis-Plus 3.5.6
- MapStruct 用于对象映射
- 插件化架构（BaseEntity、BaseService、BaseController）

**前端**：
- React 19.2.3
- TypeScript 5.8.2
- Tailwind CSS
- ToolLayout 组件提供统一 UI

**数据库**：
- MySQL 8.0+
- FULLTEXT 索引用于搜索
- 软删除模式



## 架构设计

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Polaris Tools Platform                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │   仪表板      │────────▶│  MD2Word     │                 │
│  │   (工具卡片)  │         │  全屏页面     │                 │
│  └──────────────┘         └──────┬───────┘                 │
│                                   │                          │
│  ┌────────────────────────────────┴──────────────────────┐ │
│  │           MD2Word 前端组件                             │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  文件管理器 │ 编辑器 │ 工具栏 │ 样式面板 │ 导出面板  │ │
│  └────────────────────────────────┬──────────────────────┘ │
│                                    │                         │
│                                    │ API 调用                │
│                                    ▼                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           后端插件化架构                             │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  DocumentController (继承 BaseController)           │   │
│  │         │                                            │   │
│  │         ▼                                            │   │
│  │  DocumentService (继承 BaseService)                 │   │
│  │         │                                            │   │
│  │         ▼                                            │   │
│  │  DocumentMapper (继承 BaseMapper)                   │   │
│  │         │                                            │   │
│  │         ▼                                            │   │
│  │  数据库 (MySQL)                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 插件化架构集成

**后端插件组件**：
1. **实体类**：UserDocument、DocumentFolder、DocumentVersion、DocumentExport（均继承 BaseEntity）
2. **服务层**：DocumentService、FolderService、VersionService、ExportService（均继承 BaseService）
3. **控制器**：DocumentController、FolderController、ExportController（均继承 BaseController）
4. **转换器**：DocumentConverter、FolderConverter（使用 MapStruct）
5. **模块注册**：在 ToolModuleRegistry 中注册，module_id 为 "md2word"

**前端插件组件**：
1. **页面组件**：Md2Word.tsx（全屏页面）
2. **专用组件**：FileManager、Editor、Toolbar、StylePanel、ExportPanel
3. **Hooks**：useDocument、useFolder、useVersion、useExport
4. **API 客户端**：md2word.ts（API 集成）
5. **工具注册**：在 TOOL_REGISTRY 中注册，path 为 "md2word"



## 组件和接口

### 后端组件

#### 1. 实体类

**UserDocument 实体**：
```java
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_user_document")
public class UserDocument extends BaseEntity {
    private Long userId;           // 用户ID
    private String title;          // 文档标题
    @TableField(typeHandler = ClobTypeHandler.class)
    private String content;        // 文档内容
    private String format;         // 格式："markdown"
    private Long folderId;         // 文件夹ID
    private String tags;           // 标签（逗号分隔）
    private Integer isTemplate;    // 是否为模板：0-否，1-是
    private Long viewCount;        // 浏览次数
    private Long exportCount;      // 导出次数
    private LocalDateTime expireAt;  // 过期时间
    private LocalDateTime createdAt; // 创建时间
    private LocalDateTime updatedAt; // 更新时间
    @TableLogic
    private Integer deleted;       // 删除标记：0-正常，1-已删除
}
```

**DocumentFolder 实体**：
```java
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_document_folder")
public class DocumentFolder extends BaseEntity {
    private Long userId;           // 用户ID
    private String name;           // 文件夹名称
    private Long parentId;         // 父文件夹ID
    private Integer sortOrder;     // 排序顺序
    private LocalDateTime createdAt; // 创建时间
}
```

**DocumentVersion 实体**：
```java
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_document_version")
public class DocumentVersion extends BaseEntity {
    private Long documentId;       // 文档ID
    @TableField(typeHandler = ClobTypeHandler.class)
    private String content;        // 版本内容
    private Integer versionNumber; // 版本号
    private LocalDateTime expireAt;  // 过期时间
    private LocalDateTime createdAt; // 创建时间
}
```

**DocumentExport 实体**：
```java
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_document_export")
public class DocumentExport extends BaseEntity {
    private Long documentId;       // 文档ID
    private Long userId;           // 用户ID
    private String format;         // 导出格式："docx"、"pdf"、"html"、"markdown"、"latex"
    private Long fileSize;         // 文件大小（字节）
    private String fileUrl;        // 文件URL
    private String batchId;        // 批量导出ID
    private LocalDateTime createdAt; // 创建时间
}
```

#### 2. DTO 类

**请求 DTO**：
- `DocumentCreateRequest`：title（标题）、content（内容）、folderId（文件夹ID）、tags（标签）
- `DocumentUpdateRequest`：title（标题）、content（内容）、folderId（文件夹ID）、tags（标签）
- `DocumentQueryRequest`：folderId（文件夹ID）、tags（标签）、keyword（关键词）、page（页码）、size（每页数量）
- `FolderCreateRequest`：name（名称）、parentId（父文件夹ID）
- `FolderUpdateRequest`：name（名称）、sortOrder（排序顺序）
- `ExportRequest`：documentIds[]（文档ID数组）、format（格式）、imageQuality（图片质量）、mirrorMargins（镜像边距）

**响应 DTO**：
- `DocumentResponse`：id、title、content、folderId、tags、isTemplate、viewCount、exportCount、wordCount（字数）、charCount（字符数）、readingTime（阅读时间）、createdAt、updatedAt
- `FolderResponse`：id、name、parentId、sortOrder、documentCount（文档数量）、createdAt
- `VersionResponse`：id、documentId、versionNumber、createdAt
- `ExportResponse`：id、documentId、format、fileSize、fileUrl、createdAt

#### 3. 服务接口

**DocumentService**：
```java
public interface DocumentService extends BaseService<UserDocument, DocumentResponse, 
                                                      DocumentCreateRequest, DocumentUpdateRequest, 
                                                      DocumentQueryRequest> {
    DocumentResponse createDocument(DocumentCreateRequest request);  // 创建文档
    DocumentResponse updateDocument(Long id, DocumentUpdateRequest request);  // 更新文档
    void deleteDocument(Long id);  // 删除文档
    List<DocumentResponse> searchDocuments(String keyword, Long folderId, String tags);  // 搜索文档
    DocumentResponse markAsTemplate(Long id);  // 标记为模板
    DocumentResponse createFromTemplate(Long templateId);  // 从模板创建
    void incrementViewCount(Long id);  // 增加浏览次数
    void incrementExportCount(Long id);  // 增加导出次数
}
```

**FolderService**：
```java
public interface FolderService extends BaseService<DocumentFolder, FolderResponse, 
                                                    FolderCreateRequest, FolderUpdateRequest, 
                                                    FolderQueryRequest> {
    FolderResponse createFolder(FolderCreateRequest request);  // 创建文件夹
    FolderResponse updateFolder(Long id, FolderUpdateRequest request);  // 更新文件夹
    void deleteFolder(Long id);  // 删除文件夹
    List<FolderResponse> getFolderHierarchy();  // 获取文件夹层级结构
}
```

**VersionService**：
```java
public interface VersionService {
    VersionResponse createVersion(Long documentId, String content);  // 创建版本
    List<VersionResponse> getVersionHistory(Long documentId);  // 获取版本历史
    DocumentResponse restoreVersion(Long documentId, Long versionId);  // 恢复版本
}
```

**ExportService**：
```java
public interface ExportService {
    ExportResponse exportDocument(Long documentId, String format, Integer imageQuality, Boolean mirrorMargins);  // 导出文档
    ExportResponse batchExport(List<Long> documentIds, String format);  // 批量导出
    void validateBatchExportLimit(int count, String membershipType);  // 验证批量导出限制
}
```



#### 4. 控制器端点

**DocumentController** (`/api/v1/documents`)：
- `GET /` - 获取文档列表（支持分页、搜索、过滤）
- `GET /{id}` - 获取文档详情
- `POST /` - 创建文档
- `PUT /{id}` - 更新文档
- `DELETE /{id}` - 删除文档（软删除）
- `DELETE /batch` - 批量删除文档
- `GET /search` - 搜索文档
- `POST /{id}/view` - 增加浏览次数
- `POST /{id}/template` - 标记为模板
- `POST /from-template/{templateId}` - 从模板创建文档

**FolderController** (`/api/v1/folders`)：
- `GET /` - 获取文件夹列表
- `GET /{id}` - 获取文件夹详情
- `POST /` - 创建文件夹
- `PUT /{id}` - 更新文件夹
- `DELETE /{id}` - 删除文件夹
- `GET /hierarchy` - 获取文件夹层级结构

**VersionController** (`/api/v1/versions`)：
- `GET /document/{documentId}` - 获取版本历史
- `POST /document/{documentId}/restore/{versionId}` - 恢复版本

**ExportController** (`/api/v1/exports`)：
- `POST /document/{documentId}` - 导出单个文档
- `POST /batch` - 批量导出文档
- `GET /history` - 获取导出历史

### 前端组件

#### 1. 页面组件

**Md2Word.tsx**：
```typescript
export const Md2Word: React.FC = () => {
  return (
    <ToolLayout toolId="md2word">
      <div className="flex h-full">
        <FileManager />  {/* 文件管理器 */}
        <Editor />       {/* 编辑器 */}
        <StylePanel />   {/* 样式面板 */}
      </div>
    </ToolLayout>
  );
};
```

#### 2. 核心组件

**FileManager**（左侧边栏）：
- 带搜索的文档列表
- 文件夹树形导航
- 最近文档
- 模板区域
- 创建/删除/移动操作

**Editor**（中间区域）：
- Markdown 输入区域
- 实时预览
- 视图模式切换器（分屏/源码/预览）
- 格式化工具栏
- 自动保存指示器
- 字数/字符数显示

**Toolbar**（工具栏）：
- 粗体、斜体、标题按钮
- 链接、图片、代码、公式按钮
- 撤销/重做按钮
- 保存按钮

**StylePanel**（右侧边栏）：
- 导出格式选择器
- 导出选项（图片质量、镜像边距）
- 导出按钮
- 导出历史

**ExportPanel**（导出面板）：
- 格式选择（DOCX、PDF、HTML、Markdown、LaTeX）
- 质量设置
- 批量导出界面
- 导出进度指示器

#### 3. 自定义 Hooks

**useDocument**：
```typescript
export const useDocument = () => {
  const [documents, setDocuments] = useState<Document[]>([]);  // 文档列表
  const [activeDocument, setActiveDocument] = useState<Document | null>(null);  // 当前文档
  const [loading, setLoading] = useState(false);  // 加载状态
  
  const loadDocuments = async () => { /* 加载文档列表 */ };
  const createDocument = async (data: DocumentCreateRequest) => { /* 创建文档 */ };
  const updateDocument = async (id: number, data: DocumentUpdateRequest) => { /* 更新文档 */ };
  const deleteDocument = async (id: number) => { /* 删除文档 */ };
  const searchDocuments = async (keyword: string) => { /* 搜索文档 */ };
  
  return { documents, activeDocument, loading, loadDocuments, createDocument, updateDocument, deleteDocument, searchDocuments };
};
```

**useFolder**：
```typescript
export const useFolder = () => {
  const [folders, setFolders] = useState<Folder[]>([]);  // 文件夹列表
  const [folderHierarchy, setFolderHierarchy] = useState<FolderNode[]>([]);  // 文件夹层级
  
  const loadFolders = async () => { /* 加载文件夹列表 */ };
  const createFolder = async (data: FolderCreateRequest) => { /* 创建文件夹 */ };
  const deleteFolder = async (id: number) => { /* 删除文件夹 */ };
  const getFolderHierarchy = async () => { /* 获取文件夹层级 */ };
  
  return { folders, folderHierarchy, loadFolders, createFolder, deleteFolder, getFolderHierarchy };
};
```

**useVersion**：
```typescript
export const useVersion = () => {
  const [versions, setVersions] = useState<Version[]>([]);  // 版本列表
  
  const loadVersions = async (documentId: number) => { /* 加载版本历史 */ };
  const restoreVersion = async (documentId: number, versionId: number) => { /* 恢复版本 */ };
  
  return { versions, loadVersions, restoreVersion };
};
```

**useExport**：
```typescript
export const useExport = () => {
  const [exporting, setExporting] = useState(false);  // 导出状态
  const [exportHistory, setExportHistory] = useState<Export[]>([]);  // 导出历史
  
  const exportDocument = async (documentId: number, format: string, options: ExportOptions) => { /* 导出文档 */ };
  const batchExport = async (documentIds: number[], format: string) => { /* 批量导出 */ };
  const loadExportHistory = async () => { /* 加载导出历史 */ };
  
  return { exporting, exportHistory, exportDocument, batchExport, loadExportHistory };
};
```



## 数据模型

### 数据库表结构

#### t_user_document（用户文档表）
```sql
CREATE TABLE t_user_document (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    title VARCHAR(200) NOT NULL COMMENT '文档标题',
    content LONGTEXT COMMENT '文档内容',
    format VARCHAR(20) DEFAULT 'markdown' COMMENT '文档格式',
    folder_id BIGINT COMMENT '文件夹ID',
    tags VARCHAR(500) COMMENT '标签（逗号分隔）',
    is_template TINYINT DEFAULT 0 COMMENT '是否为模板：0-否，1-是',
    view_count BIGINT DEFAULT 0 COMMENT '浏览次数',
    export_count BIGINT DEFAULT 0 COMMENT '导出次数',
    expire_at DATETIME COMMENT '过期时间：会员30天，免费3天',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '删除标记：0-正常，1-已删除',
    INDEX idx_user_id (user_id),
    INDEX idx_folder_id (folder_id),
    INDEX idx_expire_at (expire_at),
    INDEX idx_created_at (created_at DESC),
    FULLTEXT INDEX ft_title_content (title, content),
    FOREIGN KEY (user_id) REFERENCES t_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户文档表，支持基于会员的保留期限';
```

#### t_document_folder（文档文件夹表）
```sql
CREATE TABLE t_document_folder (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    name VARCHAR(100) NOT NULL COMMENT '文件夹名称',
    parent_id BIGINT COMMENT '父文件夹ID',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_user_id (user_id),
    INDEX idx_parent_id (parent_id),
    FOREIGN KEY (user_id) REFERENCES t_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文档文件夹表';
```

#### t_document_version（文档版本表）
```sql
CREATE TABLE t_document_version (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    document_id BIGINT NOT NULL COMMENT '文档ID',
    content LONGTEXT COMMENT '版本内容',
    version_number INT NOT NULL COMMENT '版本号',
    expire_at DATETIME COMMENT '过期时间：会员30天，免费3天',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_document_id (document_id),
    INDEX idx_expire_at (expire_at),
    FOREIGN KEY (document_id) REFERENCES t_user_document(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文档版本历史表，支持基于会员的保留期限';
```

#### t_document_export（文档导出记录表）
```sql
CREATE TABLE t_document_export (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
    document_id BIGINT NOT NULL COMMENT '文档ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    format VARCHAR(20) NOT NULL COMMENT '导出格式',
    file_size BIGINT COMMENT '文件大小（字节）',
    file_url VARCHAR(500) COMMENT '文件URL',
    batch_id VARCHAR(50) COMMENT '批量导出ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_document_id (document_id),
    INDEX idx_user_id (user_id),
    INDEX idx_batch_id (batch_id),
    FOREIGN KEY (document_id) REFERENCES t_user_document(id),
    FOREIGN KEY (user_id) REFERENCES t_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='导出记录表，支持批量追踪';
```

### 数据流程

#### 文档创建流程
```
用户输入 → DocumentCreateRequest → DocumentService.createDocument()
    ↓
检查用户会员类型（会员/免费）
    ↓
设置过期时间（会员30天，免费3天）
    ↓
保存到 t_user_document
    ↓
在 t_document_version 创建初始版本
    ↓
返回 DocumentResponse
```

#### 文档更新流程
```
用户编辑 → DocumentUpdateRequest → DocumentService.updateDocument()
    ↓
更新文档内容和 updated_at
    ↓
在 t_document_version 创建新版本快照
    ↓
根据会员类型设置版本过期时间
    ↓
返回 DocumentResponse
```

#### 导出流程
```
用户导出请求 → ExportRequest → ExportService.exportDocument()
    ↓
验证格式和选项
    ↓
将 Markdown 转换为目标格式（DOCX/PDF/HTML/LaTeX）
    ↓
上传文件到存储
    ↓
在 t_document_export 记录导出
    ↓
增加文档 export_count
    ↓
返回 ExportResponse 和文件 URL
```

#### 批量导出流程
```
用户批量导出 → ExportRequest（多个ID） → ExportService.batchExport()
    ↓
验证数量是否超过会员限制（会员：20，免费：3）
    ↓
生成唯一 batch_id
    ↓
对每个文档：
    - 转换为目标格式
    - 记录导出并关联 batch_id
    ↓
将所有文件打包为 ZIP 压缩包
    ↓
返回 ExportResponse 和 ZIP URL
```

### 会员差异化逻辑

**文档保留期限**：
```java
private LocalDateTime calculateExpireAt(String membershipType) {
    if ("premium".equals(membershipType)) {
        return LocalDateTime.now().plusDays(30);  // 会员用户：30天
    } else {
        return LocalDateTime.now().plusDays(3);   // 免费用户：3天
    }
}
```

**批量导出限制**：
```java
private void validateBatchExportLimit(int count, String membershipType) {
    int maxCount = "premium".equals(membershipType) ? 20 : 3;  // 会员：20个，免费：3个
    if (count > maxCount) {
        throw new BusinessException(ErrorCode.BATCH_EXPORT_LIMIT_EXCEEDED, 
            "最多允许导出 " + maxCount + " 个文档（" + membershipType + " 用户）");
    }
}
```

**版本保留期限**：
```java
private LocalDateTime calculateVersionExpireAt(String membershipType) {
    if ("premium".equals(membershipType)) {
        return LocalDateTime.now().plusDays(30);  // 会员用户：30天
    } else {
        return LocalDateTime.now().plusDays(3);   // 免费用户：3天
    }
}
```



## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Document Management Properties

**Property 1: Document expiration based on membership**
*For any* user creating a document, if the user is a Premium_User, the document expire_at SHALL be set to 30 days from creation, and if the user is a Free_User, the document expire_at SHALL be set to 3 days from creation
**Validates: Requirements 2.2, 2.3, 2.4**

**Property 2: Non-expired documents in list**
*For any* user requesting document list, all returned documents SHALL have expire_at greater than current time
**Validates: Requirements 2.5**

**Property 3: Soft delete sets deleted flag**
*For any* document deletion, the document deleted flag SHALL be set to 1 and the document SHALL remain in database
**Validates: Requirements 2.7**

**Property 4: Deleted documents excluded from queries**
*For any* document query, all returned documents SHALL have deleted flag equal to 0
**Validates: Requirements 2.8**

**Property 5: Document update modifies timestamp**
*For any* document update, the updated_at timestamp SHALL be greater than the previous updated_at timestamp
**Validates: Requirements 2.6**

### Version Management Properties

**Property 6: Version creation on document save**
*For any* document save operation, a new version record SHALL be created in t_document_version with the current content
**Validates: Requirements 3.1**

**Property 7: Version expiration based on membership**
*For any* version creation, if the user is a Premium_User, the version expire_at SHALL be set to 30 days from creation, and if the user is a Free_User, the version expire_at SHALL be set to 3 days from creation
**Validates: Requirements 3.2, 3.3, 3.4**

**Property 8: Non-expired versions in history**
*For any* user requesting version history, all returned versions SHALL have expire_at greater than current time and SHALL be ordered by created_at descending
**Validates: Requirements 3.5**

**Property 9: Version restoration creates new version**
*For any* version restoration, the document content SHALL be updated to the selected version content AND a new version record SHALL be created
**Validates: Requirements 3.6, 3.7**

### Folder Management Properties

**Property 10: Folder hierarchy integrity**
*For any* folder with parent_id not null, the parent folder SHALL exist in the database
**Validates: Requirements 4.2**

**Property 11: Non-empty folder deletion prevention**
*For any* folder deletion attempt, if the folder contains documents (folder_id references exist), the deletion SHALL be prevented and an error SHALL be returned
**Validates: Requirements 4.4, 4.5**

**Property 12: Folder ordering**
*For any* folder query, folders SHALL be ordered first by sort_order ascending, then by name ascending
**Validates: Requirements 4.7**

### Export Properties

**Property 13: Export record creation**
*For any* document export, a record SHALL be created in t_document_export with document_id, user_id, format, file_size, and file_url
**Validates: Requirements 6.8**

**Property 14: Batch export limit enforcement**
*For any* batch export request, if the user is a Premium_User and document count exceeds 20, OR if the user is a Free_User and document count exceeds 3, the request SHALL be rejected with an error
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

**Property 15: Batch export unique batch_id**
*For any* batch export operation, all export records created SHALL have the same unique batch_id
**Validates: Requirements 7.5, 7.7**

### Search Properties

**Property 16: Search in title and content**
*For any* search query, documents SHALL be returned if the query matches either the title OR the content
**Validates: Requirements 8.1**

**Property 17: Search excludes invalid documents**
*For any* search query, all returned documents SHALL have expire_at greater than current time AND deleted flag equal to 0
**Validates: Requirements 8.3**

**Property 18: Search folder filter**
*For any* search query with folder_id filter, all returned documents SHALL have folder_id equal to the specified folder_id
**Validates: Requirements 8.5**

**Property 19: Search tag filter**
*For any* search query with tag filter, all returned documents SHALL contain the specified tag in their tags field
**Validates: Requirements 8.6**

### Tag Management Properties

**Property 20: Tag uniqueness**
*For any* document with tags, the tags field SHALL contain no duplicate tags
**Validates: Requirements 9.3**

**Property 21: Tag count limit**
*For any* document, the number of tags SHALL not exceed 10
**Validates: Requirements 9.2**

**Property 22: Multi-tag query AND logic**
*For any* document query with multiple tags, all returned documents SHALL contain ALL specified tags
**Validates: Requirements 9.6**

### Template Properties

**Property 23: Template flag filtering**
*For any* template query, all returned documents SHALL have is_template flag equal to 1
**Validates: Requirements 10.2**

**Property 24: Template content copy without metadata**
*For any* document created from template, the new document content SHALL equal the template content, but view_count and export_count SHALL be 0
**Validates: Requirements 10.3, 10.4**

### Statistics Properties

**Property 25: View count increment**
*For any* document view operation, the document view_count SHALL be incremented by exactly 1
**Validates: Requirements 11.1**

**Property 26: Export count increment**
*For any* document export operation, the document export_count SHALL be incremented by exactly 1
**Validates: Requirements 11.2**

**Property 27: Word count calculation**
*For any* document, the word count SHALL equal the number of whitespace-separated tokens in the content
**Validates: Requirements 11.4**

**Property 28: Character count calculation**
*For any* document, the character count SHALL equal the length of the content string
**Validates: Requirements 11.5**

**Property 29: Reading time calculation**
*For any* document, the estimated reading time SHALL be calculated as word_count divided by 200 (average reading speed)
**Validates: Requirements 11.6**



## 错误处理

### 错误码定义

```java
public enum ErrorCode {
    // 文档错误
    DOCUMENT_NOT_FOUND(40401, "文档不存在"),
    DOCUMENT_EXPIRED(40402, "文档已过期"),
    DOCUMENT_ACCESS_DENIED(40403, "无权访问该文档"),
    
    // 文件夹错误
    FOLDER_NOT_FOUND(40404, "文件夹不存在"),
    FOLDER_NOT_EMPTY(40005, "无法删除包含文档的文件夹"),
    FOLDER_HIERARCHY_INVALID(40006, "文件夹层级结构无效"),
    
    // 版本错误
    VERSION_NOT_FOUND(40407, "版本不存在"),
    VERSION_EXPIRED(40408, "版本已过期"),
    
    // 导出错误
    EXPORT_FORMAT_INVALID(40009, "导出格式无效"),
    EXPORT_FAILED(50001, "导出操作失败"),
    BATCH_EXPORT_LIMIT_EXCEEDED(40010, "超出批量导出限制"),
    
    // 标签错误
    TAG_LIMIT_EXCEEDED(40011, "每个文档最多允许10个标签"),
    
    // 通用错误
    INVALID_PARAMETER(40000, "参数无效"),
    UNAUTHORIZED(40100, "未授权访问"),
    INTERNAL_ERROR(50000, "内部服务器错误");
    
    private final int code;
    private final String message;
}
```

### 错误处理策略

**服务层**：
- 验证输入参数
- 检查业务规则
- 抛出带有适当 ErrorCode 的 BusinessException
- 记录带上下文的错误日志

**控制器层**：
- 捕获 BusinessException
- 返回 Result.error() 带错误码和消息
- 使用 GlobalExceptionHandler 处理未捕获的异常

**前端**：
- 显示用户友好的错误消息
- 为临时错误提供重试选项
- 为会员限制错误显示升级提示
- 记录错误用于调试

### 错误处理示例

```java
@Override
public DocumentResponse createDocument(DocumentCreateRequest request) {
    // 验证用户
    Long userId = UserContext.getCurrentUserId();
    if (userId == null) {
        throw new BusinessException(ErrorCode.UNAUTHORIZED);
    }
    
    // 验证文件夹（如果指定）
    if (request.getFolderId() != null) {
        DocumentFolder folder = folderMapper.selectById(request.getFolderId());
        if (folder == null || !folder.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FOLDER_NOT_FOUND);
        }
    }
    
    // 验证标签
    if (request.getTags() != null) {
        String[] tags = request.getTags().split(",");
        if (tags.length > 10) {
            throw new BusinessException(ErrorCode.TAG_LIMIT_EXCEEDED);
        }
    }
    
    // 创建文档并设置过期时间
    UserDocument document = converter.toEntity(request);
    document.setUserId(userId);
    document.setExpireAt(calculateExpireAt(getUserMembershipType(userId)));
    document.setCreatedAt(LocalDateTime.now());
    
    mapper.insert(document);
    
    // 创建初始版本
    versionService.createVersion(document.getId(), document.getContent());
    
    return converter.toResponse(document);
}
```



## 测试策略

### 双重测试方法

MD2Word 插件将使用单元测试和属性测试来确保全面覆盖：

**单元测试**：验证特定示例、边界情况和错误条件
- 测试特定的文档创建场景
- 测试文件夹层级边界情况
- 测试导出格式转换
- 测试错误处理路径
- 测试组件之间的集成点

**属性测试**：验证所有输入的通用属性
- 测试随机用户的基于会员的过期逻辑
- 测试随机文档集的文档过滤
- 测试随机操作的版本管理
- 测试随机选择的批量导出限制
- 测试随机标签组合的标签管理

两种测试方法是互补的，对于全面覆盖都是必要的。单元测试捕获特定场景中的具体错误，而属性测试验证整个输入空间的一般正确性。

### 属性测试配置

**框架**：后端使用 jqwik（Java），前端使用 fast-check（TypeScript）

**配置**：
- 每个属性测试最少 100 次迭代
- 每个属性测试引用其设计文档属性
- 标签格式：`@Tag("Feature: md2word-plugin, Property {number}: {property_text}")`

**属性测试示例**：
```java
@Property
@Tag("Feature: md2word-plugin, Property 1: 基于会员的文档过期时间")
void documentExpirationBasedOnMembership(@ForAll("users") User user, 
                                         @ForAll("documentRequests") DocumentCreateRequest request) {
    // Given: 具有特定会员类型的用户
    when(userService.getUserById(user.getId())).thenReturn(user);
    UserContext.setCurrentUserId(user.getId());
    
    // When: 创建文档
    DocumentResponse response = documentService.createDocument(request);
    
    // Then: 过期时间应匹配会员类型
    LocalDateTime expectedExpireAt;
    if ("premium".equals(user.getPlanType())) {
        expectedExpireAt = LocalDateTime.now().plusDays(30);  // 会员：30天
    } else {
        expectedExpireAt = LocalDateTime.now().plusDays(3);   // 免费：3天
    }
    
    assertThat(response.getExpireAt())
        .isCloseTo(expectedExpireAt, within(1, ChronoUnit.SECONDS));
}

@Provide
Arbitrary<User> users() {
    return Combinators.combine(
        Arbitraries.longs().greaterOrEqual(1L),
        Arbitraries.of("premium", "free")
    ).as((id, planType) -> {
        User user = new User();
        user.setId(id);
        user.setPlanType(planType);
        return user;
    });
}
```

### 单元测试策略

**服务层测试**：
- 测试文档 CRUD 操作
- 测试文件夹管理
- 测试版本创建和恢复
- 测试导出操作
- 测试搜索和过滤逻辑
- 测试会员限制执行
- 测试错误条件

**控制器层测试**：
- 测试 API 端点响应
- 测试请求验证
- 测试认证和授权
- 测试错误响应格式

**集成测试**：
- 测试完整工作流（创建 → 编辑 → 导出）
- 测试数据库事务
- 测试文件存储操作
- 测试批量操作

### 测试覆盖率目标

- **行覆盖率**：> 80%
- **分支覆盖率**：> 75%
- **属性测试覆盖率**：实现所有 29 个属性
- **单元测试覆盖率**：所有关键路径和边界情况

### 测试工具

**后端**：
- JUnit 5 用于单元测试
- jqwik 用于属性测试
- Mockito 用于模拟
- Testcontainers 用于集成测试
- H2 用于内存数据库测试

**前端**：
- Vitest 用于单元测试
- fast-check 用于属性测试
- React Testing Library 用于组件测试
- MSW（Mock Service Worker）用于 API 模拟

