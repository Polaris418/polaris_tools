import React from 'react';

interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
}

// 常用的 Material Icons 列表（用于验证）
const VALID_ICONS = new Set([
  // Navigation & UI
  'dashboard', 'settings', 'search', 'menu', 'close', 'arrow_back', 'arrow_forward',
  'chevron_left', 'chevron_right', 'expand_more', 'expand_less', 'more_vert', 'more_horiz',
  // Actions
  'star', 'star_border', 'favorite', 'favorite_border', 'delete', 'edit', 'add', 'remove',
  'check', 'clear', 'done', 'error', 'warning', 'info', 'help', 'refresh',
  // Content
  'folder', 'file_copy', 'description', 'article', 'inbox', 'mail', 'send', 'attach_file',
  // File types
  'picture_as_pdf', 'image', 'video_file', 'audio_file', 'insert_drive_file',
  // Text & Editing
  'title', 'text_format', 'format_quote', 'edit_note', 'numbers', 'spellcheck',
  // Developer
  'terminal', 'code', 'data_object', 'integration_instructions', 'bug_report', 'memory',
  // Media
  'compress', 'crop', 'transform', 'tune', 'filter', 'palette',
  // Tools
  'build', 'construction', 'handyman', 'settings_applications',
  // Conversion
  'swap_horiz', 'sync_alt', 'compare_arrows', 'shuffle',
  // Security
  'security', 'lock', 'vpn_key', 'shield', 'verified_user', 'admin_panel_settings',
  // Other common icons
  'home', 'person', 'group', 'notifications', 'language', 'public', 'cloud', 'download', 'upload',
  'visibility', 'visibility_off', 'link', 'qr_code', 'qr_code_scanner', 'barcode',
  'calculate', 'functions', 'speed', 'timer', 'schedule', 'event', 'calendar_today',
  'search_off', 'category', 'label', 'bookmark', 'bookmark_border',
]);

// 无效图标名的模式（占位符、测试数据等）
const INVALID_PATTERNS = [
  /icon/i,           // 包含 "icon" 的字符串（如 D_ICON, NEW_ICON, d_icon）
  /^[A-Z]/,          // 以大写字母开头的
  /test/i,           // 包含 "test" 的
  /^[A-Z_]+$/,       // 全大写带下划线的
  /^[a-z]{1,2}$/,    // 只有1-2个字母的（如 OC, D）
  /\s/,              // 包含空格的
  /[^a-z0-9_]/,      // 包含非法字符的
];

// 验证图标名称是否有效
const isValidIconName = (name: string): boolean => {
  // 空值或非字符串
  if (!name || typeof name !== 'string') return false;
  
  // 去除首尾空格
  const trimmedName = name.trim();
  if (!trimmedName) return false;
  
  // 检查是否匹配无效模式
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(trimmedName)) return false;
  }
  
  // 如果在已知列表中，肯定有效
  if (VALID_ICONS.has(trimmedName)) return true;
  
  // 其他小写带下划线的名称，至少3个字符，可能也是有效的 Material Icons
  return /^[a-z][a-z0-9_]{2,}$/.test(trimmedName);
};

export const Icon: React.FC<IconProps> = ({ name, className = "", filled = false }) => {
  // 如果图标名无效，使用默认图标
  const iconName = isValidIconName(name) ? name : 'category';
  
  return (
    <span 
      className={`material-symbols-outlined ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {iconName}
    </span>
  );
};
