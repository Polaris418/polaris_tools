import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { Notifications } from './pages/Notifications';
import { EmailPreferences } from './pages/EmailPreferences';
import { Favorites } from './pages/Favorites';
import { History } from './pages/History';
import { CategoryDetail } from './pages/CategoryDetail';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Contact } from './pages/Contact';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminTools } from './pages/admin/AdminTools';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminEmails } from './pages/admin/AdminEmails';
import { AdminEmailTemplates } from './pages/admin/AdminEmailTemplates';
import { AdminEmailQueue } from './pages/admin/AdminEmailQueue';
import { AdminSuppressionList } from './pages/admin/AdminSuppressionList';
import { AdminSubscriptions } from './pages/admin/AdminSubscriptions';
import { AdminStatistics } from './pages/admin/AdminStatistics';
import { AdminMonitoring } from './pages/admin/AdminMonitoring';
import { AdminNotifications } from './pages/admin/AdminNotifications';
import { VerificationMonitoring } from './pages/admin/VerificationMonitoring';
import { Md2Word } from './tools/md2word';
import { WordCounter } from './tools/WordCounter';
import { ColorConverter } from './tools/ColorConverter';
import { CaseConverter } from './tools/CaseConverter';
import { Base64Encoder } from './tools/Base64Encoder';
import { UrlEncoder } from './tools/UrlEncoder';
import { UuidGenerator } from './tools/UuidGenerator';
import { TimestampConverter } from './tools/TimestampConverter';
import { PasswordGenerator } from './tools/PasswordGenerator';
import { Icon } from './components/Icon';
import { CATEGORIES, USER } from './constants';
import { AppProvider, useAppContext } from './context/AppContext';
import { LoadingScreen } from './components/LoadingScreen';
import type { AdminPage, Page } from './context/AppContext';
import { createAvatar } from '@dicebear/core';
import { 
  lorelei, 
  avataaars, 
  bottts, 
  initials, 
  pixelArt,
  thumbs,
  funEmoji,
  bigSmile
} from '@dicebear/collection';
import { encodeSvgToDataUri } from './utils/encoding';

const AppContent: React.FC = () => {
  const { page, currentToolId, navigate, user, isAdmin, isAuthenticated, isInitialized, adminPage, setAdminPage, t, isGuest, canAccessFeature, promptLogin } = useAppContext();

  // Convert UserResponse to legacy User format for Sidebar
  const legacyUser = React.useMemo(() => {
    if (!user) return null;
    
    // Use the same avatar generation logic as Profile page
    const avatarStyle = user.avatar || 'lorelei';
    // Parse avatarConfig if available
    let parsedConfig: Record<string, any> = {};
    if (user.avatarConfig) {
      try {
        parsedConfig = JSON.parse(user.avatarConfig);
      } catch (error) {
        console.error('Failed to parse avatarConfig in Sidebar:', error);
      }
    }
    
    // 使用保存的 seed，如果没有则使用用户名
    const seed = parsedConfig.seed || user.username;
    
    // Map style ID to style module
    const styleMap: Record<string, any> = {
      'lorelei': lorelei,
      'avataaars': avataaars,
      'bottts': bottts,
      'pixelArt': pixelArt,
      'thumbs': thumbs,
      'funEmoji': funEmoji,
      'bigSmile': bigSmile,
      'initials': initials,
    };
    
    const style = styleMap[avatarStyle] || lorelei;
    
    try {
      // @ts-ignore - DiceBear styles have different option types
      const avatar = createAvatar(style, {
        seed,
        size: 128,
        ...parsedConfig,
      });
      
      // Convert to data URI using the encoding utility
      const avatarUrl = encodeSvgToDataUri(avatar.toString());
      
      // Map planType to plan name
      const getPlanName = (planType: number): string => {
        switch (planType) {
          case 0: return 'Free';
          case 1: return 'Pro';
          case 2: return 'Enterprise';
          case 999: return 'Admin';
          default: return 'Free';
        }
      };
      
      const getPlanNameZh = (planType: number): string => {
        switch (planType) {
          case 0: return '免费版';
          case 1: return '专业版';
          case 2: return '企业版';
          case 999: return '管理员';
          default: return '免费版';
        }
      };
      
      return {
        name: user.nickname || user.username,
        plan: getPlanName(user.planType),
        plan_zh: getPlanNameZh(user.planType),
        avatarUrl: avatarUrl,
      };
    } catch (error) {
      console.error('Avatar generation error in Sidebar:', error);
      return {
        name: user.nickname || user.username,
        plan: user.planType === 999 ? 'Admin' : 'Free',
        plan_zh: user.planType === 999 ? '管理员' : '免费版',
        avatarUrl: '',
      };
    }
  }, [user]);

  // Check feature access permissions when page changes
  // Requirements: 1.2, 1.4
  React.useEffect(() => {
    // Skip check for standalone pages (login, register, reset-password, verify-email, privacy, terms, contact)
    if (page === 'login' || page === 'register' || page === 'reset-password' || page === 'verify-email' || page === 'privacy' || page === 'terms' || page === 'contact') {
      return;
    }

    // Check if guest can access the current page
    if (!canAccessFeature(page)) {
      // Guest trying to access restricted feature, show login prompt
      promptLogin(`访问"${getPageName(page)}"功能需要登录`);
      navigate('dashboard');
    }
  }, [page, canAccessFeature, promptLogin, navigate]);

  // Helper function to get page display name
  const getPageName = (pageName: Page): string => {
    const pageNames: Record<Page, string> = {
      dashboard: '首页',
      login: '登录',
      register: '注册',
      'reset-password': '重置密码',
      settings: '设置',
      profile: '个人资料',
      'email-preferences': '邮件偏好',
      notifications: '通知中心',
      favorites: '我的收藏',
      history: '使用历史',
      category: '分类',
      tool: '工具',
      admin: '管理后台',
    };
    return pageNames[pageName] || pageName;
  };

  // Show loading screen while checking authentication
  // Requirements: 5.1, 5.2, 5.3
  if (!isInitialized) {
    return <LoadingScreen message={t('app.loading')} />;
  }

  // Standalone pages (no sidebar/header)
  if (page === 'login') {
    return <Login />;
  }
  if (page === 'register') {
    return <Register />;
  }
  if (page === 'reset-password') {
    return <ResetPassword />;
  }
  if (page === 'verify-email') {
    return <VerifyEmail />;
  }
  if (page === 'privacy') {
    return <Privacy />;
  }
  if (page === 'terms') {
    return <Terms />;
  }
  if (page === 'contact') {
    return <Contact />;
  }

  // Guest mode: Allow unauthenticated users to access the app
  // No forced redirect to login page

  // Admin Panel
  if (page === 'admin') {
    if (!isAdmin) {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#020617]">
          <div className="text-center p-8">
            <div className="size-20 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Icon name="block" className="text-4xl text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('access.no_permission')}</h2>
            <p className="text-slate-500 dark:text-text-secondary max-w-md mb-8">
              {t('access.no_admin_permission')}
            </p>
            <button 
              onClick={() => navigate('dashboard')}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              {t('access.back_home')}
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <AdminLayout currentPage={adminPage} onNavigate={setAdminPage}>
        {adminPage === 'dashboard' && <AdminDashboard onNavigate={setAdminPage} />}
        {adminPage === 'users' && <AdminUsers />}
        {adminPage === 'tools' && <AdminTools />}
        {adminPage === 'categories' && <AdminCategories />}
        {adminPage === 'emails' && <AdminEmails />}
        {adminPage === 'templates' && <AdminEmailTemplates />}
        {adminPage === 'queue' && <AdminEmailQueue />}
        {adminPage === 'suppression' && <AdminSuppressionList />}
        {adminPage === 'subscriptions' && <AdminSubscriptions />}
        {adminPage === 'statistics' && <AdminStatistics />}
        {adminPage === 'monitoring' && <AdminMonitoring />}
        {adminPage === 'verification-monitoring' && <VerificationMonitoring />}
        {adminPage === 'notifications' && <AdminNotifications />}
      </AdminLayout>
    );
  }

  /**
   * 工具路由渲染函数
   * 根据 toolId (path) 渲染对应的工具组件
   * 
   * 添加新工具步骤：
   * 1. 在 constants.ts 的 TOOL_REGISTRY 中添加工具配置
   * 2. 在 tools/ 文件夹创建工具组件
   * 3. 在这里添加 case 分支
   */
  const renderTool = () => {
    switch (currentToolId) {
      case 'word-counter':
        return <WordCounter />;
      
      case 'color-converter':
        return <ColorConverter />;
      
      case 'md2word':
        return <Md2Word />;
      
      case 'case-converter':
        return <CaseConverter />;
      
      case 'base64-encoder':
        return <Base64Encoder />;
      
      case 'url-encoder':
        return <UrlEncoder />;
      
      case 'uuid-generator':
        return <UuidGenerator />;
      
      case 'timestamp-converter':
        return <TimestampConverter />;
      
      case 'password-generator':
        return <PasswordGenerator />;
      
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="size-20 bg-slate-100 dark:bg-[#1e293b] rounded-2xl flex items-center justify-center mb-6">
              <Icon name="construction" className="text-4xl text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('tool.under_construction')}</h2>
            <p className="text-slate-500 dark:text-text-secondary max-w-md mb-8">
              {t('tool.not_implemented', { toolId: currentToolId || '' })}
            </p>
            <button 
              onClick={() => navigate('dashboard')}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              {t('tool.go_back_dashboard')}
            </button>
          </div>
        );
    }
  };

  // Application Layout
  return (
    <div className="flex w-full h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white transition-colors duration-300">
      <Sidebar categories={CATEGORIES} user={legacyUser} />
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <Header />
        {page === 'dashboard' && <Dashboard />}
        {page === 'settings' && <Settings />}
        {page === 'profile' && <Profile />}
        {page === 'email-preferences' && <EmailPreferences />}
        {page === 'notifications' && <Notifications />}
        {page === 'favorites' && <Favorites />}
        {page === 'history' && <History />}
        {page === 'category' && <CategoryDetail />}
        {page === 'tool' && renderTool()}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
