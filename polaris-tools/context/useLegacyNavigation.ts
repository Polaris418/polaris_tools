import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { parseRouteState, pathByPage, type AdminPage, type Page } from './navigation';

export interface LegacyNavigationState {
  page: Page;
  currentToolId: string | null;
  currentCategoryId: number | null;
  adminPage: AdminPage;
  navigate: (page: Page) => void;
  setPage: (page: Page) => void;
  setToolPage: (toolId: string) => void;
  setCategoryPage: (categoryId: number) => void;
  setAdminPage: (page: AdminPage) => void;
}

export const useLegacyNavigation = (): LegacyNavigationState => {
  const location = useLocation();
  const routerNavigate = useNavigate();

  const routeState = useMemo(() => parseRouteState(location.pathname), [location.pathname]);
  const [manualPage, setManualPage] = useState<string | null>(null);
  const [manualToolId, setManualToolId] = useState<string | null>(null);
  const [manualCategoryId, setManualCategoryId] = useState<number | null>(null);
  const [manualAdminPage, setManualAdminPageState] = useState<AdminPage | null>(null);

  const page = (manualPage ?? routeState.page) as Page;
  const currentToolId = manualToolId ?? routeState.currentToolId;
  const currentCategoryId = manualCategoryId ?? routeState.currentCategoryId;
  const adminPage = manualAdminPage ?? routeState.adminPage;

  useEffect(() => {
    setManualPage(null);
    setManualToolId(null);
    setManualCategoryId(null);
    setManualAdminPageState(null);
  }, [location.pathname]);

  const navigateByPath = useCallback(
    (path: string | null): boolean => {
      if (!path) {
        return false;
      }
      if (location.pathname !== path) {
        routerNavigate(path);
      }
      return true;
    },
    [location.pathname, routerNavigate]
  );

  const navigate = useCallback(
    (newPage: Page) => {
      setManualPage(newPage);
      if (newPage !== 'tool') {
        setManualToolId(null);
      }
      if (newPage !== 'category') {
        setManualCategoryId(null);
      }
      if (newPage !== 'admin') {
        setManualAdminPageState(null);
      }

      navigateByPath(
        pathByPage(newPage, {
          toolId: currentToolId,
          categoryId: currentCategoryId,
          adminPage,
        })
      );
    },
    [adminPage, currentCategoryId, currentToolId, navigateByPath]
  );

  const setPage = useCallback(
    (newPage: Page) => {
      navigate(newPage);
    },
    [navigate]
  );

  const setToolPage = useCallback(
    (toolId: string) => {
      setManualPage('tool');
      setManualToolId(toolId);
      setManualCategoryId(null);
      setManualAdminPageState(null);
      navigateByPath(pathByPage('tool', { toolId }));
    },
    [navigateByPath]
  );

  const setCategoryPage = useCallback(
    (categoryId: number) => {
      setManualPage('category');
      setManualToolId(null);
      setManualCategoryId(categoryId);
      setManualAdminPageState(null);
      navigateByPath(pathByPage('category', { categoryId }));
    },
    [navigateByPath]
  );

  const setAdminPage = useCallback(
    (targetPage: AdminPage) => {
      setManualPage('admin');
      setManualToolId(null);
      setManualCategoryId(null);
      setManualAdminPageState(targetPage);
      navigateByPath(pathByPage('admin', { adminPage: targetPage }));
    },
    [navigateByPath]
  );

  return {
    page,
    currentToolId,
    currentCategoryId,
    adminPage,
    navigate,
    setPage,
    setToolPage,
    setCategoryPage,
    setAdminPage,
  };
};
