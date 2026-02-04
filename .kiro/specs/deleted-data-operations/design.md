# Design Document: Deleted Data Operations

## Overview

本设计文档描述了管理后台已删除数据操作功能的技术实现方案。该功能为三个管理页面（用户、工具、分类）的已删除数据添加编辑、恢复和永久删除操作，使管理员能够完整管理数据生命周期。

系统采用前后端分离架构：
- 前端：React + TypeScript + Tailwind CSS
- 后端：Java Spring Boot + MyBatis Plus
- 数据库：MySQL（软删除字段：deleted，0=正常，1=已删除）

设计遵循以下原则：
1. **代码复用**：利用现有的编辑模态框和API结构
2. **一致性**：三个管理页面使用统一的操作模式
3. **安全性**：永久删除需要二次确认，所有操作需要管理员权限
4. **用户体验**：提供清晰的操作反馈和国际化支持

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  AdminUsers.tsx  │  AdminTools.tsx  │  AdminCategories.tsx  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Deleted Data Operations Component                   │   │
│  │  - Edit Button → Open Edit Modal                     │   │
│  │  - Restore Button → Call Restore API                 │   │
│  │  - Delete Button → Show Confirmation → Call Delete   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Spring Boot)                       │
├─────────────────────────────────────────────────────────────┤
│  Controller Layer                                            │
│  - UserController    - ToolController    - CategoryController│
│  - PUT /restore      - PUT /restore      - PUT /restore      │
│  - DELETE ?permanent - DELETE ?permanent - DELETE ?permanent │
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                               │
│  - UserService       - ToolService       - CategoryService   │
│  - restoreUser()     - restoreTool()     - restoreCategory() │
│  - hardDeleteUser()  - hardDeleteTool()  - hardDeleteCat()   │
├─────────────────────────────────────────────────────────────┤
│  Repository Layer (MyBatis Plus)                             │
│  - UserMapper        - ToolMapper        - CategoryMapper    │
│  - updateById()      - updateById()      - updateById()      │
│  - deleteById()      - deleteById()      - deleteById()      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (MySQL)                          │
│  users table         tools table         categories table    │
│  - id                - id                - id                │
│  - deleted (0/1)     - deleted (0/1)     - deleted (0/1)     │
│  - ...               - ...               - ...               │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

**Edit Flow:**
```
User clicks Edit → Open existing Edit Modal → User modifies fields → 
Save → Call existing PUT API → Backend updates record (deleted=1 unchanged) → 
Refresh list → Show success toast
```

**Restore Flow:**
```
User clicks Restore → Call new PUT /restore API → 
Backend sets deleted=0 → Refresh list → Show success toast → 
Record moves to normal list
```

**Permanent Delete Flow:**
```
User clicks Delete → Show Confirmation Dialog → User confirms → 
Call DELETE API with permanent=true → Backend physically deletes record → 
Refresh list → Show success toast → Record removed from database
```

## Components and Interfaces

### Frontend Components

#### 1. Deleted Data Action Buttons Component

每个管理页面需要添加操作按钮组件，用于显示编辑、恢复和永久删除按钮。

**Props Interface:**
```typescript
interface DeletedDataActionsProps {
  record: User | Tool | Category;
  onEdit: (record: any) => void;
  onRestore: (id: number) => Promise<void>;
  onPermanentDelete: (id: number) => Promise<void>;
  isDeleted: boolean;
}
```

**Component Structure:**
```typescript
function DeletedDataActions({ record, onEdit, onRestore, onPermanentDelete, isDeleted }: DeletedDataActionsProps) {
  if (!isDeleted) {
    return <NormalActions />; // 现有的正常操作按钮
  }
  
  return (
    <div className="flex gap-2">
      <button onClick={() => onEdit(record)}>
        {t('edit')}
      </button>
      <button onClick={() => onRestore(record.id)}>
        {t('restore')}
      </button>
      <button onClick={() => onPermanentDelete(record.id)}>
        {t('permanentDelete')}
      </button>
    </div>
  );
}
```

#### 2. Permanent Delete Confirmation Dialog

用于永久删除的二次确认对话框。

**Props Interface:**
```typescript
interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}
```

**Component Behavior:**
- 显示警告图标和红色主题
- 清晰说明操作不可逆
- 提供取消和确认两个按钮
- 确认按钮使用危险色（红色）

#### 3. Modified Admin Pages

三个管理页面需要添加以下功能：

**AdminUsers.tsx / AdminTools.tsx / AdminCategories.tsx:**

```typescript
// 添加恢复函数
const handleRestore = async (id: number) => {
  try {
    setLoading(true);
    await api.put(`/api/v1/admin/users/${id}/restore`);
    toast.success(t('restoreSuccess'));
    fetchData(); // 刷新列表
  } catch (error) {
    toast.error(t('restoreFailed'));
  } finally {
    setLoading(false);
  }
};

// 添加永久删除函数
const handlePermanentDelete = async (id: number) => {
  setDeleteConfirmation({ isOpen: true, id });
};

const confirmPermanentDelete = async () => {
  try {
    setLoading(true);
    await api.delete(`/api/v1/admin/users/${deleteConfirmation.id}?permanent=true`);
    toast.success(t('permanentDeleteSuccess'));
    fetchData(); // 刷新列表
    setDeleteConfirmation({ isOpen: false, id: null });
  } catch (error) {
    toast.error(t('permanentDeleteFailed'));
  } finally {
    setLoading(false);
  }
};

// 修改编辑函数，允许编辑已删除数据
const handleEdit = (record: User) => {
  setEditingRecord(record);
  setIsModalOpen(true);
  // 现有的编辑模态框已支持，无需修改
};
```

### Backend Components

#### 1. Controller Layer

为每个Controller添加恢复和永久删除端点。

**UserController.java:**
```java
@RestController
@RequestMapping("/api/v1/admin/users")
public class UserController {
    
    @Autowired
    private UserService userService;
    
    // 恢复用户
    @PutMapping("/{id}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> restoreUser(@PathVariable Long id) {
        userService.restoreUser(id);
        return ResponseEntity.ok(ApiResponse.success("User restored successfully"));
    }
    
    // 永久删除用户
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> deleteUser(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "false") Boolean permanent) {
        if (Boolean.TRUE.equals(permanent)) {
            userService.hardDeleteUser(id);
            return ResponseEntity.ok(ApiResponse.success("User permanently deleted"));
        } else {
            userService.softDeleteUser(id); // 现有的软删除
            return ResponseEntity.ok(ApiResponse.success("User deleted"));
        }
    }
}
```

**ToolController.java 和 CategoryController.java 采用相同模式。**

#### 2. Service Layer

为每个Service添加恢复和永久删除方法。

**UserService.java:**
```java
@Service
public class UserService {
    
    @Autowired
    private UserMapper userMapper;
    
    @Transactional
    public void restoreUser(Long id) {
        User user = userMapper.selectById(id);
        if (user == null) {
            throw new ResourceNotFoundException("User not found");
        }
        
        // 验证恢复后的数据是否符合约束
        validateUserForRestore(user);
        
        user.setDeleted(0);
        userMapper.updateById(user);
    }
    
    @Transactional
    public void hardDeleteUser(Long id) {
        User user = userMapper.selectById(id);
        if (user == null) {
            throw new ResourceNotFoundException("User not found");
        }
        
        // 检查是否已软删除
        if (user.getDeleted() != 1) {
            throw new IllegalStateException("Can only permanently delete soft-deleted records");
        }
        
        // 处理外键约束（如果有）
        handleUserDependencies(id);
        
        // 物理删除
        userMapper.deleteById(id);
    }
    
    private void validateUserForRestore(User user) {
        // 验证用户名唯一性等约束
        if (userMapper.existsByUsernameAndDeletedNot(user.getUsername(), 1) > 0) {
            throw new ValidationException("Username already exists");
        }
    }
    
    private void handleUserDependencies(Long userId) {
        // 处理或检查外键约束
        // 例如：删除用户的关联数据或抛出异常
    }
}
```

**ToolService.java 和 CategoryService.java 采用相同模式。**

#### 3. Repository Layer

MyBatis Plus已提供所需的基础方法：
- `updateById()` - 用于恢复操作
- `deleteById()` - 用于永久删除操作

需要添加自定义查询方法：

**UserMapper.java:**
```java
@Mapper
public interface UserMapper extends BaseMapper<User> {
    
    @Select("SELECT COUNT(*) FROM users WHERE username = #{username} AND deleted != #{excludeDeleted}")
    int existsByUsernameAndDeletedNot(@Param("username") String username, @Param("excludeDeleted") Integer excludeDeleted);
}
```

## Data Models

### Frontend Data Models

**User Interface:**
```typescript
interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  deleted: number; // 0=正常, 1=已删除
  createdAt: string;
  updatedAt: string;
}
```

**Tool Interface:**
```typescript
interface Tool {
  id: number;
  name: string;
  description: string;
  categoryId: number;
  deleted: number;
  createdAt: string;
  updatedAt: string;
}
```

**Category Interface:**
```typescript
interface Category {
  id: number;
  name: string;
  description: string;
  deleted: number;
  createdAt: string;
  updatedAt: string;
}
```

**Confirmation Dialog State:**
```typescript
interface DeleteConfirmationState {
  isOpen: boolean;
  id: number | null;
}
```

### Backend Data Models

**User Entity:**
```java
@Data
@TableName("users")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private String username;
    private String email;
    private String role;
    
    @TableLogic // MyBatis Plus逻辑删除注解
    private Integer deleted; // 0=正常, 1=已删除
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

**Tool Entity:**
```java
@Data
@TableName("tools")
public class Tool {
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private String name;
    private String description;
    private Long categoryId;
    
    @TableLogic
    private Integer deleted;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

**Category Entity:**
```java
@Data
@TableName("categories")
public class Category {
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private String name;
    private String description;
    
    @TableLogic
    private Integer deleted;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

**API Response Model:**
```java
@Data
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    
    public static <T> ApiResponse<T> success(String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setMessage(message);
        return response;
    }
    
    public static <T> ApiResponse<T> error(String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setSuccess(false);
        response.setMessage(message);
        return response;
    }
}
```

### Database Schema

现有表结构已包含deleted字段，无需修改：

```sql
-- users表
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    deleted TINYINT DEFAULT 0, -- 0=正常, 1=已删除
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_deleted (deleted)
);

-- tools表和categories表结构类似
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Deleted Record Actions Visibility

*For any* deleted record (user, tool, or category), when displayed in the admin interface, the system should render edit, restore, and permanent delete action buttons.

**Validates: Requirements 1.1, 2.1, 3.1**

### Property 2: Edit Modal Opens With Correct Data

*For any* deleted record, when the edit button is clicked, the edit modal should open and display all current field values matching the record's data.

**Validates: Requirements 1.4**

### Property 3: Deleted Status Preservation During Edit

*For any* deleted record and any valid field modifications, after saving the changes, the record's deleted field should remain equal to 1 (deleted status preserved).

**Validates: Requirements 1.6**

### Property 4: Restore Operation Changes Deleted Field

*For any* deleted record (where deleted=1), after a successful restore operation, the record's deleted field should be updated to 0 (normal status).

**Validates: Requirements 2.3**

### Property 5: View Filtering After Restore

*For any* deleted record that is restored, if the admin is viewing the "deleted records" filter, the restored record should disappear from the current view; if viewing "all records" or "normal records", the restored record should appear in the list.

**Validates: Requirements 2.5, 2.6**

### Property 6: Permanent Delete Removes Record

*For any* deleted record, after a successful permanent delete operation, the record should no longer exist in the database (querying by ID should return null/not found).

**Validates: Requirements 3.6**

### Property 7: Loading Indicator During Operations

*For any* operation (edit, restore, or permanent delete) on a deleted record, while the operation is in progress, a loading indicator should be visible in the UI.

**Validates: Requirements 5.1**

### Property 8: Operation Feedback Messages

*For any* operation on a deleted record, when the operation completes, the system should display a toast message: success toast with success message if the operation succeeded, or error toast with error details if the operation failed, both in the user's selected language.

**Validates: Requirements 5.2, 5.3**

### Property 9: Internationalization Support

*For all* UI text and messages related to deleted data operations, translations should exist in both Chinese (zh) and English (en) locales.

**Validates: Requirements 5.4**

### Property 10: Filter State Preservation

*For any* operation (edit, restore, or permanent delete) on a deleted record, the current filter state (showing deleted, normal, or all records) should be preserved after the operation completes and the list refreshes.

**Validates: Requirements 5.6**

### Property 11: Pagination Preservation

*For any* operation that triggers a list refresh, if the current page number is still valid after the operation (i.e., records still exist on that page), the pagination should remain on the same page number.

**Validates: Requirements 5.7**

### Property 12: Field Validation on Data Modification

*For any* deleted record being edited or restored, if any field value violates validation constraints (e.g., duplicate username, invalid email format, required field missing), the operation should be rejected and return a validation error.

**Validates: Requirements 6.1, 6.2**

### Property 13: Specific Error Messages

*For any* operation that fails due to validation errors, the error message should include specific details about which field(s) failed validation and why.

**Validates: Requirements 6.4**

## Error Handling

### Frontend Error Handling

**API Request Errors:**
- Network errors: Display generic error toast with retry suggestion
- 401 Unauthorized: Redirect to login page
- 403 Forbidden: Display permission denied message
- 404 Not Found: Display "Record not found" message
- 409 Conflict: Display validation error details
- 500 Server Error: Display generic server error message

**Error Recovery:**
- Keep modal open on save failure (allows user to retry)
- Maintain form data on error (user doesn't lose changes)
- Provide clear error messages with actionable guidance
- Log errors to console for debugging

**Confirmation Dialog Errors:**
- If permanent delete fails, close confirmation dialog and show error toast
- Allow user to retry the operation

### Backend Error Handling

**Service Layer Exceptions:**
```java
// 资源不存在
throw new ResourceNotFoundException("User with id " + id + " not found");

// 权限不足
throw new ForbiddenException("Admin permission required");

// 验证失败
throw new ValidationException("Username already exists");

// 状态错误
throw new IllegalStateException("Can only permanently delete soft-deleted records");

// 外键约束
throw new ConstraintViolationException("Cannot delete user with existing dependencies");
```

**Transaction Rollback:**
- All restore and delete operations wrapped in @Transactional
- Any exception triggers automatic rollback
- Database remains in consistent state

**Global Exception Handler:**
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(404)
            .body(ApiResponse.error(ex.getMessage()));
    }
    
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ApiResponse> handleValidation(ValidationException ex) {
        return ResponseEntity.status(409)
            .body(ApiResponse.error(ex.getMessage()));
    }
    
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(400)
            .body(ApiResponse.error(ex.getMessage()));
    }
    
    // ... other exception handlers
}
```

### Database Constraint Handling

**Foreign Key Constraints:**
- Check for dependencies before permanent delete
- Options:
  1. Cascade delete (if appropriate for the relationship)
  2. Reject delete with clear error message
  3. Soft delete dependencies first

**Unique Constraints:**
- Validate uniqueness before restore operation
- Check if username/email/name conflicts with existing normal records
- Provide specific error message indicating the conflicting field

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

### Unit Testing

**Frontend Unit Tests (React Testing Library + Jest):**

Focus on specific examples and integration points:

1. **Component Rendering Tests:**
   - Verify action buttons render for deleted records
   - Verify action buttons don't render for normal records
   - Verify confirmation dialog displays correct warning text

2. **User Interaction Tests:**
   - Click edit button opens modal with correct data
   - Click restore button calls correct API endpoint
   - Click delete button shows confirmation dialog
   - Confirm deletion calls permanent delete API

3. **Error Handling Tests:**
   - API failure displays error toast
   - Network error shows retry message
   - 403 error shows permission denied message

4. **Edge Cases:**
   - Empty list handling
   - Last record on page deletion
   - Concurrent operations

**Backend Unit Tests (JUnit + Mockito):**

Focus on service layer logic and edge cases:

1. **Restore Operation Tests:**
   - Restore sets deleted=0
   - Restore validates uniqueness constraints
   - Restore fails for non-existent record
   - Restore fails for already-normal record

2. **Permanent Delete Tests:**
   - Hard delete removes record from database
   - Hard delete fails for normal records (not soft-deleted)
   - Hard delete handles foreign key constraints
   - Hard delete fails for non-existent record

3. **Validation Tests:**
   - Duplicate username prevents restore
   - Invalid email format prevents edit
   - Required fields validation

4. **Authorization Tests:**
   - Non-admin users cannot restore
   - Non-admin users cannot permanent delete
   - Admin users can perform all operations

### Property-Based Testing

**Property Testing Library:**
- Frontend: fast-check (TypeScript property testing library)
- Backend: jqwik (Java property testing library)

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number

**Frontend Property Tests:**

```typescript
// Property 3: Deleted Status Preservation During Edit
// Feature: deleted-data-operations, Property 3
test('editing deleted record preserves deleted status', async () => {
  await fc.assert(
    fc.asyncProperty(
      arbitraryDeletedUser(), // generates random deleted user
      arbitraryFieldUpdates(), // generates random valid field changes
      async (user, updates) => {
        const result = await editDeletedRecord(user, updates);
        expect(result.deleted).toBe(1);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 8: Operation Feedback Messages
// Feature: deleted-data-operations, Property 8
test('all operations display appropriate feedback', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.constantFrom('edit', 'restore', 'permanentDelete'),
      arbitraryDeletedRecord(),
      fc.boolean(), // success or failure
      async (operation, record, shouldSucceed) => {
        const result = await performOperation(operation, record, shouldSucceed);
        expect(result.toastDisplayed).toBe(true);
        expect(result.toastType).toBe(shouldSucceed ? 'success' : 'error');
        expect(result.toastMessage).toBeTruthy();
      }
    ),
    { numRuns: 100 }
  );
});

// Property 10: Filter State Preservation
// Feature: deleted-data-operations, Property 10
test('operations preserve filter state', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.constantFrom('deleted', 'normal', 'all'),
      fc.constantFrom('edit', 'restore', 'permanentDelete'),
      arbitraryDeletedRecord(),
      async (filterState, operation, record) => {
        const initialFilter = filterState;
        await performOperation(operation, record, true);
        const finalFilter = getCurrentFilterState();
        expect(finalFilter).toBe(initialFilter);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Backend Property Tests:**

```java
// Property 4: Restore Operation Changes Deleted Field
// Feature: deleted-data-operations, Property 4
@Property
void restoreChangesDeletedFieldToZero(@ForAll("deletedUsers") User user) {
    userService.restoreUser(user.getId());
    User restored = userMapper.selectById(user.getId());
    assertThat(restored.getDeleted()).isEqualTo(0);
}

// Property 6: Permanent Delete Removes Record
// Feature: deleted-data-operations, Property 6
@Property
void permanentDeleteRemovesRecord(@ForAll("deletedUsers") User user) {
    userService.hardDeleteUser(user.getId());
    User result = userMapper.selectById(user.getId());
    assertThat(result).isNull();
}

// Property 12: Field Validation on Data Modification
// Feature: deleted-data-operations, Property 12
@Property
void invalidDataRejectedOnEdit(
    @ForAll("deletedUsers") User user,
    @ForAll("invalidFieldUpdates") Map<String, Object> invalidUpdates
) {
    assertThatThrownBy(() -> {
        userService.updateUser(user.getId(), invalidUpdates);
    }).isInstanceOf(ValidationException.class);
}

// Generators
@Provide
Arbitrary<User> deletedUsers() {
    return Arbitraries.of(User.class)
        .map(user -> {
            user.setDeleted(1);
            return user;
        });
}
```

### Integration Testing

**API Integration Tests:**
- Test complete request/response cycle
- Verify database state changes
- Test transaction rollback on errors
- Test authorization at API level

**End-to-End Tests (Optional):**
- Full user workflow: view deleted → edit → save
- Full user workflow: view deleted → restore → verify in normal list
- Full user workflow: view deleted → delete → confirm → verify removed

### Test Coverage Goals

- Unit test coverage: >80% for service layer and components
- Property test coverage: All 13 correctness properties implemented
- Integration test coverage: All API endpoints tested
- Edge case coverage: All error conditions tested
