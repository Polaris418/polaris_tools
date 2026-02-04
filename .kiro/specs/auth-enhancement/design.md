# 认证增强功能设计文档

## 1. 架构设计

### 1.1 整体架构

```

                        前端应用层                              

  Components    Pages    Hooks    Utils    Context       

                     认证管理层                                
            
   TokenManager   SessionManager   AuthContext        
            

                     API 客户端层                              
     
    API Client (with interceptors)                         
     

                     后端 API                                 
─
```

### 1.2 认证状态管理

```typescript
// 认证状态类型
type AuthState = 
  | 'initializing'    // 初始化中
  | 'unauthenticated' // 未登录（游客模式）
  | 'authenticated'   // 已登录
  | 'refreshing'      // Token 刷新中
  | 'expired';        // 会话已过期

interface AuthContextState {
  state: AuthState;
  user: UserResponse | null;
  isAuthenticated: boolean;
  isGuest: boolean;  // 是否为游客模式
  rememberMe: boolean;
  sessionExpiresAt: number | null;
}
```

## 2. 核心功能设计

### 2.1 未登录用户访问（游客模式）

#### 2.1.1 设计原则
- 游客可以访问和使用所有工具功能
- 游客的使用会被匿名统计（用于分析工具使用频率）
- 游客无法使用需要个人数据的功能（收藏、个人历史、设置等）
- 游客在尝试访问受限功能时，显示友好的登录提示
- **游客使用次数有限制（默认10次），达到限制后强制登录**
- **显示剩余使用次数，引导用户注册**

#### 2.1.2 功能权限矩阵

| 功能 | 游客 | 登录用户 | 说明 |
|------|------|----------|------|
| 首页浏览 |  |  | 所有人可访问 |
| 工具使用 |  |  | 所有人可使用 |
| 匿名统计 |  |  | 记录工具使用次数 |
| 个人收藏 |  |  | 需要登录 |
| 使用历史 |  |  | 需要登录 |
| 个人设置 |  |  | 需要登录 |
| 通知中心 |  |  | 需要登录 |
| 个人资料 |  |  | 需要登录 |

#### 2.1.3 前端实现

**AppContext 状态管理：**
```typescript
// context/AppContext.tsx
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // 游客模式：未登录或无有效 token
  const isGuest = !isAuthenticated || !user;
  
  // 检查功能访问权限
  const canAccessFeature = useCallback((feature: string): boolean => {
    const guestAllowedFeatures = [
      'dashboard', 'tool', 'category'
    ];
    
    const loginRequiredFeatures = [
      'favorites', 'profile', 'settings', 'notifications', 'admin'
    ];
    
    if (isGuest && loginRequiredFeatures.includes(feature)) {
      return false;
    }
    
    return true;
  }, [isGuest]);
  
  // 显示登录提示
  const promptLogin = useCallback((message?: string) => {
    showConfirm({
      title: '需要登录',
      message: message || '此功能需要登录后才能使用',
      confirmText: '立即登录',
      cancelText: '稍后再说',
      type: 'info',
    }).then((confirmed) => {
      if (confirmed) {
        navigate('login');
      }
    });
  }, [navigate, showConfirm]);
  
  return (
    <AppContext.Provider value={{
      // ... 其他状态
      isGuest,
      canAccessFeature,
      promptLogin,
    }}>
      {children}
    </AppContext.Provider>
  );
};
```

**App.tsx 路由调整：**
```typescript
// App.tsx
const AppContent: React.FC = () => {
  const { page, isAuthenticated, isInitialized, isGuest, canAccessFeature, promptLogin } = useAppContext();

  // 初始化加载
  if (!isInitialized) {
    return <LoadingScreen message="正在初始化..." />;
  }

  // 登录和注册页面（独立页面）
  if (page === 'login') return <Login />;
  if (page === 'register') return <Register />;

  // 检查功能访问权限
  if (!canAccessFeature(page)) {
    // 游客尝试访问受限功能，显示提示
    useEffect(() => {
      promptLogin(`访问"${page}"功能需要登录`);
      navigate('dashboard');
    }, [page]);
  }

  // 应用主布局（游客和登录用户都可以访问）
  return (
    <div className="flex w-full h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        {/* 页面内容 */}
      </div>
    </div>
  );
};
```

**Header 组件调整：**
```typescript
// components/Header.tsx
export const Header: React.FC = () => {
  const { isGuest, isAuthenticated, navigate, logout } = useAppContext();

  return (
    <header className="h-16 border-b flex items-center justify-between px-6">
      {/* 左侧：面包屑导航 */}
      <div className="flex items-center gap-2">
        {/* ... */}
      </div>
      
      {/* 右侧：用户操作区 */}
      <div className="flex items-center gap-3">
        {/* 主题切换 */}
        <button onClick={toggleTheme}>
          <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} />
        </button>

        {/* 语言切换 */}
        <button onClick={toggleLanguage}>
          <Icon name="translate" />
          {language === 'en' ? 'EN' : '中文'}
        </button>

        <div className="h-6 w-px bg-slate-200" />

        {/* 游客模式：显示登录/注册按钮 */}
        {isGuest ? (
          <>
            <button 
              onClick={() => navigate('login')}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              登录
            </button>
            <button 
              onClick={() => navigate('register')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg"
            >
              注册
            </button>
          </>
        ) : (
          <>
            {/* 登录用户：显示通知和退出 */}
            <button onClick={() => navigate('notifications')}>
              <Icon name="notifications" />
              {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </button>
            <button onClick={() => logout()}>
              退出登录
            </button>
          </>
        )}
      </div>
    </header>
  );
};
```

**Sidebar 组件调整：**
```typescript
// components/Sidebar.tsx
export const Sidebar: React.FC = () => {
  const { isGuest, navigate, page } = useAppContext();

  const menuItems = [
    { id: 'dashboard', label: '首页', icon: 'home', guestAllowed: true },
    { id: 'favorites', label: '我的收藏', icon: 'star', guestAllowed: false },
    { id: 'profile', label: '个人资料', icon: 'person', guestAllowed: false },
    { id: 'settings', label: '设置', icon: 'settings', guestAllowed: false },
  ];

  // 根据游客模式过滤菜单
  const visibleItems = isGuest 
    ? menuItems.filter(item => item.guestAllowed)
    : menuItems;

  return (
    <aside className="w-64 border-r">
      {/* Logo */}
      <div className="h-16 flex items-center px-6">
        <h1>Polaris Tools</h1>
      </div>

      {/* 游客提示 */}
      {isGuest && (
        <div className="mx-4 mb-4 p-3 bg-indigo-50 rounded-lg">
          <p className="text-sm text-indigo-900 mb-2">
            登录后解锁更多功能
          </p>
          <button 
            onClick={() => navigate('login')}
            className="w-full py-2 bg-indigo-600 text-white text-sm rounded-lg"
          >
            立即登录
          </button>
        </div>
      )}

      {/* 菜单列表 */}
      <nav className="px-4">
        {visibleItems.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.id as Page)}
            className={`menu-item ${page === item.id ? 'active' : ''}`}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};
```

#### 2.1.4 后端实现

**工具使用统计 - 支持匿名记录：**
```java
// ToolController.java
@PostMapping("/api/v1/tools/{id}/use")
public Result<Void> recordToolUsage(
    @PathVariable Long id,
    @RequestHeader(value = "Authorization", required = false) String authHeader
) {
    Long userId = null;
    
    // 如果提供了 token，提取用户 ID
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
        String token = authHeader.substring(7);
        try {
            userId = jwtTokenProvider.getUserIdFromToken(token);
        } catch (Exception e) {
            // Token 无效，作为匿名用户处理
            log.debug("Invalid token, treating as anonymous user");
        }
    }
    
    // 记录使用统计（userId 可以为 null，表示匿名用户）
    toolUsageService.recordUsage(id, userId);
    
    return Result.success();
}
```

**ToolUsageService 实现：**
```java
// ToolUsageServiceImpl.java
@Override
public void recordUsage(Long toolId, Long userId) {
    // 更新工具的全局使用计数
    toolMapper.incrementUsageCount(toolId);
    
    // 如果是登录用户，记录个人使用历史
    if (userId != null) {
        ToolUsage usage = new ToolUsage();
        usage.setToolId(toolId);
        usage.setUserId(userId);
        usage.setUsedAt(LocalDateTime.now());
        toolUsageMapper.insert(usage);
    }
    
    // 记录匿名统计（用于分析）
    statisticsService.recordAnonymousUsage(toolId);
}
```


#### 2.1.5 游客使用次数限制

**GuestUsageManager 工具类：**
```typescript
// utils/guestUsageManager.ts
interface GuestUsage {
  count: number;
  limit: number;
  lastResetDate: string;
}

class GuestUsageManager {
  private readonly STORAGE_KEY = 'guest_usage';
  private readonly DEFAULT_LIMIT = 10;
  private readonly WARNING_THRESHOLD = 7; // 剩余3次时提醒
  
  /**
   * 获取游客使用信息
   */
  getUsage(): GuestUsage {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const usage = JSON.parse(stored) as GuestUsage;
        // 检查是否需要重置（可选：每天重置）
        if (this.shouldReset(usage.lastResetDate)) {
          return this.resetUsage();
        }
        return usage;
      } catch (error) {
        console.error('Failed to parse guest usage:', error);
      }
    }
    return this.initUsage();
  }
  
  /**
   * 初始化使用信息
   */
  private initUsage(): GuestUsage {
    const usage: GuestUsage = {
      count: 0,
      limit: this.DEFAULT_LIMIT,
      lastResetDate: new Date().toISOString(),
    };
    this.saveUsage(usage);
    return usage;
  }
  
  /**
   * 重置使用次数（可选功能：每天重置）
   */
  private resetUsage(): GuestUsage {
    const usage: GuestUsage = {
      count: 0,
      limit: this.DEFAULT_LIMIT,
      lastResetDate: new Date().toISOString(),
    };
    this.saveUsage(usage);
    return usage;
  }
  
  /**
   * 判断是否需要重置（可选：每天重置）
   */
  private shouldReset(lastResetDate: string): boolean {
    // 可选功能：每天重置使用次数
    // 如果不需要每天重置，返回 false
    const lastReset = new Date(lastResetDate);
    const today = new Date();
    return lastReset.toDateString() !== today.toDateString();
  }
  
  /**
   * 保存使用信息
   */
  private saveUsage(usage: GuestUsage): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usage));
  }
  
  /**
   * 增加使用次数
   */
  incrementUsage(): GuestUsage {
    const usage = this.getUsage();
    usage.count += 1;
    this.saveUsage(usage);
    return usage;
  }
  
  /**
   * 检查是否可以继续使用
   */
  canUse(): boolean {
    const usage = this.getUsage();
    return usage.count < usage.limit;
  }
  
  /**
   * 获取剩余使用次数
   */
  getRemainingCount(): number {
    const usage = this.getUsage();
    return Math.max(0, usage.limit - usage.count);
  }
  
  /**
   * 是否需要显示警告
   */
  shouldShowWarning(): boolean {
    const usage = this.getUsage();
    return usage.count >= this.WARNING_THRESHOLD && usage.count < usage.limit;
  }
  
  /**
   * 是否已达到限制
   */
  isLimitReached(): boolean {
    const usage = this.getUsage();
    return usage.count >= usage.limit;
  }
  
  /**
   * 清除使用记录（登录后调用）
   */
  clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const guestUsageManager = new GuestUsageManager();
```

**GuestLimitDialog 组件：**
```typescript
// components/GuestLimitDialog.tsx
interface GuestLimitDialogProps {
  remainingCount: number;
  isBlocked: boolean;
  onLogin: () => void;
  onRegister: () => void;
  onClose?: () => void;
}

export const GuestLimitDialog: React.FC<GuestLimitDialogProps> = ({
  remainingCount,
  isBlocked,
  onLogin,
  onRegister,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-slate-200 dark:border-border-dark p-8 max-w-md w-full">
        {/* 图标 */}
        <div className="flex flex-col items-center mb-6">
          <div className={`size-16 rounded-2xl flex items-center justify-center mb-4 ${
            isBlocked 
              ? 'bg-red-100 dark:bg-red-900/20' 
              : 'bg-amber-100 dark:bg-amber-900/20'
          }`}>
            <Icon 
              name={isBlocked ? 'block' : 'warning'} 
              className={`text-[32px] ${
                isBlocked 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            />
          </div>
          
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {isBlocked ? '使用次数已用完' : '使用次数即将用完'}
          </h3>
          
          <p className="text-slate-500 dark:text-text-secondary text-center text-sm">
            {isBlocked 
              ? '您已达到游客使用限制，请登录后继续使用'
              : `您还可以使用 ${remainingCount} 次，登录后即可无限使用`
            }
          </p>
        </div>

        {/* 剩余次数显示（未阻止时） */}
        {!isBlocked && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg text-center border border-amber-200 dark:border-amber-800">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">
              {remainingCount}
            </div>
            <div className="text-sm text-amber-700 dark:text-amber-300">
              剩余使用次数
            </div>
          </div>
        )}

        {/* 登录注册的好处 */}
        <div className="mb-6 space-y-2">
          <div className="flex items-start gap-3">
            <Icon name="check_circle" className="text-green-600 text-[20px] mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                无限使用所有工具
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Icon name="check_circle" className="text-green-600 text-[20px] mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                保存使用历史和收藏
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Icon name="check_circle" className="text-green-600 text-[20px] mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                个性化设置和偏好
              </p>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3">
          <button
            onClick={onLogin}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
          >
            立即登录
          </button>
          <button
            onClick={onRegister}
            className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold rounded-lg transition-colors"
          >
            注册新账号
          </button>
          
          {/* 只有在未阻止时才显示关闭按钮 */}
          {!isBlocked && onClose && (
            <button
              onClick={onClose}
              className="w-full py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
            >
              稍后再说
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

**AppContext 集成游客限制：**
```typescript
// context/AppContext.tsx
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [guestUsage, setGuestUsage] = useState(guestUsageManager.getUsage());
  const [showGuestLimit, setShowGuestLimit] = useState(false);
  const [isGuestBlocked, setIsGuestBlocked] = useState(false);
  
  // 检查游客使用限制
  const checkGuestUsage = useCallback(() => {
    if (isGuest) {
      const usage = guestUsageManager.getUsage();
      setGuestUsage(usage);
      
      // 检查是否达到限制
      if (guestUsageManager.isLimitReached()) {
        setIsGuestBlocked(true);
        setShowGuestLimit(true);
        return false;
      }
      
      // 检查是否需要显示警告
      if (guestUsageManager.shouldShowWarning()) {
        setShowGuestLimit(true);
      }
      
      return true;
    }
    return true;
  }, [isGuest]);
  
  // 记录工具使用（游客）
  const recordGuestToolUsage = useCallback(() => {
    if (isGuest) {
      const usage = guestUsageManager.incrementUsage();
      setGuestUsage(usage);
      
      // 检查是否需要显示提醒
      if (guestUsageManager.shouldShowWarning()) {
        setShowGuestLimit(true);
      }
      
      // 检查是否达到限制
      if (guestUsageManager.isLimitReached()) {
        setIsGuestBlocked(true);
        setShowGuestLimit(true);
      }
    }
  }, [isGuest]);
  
  // 登录成功后清除游客使用记录
  const login = async (...) => {
    // ... 原有登录逻辑
    
    // 清除游客使用记录
    guestUsageManager.clear();
    setGuestUsage(guestUsageManager.getUsage());
    setShowGuestLimit(false);
    setIsGuestBlocked(false);
  };
  
  return (
    <AppContext.Provider value={{
      // ... 其他状态
      guestUsage,
      checkGuestUsage,
      recordGuestToolUsage,
      isGuestBlocked,
    }}>
      {children}
      
      {/* 游客限制对话框 */}
      {showGuestLimit && (
        <GuestLimitDialog
          remainingCount={guestUsageManager.getRemainingCount()}
          isBlocked={isGuestBlocked}
          onLogin={() => navigate('login')}
          onRegister={() => navigate('register')}
          onClose={isGuestBlocked ? undefined : () => setShowGuestLimit(false)}
        />
      )}
    </AppContext.Provider>
  );
};
```

**工具页面集成：**
```typescript
// 任何工具组件（例如：WordCounter.tsx）
export const WordCounter: React.FC = () => {
  const { isGuest, recordGuestToolUsage, checkGuestUsage } = useAppContext();
  
  const handleToolUse = () => {
    // 游客模式：检查使用限制
    if (isGuest) {
      if (!checkGuestUsage()) {
        // 已达到限制，阻止使用
        return;
      }
      // 记录使用次数
      recordGuestToolUsage();
    }
    
    // 执行工具功能
    // ...
  };
  
  return (
    <div>
      {/* 工具 UI */}
      <button onClick={handleToolUse}>
        使用工具
      </button>
    </div>
  );
};
```

**Header 显示剩余次数：**
```typescript
// components/Header.tsx
export const Header: React.FC = () => {
  const { isGuest, guestUsage } = useAppContext();
  const remainingCount = guestUsageManager.getRemainingCount();
  
  return (
    <header className="h-16 border-b flex items-center justify-between px-6">
      {/* ... 其他内容 */}
      
      {/* 游客模式：显示剩余次数 */}
      {isGuest && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <Icon name="schedule" className="text-amber-600 text-[18px]" />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
            剩余 {remainingCount} 次使用
          </span>
        </div>
      )}
      
      {/* ... 其他按钮 */}
    </header>
  );
};
```
### 2.2 Token 自动刷新机制

#### 2.2.1 设计原则
- 在 token 即将过期前自动刷新（剩余 15% 生命周期时）
- 刷新过程对用户透明，不中断当前操作
- API 请求遇到 401 错误时自动尝试刷新并重试
- 刷新失败时显示友好提示并引导重新登录

#### 2.2.2 Token 生命周期

```
Token 创建 (0%)
    
正常使用期 (0% - 85%)
    
自动刷新窗口 (85% - 100%)   后台自动刷新
    
即将过期 (95% - 100%)       显示超时提醒（可选）
    
已过期 (100%)               强制刷新或退出
```

#### 2.2.3 实现方案

**TokenManager 工具类：**
```typescript
// utils/tokenManager.ts
interface TokenInfo {
  token: string;
  expiresAt: number;
  issuedAt: number;
  refreshToken?: string;
}

class TokenManager {
  private refreshTimer: NodeJS.Timeout | null = null;
  private tokenInfo: TokenInfo | null = null;
  private onRefreshCallback: (() => Promise<void>) | null = null;
  
  /**
   * 设置 token 信息
   */
  setToken(token: string, refreshToken?: string): void {
    try {
      const payload = this.parseJWT(token);
      this.tokenInfo = {
        token,
        expiresAt: payload.exp * 1000,
        issuedAt: payload.iat * 1000,
        refreshToken,
      };
    } catch (error) {
      console.error('Failed to parse token:', error);
      this.tokenInfo = null;
    }
  }
  
  /**
   * 解析 JWT token
   */
  private parseJWT(token: string): any {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }
  
  /**
   * 获取 token 剩余时间（毫秒）
   */
  getTimeUntilExpiry(): number {
    if (!this.tokenInfo) return 0;
    return Math.max(0, this.tokenInfo.expiresAt - Date.now());
  }
  
  /**
   * 获取 token 生命周期百分比
   */
  getLifetimePercentage(): number {
    if (!this.tokenInfo) return 0;
    const totalLifetime = this.tokenInfo.expiresAt - this.tokenInfo.issuedAt;
    const elapsed = Date.now() - this.tokenInfo.issuedAt;
    return Math.min(100, (elapsed / totalLifetime) * 100);
  }
  
  /**
   * 判断是否需要刷新
   */
  shouldRefresh(): boolean {
    if (!this.tokenInfo) return false;
    const percentage = this.getLifetimePercentage();
    return percentage >= 85 && percentage < 100;
  }
  
  /**
   * 判断是否已过期
   */
  isExpired(): boolean {
    if (!this.tokenInfo) return true;
    return Date.now() >= this.tokenInfo.expiresAt;
  }
  
  /**
   * 启动自动刷新
   */
  startAutoRefresh(onRefresh: () => Promise<void>): void {
    this.onRefreshCallback = onRefresh;
    this.stopAutoRefresh();
    
    // 每分钟检查一次
    const checkInterval = 60 * 1000;
    
    this.refreshTimer = setInterval(async () => {
      if (this.shouldRefresh()) {
        console.log('[TokenManager] Auto-refreshing token...');
        try {
          await this.onRefreshCallback?.();
        } catch (error) {
          console.error('[TokenManager] Auto-refresh failed:', error);
        }
      }
    }, checkInterval);
    
    console.log('[TokenManager] Auto-refresh started');
  }
  
  /**
   * 停止自动刷新
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('[TokenManager] Auto-refresh stopped');
    }
  }
  
  /**
   * 清理 token 信息
   */
  clear(): void {
    this.stopAutoRefresh();
    this.tokenInfo = null;
    this.onRefreshCallback = null;
  }
}

export const tokenManager = new TokenManager();
```


**API Client 拦截器：**
```typescript
// api/client.ts
class ApiClient {
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];
  
  async request<T>(endpoint: string, options?: RequestInit): Promise<Result<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options?.headers,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      // 401 错误，尝试刷新 token
      if (response.status === 401 && this.token) {
        return await this.handleUnauthorized(endpoint, options);
      }

      const result: Result<T> = await response.json();

      if (result.code !== 200) {
        throw new ApiError(result.code, result.message);
      }

      return result;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  private async handleUnauthorized<T>(
    endpoint: string, 
    options?: RequestInit
  ): Promise<Result<T>> {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new ApiError(401, 'No refresh token available');
    }
    
    // 如果正在刷新，等待刷新完成后重试
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshSubscribers.push((newToken: string) => {
          this.request<T>(endpoint, options).then(resolve).catch(reject);
        });
      });
    }
    
    this.isRefreshing = true;
    
    try {
      // 刷新 token
      const result = await this.auth.refreshToken(refreshToken);
      const newToken = result.data.token;
      
      // 更新 token
      this.setToken(newToken);
      tokenManager.setToken(newToken, refreshToken);
      
      // 通知所有等待的请求
      this.refreshSubscribers.forEach(callback => callback(newToken));
      this.refreshSubscribers = [];
      
      // 重试原请求
      return await this.request<T>(endpoint, options);
    } catch (error) {
      // 刷新失败，清理状态
      this.clearToken();
      tokenManager.clear();
      throw new ApiError(401, 'Token refresh failed');
    } finally {
      this.isRefreshing = false;
    }
  }
}
```

**AppContext 集成：**
```typescript
// context/AppContext.tsx
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // ... 其他状态
  
  // Token 自动刷新
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (token && refreshToken) {
        tokenManager.setToken(token, refreshToken);
        tokenManager.startAutoRefresh(async () => {
          await handleTokenRefresh();
        });
      }
    }
    
    return () => {
      tokenManager.stopAutoRefresh();
    };
  }, [isAuthenticated, user]);
  
  const handleTokenRefresh = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const result = await apiClient.auth.refreshToken(refreshToken);
      const newToken = result.data.token;
      
      // 更新 token
      apiClient.setToken(newToken);
      tokenManager.setToken(newToken, refreshToken);
      
      console.log('[Auth] Token refreshed successfully');
    } catch (error) {
      console.error('[Auth] Token refresh failed:', error);
      showToast('会话已过期，请重新登录', 'error');
      await logout();
    }
  };
  
  // ... 返回 Provider
};
```

### 2.3 "记住我"功能

#### 2.3.1 设计原则
- 用户可以选择是否记住登录状态
- 勾选"记住我"后，token 有效期延长至 30 天
- 未勾选时，token 有效期为 1 天
- 用户可以在设置中管理"记住我"状态

#### 2.3.2 实现方案

**Login 页面：**
```typescript
// pages/Login.tsx
export const Login: React.FC = () => {
  const { login } = useAppContext();
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
    rememberMe: false,  // 新增
  });
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login({
        username: loginForm.username,
        password: loginForm.password,
      }, false, loginForm.rememberMe);  // 传递 rememberMe 参数
    } catch (error) {
      // 处理错误
    }
  };
  
  return (
    <div className="login-container">
      <form onSubmit={handleLogin}>
        {/* 用户名输入 */}
        <input
          type="text"
          value={loginForm.username}
          onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
        />
        
        {/* 密码输入 */}
        <input
          type="password"
          value={loginForm.password}
          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
        />
        
        {/* 记住我复选框 */}
        <label className="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            checked={loginForm.rememberMe}
            onChange={(e) => setLoginForm({ ...loginForm, rememberMe: e.target.checked })}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <span className="text-sm text-slate-700">记住我（30天内自动登录）</span>
        </label>
        
        <button type="submit">登录</button>
      </form>
    </div>
  );
};
```

**AppContext login 方法：**
```typescript
// context/AppContext.tsx
const login = async (
  credentials: UserLoginRequest, 
  navigateToAdmin: boolean = false,
  rememberMe: boolean = false
) => {
  try {
    // 调用登录 API，传递 rememberMe 参数
    const result = await apiClient.auth.login({
      ...credentials,
      rememberMe,
    });
    
    // 存储 token
    apiClient.setToken(result.data.token);
    
    // 存储 refresh token
    if (result.data.refreshToken) {
      localStorage.setItem('refreshToken', result.data.refreshToken);
    }
    
    // 存储用户数据
    localStorage.setItem('user', JSON.stringify(result.data.user));
    
    // 存储 rememberMe 状态
    localStorage.setItem('rememberMe', rememberMe.toString());
    
    // 更新状态
    setUser(result.data.user);
    setIsAuthenticated(true);
    setRememberMe(rememberMe);
    
    // 启动 token 自动刷新
    tokenManager.setToken(result.data.token, result.data.refreshToken);
    tokenManager.startAutoRefresh(handleTokenRefresh);
    
    // 导航
    if (navigateToAdmin && result.data.user.planType === 999) {
      navigate('admin');
    } else {
      navigate('dashboard');
    }
  } catch (error) {
    // 清理状态
    apiClient.clearToken();
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    setUser(null);
    setIsAuthenticated(false);
    throw error;
  }
};
```

**后端 API 调整：**
```java
// AuthController.java
@PostMapping("/login")
public Result<LoginResponse> login(@RequestBody UserLoginRequest request) {
    // 验证用户凭据
    User user = authService.authenticate(request.getUsername(), request.getPassword());
    
    // 根据 rememberMe 设置不同的过期时间
    long expirationTime = request.isRememberMe() 
        ? 30 * 24 * 60 * 60  // 30 天
        : 24 * 60 * 60;      // 1 天
    
    // 生成 token
    String token = jwtTokenProvider.generateToken(user.getId(), expirationTime);
    String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());
    
    // 构建响应
    LoginResponse response = new LoginResponse();
    response.setToken(token);
    response.setRefreshToken(refreshToken);
    response.setExpiresIn(expirationTime);
    response.setUser(userConverter.toResponse(user));
    
    return Result.success(response);
}
```

### 2.4 会话超时提醒

#### 2.4.1 设计原则
- 在 token 即将过期前 2 分钟显示提醒
- 提醒对话框显示倒计时
- 用户可以选择继续使用（刷新 token）或退出登录
- 提醒不应干扰用户当前操作（非模态）

#### 2.4.2 实现方案

**SessionTimeoutDialog 组件：**
```typescript
// components/SessionTimeoutDialog.tsx
interface SessionTimeoutDialogProps {
  expiresAt: number;
  onContinue: () => void;
  onLogout: () => void;
  onClose: () => void;
}

export const SessionTimeoutDialog: React.FC<SessionTimeoutDialogProps> = ({
  expiresAt,
  onContinue,
  onLogout,
  onClose,
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  
  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, expiresAt - Date.now());
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        onLogout();
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [expiresAt, onLogout]);
  
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white dark:bg-surface-dark rounded-xl shadow-2xl border border-slate-200 dark:border-border-dark p-6 animate-slide-up z-50">
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
      >
        <Icon name="close" />
      </button>
      
      {/* 图标 */}
      <div className="flex items-center gap-4 mb-4">
        <div className="size-12 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
          <Icon name="schedule" className="text-2xl text-amber-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            会话即将过期
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            您的登录会话即将过期
          </p>
        </div>
      </div>
      
      {/* 倒计时 */}
      <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
          {formatTime(timeLeft)}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          剩余时间
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={onContinue}
          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
        >
          继续使用
        </button>
        <button
          onClick={onLogout}
          className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium rounded-lg transition-colors"
        >
          退出登录
        </button>
      </div>
    </div>
  );
};
```

**useSessionTimeout Hook：**
```typescript
// hooks/useSessionTimeout.ts
export const useSessionTimeout = (
  enabled: boolean,
  expiresAt: number | null,
  onRefresh: () => Promise<void>,
  onLogout: () => Promise<void>
) => {
  const [showWarning, setShowWarning] = useState(false);
  const WARNING_THRESHOLD = 2 * 60 * 1000; // 2 分钟
  
  useEffect(() => {
    if (!enabled || !expiresAt) {
      setShowWarning(false);
      return;
    }
    
    const checkTimeout = () => {
      const timeUntilExpiry = expiresAt - Date.now();
      
      if (timeUntilExpiry <= WARNING_THRESHOLD && timeUntilExpiry > 0) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    };
    
    checkTimeout();
    const interval = setInterval(checkTimeout, 10000); // 每 10 秒检查一次
    
    return () => clearInterval(interval);
  }, [enabled, expiresAt]);
  
  const handleContinue = async () => {
    setShowWarning(false);
    await onRefresh();
  };
  
  const handleLogout = async () => {
    setShowWarning(false);
    await onLogout();
  };
  
  const handleClose = () => {
    setShowWarning(false);
  };
  
  return {
    showWarning,
    handleContinue,
    handleLogout,
    handleClose,
  };
};
```

**AppContext 集成：**
```typescript
// context/AppContext.tsx
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [showSessionTimeout, setShowSessionTimeout] = useState(true); // 用户可在设置中关闭
  
  // 会话超时提醒
  const {
    showWarning,
    handleContinue,
    handleLogout,
    handleClose,
  } = useSessionTimeout(
    showSessionTimeout && isAuthenticated,
    sessionExpiresAt,
    handleTokenRefresh,
    logout
  );
  
  // 登录时设置过期时间
  const login = async (...) => {
    // ... 登录逻辑
    
    // 设置会话过期时间
    const tokenInfo = tokenManager.parseToken(result.data.token);
    setSessionExpiresAt(tokenInfo.expiresAt);
  };
  
  return (
    <AppContext.Provider value={{ /* ... */ }}>
      {children}
      
      {/* 会话超时提醒对话框 */}
      {showWarning && sessionExpiresAt && (
        <SessionTimeoutDialog
          expiresAt={sessionExpiresAt}
          onContinue={handleContinue}
          onLogout={handleLogout}
          onClose={handleClose}
        />
      )}
    </AppContext.Provider>
  );
};
```


### 2.5 优化加载状态 UI

#### 2.5.1 设计原则
- 提供品牌化的加载体验
- 不同场景显示不同的加载提示
- 加载动画流畅且符合品牌风格
- 长时间加载时提供额外信息

#### 2.5.2 加载场景

| 场景 | 提示文本 | 持续时间 |
|------|----------|----------|
| 应用初始化 | "正在初始化..." | 1-3秒 |
| 用户登录 | "登录中..." | 1-2秒 |
| Token 刷新 | "正在刷新会话..." | <1秒 |
| 数据加载 | "加载中..." | 1-5秒 |
| 页面切换 | 无加载屏（使用骨架屏） | <1秒 |

#### 2.5.3 实现方案

**LoadingScreen 组件：**
```typescript
// components/LoadingScreen.tsx
interface LoadingScreenProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = '加载中...',
  showProgress = false,
  progress = 0,
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50 dark:bg-[#020617] z-50">
      <div className="text-center">
        {/* Logo 动画 */}
        <div className="size-16 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-6 mx-auto animate-pulse shadow-lg shadow-indigo-600/30">
          <svg 
            className="w-8 h-8" 
            fill="none" 
            stroke="currentColor" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            viewBox="0 0 24 24"
          >
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
          </svg>
        </div>
        
        {/* 加载提示 */}
        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-4">
          {message}
        </p>
        
        {/* 进度条（可选） */}
        {showProgress && (
          <div className="w-48 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mx-auto">
            <div 
              className="h-full bg-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        
        {/* 加载动画 */}
        <div className="flex items-center justify-center gap-1 mt-4">
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
```

**Skeleton Screen 组件：**
```typescript
// components/SkeletonScreen.tsx
export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl p-6 border border-slate-200 dark:border-border-dark animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="size-12 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="flex-1">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
      </div>
    </div>
  );
};

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};
```

**App.tsx 使用：**
```typescript
// App.tsx
const AppContent: React.FC = () => {
  const { isInitialized } = useAppContext();

  // 应用初始化加载
  if (!isInitialized) {
    return <LoadingScreen message="正在初始化应用..." />;
  }

  // ... 其他逻辑
};
```

**页面级加载状态：**
```typescript
// pages/Dashboard.tsx
export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tools, setTools] = useState<ToolResponse[]>([]);
  
  useEffect(() => {
    loadTools();
  }, []);
  
  const loadTools = async () => {
    setLoading(true);
    try {
      const result = await apiClient.tools.list();
      setTools(result.data.records);
    } catch (error) {
      // 处理错误
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="p-6">
        <SkeletonList count={6} />
      </div>
    );
  }
  
  return (
    <div className="p-6">
      {/* 工具列表 */}
    </div>
  );
};
```

## 3. 数据模型

### 3.1 前端数据模型

```typescript
// types.ts

// Token 信息
interface TokenInfo {
  token: string;
  refreshToken: string;
  expiresAt: number;
  issuedAt: number;
}

// 用户偏好
interface UserPreferences {
  rememberMe: boolean;
  showSessionTimeout: boolean;
  language: Language;
  theme: Theme;
}

// 登录请求（扩展）
interface UserLoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;  // 新增
}

// 登录响应（扩展）
interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;      // Token 有效期（秒）
  user: UserResponse;
}

// Token 刷新响应
interface RefreshTokenResponse {
  token: string;
  expiresIn: number;
}
```

### 3.2 后端数据模型

```java
// UserLoginRequest.java
@Data
public class UserLoginRequest {
    @NotBlank(message = "用户名不能为空")
    private String username;
    
    @NotBlank(message = "密码不能为空")
    private String password;
    
    private Boolean rememberMe = false;  // 新增
}

// LoginResponse.java
@Data
public class LoginResponse {
    private String token;
    private String refreshToken;
    private Long expiresIn;  // 秒
    private UserResponse user;
}

// RefreshTokenRequest.java
@Data
public class RefreshTokenRequest {
    @NotBlank(message = "Refresh token 不能为空")
    private String refreshToken;
}
```

## 4. API 设计

### 4.1 认证相关 API

#### 登录（支持记住我）
```
POST /api/v1/auth/login
Content-Type: application/json

Request:
{
  "username": "user123",
  "password": "password123",
  "rememberMe": true
}

Response:
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 2592000,  // 30天（秒）
    "user": {
      "id": 1,
      "username": "user123",
      "email": "user@example.com",
      "planType": 1
    }
  }
}
```

#### 刷新 Token
```
POST /api/v1/auth/refresh
Content-Type: application/json

Request:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response:
{
  "code": 200,
  "message": "Token 刷新成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 86400  // 1天（秒）
  }
}
```

#### 工具使用统计（支持匿名）
```
POST /api/v1/tools/{id}/use
Authorization: Bearer {token}  // 可选

Response:
{
  "code": 200,
  "message": "使用记录已保存"
}
```

## 5. 配置参数

### 5.1 前端配置

```typescript
// config/auth.ts
export const AUTH_CONFIG = {
  // Token 刷新配置
  REFRESH_BEFORE_EXPIRY_PERCENTAGE: 0.15,  // 剩余 15% 时刷新
  TOKEN_CHECK_INTERVAL: 60 * 1000,         // 1 分钟检查一次
  
  // 会话超时提醒
  SESSION_TIMEOUT_WARNING: 2 * 60 * 1000,  // 提前 2 分钟提醒
  SESSION_TIMEOUT_CHECK_INTERVAL: 10 * 1000, // 10 秒检查一次
  
  // Token 有效期（由后端控制，前端仅用于显示）
  REMEMBER_ME_DURATION: 30 * 24 * 60 * 60,  // 30 天
  NORMAL_DURATION: 24 * 60 * 60,            // 1 天
  
  // 重试配置
  MAX_REFRESH_RETRIES: 3,
  RETRY_DELAY: 1000,  // 1 秒
};
```

### 5.2 后端配置

```yaml
# application.yml
jwt:
  secret: ${JWT_SECRET:your-secret-key}
  expiration:
    normal: 86400      # 1 天（秒）
    remember-me: 2592000  # 30 天（秒）
  refresh-token:
    expiration: 7776000  # 90 天（秒）
```

## 6. 安全考虑

### 6.1 Token 安全
- Access Token 存储在 localStorage（考虑 XSS 风险）
- Refresh Token 存储在 localStorage（未来可改为 HttpOnly Cookie）
- 实施 Content Security Policy (CSP)
- 定期轮换 Refresh Token

### 6.2 API 安全
- 所有敏感操作需要验证 token
- 实施速率限制（防止暴力破解）
- 记录异常登录行为
- 支持多设备登录管理

### 6.3 匿名用户限制
- 基于 IP 的速率限制
- 限制单个 IP 的并发请求数
- 记录匿名用户行为用于分析

## 7. 性能优化

### 7.1 前端优化
- Token 刷新使用防抖机制
- 并发请求共享刷新流程
- 使用骨架屏减少感知加载时间
- 懒加载非关键组件

### 7.2 后端优化
- Token 验证使用缓存
- 数据库查询优化（索引）
- 使用 Redis 缓存用户会话
- 异步处理统计数据

## 8. 测试策略

### 8.1 单元测试
- TokenManager 类的所有方法
- Token 刷新逻辑
- 会话超时检测
- 权限检查函数

### 8.2 集成测试
- 登录流程（记住我 vs 不记住我）
- Token 自动刷新流程
- 会话超时处理
- 游客模式功能限制

### 8.3 E2E 测试
- 游客使用工具流程
- 完整登录到退出流程
- Token 过期场景
- 多设备登录场景

## 9. 部署和监控

### 9.1 部署清单
- [ ] 更新前端代码
- [ ] 更新后端 API
- [ ] 配置环境变量
- [ ] 数据库迁移（如需要）
- [ ] 清理旧版本缓存

### 9.2 监控指标
- Token 刷新成功率
- 会话超时率
- 游客转化率
- API 响应时间
- 错误率

## 10. 回滚计划

如果出现严重问题，可以快速回滚：

1. 恢复旧版本代码
2. 清理新版本的 localStorage 数据
3. 通知用户重新登录
4. 分析问题并修复

## 11. 文档和培训

### 11.1 用户文档
- 游客模式使用指南
- "记住我"功能说明
- 会话管理最佳实践

### 11.2 开发文档
- API 集成指南
- Token 管理最佳实践
- 故障排查指南

