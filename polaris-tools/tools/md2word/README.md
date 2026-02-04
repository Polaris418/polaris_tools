# MD2Word - Markdown 转 Word 工具

## 功能概述

MD2Word 是一个功能强大的 Markdown 到 Word 文档转换工具，支持单文档编辑和批量转换两种模式。

## 主要特性

### 编辑器模式 (Editor Mode)

- **实时预览**: 分栏视图、源码视图、预览视图三种模式
- **智能工具栏**: 快速插入格式化内容
- **键盘快捷键**:
  - `Ctrl+B`: 粗体
  - `Ctrl+I`: 斜体
  - `Ctrl+K`: 插入链接
- **字数统计**: 实时显示字符数、词数、行数、段落数、预估阅读时间
- **样式智能**: 自然语言样式命令解析

### 批量转换模式 (Batch Mode)

- **拖拽上传**: 支持拖拽多个文件同时上传
- **文件格式**: 支持 .md, .markdown, .txt 格式
- **模板选择**: 学术论文、企业报告、技术手册、内部备忘
- **队列管理**: 查看转换进度、重试失败项、下载全部

## 组件结构

```
tools/md2word/
├── index.tsx          # 主组件（Tab 切换）
├── types.ts           # 类型定义
├── TopNavigation.tsx  # 顶部导航（含 Tab 切换）
├── SidebarLeft.tsx    # 左侧边栏（文件管理）
├── SidebarRight.tsx   # 右侧边栏（样式智能）
├── Editor.tsx         # 编辑器（分栏/源码/预览）
├── FileUploader.tsx   # 文件上传（拖拽）
├── FileList.tsx       # 文件列表（批量模式）
├── BatchToolbar.tsx   # 批量工具栏
└── README.md          # 本文档
```

## 导出格式

| 格式 | 说明 |
|------|------|
| DOCX | Microsoft Word 文档 |
| PDF  | 便携文档格式 |
| HTML | 网页格式 |

## 模板说明

| 模板 | 适用场景 |
|------|----------|
| 学术论文 | 论文、研究报告 |
| 企业报告 | 商业文档、年报 |
| 技术手册 | API 文档、操作指南 |
| 内部备忘 | 会议纪要、简报 |

## 待开发功能

- [ ] 后端 API 集成（实际文档转换）
- [ ] 自定义模板编辑
- [ ] 云端文件存储
- [ ] 历史版本管理
- [ ] 协作编辑

## 技术栈

- React 19 + TypeScript
- TailwindCSS
- Material Symbols Icons
