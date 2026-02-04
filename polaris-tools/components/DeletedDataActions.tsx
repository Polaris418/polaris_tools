import React from 'react';
import { Icon } from './Icon';

interface DeletedDataActionsProps<T = any> {
  record: T;
  onEdit: (record: T) => void;
  onRestore: (id: number) => Promise<void>;
  onPermanentDelete: (id: number) => Promise<void>;
  isDeleted: boolean;
  t: (key: string) => string;
}

/**
 * Deleted Data Actions Component
 * 已删除数据操作组件
 * 
 * 根据记录的删除状态显示不同的操作按钮：
 * - 已删除记录：显示编辑、恢复、永久删除按钮
 * - 正常记录：显示常规操作按钮（编辑、禁用/启用、删除）
 * 
 * Displays different action buttons based on the record's deletion status:
 * - Deleted records: Show edit, restore, and permanent delete buttons
 * - Normal records: Show regular action buttons (edit, disable/enable, delete)
 */
export function DeletedDataActions<T extends { id: number; status?: number }>({
  record,
  onEdit,
  onRestore,
  onPermanentDelete,
  isDeleted,
  t,
}: DeletedDataActionsProps<T>) {
  if (!isDeleted) {
    // For normal records, return null - the parent component will render regular actions
    return null;
  }

  // For deleted records, show edit, restore, and permanent delete buttons
  return (
    <div className="flex items-center justify-end gap-2">
      {/* Edit Button */}
      <button
        onClick={() => onEdit(record)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
        title={t('common.edit')}
      >
        <Icon name="edit" className="text-[18px]" />
      </button>

      {/* Restore Button */}
      <button
        onClick={() => onRestore(record.id)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
        title={t('action.restore')}
      >
        <Icon name="restore" className="text-[18px]" />
      </button>

      {/* Permanent Delete Button */}
      <button
        onClick={() => onPermanentDelete(record.id)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        title={t('deleted.permanentDelete')}
      >
        <Icon name="delete_forever" className="text-[18px]" />
      </button>
    </div>
  );
}
