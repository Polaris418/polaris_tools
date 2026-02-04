import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ViewMode, DocumentStats } from './types';
import { useAppContext } from '../../context/AppContext';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  selectedTemplate?: string;
  customStyles?: Array<{id: string; css: string}>;
  exportSettings?: {
    includeTableOfContents: boolean;
    pageNumbers: boolean;
  };
}

/**
 * MD2Word 编辑器 - 支持分栏视图、快捷键和字数统计
 */
export const Editor: React.FC<EditorProps> = ({ 
  content, 
  onChange, 
  selectedTemplate = 'corporate', 
  customStyles = [],
  exportSettings = { includeTableOfContents: true, pageNumbers: true }
}) => {
  const { language } = useAppContext();
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 动态插入全局样式
  useEffect(() => {
    const styleId = 'md2word-preview-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
      .markdown-preview .toc {
        display: block !important;
        background: #f9fafb !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
        padding: 16px !important;
        margin: 24px 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
        position: relative !important;
        z-index: 10 !important;
        min-height: 50px !important;
      }
      .markdown-preview .toc-title {
        font-weight: bold !important;
        font-size: 14pt !important;
        margin-bottom: 12px !important;
        color: #111827 !important;
        display: block !important;
      }
      .markdown-preview .toc-item {
        margin: 6px 0 !important;
        color: #4b5563 !important;
        cursor: pointer;
        display: block !important;
        line-height: 1.6 !important;
      }
      .markdown-preview .toc-item:hover {
        color: #6366f1 !important;
      }
      .markdown-preview sup {
        vertical-align: super !important;
        font-size: 0.75em !important;
        line-height: 0 !important;
      }
      .markdown-preview .citation {
        color: #2563eb !important;
        font-weight: 500 !important;
        cursor: pointer !important;
      }
      .markdown-preview .citation a {
        color: inherit !important;
        text-decoration: none !important;
      }
      .markdown-preview .citation:hover {
        color: #1d4ed8 !important;
      }
      .markdown-preview .citation:hover a {
        color: inherit !important;
      }
      .markdown-preview .references {
        display: block !important;
        margin-top: 48px !important;
        padding-top: 24px !important;
        border-top: 2px solid #e5e7eb !important;
        width: 100% !important;
      }
      .markdown-preview .references-title {
        font-size: 16pt !important;
        font-weight: bold !important;
        color: #111827 !important;
        margin-bottom: 16px !important;
        display: block !important;
      }
      .markdown-preview .reference-item {
        margin: 8px 0 !important;
        padding-left: 24px !important;
        text-indent: -24px !important;
        font-size: 10pt !important;
        color: #374151 !important;
        line-height: 1.6 !important;
        display: block !important;
        transition: background-color 0.3s ease !important;
        padding: 8px !important;
        border-radius: 4px !important;
      }
      .markdown-preview .reference-id {
        color: #2563eb !important;
        font-weight: 500 !important;
      }
    `;
    
    return () => {
      // 清理函数（可选）
    };
  }, []);

  // 处理引用点击跳转
  useEffect(() => {
    const handleCitationClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="#ref-"]');
      
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          const targetId = href.substring(1); // 移除 #
          const targetElement = document.getElementById(targetId);
          
          if (targetElement) {
            // 找到预览容器
            const previewContainer = targetElement.closest('.overflow-y-auto');
            
            if (previewContainer) {
              // 计算目标元素相对于容器的位置
              const containerRect = previewContainer.getBoundingClientRect();
              const targetRect = targetElement.getBoundingClientRect();
              const scrollTop = previewContainer.scrollTop;
              const offset = targetRect.top - containerRect.top + scrollTop - 100; // 100px 偏移量
              
              // 平滑滚动到目标位置
              previewContainer.scrollTo({
                top: offset,
                behavior: 'smooth',
              });
              
              // 添加高亮效果
              targetElement.style.backgroundColor = '#fef3c7';
              setTimeout(() => {
                targetElement.style.backgroundColor = '';
              }, 2000);
            }
          }
        }
      }
    };

    document.addEventListener('click', handleCitationClick);
    
    return () => {
      document.removeEventListener('click', handleCitationClick);
    };
  }, []);

  // 模板样式配置
  const templateStyles = useMemo(() => {
    const templates: Record<string, any> = {
      academic: {
        h1: { fontSize: '16pt', fontFamily: 'SimSun, serif', textAlign: 'center', fontWeight: 'bold', color: '#000000' },
        h2: { fontSize: '14pt', fontFamily: 'SimSun, serif', fontWeight: 'bold', color: '#000000' },
        h3: { fontSize: '12pt', fontFamily: 'SimSun, serif', fontWeight: 'bold', color: '#000000' },
        body: { fontSize: '12pt', fontFamily: 'SimSun, serif', lineHeight: '1.5', color: '#000000' },
      },
      corporate: {
        h1: { fontSize: '18pt', fontFamily: 'Microsoft YaHei, sans-serif', textAlign: 'left', fontWeight: 'bold', color: '#000000' },
        h2: { fontSize: '14pt', fontFamily: 'Microsoft YaHei, sans-serif', fontWeight: 'bold', color: '#000000' },
        h3: { fontSize: '12pt', fontFamily: 'Microsoft YaHei, sans-serif', fontWeight: 'bold', color: '#000000' },
        body: { fontSize: '11pt', fontFamily: 'Microsoft YaHei, sans-serif', lineHeight: '1.15', color: '#000000' },
      },
      technical: {
        h1: { fontSize: '16pt', fontFamily: 'Arial, sans-serif', textAlign: 'left', fontWeight: 'bold', color: '#000000' },
        h2: { fontSize: '14pt', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', color: '#000000' },
        h3: { fontSize: '12pt', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', color: '#000000' },
        body: { fontSize: '11pt', fontFamily: 'Arial, sans-serif', lineHeight: '1.2', color: '#000000' },
      },
      memo: {
        h1: { fontSize: '14pt', fontFamily: 'SimHei, sans-serif', textAlign: 'left', fontWeight: 'bold', color: '#000000' },
        h2: { fontSize: '12pt', fontFamily: 'SimHei, sans-serif', fontWeight: 'bold', color: '#000000' },
        h3: { fontSize: '11pt', fontFamily: 'SimHei, sans-serif', fontWeight: 'bold', color: '#000000' },
        body: { fontSize: '11pt', fontFamily: 'FangSong, serif', lineHeight: '1.0', color: '#000000' },
      },
    };
    return templates[selectedTemplate] || templates.corporate;
  }, [selectedTemplate]);

  // 计算文档统计信息
  const stats: DocumentStats = useMemo(() => {
    const text = content || '';
    const charCount = text.length;
    const charCountNoSpaces = text.replace(/\s/g, '').length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lineCount = text.split('\n').length;
    const paragraphCount = text.split(/\n\s*\n/).filter((p: string) => p.trim()).length || 1;
    
    // 预估阅读时间（按中文 300字/分钟，英文 200词/分钟）
    const isChinese = /[\u4e00-\u9fa5]/.test(text);
    const readTime = Math.ceil(isChinese ? charCountNoSpaces / 300 : wordCount / 200);
    
    return { charCount, charCountNoSpaces, wordCount, lineCount, paragraphCount, readTime };
  }, [content]);

  // 插入文本到光标位置
  const insertText = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    onChange(newText);
    
    // 恢复光标位置
    setTimeout(() => {
      textarea.focus();
      const newPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [content, onChange]);

  // 工具栏按钮处理
  const handleToolbarAction = useCallback((action: string) => {
    switch (action) {
      case 'bold':
        insertText('**', '**');
        break;
      case 'italic':
        insertText('*', '*');
        break;
      case 'heading':
        insertText('## ');
        break;
      case 'link':
        insertText('[链接文字](', ')');
        break;
      case 'image':
        insertText('![图片描述](', ')');
        break;
      case 'code':
        insertText('`', '`');
        break;
      case 'codeblock':
        insertText('```\n', '\n```');
        break;
      case 'list':
        insertText('- ');
        break;
      case 'quote':
        insertText('> ');
        break;
      case 'table':
        insertText('| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 内容 | 内容 | 内容 |');
        break;
    }
  }, [insertText]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!textareaRef.current || document.activeElement !== textareaRef.current) return;
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            handleToolbarAction('bold');
            break;
          case 'i':
            e.preventDefault();
            handleToolbarAction('italic');
            break;
          case 'k':
            e.preventDefault();
            handleToolbarAction('link');
            break;
          case '`':
            e.preventDefault();
            handleToolbarAction('code');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleToolbarAction]);

  // LaTeX 到 Unicode 转换函数
  const convertLatexToUnicode = useCallback((latex: string): string => {
    let result = latex;
    
    const replacements: Record<string, string> = {
      '\\int': '∫', '\\sum': '∑', '\\prod': '∏', '\\infty': '∞',
      '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
      '\\epsilon': 'ε', '\\theta': 'θ', '\\lambda': 'λ', '\\mu': 'μ',
      '\\pi': 'π', '\\sigma': 'σ', '\\phi': 'φ', '\\omega': 'ω',
      '\\Delta': 'Δ', '\\Sigma': 'Σ', '\\Omega': 'Ω',
      '\\pm': '±', '\\times': '×', '\\div': '÷',
      '\\leq': '≤', '\\geq': '≥', '\\neq': '≠', '\\approx': '≈', '\\equiv': '≡',
      '\\in': '∈', '\\subset': '⊂', '\\supset': '⊃', '\\cup': '∪', '\\cap': '∩',
      '\\emptyset': '∅', '\\forall': '∀', '\\exists': '∃',
      '\\nabla': '∇', '\\partial': '∂', '\\sqrt': '√', '\\max': 'max', '\\hat': '^',
    };
    
    for (const [latex, unicode] of Object.entries(replacements)) {
      result = result.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), unicode);
    }
    
    result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');
    result = result.replace(/\^2/g, '²').replace(/\^3/g, '³').replace(/\^n/g, 'ⁿ');
    result = result.replace(/\^\{2\}/g, '²').replace(/\^\{3\}/g, '³').replace(/\^\{n\}/g, 'ⁿ').replace(/\^\{-1\}/g, '⁻¹');
    result = result.replace(/_\{([^}]+)\}/g, '₍$1₎').replace(/_([a-zA-Z0-9])/g, '₍$1₎');
    result = result.replace(/[{}\\]/g, '');
    
    return result.trim();
  }, []);

  // 简单的 Markdown 预览渲染
  const renderedContent = useMemo(() => {
    if (!content) return '';
    
    // 生成模板样式的 CSS
    let templateCSS = `
      <style>
        .markdown-preview h1 {
          font-size: ${templateStyles.h1.fontSize};
          font-family: ${templateStyles.h1.fontFamily};
          text-align: ${templateStyles.h1.textAlign};
          font-weight: ${templateStyles.h1.fontWeight};
          color: ${templateStyles.h1.color};
          margin: 24px 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #333;
        }
        .markdown-preview h2 {
          font-size: ${templateStyles.h2.fontSize};
          font-family: ${templateStyles.h2.fontFamily};
          font-weight: ${templateStyles.h2.fontWeight};
          color: ${templateStyles.h2.color};
          margin: 20px 0 12px 0;
        }
        .markdown-preview h3 {
          font-size: ${templateStyles.h3.fontSize};
          font-family: ${templateStyles.h3.fontFamily};
          font-weight: ${templateStyles.h3.fontWeight};
          color: ${templateStyles.h3.color};
          margin: 16px 0 10px 0;
        }
        .markdown-preview p {
          font-size: ${templateStyles.body.fontSize};
          font-family: ${templateStyles.body.fontFamily};
          line-height: ${templateStyles.body.lineHeight};
          color: ${templateStyles.body.color};
          margin: 12px 0;
          text-align: justify;
        }
        .markdown-preview .formula {
          font-family: 'Cambria Math', serif;
          font-style: italic;
          color: #000000;
        }
        .markdown-preview .page-number {
          display: ${exportSettings.pageNumbers ? 'block' : 'none'};
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 10pt;
        }
        .markdown-preview .toc {
          display: block !important;
          background: #f9fafb !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          padding: 16px !important;
          margin: 24px 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
          position: relative !important;
          z-index: 10 !important;
          min-height: 50px !important;
        }
        .markdown-preview .toc-title {
          font-weight: bold !important;
          font-size: 14pt !important;
          margin-bottom: 12px !important;
          color: #111827 !important;
          display: block !important;
        }
        .markdown-preview .toc-item {
          margin: 6px 0 !important;
          color: #4b5563 !important;
          cursor: pointer;
          display: block !important;
          line-height: 1.6 !important;
        }
        .markdown-preview .toc-item:hover {
          color: #6366f1 !important;
        }
        .markdown-preview sup {
          vertical-align: super !important;
          font-size: 0.75em !important;
          line-height: 0 !important;
        }
        .markdown-preview .citation {
          color: #2563eb !important;
          font-weight: 500 !important;
          cursor: pointer;
          font-size: 0.75em;
          vertical-align: super;
        }
        .markdown-preview .citation:hover {
          color: #1d4ed8 !important;
        }
        .markdown-preview .references {
          display: block !important;
          margin-top: 48px !important;
          padding-top: 24px !important;
          border-top: 2px solid #e5e7eb !important;
          width: 100% !important;
        }
        .markdown-preview .references-title {
          font-size: 16pt !important;
          font-weight: bold !important;
          color: #111827 !important;
          margin-bottom: 16px !important;
          display: block !important;
        }
        .markdown-preview .reference-item {
          margin: 8px 0 !important;
          padding-left: 24px !important;
          text-indent: -24px !important;
          font-size: 10pt !important;
          color: #374151 !important;
          line-height: 1.6 !important;
          display: block !important;
        }
        .markdown-preview .reference-id {
          color: #2563eb !important;
          font-weight: 500 !important;
        }
    `;
    
    // 添加自定义样式规则
    if (customStyles.length > 0) {
      customStyles.forEach((style: any) => {
        templateCSS += `\n        ${style.css}`;
      });
    }
    
    templateCSS += `\n      </style>`;
    
    // 生成目录
    let toc = '';
    if (exportSettings.includeTableOfContents) {
      const headings: Array<{level: number; text: string; id: string}> = [];
      const lines = content.split('\n');
      lines.forEach((line: string, index: number) => {
        if (line.startsWith('# ')) {
          headings.push({ level: 1, text: line.substring(2), id: `h1-${index}` });
        } else if (line.startsWith('## ')) {
          headings.push({ level: 2, text: line.substring(3), id: `h2-${index}` });
        } else if (line.startsWith('### ')) {
          headings.push({ level: 3, text: line.substring(4), id: `h3-${index}` });
        }
      });
      
      if (headings.length > 0) {
        toc = '<div class="toc"><div class="toc-title">目录 / Table of Contents</div>';
        headings.forEach((h: any) => {
          const indent = (h.level - 1) * 20;
          toc += `<div class="toc-item" style="margin-left: ${indent}px;">${h.text}</div>`;
        });
        toc += '</div>';
      }
    }
    
    // 提取文献引用
    const references: Array<{id: string; text: string}> = [];
    const refPattern = /^\[\^(\w+)\]:\s*(.+)$/gm;
    let refMatch: RegExpExecArray | null;
    while ((refMatch = refPattern.exec(content)) !== null) {
      references.push({ id: refMatch[1], text: refMatch[2] });
    }
    
    let html = content
      // 移除文献定义行（不在正文中显示）
      .replace(/^\[\^(\w+)\]:\s*.+$/gm, '')
      // 文献引用标记 [^1] - 必须在链接处理之前
      .replace(/\[\^(\w+)\]/g, '<sup class="citation"><a href="#ref-$1" style="text-decoration: none; color: inherit;">[$1]</a></sup>')
      // 先处理数学公式（避免被其他规则干扰）
      .replace(/\$\$([\s\S]*?)\$\$/g, (_m: string, formula: string) => {
        const unicodeFormula = convertLatexToUnicode(formula.trim());
        return `<div class="my-4 text-center text-lg formula">${unicodeFormula}</div>`;
      })
      .replace(/\$([^$\n]+)\$/g, (_m: string, formula: string) => {
        const unicodeFormula = convertLatexToUnicode(formula);
        return `<span class="formula">${unicodeFormula}</span>`;
      })
      // 代码块
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto mb-4 border border-slate-200 dark:border-slate-700"><code class="text-sm font-mono text-slate-800 dark:text-slate-200">$2</code></pre>')
      // 标题
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // 粗体和斜体
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
      // 行内代码
      .replace(/`([^`]+)`/g, '<code class="bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded text-sm text-indigo-600 dark:text-indigo-400 font-mono">$1</code>')
      // 引用
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-indigo-500 pl-4 py-2 my-4 bg-slate-50 dark:bg-slate-800/50 italic text-slate-600 dark:text-slate-300">$1</blockquote>')
      // 无序列表
      .replace(/^- (.+)$/gm, '<li class="ml-5 list-disc mb-1">$1</li>')
      // 有序列表
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-5 list-decimal mb-1">$1</li>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">$1</a>')
      // 图片
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure class="my-4"><img src="$2" alt="$1" class="rounded-lg max-w-full shadow-md" /><figcaption class="text-xs text-center text-slate-500 mt-2">$1</figcaption></figure>')
      // 水平线
      .replace(/^---$/gm, '<hr class="my-6 border-slate-200 dark:border-slate-700" />')
      // 段落
      .replace(/^(?!<[hluopfbrd])(.+)$/gm, '<p>$1</p>');

    // 生成参考文献列表
    let referencesHtml = '';
    if (references.length > 0) {
      referencesHtml = '<div class="references"><h2 class="references-title">参考文献 / References</h2>';
      references.forEach((ref: any) => {
        referencesHtml += `<div class="reference-item" id="ref-${ref.id}"><span class="reference-id">[${ref.id}]</span> ${ref.text}</div>`;
      });
      referencesHtml += '</div>';
    }

    // 添加页码
    const pageNumber = exportSettings.pageNumbers ? '<div class="page-number">- 1 -</div>' : '';

    return templateCSS + toc + html + referencesHtml + pageNumber;
  }, [content, convertLatexToUnicode, templateStyles, customStyles, exportSettings]);

  // 工具按钮配置
  const toolbarButtons = [
    { icon: 'format_bold', action: 'bold', title: language === 'zh' ? '粗体 (Ctrl+B)' : 'Bold (Ctrl+B)' },
    { icon: 'format_italic', action: 'italic', title: language === 'zh' ? '斜体 (Ctrl+I)' : 'Italic (Ctrl+I)' },
    { icon: 'title', action: 'heading', title: language === 'zh' ? '标题' : 'Heading' },
    { divider: true },
    { icon: 'link', action: 'link', title: language === 'zh' ? '链接 (Ctrl+K)' : 'Link (Ctrl+K)' },
    { icon: 'image', action: 'image', title: language === 'zh' ? '图片' : 'Image' },
    { divider: true },
    { icon: 'code', action: 'code', title: language === 'zh' ? '行内代码' : 'Inline Code' },
    { icon: 'code_blocks', action: 'codeblock', title: language === 'zh' ? '代码块' : 'Code Block' },
    { divider: true },
    { icon: 'format_list_bulleted', action: 'list', title: language === 'zh' ? '列表' : 'List' },
    { icon: 'format_quote', action: 'quote', title: language === 'zh' ? '引用' : 'Quote' },
    { icon: 'table_chart', action: 'table', title: language === 'zh' ? '表格' : 'Table' },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900 relative">
      {/* 工具栏 */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 justify-between bg-white dark:bg-slate-800 sticky top-0 z-10">
        <div className="flex items-center gap-0.5">
          {toolbarButtons.map((btn, index) => (
            btn.divider ? (
              <div key={`divider-${index}`} className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-2"></div>
            ) : (
              <button 
                key={btn.icon} 
                onClick={() => handleToolbarAction(btn.action!)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title={btn.title}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{btn.icon}</span>
              </button>
            )
          ))}
        </div>

        {/* 视图切换 */}
        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
          {(['split', 'source', 'preview'] as ViewMode[]).map((mode) => (
            <button 
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                viewMode === mode 
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              {mode === 'split' ? (language === 'zh' ? '分栏' : 'Split') : 
               mode === 'source' ? (language === 'zh' ? '源码' : 'Source') :
               (language === 'zh' ? '预览' : 'Preview')}
            </button>
          ))}
        </div>
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 代码输入 */}
        {(viewMode === 'split' || viewMode === 'source') && (
          <div className={`${viewMode === 'split' ? 'flex-1' : 'flex-1'} bg-white dark:bg-slate-800 overflow-y-auto ${viewMode === 'split' ? 'border-r border-slate-200 dark:border-slate-700' : ''} flex flex-col`}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              className="w-full flex-1 p-6 font-mono text-sm leading-relaxed text-slate-800 dark:text-slate-200 bg-transparent resize-none focus:outline-none"
              placeholder={language === 'zh' ? '在此输入 Markdown 内容...' : 'Type your Markdown here...'}
              spellCheck={false}
            />
          </div>
        )}

        {/* 实时预览 */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className={`${viewMode === 'split' ? 'flex-1' : 'flex-1'} bg-slate-50 dark:bg-slate-900 overflow-y-auto h-full`}>
            <div className="p-6 max-w-3xl mx-auto min-h-full">
              <div 
                className="markdown-preview prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: renderedContent }}
              />
              {!content && (
                <div className="text-center text-slate-400 dark:text-slate-500 mt-20">
                  <span className="material-symbols-outlined text-5xl mb-4 block">edit_note</span>
                  <p>{language === 'zh' ? '预览将在此显示' : 'Preview will appear here'}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="h-8 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center px-4 justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span>{language === 'zh' ? `${stats.charCount} 字符` : `${stats.charCount} chars`}</span>
          <span>{language === 'zh' ? `${stats.wordCount} 词` : `${stats.wordCount} words`}</span>
          <span>{language === 'zh' ? `${stats.lineCount} 行` : `${stats.lineCount} lines`}</span>
          <span>{language === 'zh' ? `${stats.paragraphCount} 段` : `${stats.paragraphCount} paragraphs`}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">schedule</span>
          <span>{language === 'zh' ? `约 ${stats.readTime} 分钟阅读` : `~${stats.readTime} min read`}</span>
        </div>
      </div>
    </div>
  );
};
