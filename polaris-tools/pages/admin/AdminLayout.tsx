import React, { useState } from 'react';
import { Icon } from '../../components/Icon';
import { useAppContext } from '../../context/AppContext';
import type { AdminPage } from './types';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage: AdminPage;
  onNavigate: (page: AdminPage) => void;
}

/**
 * Admin Layout Component
 * 管理员布局组件 - 包含侧边栏和头部
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, currentPage, onNavigate }) => {
  const { t, theme, toggleTheme, language, toggleLanguage, navigate, user, logout } = useAppContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [emailMenuExpanded, setEmailMenuExpanded] = useState(true);

  // Email-related pages
  const emailPages: AdminPage[] = ['emails', 'templates', 'queue', 'suppression', 'subscriptions', 'monitoring', 'verification-monitoring'];
  
  const menuItems: { 
    id: AdminPage | 'email-group'; 
    icon: string; 
    label: string; 
    isEmailSubItem?: boolean;
  }[] = [
    { id: 'dashboard', icon: 'dashboard', label: t('admin.menu.dashboard') },
    { id: 'users', icon: 'people', label: t('admin.menu.users') },
    { id: 'tools', icon: 'build', label: t('admin.menu.tools') },
    { id: 'categories', icon: 'category', label: t('admin.menu.categories') },
    // Email Management Group (placeholder for rendering)
    { id: 'email-group', icon: 'mail', label: t('admin.menu.email_group') },
    { id: 'emails', icon: 'mail', label: t('admin.menu.emails'), isEmailSubItem: true },
    { id: 'templates', icon: 'description', label: t('admin.menu.templates'), isEmailSubItem: true },
    { id: 'queue', icon: 'queue', label: t('admin.menu.queue'), isEmailSubItem: true },
    { id: 'suppression', icon: 'block', label: t('admin.menu.suppression'), isEmailSubItem: true },
    { id: 'subscriptions', icon: 'subscriptions', label: t('admin.menu.subscriptions'), isEmailSubItem: true },
    { id: 'monitoring', icon: 'monitoring', label: t('admin.menu.monitoring'), isEmailSubItem: true },
    { id: 'verification-monitoring', icon: 'verified_user', label: t('admin.menu.notifications'), isEmailSubItem: true },
    { id: 'statistics', icon: 'analytics', label: t('admin.menu.statistics') },
    { id: 'notifications', icon: 'notifications', label: t('admin.menu.notifications') },
  ];

  // Auto-expand email menu if current page is an email page
  React.useEffect(() => {
    if (emailPages.includes(currentPage)) {
      setEmailMenuExpanded(true);
    }
  }, [currentPage]);

  const getPageTitle = () => {
    const item = menuItems.find(m => m.id === currentPage);
    return item?.label || '';
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleBackToMain = () => {
    navigate('dashboard');
  };

  return (
    <div className="flex w-full h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white transition-colors duration-300">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'} bg-white dark:bg-surface-dark border-r border-slate-200 dark:border-border-dark flex flex-col flex-shrink-0 h-full z-20 transition-all duration-300`}>
        {/* Brand */}
        <div className={`px-4 py-5 flex items-center gap-3 border-b border-slate-200 dark:border-border-dark ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="flex items-center justify-center size-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-lg shadow-indigo-500/20">
            <Icon name="admin_panel_settings" className="text-[20px]" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <h1 className="text-slate-900 dark:text-white text-base font-bold tracking-tight leading-none">
                {t('admin.panel')}
              </h1>
              <p className="text-slate-500 dark:text-text-secondary text-[10px] font-medium leading-normal mt-0.5">
                {t('app.name')}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {menuItems.map((item) => {
            // Skip email sub-items, they'll be rendered in the email group
            if (item.isEmailSubItem) return null;
            
            // Render email management group
            if (item.id === 'email-group') {
              return (
                <div key="email-group" className="flex flex-col">
                  {/* Email Management Header */}
                  <button
                    onClick={() => {
                      if (sidebarCollapsed) {
                        setSidebarCollapsed(false);
                        setEmailMenuExpanded(true);
                      } else {
                        setEmailMenuExpanded(!emailMenuExpanded);
                      }
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                      emailPages.includes(currentPage)
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1e293b] hover:text-slate-900 dark:hover:text-white'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  >
                    <Icon 
                      name="mail" 
                      filled={emailPages.includes(currentPage)}
                      className="text-[20px]" 
                    />
                    {!sidebarCollapsed && (
                      <>
                        <span className="text-sm font-medium flex-1 text-left">
                          {t('admin.menu.email_group')}
                        </span>
                        <Icon 
                          name={emailMenuExpanded ? 'expand_less' : 'expand_more'} 
                          className="text-[20px]" 
                        />
                      </>
                    )}
                  </button>
                  
                  {/* Email Sub-menu */}
                  {!sidebarCollapsed && emailMenuExpanded && (
                    <div className="ml-3 mt-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                      {menuItems
                        .filter(subItem => subItem.isEmailSubItem)
                        .map((subItem) => (
                          <button
                            key={subItem.id}
                            onClick={() => onNavigate(subItem.id as AdminPage)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all w-full ${
                              currentPage === subItem.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1e293b] hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <Icon 
                              name={subItem.icon} 
                              filled={currentPage === subItem.id}
                              className="text-[18px]" 
                            />
                            <span className="text-sm font-medium">
                              {subItem.label}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              );
            }
            
            // Render regular menu items
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as AdminPage)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                  currentPage === item.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1e293b] hover:text-slate-900 dark:hover:text-white'
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
              >
                <Icon 
                  name={item.icon} 
                  filled={currentPage === item.id}
                  className="text-[20px]" 
                />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-border-dark space-y-1">
          {/* Collapse Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1e293b] hover:text-slate-900 dark:hover:text-white transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <Icon name={sidebarCollapsed ? 'chevron_right' : 'chevron_left'} className="text-[20px]" />
            {!sidebarCollapsed && (
              <span className="text-sm font-medium">
                {t('admin.menu.collapse')}
              </span>
            )}
          </button>
          
          {/* Back to Main */}
          <button
            onClick={handleBackToMain}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1e293b] hover:text-slate-900 dark:hover:text-white transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <Icon name="arrow_back" className="text-[20px]" />
            {!sidebarCollapsed && (
              <span className="text-sm font-medium">
                {t('admin.menu.back_main')}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 dark:border-border-dark bg-white/80 dark:bg-surface-dark/90 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0 transition-colors duration-300">
          <div className="flex items-center gap-2 text-slate-500 dark:text-text-secondary text-sm font-medium">
            <span className="text-slate-400 dark:text-slate-500">
              {t('admin.panel')}
            </span>
            <Icon name="chevron_right" className="text-[16px]" />
            <span className="text-slate-900 dark:text-white font-semibold">{getPageTitle()}</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Toggle Theme */}
            <button 
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={t('settings.theme')}
            >
              <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} filled={true} className="text-[20px]" />
            </button>

            {/* Toggle Language */}
            <button 
              onClick={toggleLanguage}
              className="flex items-center justify-center h-9 px-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
              title={t('settings.lang')}
            >
              <Icon name="translate" className="text-[18px] mr-1" />
              {language === 'en' ? 'EN' : '中文'}
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-border-dark mx-1"></div>

            {/* User Info */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {user.nickname || user.username}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
                >
                  <Icon name="logout" className="text-[18px]" />
                  <span>{t('admin.logout')}</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin scrollbar-thumb-slate-700">
          {children}
        </main>
      </div>
    </div>
  );
};
