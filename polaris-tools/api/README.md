# Polaris Tools Platform - API Client

This directory contains the frontend API client for communicating with the backend REST API.

## Files

### `client.ts`
The main API client implementation with type-safe methods for all backend endpoints.

**Features:**
- ✅ Singleton pattern for consistent API access
- ✅ Automatic JWT token management (localStorage)
- ✅ Type-safe request/response handling
- ✅ Comprehensive error handling with custom `ApiError` class
- ✅ Support for all backend API endpoints

**API Modules:**
- `auth` - User authentication (register, login, logout, refresh token, get current user)
- `tools` - Tool management (CRUD operations, view/use tracking)
- `categories` - Category management (CRUD operations)
- `favorites` - User favorites (add, remove, list, check)
- `usage` - Usage statistics (recent tools, popular tools, history)

## Usage Examples

### Authentication

```typescript
import { apiClient } from './api/client';

// Register a new user
try {
  const result = await apiClient.auth.register({
    username: 'john_doe',
    password: 'securePassword123',
    email: 'john@example.com',
    nickname: 'John'
  });
  console.log('User registered:', result.data);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('Registration failed:', error.message);
  }
}

// Login
try {
  const result = await apiClient.auth.login({
    username: 'john_doe',
    password: 'securePassword123'
  });
  
  // Token is automatically stored
  apiClient.setToken(result.data.token);
  console.log('Logged in:', result.data.user);
} catch (error) {
  console.error('Login failed:', error);
}

// Get current user
const userResult = await apiClient.auth.getCurrentUser();
console.log('Current user:', userResult.data);

// Logout
await apiClient.auth.logout();
apiClient.clearToken();
```

### Tools

```typescript
// Get tools with filters
const toolsResult = await apiClient.tools.list({
  keyword: 'json',
  categoryId: 1,
  page: 1,
  size: 20,
  sortBy: 'viewCount',
  sortOrder: 'desc'
});
console.log('Tools:', toolsResult.data.list);
console.log('Total:', toolsResult.data.total);

// Get single tool
const toolResult = await apiClient.tools.get(1);
console.log('Tool:', toolResult.data);

// Record tool view
await apiClient.tools.recordView(1);

// Record tool usage
await apiClient.tools.recordUse(1);

// Create tool (admin only)
const newTool = await apiClient.tools.create({
  categoryId: 1,
  name: 'JSON Formatter',
  nameZh: 'JSON 格式化工具',
  description: 'Format and validate JSON',
  icon: 'code',
  url: 'https://example.com/json-formatter',
  toolType: 0,
  isFeatured: 1
});
```

### Categories

```typescript
// Get all categories
const categoriesResult = await apiClient.categories.list();
console.log('Categories:', categoriesResult.data);

// Get single category
const categoryResult = await apiClient.categories.get(1);
console.log('Category:', categoryResult.data);
console.log('Tool count:', categoryResult.data.toolCount);
```

### Favorites

```typescript
// Add to favorites (requires authentication)
await apiClient.favorites.add(1);

// Get user's favorites
const favoritesResult = await apiClient.favorites.list();
console.log('Favorites:', favoritesResult.data);

// Check if tool is favorited
const isFavoritedResult = await apiClient.favorites.check(1);
console.log('Is favorited:', isFavoritedResult.data);

// Remove from favorites
await apiClient.favorites.remove(1);
```

### Usage Statistics

```typescript
// Get recent tools
const recentResult = await apiClient.usage.recent(10);
console.log('Recent tools:', recentResult.data);

// Get popular tools
const popularResult = await apiClient.usage.popular(10);
console.log('Popular tools:', popularResult.data);

// Get usage history
const historyResult = await apiClient.usage.history(1, 20);
console.log('Usage history:', historyResult.data.list);
```

## Error Handling

The API client throws `ApiError` for all API-related errors:

```typescript
import { apiClient, ApiError } from './api/client';

try {
  const result = await apiClient.tools.get(999);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.code, error.message);
    
    // Handle specific error codes
    if (error.code === 404) {
      console.log('Tool not found');
    } else if (error.code === 401) {
      console.log('Unauthorized - please login');
      // Redirect to login page
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Configuration

The API base URL is configured via environment variable in `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

For production, update this to your production API URL.

## Type Safety

All API methods are fully typed using TypeScript interfaces defined in `../types.ts`:

- Request types: `*Request` (e.g., `UserLoginRequest`, `ToolCreateRequest`)
- Response types: `*Response` (e.g., `UserResponse`, `ToolResponse`)
- Generic wrappers: `Result<T>`, `PageResult<T>`

This ensures compile-time type checking and excellent IDE autocomplete support.

## Token Management

The API client automatically manages JWT tokens:

- Tokens are stored in `localStorage` with key `'token'`
- Tokens are automatically included in request headers as `Authorization: Bearer {token}`
- Use `setToken()` after login to store the token
- Use `clearToken()` after logout to remove the token
- Token is automatically loaded from localStorage on client initialization

## Requirements Validation

This implementation satisfies the following requirements:

- ✅ **Requirement 8.1**: Unified API response format with `Result<T>`
- ✅ **Requirement 8.2**: Paginated responses with `PageResult<T>`
- ✅ **Requirement 8.3**: Error handling with `ApiError`
- ✅ **Requirement 8.4**: Type-safe request/response handling
- ✅ **Requirement 8.5**: Network error handling
- ✅ **Requirement 8.6**: Comprehensive error messages
- ✅ **Requirement 8.7**: CORS support (handled by backend)
- ✅ **Requirement 16.1**: Environment variable configuration
- ✅ **Requirement 16.2**: Configurable API base URL
- ✅ **Requirement 16.3**: Support for different environments

## Next Steps

To use this API client in your React components:

1. Import the client: `import { apiClient } from './api/client'`
2. Create custom hooks for data fetching (see task 13 in tasks.md)
3. Integrate with AppContext for authentication state management
4. Add loading and error states to UI components
