# Frontend Data Fetching Hooks

This directory contains custom React hooks for fetching and managing data from the Polaris Tools Platform API.

## Available Hooks

### useTools.ts

Hooks for managing tool data:

- **`useTools(params?: ToolQueryRequest)`** - Fetch paginated tool list with optional filters
  - Returns: `{ data, loading, error, refetch }`
  - Supports search, filtering by category, sorting, and pagination
  
- **`useTool(id: number | null)`** - Fetch a single tool by ID
  - Returns: `{ data, loading, error, refetch }`
  
- **`useRecentTools(limit?: number)`** - Fetch recently used tools
  - Returns: `{ data, loading, error, refetch }`
  - Default limit: 10
  
- **`usePopularTools(limit?: number)`** - Fetch popular tools by usage count
  - Returns: `{ data, loading, error, refetch }`
  - Default limit: 10

### useCategories.ts

Hooks for managing category data:

- **`useCategories()`** - Fetch all categories
  - Returns: `{ data, loading, error, refetch }`
  - Categories are sorted by `sortOrder` field
  
- **`useCategory(id: number | null)`** - Fetch a single category by ID
  - Returns: `{ data, loading, error, refetch }`
  - Includes tool count for the category

### useFavorites.ts

Hooks for managing user favorites:

- **`useFavorites()`** - Fetch and manage user's favorite tools
  - Returns: `{ data, loading, error, addFavorite, removeFavorite, isFavorited, refetch }`
  - `addFavorite(toolId)` - Add a tool to favorites
  - `removeFavorite(toolId)` - Remove a tool from favorites
  - `isFavorited(toolId)` - Check if a tool is favorited
  
- **`useFavoriteStatus(toolId: number | null)`** - Check and toggle favorite status for a specific tool
  - Returns: `{ isFavorited, loading, error, toggleFavorite }`
  - `toggleFavorite()` - Toggle favorite status

## Usage Examples

### Fetching Tools with Filters

```typescript
import { useTools } from './hooks';

function ToolList() {
  const { data, loading, error, refetch } = useTools({
    keyword: 'json',
    categoryId: 1,
    sortBy: 'viewCount',
    sortOrder: 'desc',
    page: 1,
    size: 20
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return (
    <div>
      {data.list.map(tool => (
        <div key={tool.id}>{tool.name}</div>
      ))}
      <div>Total: {data.total} tools</div>
    </div>
  );
}
```

### Managing Favorites

```typescript
import { useFavorites } from './hooks';

function FavoritesList() {
  const { data, loading, error, addFavorite, removeFavorite, isFavorited } = useFavorites();

  const handleToggleFavorite = async (toolId: number) => {
    try {
      if (isFavorited(toolId)) {
        await removeFavorite(toolId);
      } else {
        await addFavorite(toolId);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.map(tool => (
        <div key={tool.id}>
          {tool.name}
          <button onClick={() => handleToggleFavorite(tool.id)}>
            {isFavorited(tool.id) ? 'Unfavorite' : 'Favorite'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Using Categories

```typescript
import { useCategories } from './hooks';

function CategoryList() {
  const { data, loading, error } = useCategories();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.map(category => (
        <div key={category.id}>
          {category.name} ({category.toolCount} tools)
        </div>
      ))}
    </div>
  );
}
```

## Features

- **Automatic Cancellation**: All hooks properly cancel pending requests when the component unmounts
- **Error Handling**: Consistent error handling across all hooks
- **Loading States**: Track loading state for better UX
- **Refetch Support**: All hooks provide a `refetch()` function to manually refresh data
- **Type Safety**: Full TypeScript support with proper type definitions
- **Optimistic Updates**: Favorites hooks update local state immediately for better UX

## Requirements Coverage

- **useTools**: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
- **useCategories**: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
- **useFavorites**: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8

## Authentication

All hooks that require authentication (favorites, usage statistics) will automatically include the JWT token from the API client. Make sure the user is logged in before using these hooks, or handle authentication errors appropriately.
