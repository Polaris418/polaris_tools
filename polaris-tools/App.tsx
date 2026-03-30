import React from 'react';
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
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
import { Icon } from './components/Icon';
import { CATEGORIES } from './constants';
import { AppProvider, useAppContext } from './context/AppContext';
import { LoadingScreen } from './components/LoadingScreen';
import { AdminRoute, ProtectedRoute } from './router';
import { getToolRegistryItem } from './toolRegistry';
import type { Page } from './context/AppContext';
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

const Privacy = React.lazy(() => import('./pages/Privacy').then((m) => ({ default: m.Privacy })));
const Terms = React.lazy(() => import('./pages/Terms').then((m) => ({ default: m.Terms })));
const Contact = React.lazy(() => import('./pages/Contact').then((m) => ({ default: m.Contact })));

const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers').then((m) => ({ default: m.AdminUsers })));
const AdminTools = React.lazy(() => import('./pages/admin/AdminTools').then((m) => ({ default: m.AdminTools })));
const AdminCategories = React.lazy(() => import('./pages/admin/AdminCategories').then((m) => ({ default: m.AdminCategories })));
const AdminEmails = React.lazy(() => import('./pages/admin/AdminEmails').then((m) => ({ default: m.AdminEmails })));
const AdminEmailTemplates = React.lazy(() => import('./pages/admin/AdminEmailTemplates').then((m) => ({ default: m.AdminEmailTemplates })));
const AdminEmailQueue = React.lazy(() => import('./pages/admin/AdminEmailQueue').then((m) => ({ default: m.AdminEmailQueue })));
const AdminSuppressionList = React.lazy(() => import('./pages/admin/AdminSuppressionList').then((m) => ({ default: m.AdminSuppressionList })));
const AdminSubscriptions = React.lazy(() => import('./pages/admin/AdminSubscriptions').then((m) => ({ default: m.AdminSubscriptions })));
const AdminStatistics = React.lazy(() => import('./pages/admin/AdminStatistics').then((m) => ({ default: m.AdminStatistics })));
const AdminMonitoring = React.lazy(() => import('./pages/admin/AdminMonitoring').then((m) => ({ default: m.AdminMonitoring })));
const AdminNotifications = React.lazy(() => import('./pages/admin/AdminNotifications').then((m) => ({ default: m.AdminNotifications })));
const VerificationMonitoring = React.lazy(() => import('./pages/admin/VerificationMonitoring').then((m) => ({ default: m.VerificationMonitoring })));
const AdminAiProviders = React.lazy(() => import('./pages/admin/AdminAiProviders').then((m) => ({ default: m.AdminAiProviders })));

const MainLayout: React.FC<{ legacyUser: any }> = ({ legacyUser }) => {
  return (
    <div className="flex w-full h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white transition-colors duration-300">
      <Sidebar categories={CATEGORIES} user={legacyUser} />
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <Header />
        <Outlet />
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const {
    page,
    currentToolId,
    user,
    isAdmin,
    isInitialized,
    adminPage,
    setAdminPage,
    t,
    canAccessFeature,
    promptLogin,
  } = useAppContext();
  const navigate = useNavigate();

  const legacyUser = React.useMemo(() => {
    if (!user) return null;

    const avatarStyle = user.avatar || 'lorelei';
    let parsedConfig: Record<string, any> = {};
    if (user.avatarConfig) {
      try {
        parsedConfig = JSON.parse(user.avatarConfig);
      } catch (error) {
        console.error('Failed to parse avatarConfig in Sidebar:', error);
      }
    }

    const seed = parsedConfig.seed || user.username;

    const styleMap: Record<string, any> = {
      lorelei,
      avataaars,
      bottts,
      pixelArt,
      thumbs,
      funEmoji,
      bigSmile,
      initials,
    };

    const style = styleMap[avatarStyle] || lorelei;

    try {
      const avatar = createAvatar(style, {
        seed,
        size: 128,
        ...parsedConfig,
      });

      const avatarUrl = encodeSvgToDataUri(avatar.toString());

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
        avatarUrl,
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

  React.useEffect(() => {
    if (
      page === 'login' ||
      page === 'register' ||
      page === 'reset-password' ||
      page === 'verify-email' ||
      page === 'privacy' ||
      page === 'terms' ||
      page === 'contact' ||
      page === 'notifications' ||
      page === 'email-preferences' ||
      page === 'admin'
    ) {
      return;
    }

    if (!canAccessFeature(page)) {
      promptLogin(`访问"${getPageName(page)}"功能需要登录`);
      navigate('/');
    }
  }, [page, canAccessFeature, promptLogin, navigate]);

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
      privacy: '隐私',
      terms: '条款',
      contact: '联系我们',
      'verify-email': '邮箱验证',
    };
    return pageNames[pageName] || pageName;
  };

  if (!isInitialized) {
    return <LoadingScreen message={t('app.loading')} />;
  }
  const suspenseFallback = <LoadingScreen message={t('app.loading')} />;
  const currentTool = getToolRegistryItem(currentToolId);

  const renderTool = () => {
    if (currentTool) {
      const ActiveToolComponent = currentTool.component;
      return <ActiveToolComponent />;
    }

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
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
        >
          {t('tool.go_back_dashboard')}
        </button>
      </div>
    );
  };

  const renderAdminContent = () => {
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
              onClick={() => navigate('/')}
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
        {adminPage === 'ai-providers' && <AdminAiProviders />}
      </AdminLayout>
    );
  };

  return (
    <React.Suspense fallback={suspenseFallback}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminRoute>{renderAdminContent()}</AdminRoute>
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<MainLayout legacyUser={legacyUser} />}>
          <Route index element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route
            path="email-preferences"
            element={
              <ProtectedRoute>
                <EmailPreferences />
              </ProtectedRoute>
            }
          />
          <Route
            path="notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route path="favorites" element={<Favorites />} />
          <Route path="history" element={<History />} />
          <Route path="category/:id" element={<CategoryDetail />} />
          <Route path="tool/:toolId" element={renderTool()} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
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
