import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { CategoryCount, User } from '../types';
import { useAppContext } from '../context/AppContext';
import { useCategories } from '../hooks/useCategories';

interface SidebarProps {
  categories: CategoryCount[];
  user: User | null;
}

// 定义菜单项类型
interface MenuItem {
  id: string;
  label: string;
  icon: string;
  page: string;
  guestAllowed: boolean;
  filled?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ categories: staticCategories, user }) => {
  const { t, language, navigate, page, setCategoryPage, currentCategoryId, isGuest, promptLogin, setToolPage } = useAppContext();
  
  // Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Save collapse state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  // 定义菜单项及其访问权限
  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: 'dashboard', page: 'dashboard', guestAllowed: true },
    { id: 'favorites', label: t('nav.favorites'), icon: 'star', page: 'favorites', guestAllowed: false, filled: true },
  ];
  
  // 根据游客模式过滤菜单项
  const visibleMenuItems = isGuest 
    ? menuItems.filter(item => item.guestAllowed)
    : menuItems;
  
  // Fetch dynamic categories from API
  const { data: apiCategories, loading: categoriesLoading } = useCategories();

  // Search tools when query changes
  useEffect(() => {
    const searchTools = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      try {
        // Import apiClient dynamically to avoid circular dependencies
        const { apiClient } = await import('../api/client');
        const result = await apiClient.tools.list({
          page: 1,
          size: 10,
          keyword: searchQuery,
        });
        setSearchResults(result.data.list);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      }
    };

    const debounceTimer = setTimeout(searchTools, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSearchResults(false);
    };
    
    if (showSearchResults) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSearchResults]);

  const handleSearchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleToolClick = (toolUrl: string) => {
    setSearchQuery('');
    setShowSearchResults(false);
    setToolPage(toolUrl);
  };

  const isActive = (p: string) => page === p;
  const isCategoryActive = (categoryId: number) => page === 'category' && currentCategoryId === categoryId;

  /**
   * Get accent color class from API category accentColor field
   */
  const getAccentColorClass = (accentColor?: string): string => {
    if (!accentColor) return 'bg-indigo-500';
    
    // Map common color names to tailwind classes
    const colorMap: { [key: string]: string } = {
      'rose': 'bg-rose-500',
      'indigo': 'bg-indigo-500',
      'purple': 'bg-purple-500',
      'emerald': 'bg-emerald-500',
      'blue': 'bg-blue-500',
      'amber': 'bg-amber-500',
      'cyan': 'bg-cyan-500',
      'pink': 'bg-pink-500',
      'red': 'bg-red-500',
      'green': 'bg-green-500',
      'yellow': 'bg-yellow-500',
      'orange': 'bg-orange-500',
    };

    const lowerColor = accentColor.toLowerCase();
    for (const [key, value] of Object.entries(colorMap)) {
      if (lowerColor.includes(key)) {
        return value;
      }
    }
    
    return 'bg-indigo-500';
  };

  // Use API categories if available, otherwise fall back to static categories
  const displayCategories = apiCategories && apiCategories.length > 0 
    ? apiCategories.filter(cat => cat.status === 1)
    : null;

  return (
    <aside className={`bg-white dark:bg-surface-dark border-r border-slate-200 dark:border-border-dark flex flex-col flex-shrink-0 h-full z-20 transition-all duration-300 ${isCollapsed ? 'w-[72px]' : 'w-[280px]'}`}>
      {/* Brand */}
      <div className={`px-6 py-6 flex items-center gap-3 cursor-pointer ${isCollapsed ? 'justify-center' : ''}`} onClick={() => navigate('dashboard')}>
        <div className="flex items-center justify-center size-8 text-primary dark:text-white flex-shrink-0">
          <svg className="w-full h-full" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"></path>
          </svg>
        </div>
        {!isCollapsed && (
          <div className="flex flex-col overflow-hidden">
            <h1 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight leading-none">{t('app.name')}</h1>
            <p className="text-slate-500 dark:text-text-secondary text-[11px] font-medium leading-normal mt-0.5">{t('app.desc')}</p>
          </div>
        )}
      </div>

      {/* Collapse Toggle Button */}
      <div className={`px-4 mb-4 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#1e293b] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700"
          title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          <Icon name={isCollapsed ? 'menu_open' : 'menu'} className="text-[20px]" />
          {!isCollapsed && (
            <span className="text-xs font-medium">{t('sidebar.collapse')}</span>
          )}
        </button>
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="px-4 mb-2 relative" onClick={handleSearchClick}>
          <label className="flex flex-col w-full">
            <div className="flex w-full items-center rounded-lg bg-slate-50 dark:bg-[#1e293b] h-10 px-3 gap-2 border border-slate-200 dark:border-slate-700 focus-within:border-slate-400 dark:focus-within:border-slate-500 transition-colors">
              <Icon name="search" className="text-slate-400 dark:text-text-secondary text-[20px]" />
              <input 
                className="w-full bg-transparent border-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-text-secondary focus:ring-0 p-0 focus:outline-none" 
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowSearchResults(true)}
              />
              <span className="text-[10px] text-slate-400 dark:text-text-secondary border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5">⌘K</span>
            </div>
          </label>
          
          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div className="absolute top-full left-4 right-4 mt-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-lg shadow-lg max-h-[400px] overflow-y-auto z-50">
              {searchResults.length > 0 ? (
                <div className="py-2">
                  {searchResults.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => handleToolClick(tool.url)}
                      className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors text-left"
                    >
                      <div className={`size-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tool.colorClass || 'bg-indigo-100 dark:bg-indigo-900/20'}`}>
                        <Icon name={tool.icon} className={`text-[20px] ${tool.colorClass?.replace('bg-', 'text-').replace('-100', '-600').replace('dark:bg-', 'dark:text-').replace('/20', '') || 'text-indigo-600 dark:text-indigo-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {language === 'zh' && tool.nameZh ? tool.nameZh : tool.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {language === 'zh' && tool.descriptionZh ? tool.descriptionZh : tool.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Icon name="search_off" className="text-slate-300 dark:text-slate-600 text-[32px] mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('search.no_results')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-slate-700">
        {/* 游客登录提示卡片 */}
        {isGuest && !isCollapsed && (
          <div className="mx-0 mb-2 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex items-center justify-center size-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex-shrink-0">
                <Icon name="person" className="text-indigo-600 dark:text-indigo-400 text-[20px]" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  {language === 'zh' ? '登录解锁更多功能' : 'Login for More Features'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {language === 'zh' 
                    ? '保存收藏、查看历史记录、个性化设置等' 
                    : 'Save favorites, view history, personalize settings'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('login')}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              {language === 'zh' ? '立即登录' : 'Sign In'}
            </button>
          </div>
        )}
        
        <div className="flex flex-col gap-1">
          {visibleMenuItems.map((item) => (
            <a 
              key={item.id}
              onClick={() => {
                if (!item.guestAllowed && isGuest) {
                  promptLogin(`访问"${item.label}"功能需要登录`);
                } else {
                  navigate(item.page as Page);
                }
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer group ${isActive(item.page) ? 'bg-slate-100 dark:bg-[#1e293b]' : 'hover:bg-slate-50 dark:hover:bg-[#1e293b]'} ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.label : ''}
            >
              <Icon 
                name={item.icon} 
                filled={item.filled && isActive(item.page)}
                className={`${isActive(item.page) ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'} text-[20px] transition-colors flex-shrink-0`} 
              />
              {!isCollapsed && (
                <p className={`${isActive(item.page) ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'} text-sm font-medium leading-normal transition-colors`}>
                  {item.label}
                </p>
              )}
            </a>
          ))}
        </div>

        <div>
          {!isCollapsed && (
            <p className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-text-secondary">{t('nav.categories')}</p>
          )}
          <div className="flex flex-col gap-1">
            {categoriesLoading ? (
              // Loading skeleton for categories
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`flex items-center px-3 py-2 animate-pulse ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isCollapsed ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="size-5 bg-slate-200 dark:bg-slate-700 rounded"></div>
                          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        </div>
                        <div className="h-4 w-6 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      </>
                    ) : (
                      <div className="size-5 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    )}
                  </div>
                ))}
              </>
            ) : displayCategories ? (
              // Dynamic categories from API
              displayCategories.map((cat) => (
                <a 
                  key={cat.id} 
                  onClick={() => setCategoryPage(cat.id)}
                  className={`flex items-center px-3 py-2 rounded-lg transition-colors group cursor-pointer ${
                    isCategoryActive(cat.id) 
                      ? 'bg-slate-100 dark:bg-[#1e293b]' 
                      : 'hover:bg-slate-50 dark:hover:bg-[#1e293b]'
                  } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                  title={isCollapsed ? (language === 'zh' && cat.nameZh ? cat.nameZh : cat.name) : ''}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      <Icon 
                        name={cat.icon} 
                        className={`text-[20px] transition-colors ${
                          isCategoryActive(cat.id) 
                            ? 'text-slate-900 dark:text-white' 
                            : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                        }`} 
                      />
                      <span className={`absolute -bottom-0.5 -right-0.5 size-1.5 ${getAccentColorClass(cat.accentColor)} rounded-full ${isCategoryActive(cat.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200`}></span>
                    </div>
                    {!isCollapsed && (
                      <p className={`text-sm font-medium leading-normal transition-colors ${
                        isCategoryActive(cat.id) 
                          ? 'text-slate-900 dark:text-white' 
                          : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                      }`}>
                        {language === 'zh' && cat.nameZh ? cat.nameZh : cat.name}
                      </p>
                    )}
                  </div>
                  {!isCollapsed && (
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">{cat.toolCount}</span>
                  )}
                </a>
              ))
            ) : (
              // Fallback to static categories
              staticCategories.map((cat, idx) => (
                <a 
                  key={idx} 
                  className={`flex items-center px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors group cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                  title={isCollapsed ? (language === 'zh' ? cat.name_zh || cat.name : cat.name) : ''}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      <Icon name={cat.icon} className="text-slate-500 dark:text-slate-400 text-[20px] group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                      <span className={`absolute -bottom-0.5 -right-0.5 size-1.5 ${cat.accentColorClass} rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200`}></span>
                    </div>
                    {!isCollapsed && (
                      <p className="text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white text-sm font-medium leading-normal transition-colors">
                        {language === 'zh' ? cat.name_zh || cat.name : cat.name}
                      </p>
                    )}
                  </div>
                  {!isCollapsed && (
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">{cat.count}</span>
                  )}
                </a>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer User Profile */}
      <div className="p-4 border-t border-slate-200 dark:border-border-dark flex flex-col gap-1">
        {/* Admin Panel Link - Only show for admin users */}
        {user && user.planType === 999 && (
          <a 
            onClick={() => navigate('admin')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer mb-1 ${
              isActive('admin') 
                ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800' 
                : 'hover:bg-slate-50 dark:hover:bg-[#1e293b]'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? t('sidebar.admin_panel') : ''}
          >
            <Icon 
              name="admin_panel_settings" 
              className={`text-[20px] flex-shrink-0 ${
                isActive('admin') 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-500 dark:text-slate-400'
              }`} 
            />
            {!isCollapsed && (
              <p className={`text-sm font-medium leading-normal ${
                isActive('admin') 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                {t('sidebar.admin_panel')}
              </p>
            )}
          </a>
        )}
        
        {/* Settings - Only show for logged-in users */}
        {!isGuest && (
          <a 
            onClick={() => navigate('settings')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${isActive('settings') ? 'bg-slate-100 dark:bg-[#1e293b]' : 'hover:bg-slate-50 dark:hover:bg-[#1e293b]'} ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? t('nav.settings') : ''}
          >
            <Icon name="settings" className="text-slate-500 dark:text-slate-400 text-[20px] flex-shrink-0" />
            {!isCollapsed && (
              <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal">{t('nav.settings')}</p>
            )}
          </a>
        )}
        
        {/* User Profile - Only show for logged-in users */}
        {!isGuest && user && (
          <div 
            onClick={() => navigate('profile')}
            className={`mt-2 flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1e293b] cursor-pointer transition-colors ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? user.name : ''}
          >
            <div className="relative flex-shrink-0">
              <div 
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 border border-slate-200 dark:border-slate-700" 
                style={{ backgroundImage: `url("${user.avatarUrl}")` }}
              ></div>
              <div className="absolute bottom-0 right-0 size-2.5 bg-green-500 border-2 border-white dark:border-surface-dark rounded-full"></div>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-none truncate">{user.name}</p>
                <p className="text-slate-500 dark:text-text-secondary text-xs leading-normal truncate">
                   {language === 'zh' ? user.plan_zh || user.plan : user.plan}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
