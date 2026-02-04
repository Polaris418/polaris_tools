# Utils

Utility functions and managers for Polaris Tools.

## GuestUsageManager

Manages guest user usage limits with automatic daily reset functionality.

### Features

- **Usage Tracking**: Records the number of times a guest user has used tools
- **Daily Reset**: Automatically resets usage count at midnight (00:00) each day
- **Limit Enforcement**: Enforces a default limit of 10 uses per day for guest users
- **Warning System**: Shows warnings when users have 3 or fewer uses remaining
- **Persistence**: Stores usage data in localStorage

### Usage

```typescript
import { guestUsageManager } from './utils/guestUsageManager';

// Check if guest can use a tool
if (guestUsageManager.canUse()) {
  // Allow tool usage
  guestUsageManager.incrementUsage();
} else {
  // Show login prompt
  promptLogin();
}

// Get remaining uses
const remaining = guestUsageManager.getRemainingCount();

// Check if warning should be shown
if (guestUsageManager.shouldShowWarning()) {
  showWarning(`You have ${remaining} uses remaining today`);
}

// Clear usage data (call after user logs in)
guestUsageManager.clear();
```

### Daily Reset Behavior

The usage count automatically resets to 0 at midnight (00:00) each day. This is checked every time `getUsage()` is called by comparing the stored `lastResetDate` with the current date.

**Example:**
- Day 1: User uses tools 8 times (2 remaining)
- Day 2 (after midnight): Usage count resets to 0 (10 available)

### Methods

- `getUsage()`: Get current usage information
- `incrementUsage()`: Increment usage count by 1
- `canUse()`: Check if user can still use tools
- `getRemainingCount()`: Get number of remaining uses
- `shouldShowWarning()`: Check if warning should be displayed
- `isLimitReached()`: Check if usage limit has been reached
- `clear()`: Clear all usage data (call after login)
- `getNextResetTime()`: Get the next reset time (tomorrow at 00:00)
- `getTimeUntilReset()`: Get milliseconds until next reset

### Configuration

Default values can be modified in the class:
- `DEFAULT_LIMIT`: 10 uses per day
- `WARNING_THRESHOLD`: 7 uses (shows warning when 3 remain)


## Performance Optimization

See [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) for detailed documentation on:

- **Data Caching**: Cache API responses to reduce network requests
- **Lazy Loading**: Load components and data only when needed
- **API Optimization**: Debounce, throttle, and batch API calls
- **Virtual Scrolling**: Efficiently render large lists

### Quick Start

```typescript
// Use optimized API client with automatic caching
import { optimizedTemplateApi } from './utils/optimizedApi';
const templates = await optimizedTemplateApi.list({ page: 1, size: 20 });

// Debounce search input
import { useDebouncedCallback } from './utils/performance';
const search = useDebouncedCallback(searchApi, 500);

// Virtual scrolling for large lists
import { VirtualList } from './components/VirtualList';
<VirtualList items={items} itemHeight={60} containerHeight={600} renderItem={...} />

// Lazy load charts
import { useLazyChart } from './hooks/useLazyChart';
const { ref, shouldRender } = useLazyChart();
<div ref={ref}>{shouldRender && <Chart />}</div>
```

### Available Utilities

#### Cache (`cache.ts`)
- `apiCache`, `templateCache`, `statsCache` - Pre-configured cache instances
- `createCachedFunction()` - Wrap functions with caching
- `useCachedData()` - React hook for cached data

#### Performance (`performance.ts`)
- `debounce()`, `throttle()` - Function rate limiting
- `useDebounce()`, `useDebouncedCallback()` - React debounce hooks
- `useThrottledCallback()` - React throttle hook
- `BatchRequestManager` - Batch multiple requests
- `createBatchedFunction()` - Create batched function
- `memoize()` - Memoize function results
- `RequestDeduplicator` - Prevent duplicate requests
- `createDeduplicatedFunction()` - Create deduplicated function

#### Optimized API (`optimizedApi.ts`)
- `optimizedTemplateApi` - Cached template API
- `optimizedStatsApi` - Cached statistics API
- `optimizedEmailApi` - Deduplicated email API
- `optimizedQueueApi` - Deduplicated queue API
- `optimizedSuppressionApi` - Cached suppression API
- `optimizedSubscriptionApi` - Cached subscription API
- `optimizedMonitoringApi` - Cached monitoring API
- `batchOperations` - Batch operation helpers
- `cacheManager` - Cache management utilities
- `prefetch` - Data prefetching utilities

#### Virtual Scrolling (`../components/VirtualList.tsx`)
- `VirtualList` - Virtual scrolling list component
- `VirtualTable` - Virtual scrolling table component
- `useVirtualScroll()` - Virtual scroll hook
- `useInfiniteScroll()` - Infinite scroll hook

#### Lazy Charts (`../hooks/useLazyChart.ts`)
- `useLazyChart()` - Lazy load charts when visible
- `useProgressiveChart()` - Progressive chart data loading
- `useChartSampling()` - Reduce chart data points
- `useChartAnimation()` - Control chart animations
