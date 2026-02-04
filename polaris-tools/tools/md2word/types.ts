/**
 * MD2Word 工具类型定义
 * 基于文档规范: QUICK-REFERENCE.md
 */

// ==================== 文件管理 ====================

export enum FileStatus {
  Pending = 'Pending',
  Converting = 'Converting',
  Done = 'Done',
  Error = 'Error'
}

export interface FileItem {
  id: string;
  name: string;
  content: string;
  size: number;
  status: FileStatus;
  progress: number;
  templateOverride?: string;
  lastEdited: string;
  type: string;
  error?: string;
  file?: File; // 原始 File 对象（用于批量上传）
}

// ==================== 编辑器 ====================

export type ViewMode = 'split' | 'source' | 'preview';

// ==================== 样式规则 ====================

export interface StyleRule {
  id: string;
  name: string;
  description: string;
  element: string;
  styles: Record<string, string>;
  active: boolean;
}

// ==================== 导出设置 ====================

// 使用字符串字面量类型更灵活
export type ExportFormat = 'docx' | 'pdf' | 'html';

export interface ExportOptions {
  format: ExportFormat;
  template: string;
  imageQuality: number;
  mirrorMargins: boolean;
  includeTableOfContents: boolean;
  pageSize: 'a4' | 'letter';
}

// ==================== 模板 ====================

export interface TemplateOption {
  value: string;
  label: string;
  labelZh: string;
  description: string;
  descriptionZh: string;
  details: string;
  detailsZh: string;
  icon: string;
}

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  { 
    value: 'academic', 
    label: 'Academic Paper', 
    labelZh: '学术论文',
    description: 'Formal academic writing',
    descriptionZh: '正式学术写作格式',
    details: 'Title: Times New Roman 16pt Bold | Body: Times New Roman 12pt | Line spacing: 1.5 | Margins: 2.54cm | Citations: APA style',
    detailsZh: '标题: 宋体 三号(16pt) 加粗居中 | 正文: 宋体 小四(12pt) | 行距: 1.5倍 | 页边距: 2.54cm | 引用: APA格式',
    icon: 'school'
  },
  { 
    value: 'corporate', 
    label: 'Corporate Report', 
    labelZh: '企业报告',
    description: 'Professional business documentation',
    descriptionZh: '专业商业文档格式',
    details: 'Title: Arial 18pt Bold | Headings: Arial 14pt Bold | Body: Arial 11pt | Line spacing: 1.15 | Margins: 2cm',
    detailsZh: '标题: 微软雅黑 小二(18pt) 加粗 | 小标题: 微软雅黑 四号(14pt) 加粗 | 正文: 微软雅黑 五号(11pt) | 行距: 1.15倍 | 页边距: 2cm',
    icon: 'business'
  },
  { 
    value: 'technical', 
    label: 'Technical Manual', 
    labelZh: '技术手册',
    description: 'Technical documentation',
    descriptionZh: '技术文档格式',
    details: 'Title: Consolas 16pt Bold | Code: Consolas 10pt | Body: Segoe UI 11pt | Line spacing: 1.2 | Syntax highlighting',
    detailsZh: '标题: 等线 三号(16pt) 加粗 | 代码: Consolas 五号(10pt) 灰底 | 正文: 等线 五号(11pt) | 行距: 1.2倍 | 代码高亮',
    icon: 'code'
  },
  { 
    value: 'memo', 
    label: 'Internal Memo', 
    labelZh: '内部备忘',
    description: 'Simple internal communication',
    descriptionZh: '简洁内部通讯格式',
    details: 'Title: Calibri 14pt Bold | Body: Calibri 11pt | Line spacing: 1.0 | Margins: 1.5cm | Compact layout',
    detailsZh: '标题: 黑体 四号(14pt) 加粗 | 正文: 仿宋 五号(11pt) | 行距: 单倍 | 页边距: 1.5cm | 紧凑布局',
    icon: 'note'
  },
];

// ==================== 全局设置 ====================

export interface GlobalSettings {
  template: string;
  format: ExportFormat;
}

// ==================== Tab 模式 ====================

export type TabMode = 'editor' | 'batch';

// ==================== 统计信息 ====================

export interface DocumentStats {
  charCount: number;
  charCountNoSpaces: number;
  wordCount: number;
  lineCount: number;
  paragraphCount: number;
  readTime: number;
}
