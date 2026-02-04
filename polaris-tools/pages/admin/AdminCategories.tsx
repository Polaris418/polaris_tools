import React, { useEffect, useState, useRef } from 'react';
import { Icon } from '../../components/Icon';
import { useAppContext } from '../../context/AppContext';
import { adminApi } from '../../api/adminClient';
import { CategoryFormModal } from './CategoryFormModal';
import { DeletedDataActions } from '../../components/DeletedDataActions';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { CategoryResponse, ModalState } from './types';

/**
 * Admin Categories Management Component
 * 管理员分类管理页面
 */
export const AdminCategories: React.FC = () => {
  const { t, language, showToast, showConfirm } = useAppContext();
  
  // State
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [showDeleted, setShowDeleted] = useState(false);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [selectedCategory, setSelectedCategory] = useState<CategoryResponse | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set()); // 正在删除的分类ID
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: number | null; name: string }>({ 
    isOpen: false, 
    id: null, 
    name: '' 
  });
  const [operationLoading, setOperationLoading] = useState(false);
  
  // 展开的分类ID集合
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  // 每个分类下的工具列表
  const [categoryTools, setCategoryTools] = useState<Record<number, any[]>>({});
  // 正在加载工具的分类ID
  const [loadingTools, setLoadingTools] = useState<Set<number>>(new Set());
  
  // 拖拽排序相关状态
  const [draggedItem, setDraggedItem] = useState<CategoryResponse | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [statusFilter, showDeleted]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await adminApi.categories.list({ 
        status: statusFilter,
        includeDeleted: showDeleted || undefined,
      });
      
      setCategories(result.data);
    } catch (err: any) {
      setError(err.message || t('admin.error.load_categories'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (category: CategoryResponse) => {
    try {
      const newStatus = category.status === 1 ? 0 : 1;
      await adminApi.categories.update(category.id, { status: newStatus });
      // 重新获取数据，保持当前筛选条件
      await fetchCategories();
      showToast(t('admin.tools.status_updated'), 'success');
    } catch (err: any) {
      showToast(err.message || t('admin.error.update_category_status'), 'error');
    }
  };

  const handleAdd = () => {
    setSelectedCategory(null);
    setModal({ isOpen: true, mode: 'create' });
  };

  const handleEdit = (category: CategoryResponse) => {
    setSelectedCategory(category);
    setModal({ isOpen: true, mode: 'edit' });
    // 编辑模态框支持编辑已删除记录，deleted状态将被保留
  };

  const handleModalClose = () => {
    setModal({ isOpen: false, mode: 'create' });
    setSelectedCategory(null);
  };

  const handleModalSuccess = () => {
    fetchCategories();
  };

  const handleDelete = async (category: CategoryResponse) => {
    // 防止重复删除
    if (deletingIds.has(category.id)) {
      return;
    }
    
    const confirmed = await showConfirm({
      title: t('confirm.delete_title'),
      message: t('admin.categories.confirm_delete', { name: category.name }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      type: 'danger',
    });
    
    if (!confirmed) return;
    
    // 确认后再次检查，防止在等待确认期间已被删除
    if (deletingIds.has(category.id)) {
      return;
    }
    
    // 标记为正在删除
    setDeletingIds(prev => new Set(prev).add(category.id));
    
    try {
      await adminApi.categories.delete(category.id);
      showToast(t('admin.categories.form.name') + t('message.delete_success'), 'success');
      // 删除成功后刷新列表
      await fetchCategories();
    } catch (err: any) {
      showToast(err.message || t('admin.error.delete_category'), 'error');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(category.id);
        return next;
      });
    }
  };

  // 恢复已删除分类
  const handleRestore = async (id: number) => {
    try {
      setOperationLoading(true);
      await adminApi.categories.restore(id);
      showToast(t('deleted.restoreSuccess'), 'success');
      // 刷新列表，保持当前筛选状态
      await fetchCategories();
    } catch (err: any) {
      showToast(err.message || t('deleted.restoreFailed'), 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  // 显示永久删除确认对话框
  const handlePermanentDelete = (category: CategoryResponse) => {
    setDeleteConfirmation({ 
      isOpen: true, 
      id: category.id, 
      name: category.name 
    });
  };

  // 确认永久删除
  const confirmPermanentDelete = async () => {
    if (!deleteConfirmation.id) return;
    
    try {
      setOperationLoading(true);
      await adminApi.categories.permanentDelete(deleteConfirmation.id);
      showToast(t('deleted.permanentDeleteSuccess'), 'success');
      setDeleteConfirmation({ isOpen: false, id: null, name: '' });
      // 刷新列表，保持当前筛选状态
      await fetchCategories();
    } catch (err: any) {
      showToast(err.message || t('deleted.permanentDeleteFailed'), 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  // 取消永久删除
  const cancelPermanentDelete = () => {
    setDeleteConfirmation({ isOpen: false, id: null, name: '' });
  };
  
  // 切换分类展开/收起
  const toggleCategoryExpand = async (categoryId: number) => {
    const isExpanded = expandedCategories.has(categoryId);
    
    if (isExpanded) {
      // 收起
      setExpandedCategories(prev => {
        const next = new Set(prev);
        next.delete(categoryId);
        return next;
      });
    } else {
      // 展开 - 加载该分类下的工具
      setExpandedCategories(prev => new Set(prev).add(categoryId));
      
      // 如果还没有加载过该分类的工具，则加载
      if (!categoryTools[categoryId]) {
        await loadCategoryTools(categoryId);
      }
    }
  };
  
  // 加载分类下的工具列表
  const loadCategoryTools = async (categoryId: number) => {
    try {
      setLoadingTools(prev => new Set(prev).add(categoryId));
      
      const result = await adminApi.tools.list({
        categoryId,
        page: 1,
        size: 100, // 加载前100个工具
      });
      
      setCategoryTools(prev => ({
        ...prev,
        [categoryId]: result.data.list,
      }));
    } catch (err: any) {
      showToast(err.message || '加载工具列表失败', 'error');
    } finally {
      setLoadingTools(prev => {
        const next = new Set(prev);
        next.delete(categoryId);
        return next;
      });
    }
  };
  
  // ==================== 拖拽排序相关函数 ====================
  
  // 获取可拖拽的分类（排除已删除的）
  const draggableCategories = categories.filter(c => c.deleted !== 1);
  
  // 拖拽开始
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, category: CategoryResponse, index: number) => {
    // 不允许拖拽已删除的分类
    if (category.deleted === 1) {
      e.preventDefault();
      return;
    }
    
    setDraggedItem(category);
    setIsDragging(true);
    dragNodeRef.current = e.currentTarget;
    
    // 设置拖拽效果
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', category.id.toString());
    
    // 延迟添加拖拽样式，避免立即触发
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5';
      }
    }, 0);
  };
  
  // 拖拽结束
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(false);
    setDraggedItem(null);
    setDragOverIndex(null);
    
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
    dragNodeRef.current = null;
  };
  
  // 拖拽经过
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedItem && dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };
  
  // 拖拽进入
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedItem) {
      setDragOverIndex(index);
    }
  };
  
  // 拖拽离开
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // 仅当离开到外部元素时清除
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      // 不立即清除，因为可能是移动到相邻元素
    }
  };
  
  // 放置
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    const draggedIndex = draggableCategories.findIndex(c => c.id === draggedItem.id);
    
    if (draggedIndex === targetIndex) {
      setDraggedItem(null);
      setDragOverIndex(null);
      return;
    }
    
    // 重新排列数组
    const newCategories = [...draggableCategories];
    const [removed] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, removed);
    
    // 生成新的排序值
    const reorderItems = newCategories.map((cat, idx) => ({
      id: cat.id,
      sortOrder: idx + 1,
    }));
    
    // 乐观更新 UI
    const updatedCategories = categories.map(cat => {
      const reorderItem = reorderItems.find(item => item.id === cat.id);
      if (reorderItem) {
        return { ...cat, sortOrder: reorderItem.sortOrder };
      }
      return cat;
    }).sort((a, b) => a.sortOrder - b.sortOrder);
    
    setCategories(updatedCategories);
    setDraggedItem(null);
    setDragOverIndex(null);
    
    // 保存到服务器
    try {
      setIsSavingOrder(true);
      await adminApi.categories.reorder(reorderItems);
      showToast(language === 'zh' ? '排序已保存' : 'Order saved', 'success');
    } catch (err: any) {
      showToast(err.message || (language === 'zh' ? '保存排序失败' : 'Failed to save order'), 'error');
      // 恢复原始顺序
      await fetchCategories();
    } finally {
      setIsSavingOrder(false);
    }
  };
  
  // ==================== 工具操作相关函数 ====================
  
  // 切换工具状态
  const handleToggleToolStatus = async (tool: any, categoryId: number) => {
    try {
      const newStatus = tool.status === 1 ? 0 : 1;
      await adminApi.tools.update(tool.id, { status: newStatus });
      
      // 重新加载该分类的工具列表
      await loadCategoryTools(categoryId);
      showToast(t('admin.tools.status_updated'), 'success');
    } catch (err: any) {
      showToast(err.message || '更新工具状态失败', 'error');
    }
  };
  
  // 删除工具
  const handleDeleteTool = async (tool: any, categoryId: number) => {
    const confirmed = await showConfirm({
      title: t('confirm.delete_title'),
      message: `确定要删除工具"${tool.name}"吗？`,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      type: 'danger',
    });
    
    if (!confirmed) return;
    
    try {
      await adminApi.tools.delete(tool.id);
      showToast('工具删除成功', 'success');
      
      // 重新加载该分类的工具列表和分类列表（更新工具数量）
      await Promise.all([
        loadCategoryTools(categoryId),
        fetchCategories(),
      ]);
    } catch (err: any) {
      showToast(err.message || '删除工具失败', 'error');
    }
  };

  const getStatusLabel = (status: number) => {
    return status === 1 ? t('status.active') : t('status.disabled');
  };

  const getStatusColor = (status: number) => {
    return status === 1
      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('admin.categories.title')}
          </h1>
          <p className="text-slate-500 dark:text-text-secondary mt-1">
            {t('admin.categories.subtitle')}
          </p>
        </div>
        <button 
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
        >
          <Icon name="add_circle" className="text-[20px]" />
          <span>{t('admin.categories.add')}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('admin.categories.filter_status')}
          </label>
          <select
            value={statusFilter ?? ''}
            onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
            aria-label={t('admin.categories.filter_status')}
          >
            <option value="">{t('admin.categories.all_status')}</option>
            <option value="1">{t('status.active')}</option>
            <option value="0">{t('status.disabled')}</option>
          </select>
          
          {/* Deleted Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowDeleted(!showDeleted)}
            className={`h-10 px-4 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              showDeleted 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <Icon name="delete" className="text-[18px]" />
            <span>{t('status.deleted')}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <Icon name="error" className="text-red-600 dark:text-red-400 text-[20px] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {t('admin.categories.error_fetch')}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* 拖拽排序提示 */}
          {!showDeleted && categories.length > 1 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm text-indigo-700 dark:text-indigo-300">
              <Icon name="drag_indicator" className="text-[18px]" />
              <span>{language === 'zh' ? '拖拽分类卡片可调整排序' : 'Drag category cards to reorder'}</span>
              {isSavingOrder && (
                <span className="ml-2 flex items-center gap-1">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  {language === 'zh' ? '保存中...' : 'Saving...'}
                </span>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((category, index) => {
              const draggableIndex = draggableCategories.findIndex(c => c.id === category.id);
              const isDragOver = dragOverIndex === draggableIndex && draggedItem?.id !== category.id;
              const canDrag = category.deleted !== 1 && !showDeleted;
              
              return (
                <div
                  key={category.id}
                  draggable={canDrag}
                  onDragStart={canDrag ? (e) => handleDragStart(e, category, draggableIndex) : undefined}
                  onDragEnd={canDrag ? handleDragEnd : undefined}
                  onDragOver={canDrag ? (e) => handleDragOver(e, draggableIndex) : undefined}
                  onDragEnter={canDrag ? (e) => handleDragEnter(e, draggableIndex) : undefined}
                  onDragLeave={canDrag ? handleDragLeave : undefined}
                  onDrop={canDrag ? (e) => handleDrop(e, draggableIndex) : undefined}
                  className={`bg-white dark:bg-surface-dark rounded-xl border p-5 transition-all shadow-sm hover:shadow-md relative ${
                    category.deleted === 1 
                      ? 'opacity-60 border-slate-200 dark:border-border-dark' 
                      : category.status === 0
                      ? 'opacity-50 border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10'
                      : 'border-slate-200 dark:border-border-dark hover:border-slate-300 dark:hover:border-slate-600'
                  } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''} ${
                    isDragOver ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-[1.02]' : ''
                  } ${draggedItem?.id === category.id ? 'opacity-50 scale-95' : ''}`}
                >
                  {/* 拖拽手柄 */}
                  {canDrag && (
                    <div className="absolute top-2 right-2 p-1 text-slate-400 dark:text-slate-500 opacity-50 hover:opacity-100 transition-opacity">
                      <Icon name="drag_indicator" className="text-[18px]" />
                    </div>
                  )}
                  
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`size-12 rounded-lg ${category.accentColor} ${category.status === 0 ? 'bg-opacity-5 dark:bg-opacity-10' : 'bg-opacity-10 dark:bg-opacity-20'} border border-current border-opacity-20 flex items-center justify-center ${category.status === 0 ? 'grayscale' : ''}`}>
                        <Icon name={category.icon} className={`text-[24px] ${category.accentColor.replace('bg-', 'text-')} ${category.status === 0 ? 'opacity-40' : ''}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`text-base font-bold ${category.status === 0 ? 'text-slate-500 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                            {language === 'zh' && category.nameZh ? category.nameZh : category.name}
                          </h3>
                          {category.deleted === 1 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                              {t('status.deleted')}
                            </span>
                          )}
                          {category.status === 0 && category.deleted !== 1 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                              <Icon name="block" className="text-[14px]" />
                              {t('status.disabled')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-text-secondary">
                          {category.toolCount || 0} {t('admin.categories.tools_count')}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(category.status)}`}>
                      {getStatusLabel(category.status)}
                    </span>
                  </div>

                  {/* Description */}
                  {category.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
                      {category.description}
                    </p>
              )}

              {/* Meta Info */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-text-secondary mb-4">
                <span>{t('admin.categories.sort')}: {category.sortOrder}</span>
                <span>{new Date(category.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                {category.deleted === 1 ? (
                  <DeletedDataActions
                    record={category}
                    onEdit={handleEdit}
                    onRestore={handleRestore}
                    onPermanentDelete={async (id) => handlePermanentDelete(category)}
                    isDeleted={true}
                    t={t}
                  />
                ) : (
                  <>
                    <button
                      onClick={() => handleEdit(category)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-sm font-medium"
                    >
                      <Icon name="edit" className="text-[18px]" />
                      <span>{t('common.edit')}</span>
                    </button>
                    <button
                      onClick={() => handleToggleStatus(category)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                        category.status === 1 
                          ? 'text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20' 
                          : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                      }`}
                    >
                      <Icon name={category.status === 1 ? 'block' : 'check_circle'} className="text-[18px]" />
                      <span>{category.status === 1 ? t('action.disable') : t('action.enable')}</span>
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title={t('common.delete')}
                    >
                      <Icon name="delete" className="text-[18px]" />
                    </button>
                  </>
                )}
              </div>
              
              {/* 展开/收起工具列表按钮 */}
              {category.toolCount > 0 && category.deleted !== 1 && (
                <button
                  onClick={() => toggleCategoryExpand(category.id)}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
                >
                  <Icon name={expandedCategories.has(category.id) ? 'expand_less' : 'expand_more'} className="text-[18px]" />
                  <span>{expandedCategories.has(category.id) ? '收起工具列表' : `查看 ${category.toolCount} 个工具`}</span>
                </button>
              )}
              
              {/* 工具列表 */}
              {expandedCategories.has(category.id) && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {loadingTools.has(category.id) ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : categoryTools[category.id]?.length > 0 ? (
                    <div className="space-y-2">
                      {categoryTools[category.id].map((tool: any) => (
                        <div
                          key={tool.id}
                          className={`p-3 rounded-lg border transition-colors ${
                            tool.status === 0
                              ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`size-8 rounded-lg ${category.accentColor} ${tool.status === 0 ? 'bg-opacity-5 grayscale' : 'bg-opacity-10'} flex items-center justify-center flex-shrink-0`}>
                                <Icon name={tool.icon || 'build'} className={`text-[16px] ${category.accentColor.replace('bg-', 'text-')} ${tool.status === 0 ? 'opacity-40' : ''}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className={`text-sm font-semibold truncate ${tool.status === 0 ? 'text-slate-500 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                                    {language === 'zh' && tool.nameZh ? tool.nameZh : tool.name}
                                  </h4>
                                  {tool.status === 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex-shrink-0">
                                      已禁用
                                    </span>
                                  )}
                                </div>
                                {tool.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {tool.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                              <button
                                onClick={() => handleToggleToolStatus(tool, category.id)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  tool.status === 1
                                    ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                }`}
                                title={tool.status === 1 ? t('action.disable') : t('action.enable')}
                              >
                                <Icon name={tool.status === 1 ? 'block' : 'check_circle'} className="text-[16px]" />
                              </button>
                              <button
                                onClick={() => handleDeleteTool(tool, category.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title={t('common.delete')}
                              >
                                <Icon name="delete" className="text-[16px]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">
                      该分类下暂无工具
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        </div>
        </>
      )}

      {/* Empty State */}
      {!loading && categories.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Icon name="category" className="text-[64px] text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            {t('admin.categories.no_categories')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-text-secondary">
            {t('admin.categories.add_hint')}
          </p>
        </div>
      )}
      
      {/* Category Form Modal */}
      <CategoryFormModal
        isOpen={modal.isOpen}
        mode={modal.mode as 'create' | 'edit'}
        category={selectedCategory}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        title={t('deleted.confirmPermanentDelete')}
        message={t('deleted.permanentDeleteMessage', { name: deleteConfirmation.name })}
        confirmText={t('deleted.permanentDelete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmPermanentDelete}
        onCancel={cancelPermanentDelete}
        isDangerous={true}
      />

      {/* Operation Loading Overlay */}
      {operationLoading && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-4">{t('common.loading')}</p>
          </div>
        </div>
      )}
    </div>
  );
};
