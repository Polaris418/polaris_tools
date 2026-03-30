import { describe, expect, it } from 'vitest';
import { ROUTES } from '../router';
import { ADMIN_PAGES, parseRouteState, pathByPage, type Page } from '../context/navigation';

describe('路由直达验收', () => {
  it('应正确解析公共页面路径', () => {
    const cases: Array<{ path: string; page: Page }> = [
      { path: '/', page: 'dashboard' },
      { path: '/login', page: 'login' },
      { path: '/register', page: 'register' },
      { path: '/reset-password', page: 'reset-password' },
      { path: '/verify-email', page: 'verify-email' },
      { path: '/settings', page: 'settings' },
      { path: '/profile', page: 'profile' },
      { path: '/email-preferences', page: 'email-preferences' },
      { path: '/notifications', page: 'notifications' },
      { path: '/favorites', page: 'favorites' },
      { path: '/history', page: 'history' },
      { path: '/privacy', page: 'privacy' },
      { path: '/terms', page: 'terms' },
      { path: '/contact', page: 'contact' },
    ];

    for (const item of cases) {
      const state = parseRouteState(item.path);
      expect(state.page).toBe(item.page);
    }
  });

  it('应正确解析工具与分类路径', () => {
    const tool = parseRouteState('/tool/md2word');
    expect(tool.page).toBe('tool');
    expect(tool.currentToolId).toBe('md2word');

    const toolWithEncode = parseRouteState('/tool/%E5%AF%86%E7%A0%81%E7%94%9F%E6%88%90%E5%99%A8');
    expect(toolWithEncode.page).toBe('tool');
    expect(toolWithEncode.currentToolId).toBe('密码生成器');

    const category = parseRouteState('/category/12');
    expect(category.page).toBe('category');
    expect(category.currentCategoryId).toBe(12);
  });

  it('应正确解析管理后台路径', () => {
    const adminRoot = parseRouteState('/admin');
    expect(adminRoot.page).toBe('admin');
    expect(adminRoot.adminPage).toBe('dashboard');

    for (const adminPage of ADMIN_PAGES) {
      const state = parseRouteState(`/admin/${adminPage}`);
      expect(state.page).toBe('admin');
      expect(state.adminPage).toBe(adminPage);
    }

    const unknownAdmin = parseRouteState('/admin/unknown');
    expect(unknownAdmin.page).toBe('admin');
    expect(unknownAdmin.adminPage).toBe('dashboard');
  });

  it('应支持页面与路径的双向映射', () => {
    const staticPages: Page[] = [
      'dashboard',
      'login',
      'register',
      'reset-password',
      'verify-email',
      'settings',
      'profile',
      'email-preferences',
      'notifications',
      'favorites',
      'history',
      'privacy',
      'terms',
      'contact',
    ];

    for (const page of staticPages) {
      const path = pathByPage(page);
      expect(path).toBeTruthy();
      const state = parseRouteState(path as string);
      expect(state.page).toBe(page);
    }

    const toolPath = pathByPage('tool', { toolId: 'uuid-generator' });
    expect(toolPath).toBe('/tool/uuid-generator');
    expect(parseRouteState(toolPath as string).currentToolId).toBe('uuid-generator');

    const categoryPath = pathByPage('category', { categoryId: 3 });
    expect(categoryPath).toBe('/category/3');
    expect(parseRouteState(categoryPath as string).currentCategoryId).toBe(3);

    const adminPath = pathByPage('admin', { adminPage: 'users' });
    expect(adminPath).toBe('/admin/users');
    expect(parseRouteState(adminPath as string).adminPage).toBe('users');
  });

  it('应保证路由常量与路径规则一致', () => {
    expect(ROUTES.dashboard).toBe('/');
    expect(ROUTES.login).toBe('/login');
    expect(ROUTES.register).toBe('/register');
    expect(ROUTES.admin).toBe('/admin');

    for (const adminPage of ADMIN_PAGES) {
      expect(ROUTES.adminPage(adminPage)).toBe(`/admin/${adminPage}`);
    }

    expect(ROUTES.tool('md2word')).toBe('/tool/md2word');
    expect(ROUTES.category(1)).toBe('/category/1');
  });

  it('应将未知路径回退到首页语义', () => {
    const unknown = parseRouteState('/not-found-path');
    expect(unknown.page).toBe('dashboard');
    expect(unknown.currentToolId).toBeNull();
    expect(unknown.currentCategoryId).toBeNull();
  });
});
