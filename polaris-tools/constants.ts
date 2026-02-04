import { CategoryCount, Tool, User } from './types';

export const USER: User = {
  name: "Jane Doe",
  plan: "Pro Plan",
  plan_zh: "专业版",
  avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDzWcPIicEuLWsjJpvIRm89BgviOOHlmnYHt1Zxqp2wC_2lc_MFryVigO3YqhKXA55RzJb3QEZ0syXTKjrDiGIdGVPdjogr-C84dxY-OhfRgwa8sMbna-5NVsg8dmJ1QqlTrtAxpwg6EypypbZD76FdaJ-sSxUwKubsUOkEYbKe-xrIX49NhCBPzxx3u9bsKYWkFkNIIaYKvOECAMW_t3QOcqoQPmoExzqpJTsv7eBIHsh2DkrZmCwtpX2wftCHHwqmaSc2MlmJhQ0"
};

export const CATEGORIES: CategoryCount[] = [
  { name: "PDF Tools", name_zh: "PDF 工具", count: 4, icon: "picture_as_pdf", accentColorClass: "bg-rose-500" },
  { name: "Text Tools", name_zh: "文本工具", count: 8, icon: "title", accentColorClass: "bg-indigo-500" },
  { name: "Image Tools", name_zh: "图片工具", count: 3, icon: "image", accentColorClass: "bg-purple-500" },
  { name: "Dev Tools", name_zh: "开发工具", count: 12, icon: "terminal", accentColorClass: "bg-emerald-500" },
];

export const RECENT_TOOLS: Tool[] = [
  {
    id: "r1",
    title: "Markdown Editor",
    title_zh: "Markdown 编辑器",
    description: "",
    icon: "edit_note",
    category: "Text",
    lastUsed: "2 hours ago",
    lastUsed_zh: "2 小时前",
    path: "markdown-editor",
    bgHoverClass: "bg-indigo-500/0 group-hover:bg-indigo-500/10"
  },
  {
    id: "r2",
    title: "PDF Compressor",
    title_zh: "PDF 压缩",
    description: "",
    icon: "compress",
    category: "PDF",
    lastUsed: "Yesterday",
    lastUsed_zh: "昨天",
    path: "pdf-compressor",
    bgHoverClass: "bg-rose-500/0 group-hover:bg-rose-500/10"
  },
  {
    id: "r3",
    title: "JSON Validator",
    title_zh: "JSON 校验",
    description: "",
    icon: "data_object",
    category: "Dev",
    lastUsed: "3 days ago",
    lastUsed_zh: "3 天前",
    path: "json-validator",
    bgHoverClass: "bg-emerald-500/0 group-hover:bg-emerald-500/10"
  }
];

export const TEXT_TOOLS: Tool[] = [
  {
    id: "t1",
    title: "Word Counter",
    title_zh: "字数统计",
    description: "Stats for your text",
    description_zh: "统计文本字符数",
    icon: "numbers",
    category: "Text",
    category_zh: "文本工具",
    path: "word-counter",
    colorClass: "group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
    bgHoverClass: "bg-indigo-500/0 group-hover:bg-indigo-500/10"
  },
  {
    id: "t2",
    title: "Lorem Ipsum",
    title_zh: "乱数生成",
    description: "Dummy text generator",
    description_zh: "生成测试占位文本",
    icon: "format_quote",
    category: "Text",
    path: "lorem-ipsum",
    colorClass: "group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
    bgHoverClass: "bg-indigo-500/0 group-hover:bg-indigo-500/10"
  },
  {
    id: "t3",
    title: "Case Converter",
    title_zh: "大小写转换",
    description: "Transform text case",
    description_zh: "转换文本大小写",
    icon: "text_format",
    category: "Text",
    path: "case-converter",
    colorClass: "group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
    bgHoverClass: "bg-indigo-500/0 group-hover:bg-indigo-500/10"
  }
];

export const DEV_TOOLS: Tool[] = [
  {
    id: "d1",
    title: "Base64 Decode",
    title_zh: "Base64 解码",
    description: "Decode strings",
    description_zh: "Base64 编码解码",
    icon: "lock_open",
    category: "Dev",
    category_zh: "开发工具",
    path: "base64-decoder",
    colorClass: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    bgHoverClass: "bg-emerald-500/0 group-hover:bg-emerald-500/10"
  },
  {
    id: "d2",
    title: "SQL Formatter",
    title_zh: "SQL 格式化",
    description: "Prettify SQL",
    description_zh: "美化 SQL 语句",
    icon: "storage",
    category: "Dev",
    category_zh: "开发工具",
    path: "sql-formatter",
    colorClass: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    bgHoverClass: "bg-emerald-500/0 group-hover:bg-emerald-500/10"
  },
  {
    id: "d3",
    title: "Color Converter",
    title_zh: "颜色转换器",
    description: "HEX, RGB, HSL",
    description_zh: "颜色代码转换",
    icon: "palette",
    category: "Dev",
    category_zh: "开发工具",
    path: "color-converter",
    colorClass: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    bgHoverClass: "bg-emerald-500/0 group-hover:bg-emerald-500/10"
  },
  {
    id: "d4",
    title: "URL Parser",
    title_zh: "URL 解析",
    description: "Analyze URLs",
    description_zh: "解析 URL 参数",
    icon: "link",
    category: "Dev",
    path: "url-parser",
    colorClass: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    bgHoverClass: "bg-emerald-500/0 group-hover:bg-emerald-500/10"
  }
];


// ============================================================================
// 工具注册表 (Tool Registry)
// ============================================================================

/**
 * 工具注册表：所有可用工具的统一配置
 * 
 * 添加新工具的步骤：
 * 1. 在这里添加工具配置（定义 path、title、icon 等）
 * 2. 在 tools/ 文件夹创建工具组件（使用 ToolLayout 包裹）
 * 3. 在 App.tsx 的 renderTool 函数中添加路由映射
 * 
 * 注意：path 必须是唯一的，用于路由识别
 */
export const TOOL_REGISTRY: Tool[] = [
  // 文本工具
  {
    id: "word-counter",
    title: "Word Counter",
    title_zh: "字数统计",
    description: "Count characters, words, lines and more",
    description_zh: "统计字符数、单词数、行数等",
    icon: "numbers",
    category: "Text Tools",
    category_zh: "文本工具",
    path: "word-counter",
    colorClass: "text-indigo-600 dark:text-indigo-400",
    bgHoverClass: "bg-indigo-500/10"
  },
  
  // 开发工具
  {
    id: "color-converter",
    title: "Color Converter",
    title_zh: "颜色转换器",
    description: "Convert between HEX, RGB, and HSL",
    description_zh: "HEX、RGB、HSL 格式互转",
    icon: "palette",
    category: "Dev Tools",
    category_zh: "开发工具",
    path: "color-converter",
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgHoverClass: "bg-emerald-500/10"
  },
  
  // MD2Word (已实现的工具)
  {
    id: "md2word",
    title: "Markdown to Word",
    title_zh: "Markdown 转 Word",
    description: "Convert Markdown to DOCX/PDF",
    description_zh: "将 Markdown 转换为 Word 文档",
    icon: "description",
    category: "Text Tools",
    category_zh: "文本工具",
    path: "md2word",
    colorClass: "text-indigo-600 dark:text-indigo-400",
    bgHoverClass: "bg-indigo-500/10"
  },
  
  // 大小写转换
  {
    id: "case-converter",
    title: "Case Converter",
    title_zh: "大小写转换",
    description: "Convert text between different case formats",
    description_zh: "转换文本大小写格式",
    icon: "text_format",
    category: "Text Tools",
    category_zh: "文本工具",
    path: "case-converter",
    colorClass: "text-indigo-600 dark:text-indigo-400",
    bgHoverClass: "bg-indigo-500/10"
  },
  
  // Base64 编码
  {
    id: "base64-encoder",
    title: "Base64 Encoder",
    title_zh: "Base64 编码",
    description: "Encode and decode Base64 strings",
    description_zh: "Base64 编码/解码转换",
    icon: "code",
    category: "Dev Tools",
    category_zh: "开发工具",
    path: "base64-encoder",
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgHoverClass: "bg-emerald-500/10"
  },
  
  // URL 编码
  {
    id: "url-encoder",
    title: "URL Encoder",
    title_zh: "URL 编码",
    description: "Encode and decode URLs",
    description_zh: "URL 编码/解码转换",
    icon: "link",
    category: "Dev Tools",
    category_zh: "开发工具",
    path: "url-encoder",
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgHoverClass: "bg-emerald-500/10"
  },
  
  // UUID 生成器
  {
    id: "uuid-generator",
    title: "UUID Generator",
    title_zh: "UUID 生成器",
    description: "Generate random UUIDs",
    description_zh: "生成随机 UUID",
    icon: "fingerprint",
    category: "Dev Tools",
    category_zh: "开发工具",
    path: "uuid-generator",
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgHoverClass: "bg-emerald-500/10"
  },
  
  // 时间戳转换
  {
    id: "timestamp-converter",
    title: "Timestamp Converter",
    title_zh: "时间戳转换",
    description: "Convert between Unix timestamps and dates",
    description_zh: "Unix 时间戳与日期互转",
    icon: "schedule",
    category: "Dev Tools",
    category_zh: "开发工具",
    path: "timestamp-converter",
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgHoverClass: "bg-emerald-500/10"
  },
  
  // 密码生成器
  {
    id: "password-generator",
    title: "Password Generator",
    title_zh: "密码生成器",
    description: "Generate secure random passwords",
    description_zh: "生成安全随机密码",
    icon: "key",
    category: "Security",
    category_zh: "安全工具",
    path: "password-generator",
    colorClass: "text-rose-600 dark:text-rose-400",
    bgHoverClass: "bg-rose-500/10"
  }
];
