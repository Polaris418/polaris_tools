# 认证增强功能需求文档

## 功能概述

增强 Polaris Tools 的认证系统，提供更好的用户体验和安全性，同时允许未登录用户使用网站基础功能。

## 用户故事

### 1. 未登录用户访问

**作为** 未登录用户  
**我想要** 能够访问和使用网站的基础功能  
**以便** 在决定注册前先体验产品

**验收标准：**
- 1.1 未登录用户可以访问首页和工具页面
- 1.2 未登录用户可以使用所有工具的基础功能（有次数限制）
- 1.3 未登录用户的使用统计会被匿名记录（用于分析工具使用频率），但不保存个人历史记录和收藏
- 1.4 未登录用户在尝试访问需要登录的功能时，显示友好的提示
- 1.5 页面顶部显示"登录"和"注册"按钮（而不是用户信息）
- 1.6 侧边栏显示简化版本，隐藏需要登录的功能（收藏、个人历史等）
- 1.7 未登录用户的工具使用会增加全局使用计数，但不关联到具体用户
- 1.8 记录游客的工具使用次数（存储在 localStorage）
- 1.9 游客使用次数达到限制（例如：10次）后，强制要求登录才能继续使用
- 1.10 显示剩余使用次数提示，引导用户注册登录

### 2. Token 自动刷新机制

**作为** 已登录用户  
**我想要** 在使用网站时不会因为 token 过期而被强制退出  
**以便** 获得流畅的使用体验

**验收标准：**
- 2.1 系统在 token 即将过期前自动刷新（例如：过期前 5 分钟）
- 2.2 刷新过程对用户透明，不影响当前操作
- 2.3 如果刷新失败，显示友好的提示并引导用户重新登录
- 2.4 在后台定期检查 token 有效期（例如：每 1 分钟检查一次）
- 2.5 API 请求失败时（401 错误），自动尝试刷新 token 并重试请求
- 2.6 如果 refresh token 也过期，清理状态并跳转到登录页

### 3. "记住我"功能

**作为** 用户  
**我想要** 在登录时选择"记住我"  
**以便** 下次访问时不需要重新登录

**验收标准：**
- 3.1 登录页面显示"记住我"复选框
- 3.2 勾选"记住我"后，token 有效期延长（例如：从 1 天延长到 30 天）
- 3.3 未勾选时，使用短期 token（例如：1 天）
- 3.4 "记住我"状态保存在 localStorage 中
- 3.5 用户可以在设置页面查看和管理"记住我"状态
- 3.6 手动退出登录时，清除"记住我"状态

### 4. 会话超时提醒

**作为** 已登录用户  
**我想要** 在会话即将过期时收到提醒  
**以便** 我可以选择继续使用或保存工作

**验收标准：**
- 4.1 在 token 即将过期前 2 分钟显示提醒对话框
- 4.2 对话框显示剩余时间倒计时
- 4.3 提供"继续使用"按钮，点击后自动刷新 token
- 4.4 提供"退出登录"按钮，点击后安全退出
- 4.5 如果用户无操作，倒计时结束后自动退出
- 4.6 提醒对话框不应干扰用户当前操作（非模态，可最小化）
- 4.7 用户可以在设置中关闭超时提醒功能

### 5. 优化加载状态 UI

**作为** 用户  
**我想要** 看到美观且信息丰富的加载状态  
**以便** 了解系统正在做什么

**验收标准：**
- 5.1 应用初始化时显示品牌化的加载屏幕
- 5.2 加载屏幕包含 Logo、进度指示器和加载提示文本
- 5.3 不同的加载场景显示不同的提示文本（初始化、登录中、刷新数据等）
- 5.4 加载动画流畅且符合品牌风格
- 5.5 加载时间超过 3 秒时，显示额外的提示信息
- 5.6 支持骨架屏（Skeleton Screen）用于内容加载
- 5.7 加载失败时显示友好的错误信息和重试选项

## 功能优先级

### P0 (必须实现)
- 1. 未登录用户访问（1.1-1.6）
- 5. 优化加载状态 UI（5.1-5.4）

### P1 (高优先级)
- 2. Token 自动刷新机制（2.1-2.6）
- 3. "记住我"功能（3.1-3.4）

### P2 (中优先级)
- 4. 会话超时提醒（4.1-4.6）
- 3. "记住我"功能（3.5-3.6）
- 5. 优化加载状态 UI（5.5-5.7）

### P3 (低优先级)
- 4. 会话超时提醒（4.7）

## 技术约束

### 前端
- 使用 React Context API 管理认证状态
- 使用 localStorage 存储 token 和用户偏好
- 使用 TypeScript 确保类型安全
- 遵循现有的代码风格和架构

### 后端
- JWT token 机制
- Refresh token 支持
- Token 过期时间可配置
- 支持不同的 token 有效期（记住我 vs 普通登录）

### 安全性
- Token 存储在 localStorage（考虑 XSS 风险）
- Refresh token 使用 HttpOnly Cookie（如果可能）
- 实现 CSRF 保护
- 敏感操作需要重新验证

## 用户体验流程

### 未登录用户流程
```
访问网站 → 显示首页（未登录状态）
         ↓
使用工具 → 正常使用，匿名统计使用次数（不保存个人历史）
         ↓         记录使用次数到 localStorage
         ↓
检查使用次数 → 未达到限制：继续使用
             ↓
             达到限制（如10次）→ 显示强制登录对话框
                                ↓
                                必须登录才能继续使用
```

### 登录用户流程（记住我）
```
登录 → 勾选"记住我" → 获得长期 token (30天)
     ↓
使用网站 → Token 自动刷新（后台进行）
         ↓
关闭浏览器 → 下次访问自动登录
```

### 登录用户流程（不记住我）
```
登录 → 不勾选"记住我" → 获得短期 token (1天)
     ↓
使用网站 → Token 自动刷新（后台进行）
         ↓
Token 即将过期 → 显示超时提醒
                ↓
                选择继续 或 退出
```

## 数据模型

### Token 信息
```typescript
interface TokenInfo {
  token: string;           // JWT access token
  refreshToken: string;    // Refresh token
  expiresAt: number;       // 过期时间戳
  rememberMe: boolean;     // 是否记住我
}
```

### 用户偏好
```typescript
interface UserPreferences {
  rememberMe: boolean;           // 记住我状态
  showSessionTimeout: boolean;   // 显示超时提醒
  language: Language;            // 语言偏好
  theme: Theme;                  // 主题偏好
}

// 游客使用限制
interface GuestUsageLimit {
  count: number;                 // 已使用次数
  limit: number;                 // 使用限制（默认10次）
  lastResetDate: string;         // 上次重置日期（可选：每天重置）
}
```

## API 端点需求

### 前端需要的 API
1. `POST /api/v1/auth/refresh` - 刷新 token
2. `POST /api/v1/auth/login` - 登录（支持 rememberMe 参数）
3. `GET /api/v1/auth/me` - 获取当前用户信息
4. `POST /api/v1/auth/logout` - 退出登录

### API 响应格式
```typescript
// 登录响应
interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;        // 秒数
  user: UserResponse;
}

// 刷新响应
interface RefreshResponse {
  token: string;
  expiresIn: number;
}
```

## 配置项

### 前端配置
```typescript
const AUTH_CONFIG = {
  // Token 刷新时机（过期前多久刷新）
  REFRESH_BEFORE_EXPIRY: 5 * 60 * 1000,  // 5 分钟
  
  // Token 检查间隔
  TOKEN_CHECK_INTERVAL: 60 * 1000,        // 1 分钟
  
  // 会话超时提醒时机
  SESSION_TIMEOUT_WARNING: 2 * 60 * 1000, // 2 分钟
  
  // 记住我的 token 有效期
  REMEMBER_ME_DURATION: 30 * 24 * 60 * 60, // 30 天（秒）
  
  // 普通 token 有效期
  NORMAL_DURATION: 24 * 60 * 60,           // 1 天（秒）
  
  // 游客使用限制
  GUEST_USAGE_LIMIT: 10,                   // 游客最多使用10次
  GUEST_USAGE_WARNING_THRESHOLD: 7,        // 剩余3次时开始提醒
};
```

## 非功能性需求

### 性能
- Token 刷新操作应在 500ms 内完成
- 加载屏幕应在 100ms 内显示
- 页面切换应流畅，无明显卡顿

### 可访问性
- 所有交互元素支持键盘导航
- 提供适当的 ARIA 标签
- 支持屏幕阅读器

### 兼容性
- 支持主流浏览器（Chrome, Firefox, Safari, Edge）
- 支持移动端浏览器
- 降级处理不支持的功能

## 测试要求

### 单元测试
- Token 刷新逻辑
- 会话超时检测
- 记住我功能

### 集成测试
- 登录流程（记住我 vs 不记住我）
- Token 自动刷新
- 会话超时处理

### E2E 测试
- 未登录用户使用流程
- 完整的登录到退出流程
- Token 过期场景

## 风险和缓解措施

### 风险 1: Token 刷新失败导致用户体验中断
**缓解**: 实现重试机制，最多重试 3 次，失败后显示友好提示

### 风险 2: localStorage 被清理导致用户意外退出
**缓解**: 定期检查 token 存在性，提供恢复机制

### 风险 3: 未登录用户滥用资源
**缓解**: 后端实现速率限制（基于 IP），前端添加使用次数提示，匿名统计仍然记录以便分析

### 风险 4: XSS 攻击窃取 token
**缓解**: 实施 CSP 策略，考虑使用 HttpOnly Cookie 存储敏感信息

## 成功指标

- 未登录用户转化率提升 20%
- 用户会话时长增加 30%
- 因 token 过期导致的用户流失减少 80%
- 用户满意度评分提升至 4.5/5.0

## 参考资料

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [React Authentication Patterns](https://kentcdodds.com/blog/authentication-in-react-applications)

## 附录

### A. 现有代码结构
- `polaris-tools/context/AppContext.tsx` - 全局状态管理
- `polaris-tools/api/client.ts` - API 客户端
- `polaris-tools/pages/Login.tsx` - 登录页面
- `polaris-tools/components/Header.tsx` - 顶部导航

### B. 需要修改的文件
1. `AppContext.tsx` - 添加 token 刷新、会话管理逻辑
2. `client.ts` - 添加 token 刷新拦截器
3. `Login.tsx` - 添加"记住我"复选框
4. `Header.tsx` - 根据登录状态显示不同内容
5. `Sidebar.tsx` - 根据登录状态显示不同菜单
6. `App.tsx` - 移除强制登录检查，允许未登录访问

### C. 需要新增的文件
1. `components/SessionTimeoutDialog.tsx` - 会话超时提醒对话框
2. `components/LoadingScreen.tsx` - 优化的加载屏幕
3. `components/LoginPrompt.tsx` - 登录提示对话框
4. `hooks/useTokenRefresh.ts` - Token 刷新 Hook
5. `hooks/useSessionTimeout.ts` - 会话超时 Hook
6. `utils/tokenManager.ts` - Token 管理工具类
