import React, { useState } from 'react';

interface EmailTemplateEditorProps {
  htmlContent: string;
  textContent: string;
  variables?: string[];
  onHtmlChange: (content: string) => void;
  onTextChange: (content: string) => void;
  readOnly?: boolean;
}

/**
 * EmailTemplateEditor 组件
 * 邮件模板编辑器，支持HTML和纯文本编辑、变量插入和实时预览
 * 
 * 需求: 19.6, 19.8 - 模板编辑和预览功能
 * 
 * Note: 使用简化的文本编辑器实现，避免与React 19的兼容性问题
 */
export const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({
  htmlContent,
  textContent,
  variables = [],
  onHtmlChange,
  onTextChange,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'html' | 'text' | 'preview'>('html');
  const [selectedVariable, setSelectedVariable] = useState<string>('');

  const insertVariable = (variable: string, isHtml: boolean) => {
    const variableTag = `\${${variable}}`;
    const textarea = document.getElementById(
      isHtml ? 'html-editor' : 'text-editor'
    ) as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const content = isHtml ? htmlContent : textContent;
      const newContent =
        content.substring(0, start) + variableTag + content.substring(end);
      
      if (isHtml) {
        onHtmlChange(newContent);
      } else {
        onTextChange(newContent);
      }
      
      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + variableTag.length,
          start + variableTag.length
        );
      }, 0);
    }
  };

  const commonFormatButtons = [
    { label: '粗体', tag: '<strong>', closeTag: '</strong>', icon: 'format_bold' },
    { label: '斜体', tag: '<em>', closeTag: '</em>', icon: 'format_italic' },
    { label: '链接', tag: '<a href="">', closeTag: '</a>', icon: 'link' },
    { label: '段落', tag: '<p>', closeTag: '</p>', icon: 'format_paragraph' },
    { label: '标题', tag: '<h2>', closeTag: '</h2>', icon: 'title' },
  ];

  const insertFormatTag = (tag: string, closeTag: string) => {
    const textarea = document.getElementById('html-editor') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = htmlContent.substring(start, end);
      const newContent =
        htmlContent.substring(0, start) +
        tag +
        selectedText +
        closeTag +
        htmlContent.substring(end);
      
      onHtmlChange(newContent);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + tag.length,
          start + tag.length + selectedText.length
        );
      }, 0);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-border-dark mb-4">
        <button
          onClick={() => setActiveTab('html')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'html'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          HTML 内容
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'text'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          纯文本内容
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'preview'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          预览
        </button>
      </div>

      {/* Toolbar */}
      {!readOnly && activeTab !== 'preview' && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {/* Format buttons (HTML only) */}
          {activeTab === 'html' && (
            <div className="flex items-center gap-1 mr-4">
              {commonFormatButtons.map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => insertFormatTag(btn.tag, btn.closeTag)}
                  className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title={btn.label}
                >
                  <span className="material-symbols-outlined text-lg">
                    {btn.icon}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Variable insertion */}
          {variables.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedVariable}
                onChange={(e) => setSelectedVariable(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 dark:border-border-dark rounded-lg bg-white dark:bg-surface-dark text-slate-900 dark:text-white"
              >
                <option value="">选择变量...</option>
                {variables.map((variable) => (
                  <option key={variable} value={variable}>
                    {variable}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (selectedVariable) {
                    insertVariable(selectedVariable, activeTab === 'html');
                    setSelectedVariable('');
                  }
                }}
                disabled={!selectedVariable}
                className="px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                插入变量
              </button>
            </div>
          )}
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'html' && (
          <textarea
            id="html-editor"
            value={htmlContent}
            onChange={(e) => onHtmlChange(e.target.value)}
            readOnly={readOnly}
            className="w-full h-full p-4 font-mono text-sm border border-slate-200 dark:border-border-dark rounded-lg bg-white dark:bg-surface-dark text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="输入 HTML 内容..."
          />
        )}

        {activeTab === 'text' && (
          <textarea
            id="text-editor"
            value={textContent}
            onChange={(e) => onTextChange(e.target.value)}
            readOnly={readOnly}
            className="w-full h-full p-4 text-sm border border-slate-200 dark:border-border-dark rounded-lg bg-white dark:bg-surface-dark text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="输入纯文本内容..."
          />
        )}

        {activeTab === 'preview' && (
          <div className="h-full overflow-auto border border-slate-200 dark:border-border-dark rounded-lg bg-white dark:bg-surface-dark">
            <div className="p-6">
              <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Variable Reference */}
      {variables.length > 0 && (
        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
            可用变量：
          </p>
          <div className="flex flex-wrap gap-2">
            {variables.map((variable) => (
              <code
                key={variable}
                className="px-2 py-1 text-xs bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded text-slate-900 dark:text-white"
              >
                ${'{'}
                {variable}
                {'}'}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
