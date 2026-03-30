import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { Tool } from './types';

export interface ToolRegistryItem extends Tool {
  component: LazyExoticComponent<ComponentType>;
}

const WordCounter = lazy(() => import('./tools/WordCounter').then((m) => ({ default: m.WordCounter })));
const ColorConverter = lazy(() => import('./tools/ColorConverter').then((m) => ({ default: m.ColorConverter })));
const Md2Word = lazy(() => import('./tools/md2word').then((m) => ({ default: m.Md2Word })));
const CaseConverter = lazy(() => import('./tools/CaseConverter').then((m) => ({ default: m.CaseConverter })));
const Base64Encoder = lazy(() => import('./tools/Base64Encoder').then((m) => ({ default: m.Base64Encoder })));
const UrlEncoder = lazy(() => import('./tools/UrlEncoder').then((m) => ({ default: m.UrlEncoder })));
const UuidGenerator = lazy(() => import('./tools/UuidGenerator').then((m) => ({ default: m.UuidGenerator })));
const TimestampConverter = lazy(() => import('./tools/TimestampConverter').then((m) => ({ default: m.TimestampConverter })));
const PasswordGenerator = lazy(() => import('./tools/PasswordGenerator').then((m) => ({ default: m.PasswordGenerator })));
const TextFormatter = lazy(() => import('./tools/TextFormatter').then((m) => ({ default: m.TextFormatter })));
const TextDiff = lazy(() => import('./tools/TextDiff').then((m) => ({ default: m.TextDiff })));
const JsonFormatter = lazy(() => import('./tools/JsonFormatter').then((m) => ({ default: m.JsonFormatter })));
const HashGenerator = lazy(() => import('./tools/HashGenerator').then((m) => ({ default: m.HashGenerator })));
const UnitConverter = lazy(() => import('./tools/UnitConverter').then((m) => ({ default: m.UnitConverter })));
const CurrencyConverter = lazy(() => import('./tools/CurrencyConverter').then((m) => ({ default: m.CurrencyConverter })));
const QrGenerator = lazy(() => import('./tools/QrGenerator').then((m) => ({ default: m.QrGenerator })));
const TextEncryptor = lazy(() => import('./tools/TextEncryptor').then((m) => ({ default: m.TextEncryptor })));

export const TOOL_REGISTRY: ToolRegistryItem[] = [
  {
    id: 'word-counter',
    title: 'Word Counter',
    title_zh: '字数统计',
    description: 'Count characters, words, lines and more',
    description_zh: '统计字符数、单词数、行数等',
    icon: 'numbers',
    category: 'Text Tools',
    category_zh: '文本工具',
    path: 'word-counter',
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    bgHoverClass: 'bg-indigo-500/10',
    component: WordCounter,
  },
  {
    id: 'color-converter',
    title: 'Color Converter',
    title_zh: '颜色转换器',
    description: 'Convert between HEX, RGB, and HSL',
    description_zh: 'HEX、RGB、HSL 格式互转',
    icon: 'palette',
    category: 'Dev Tools',
    category_zh: '开发工具',
    path: 'color-converter',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgHoverClass: 'bg-emerald-500/10',
    component: ColorConverter,
  },
  {
    id: 'md2word',
    title: 'Markdown to Word',
    title_zh: 'Markdown 转 Word',
    description: 'Convert Markdown to DOCX/PDF',
    description_zh: '将 Markdown 转换为 Word 文档',
    icon: 'description',
    category: 'Text Tools',
    category_zh: '文本工具',
    path: 'md2word',
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    bgHoverClass: 'bg-indigo-500/10',
    component: Md2Word,
  },
  {
    id: 'case-converter',
    title: 'Case Converter',
    title_zh: '大小写转换',
    description: 'Convert text between different case formats',
    description_zh: '转换文本大小写格式',
    icon: 'text_format',
    category: 'Text Tools',
    category_zh: '文本工具',
    path: 'case-converter',
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    bgHoverClass: 'bg-indigo-500/10',
    component: CaseConverter,
  },
  {
    id: 'base64-encoder',
    title: 'Base64 Encoder',
    title_zh: 'Base64 编码',
    description: 'Encode and decode Base64 strings',
    description_zh: 'Base64 编码/解码转换',
    icon: 'code',
    category: 'Dev Tools',
    category_zh: '开发工具',
    path: 'base64-encoder',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgHoverClass: 'bg-emerald-500/10',
    component: Base64Encoder,
  },
  {
    id: 'url-encoder',
    title: 'URL Encoder',
    title_zh: 'URL 编码',
    description: 'Encode and decode URLs',
    description_zh: 'URL 编码/解码转换',
    icon: 'link',
    category: 'Dev Tools',
    category_zh: '开发工具',
    path: 'url-encoder',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgHoverClass: 'bg-emerald-500/10',
    component: UrlEncoder,
  },
  {
    id: 'uuid-generator',
    title: 'UUID Generator',
    title_zh: 'UUID 生成器',
    description: 'Generate random UUIDs',
    description_zh: '生成随机 UUID',
    icon: 'fingerprint',
    category: 'Dev Tools',
    category_zh: '开发工具',
    path: 'uuid-generator',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgHoverClass: 'bg-emerald-500/10',
    component: UuidGenerator,
  },
  {
    id: 'timestamp-converter',
    title: 'Timestamp Converter',
    title_zh: '时间戳转换器',
    description: 'Convert between Unix timestamps and dates',
    description_zh: 'Unix 时间戳与日期互转',
    icon: 'schedule',
    category: 'Dev Tools',
    category_zh: '开发工具',
    path: 'timestamp-converter',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgHoverClass: 'bg-emerald-500/10',
    component: TimestampConverter,
  },
  {
    id: 'password-generator',
    title: 'Password Generator',
    title_zh: '密码生成器',
    description: 'Generate secure random passwords',
    description_zh: '生成安全随机密码',
    icon: 'key',
    category: 'Security',
    category_zh: '安全工具',
    path: 'password-generator',
    colorClass: 'text-rose-600 dark:text-rose-400',
    bgHoverClass: 'bg-rose-500/10',
    component: PasswordGenerator,
  },
  {
    id: 'text-formatter',
    title: 'Text Formatter',
    title_zh: '文本格式化',
    description: 'Clean, deduplicate, sort, and normalize text',
    description_zh: '清理、去重、排序并规范化文本',
    icon: 'format_align_left',
    category: 'Text Tools',
    category_zh: '文本工具',
    path: 'text-formatter',
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    bgHoverClass: 'bg-indigo-500/10',
    component: TextFormatter,
  },
  {
    id: 'text-diff',
    title: 'Text Diff',
    title_zh: '文本对比',
    description: 'Compare two texts line by line',
    description_zh: '按行比较两段文本差异',
    icon: 'difference',
    category: 'Text Tools',
    category_zh: '文本工具',
    path: 'text-diff',
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    bgHoverClass: 'bg-indigo-500/10',
    component: TextDiff,
  },
  {
    id: 'json-formatter',
    title: 'JSON Formatter',
    title_zh: 'JSON 格式化',
    description: 'Validate, format, and minify JSON',
    description_zh: '校验、格式化和压缩 JSON',
    icon: 'data_object',
    category: 'Dev Tools',
    category_zh: '开发工具',
    path: 'json-formatter',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgHoverClass: 'bg-emerald-500/10',
    component: JsonFormatter,
  },
  {
    id: 'hash-generator',
    title: 'Hash Generator',
    title_zh: '哈希生成器',
    description: 'Generate MD5, SHA-1, SHA-256, and SHA-512 hashes',
    description_zh: '生成 MD5、SHA-1、SHA-256 和 SHA-512 哈希',
    icon: 'tag',
    category: 'Dev Tools',
    category_zh: '开发工具',
    path: 'hash-generator',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgHoverClass: 'bg-emerald-500/10',
    component: HashGenerator,
  },
  {
    id: 'unit-converter',
    title: 'Unit Converter',
    title_zh: '单位转换',
    description: 'Convert length, weight, area, temperature, and storage units',
    description_zh: '转换长度、重量、面积、温度和存储单位',
    icon: 'straighten',
    category: 'Converter Tools',
    category_zh: '转换工具',
    path: 'unit-converter',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgHoverClass: 'bg-emerald-500/10',
    component: UnitConverter,
  },
  {
    id: 'currency-converter',
    title: 'Currency Converter',
    title_zh: '货币转换',
    description: 'Convert between currencies with editable reference rates',
    description_zh: '基于可编辑参考汇率进行货币转换',
    icon: 'currency_exchange',
    category: 'Converter Tools',
    category_zh: '转换工具',
    path: 'currency-converter',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgHoverClass: 'bg-emerald-500/10',
    component: CurrencyConverter,
  },
  {
    id: 'qr-generator',
    title: 'QR Code Generator',
    title_zh: '二维码生成器',
    description: 'Generate QR codes locally in the browser',
    description_zh: '在浏览器本地生成二维码',
    icon: 'qr_code',
    category: 'Security',
    category_zh: '安全工具',
    path: 'qr-generator',
    colorClass: 'text-rose-600 dark:text-rose-400',
    bgHoverClass: 'bg-rose-500/10',
    component: QrGenerator,
  },
  {
    id: 'text-encryptor',
    title: 'Text Encryptor',
    title_zh: '文本加密',
    description: 'Encrypt or decrypt text with AES-GCM',
    description_zh: '使用 AES-GCM 加密或解密文本',
    icon: 'lock',
    category: 'Security',
    category_zh: '安全工具',
    path: 'text-encryptor',
    colorClass: 'text-rose-600 dark:text-rose-400',
    bgHoverClass: 'bg-rose-500/10',
    component: TextEncryptor,
  },
];

const normalizeToolKey = (value: string) => value.replace(/^\/+/, '').replace(/^tools\//, '');

const TOOL_REGISTRY_BY_PATH = new Map<string, ToolRegistryItem>();

TOOL_REGISTRY.forEach((tool) => {
  const rawKey = tool.path ?? tool.id;
  TOOL_REGISTRY_BY_PATH.set(rawKey, tool);
  TOOL_REGISTRY_BY_PATH.set(normalizeToolKey(rawKey), tool);
});

export const getToolRegistryItem = (toolId: string | null | undefined): ToolRegistryItem | undefined => {
  if (!toolId) {
    return undefined;
  }
  return TOOL_REGISTRY_BY_PATH.get(toolId) ?? TOOL_REGISTRY_BY_PATH.get(normalizeToolKey(toolId));
};
