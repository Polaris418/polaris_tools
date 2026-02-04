import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TopNavigation } from './TopNavigation';
import { SidebarLeft } from './SidebarLeft';
import { Editor } from './Editor';
import { SidebarRight } from './SidebarRight';
import { FileUploader } from './FileUploader';
import { FileList } from './FileList';
import { BatchToolbar } from './BatchToolbar';
import { FileItem, ExportFormat, TabMode, FileStatus, GlobalSettings } from './types';
import { useAppContext } from '../../context/AppContext';
import { ToastContainer, ToastType } from '../../components/Toast';
import { markdownToDocx, markdownToPdf, markdownToHtml, downloadFile } from '../../utils/documentConverter';
import { apiClient } from '../../api/client';

// 默认 Markdown 内容
const DEFAULT_CONTENT = `# 测试文献引用功能

## 引言

人工智能的发展已经改变了我们的生活方式[^1]。深度学习技术在图像识别领域取得了突破性进展[^2]。

## 研究背景

根据最新研究[^3]，自然语言处理技术正在快速发展。Transformer架构的提出[^4]为大语言模型的发展奠定了基础。

## 数学公式示例

深度学习中常用的激活函数包括：

- Sigmoid函数：$\\sigma(x) = \\frac{1}{1+e^{-x}}$
- ReLU函数：$f(x) = \\max(0, x)$

损失函数的计算公式为：

$$
L = \\frac{1}{n}\\sum_{i=1}^{n}(y_i - \\hat{y}_i)^2
$$

## 结论

本文综述了人工智能领域的最新进展[^5]，并展望了未来的发展方向。

---

[^1]: LeCun, Y., Bengio, Y., & Hinton, G. (2015). Deep learning. Nature, 521(7553), 436-444.
[^2]: He, K., Zhang, X., Ren, S., & Sun, J. (2016). Deep residual learning for image recognition. CVPR, 770-778.
[^3]: Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2018). BERT: Pre-training of deep bidirectional transformers for language understanding. arXiv preprint arXiv:1810.04805.
[^4]: Vaswani, A., et al. (2017). Attention is all you need. Advances in neural information processing systems, 30.
[^5]: Goodfellow, I., Bengio, Y., & Courville, A. (2016). Deep learning. MIT press.
`;

const INITIAL_FILES: FileItem[] = [
  { 
    id: '1', 
    name: 'Untitled.md', 
    content: DEFAULT_CONTENT, 
    lastEdited: 'Just now', 
    type: 'markdown', 
    size: DEFAULT_CONTENT.length, 
    status: FileStatus.Pending, 
    progress: 0 
  }
];

/**
 * MD2Word 主组件
 * Markdown 转 Word 文档工具
 * 支持单文档编辑模式和批量转换模式
 */
export const Md2Word: React.FC = () => {
  const { setPage, t, language, isGuest, checkGuestUsage, recordGuestToolUsage } = useAppContext();
  
  // Tab 模式状态
  const [tabMode, setTabMode] = useState<TabMode>('editor');
  
  // 编辑器模式状态
  const [files, setFiles] = useState<FileItem[]>(INITIAL_FILES);
  const [activeFileId, setActiveFileId] = useState<string>('1');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('corporate');
  const [customStyles, setCustomStyles] = useState<Array<{id: string; css: string}>>([]);
  const [exportSettings, setExportSettings] = useState({
    imageQuality: 85,
    includeTableOfContents: true,
    pageNumbers: true,
    mirrorMargins: false
  });
  
  // 批量转换模式状态
  const [batchFiles, setBatchFiles] = useState<FileItem[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    template: 'corporate',
    format: 'docx'
  });
  
  // Toast 提示状态
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);
  
  // 游客使用记录
  const [hasRecordedUsage, setHasRecordedUsage] = useState(false);
  
  // 记录工具使用 - 包含使用时长追踪
  const hasRecordedToolUsage = useRef(false);
  const usageIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  
  // 发送使用时长的函数
  const sendDuration = useCallback(async () => {
    if (usageIdRef.current) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (duration > 0) {
        try {
          await apiClient.tools.updateUsageDuration(usageIdRef.current, duration);
          console.debug('Tool usage duration recorded:', duration, 'seconds');
        } catch (err) {
          console.debug('Failed to update usage duration:', err);
        }
      }
      usageIdRef.current = null;
    }
  }, []);
  
  useEffect(() => {
    const recordToolUsage = async () => {
      if (!hasRecordedToolUsage.current) {
        hasRecordedToolUsage.current = true;
        startTimeRef.current = Date.now();
        try {
          const result = await apiClient.tools.recordUseByUrl('md2word');
          if (result.data) {
            usageIdRef.current = result.data;
            console.debug('Tool usage recorded, usageId:', result.data);
          }
        } catch (err) {
          console.debug('Failed to record tool usage:', err);
        }
      }
    };
    recordToolUsage();
    
    // 页面卸载时发送使用时长
    const handleBeforeUnload = () => {
      if (usageIdRef.current) {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const token = localStorage.getItem('token');
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        navigator.sendBeacon(
          `${baseUrl}/api/v1/tools/usage/${usageIdRef.current}/duration?duration=${duration}`,
          ''
        );
      }
    };
    
    // 页面可见性变化时发送
    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendDuration();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sendDuration();
    };
  }, [sendDuration]);
  
  // Toast 管理
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  // 获取当前活跃文件
  const activeFile = files.find(f => f.id === activeFileId);
  const activeFileName = activeFile?.name || 'Untitled';
  const activeContent = activeFile?.content || '';

  // 处理内容变更
  const handleContentChange = useCallback((newContent: string) => {
    setFiles(prev => prev.map(f => 
      f.id === activeFileId 
        ? { ...f, content: newContent, lastEdited: 'Just now', size: newContent.length }
        : f
    ));
  }, [activeFileId]);

  // 创建新文件
  const handleNewFile = useCallback(() => {
    const newId = Date.now().toString();
    const newFile: FileItem = {
      id: newId,
      name: `Untitled_${files.length + 1}.md`,
      content: `# New Document\n\nStart writing here...`,
      lastEdited: 'Just now',
      type: 'markdown',
      size: 0,
      status: FileStatus.Pending,
      progress: 0
    };
    setFiles(prev => [newFile, ...prev]);
    setActiveFileId(newId);
  }, [files.length]);

  // 处理右侧栏文件上传
  const handleSidebarFileUpload = useCallback((uploadedFiles: File[]) => {
    // 在编辑器模式下，读取第一个文件内容到当前编辑区
    if (uploadedFiles.length > 0) {
      const file = uploadedFiles[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // 创建新文件或更新当前文件
        const newId = Date.now().toString();
        const newFile: FileItem = {
          id: newId,
          name: file.name,
          content: content,
          lastEdited: 'Just now',
          type: 'markdown',
          size: file.size,
          status: FileStatus.Pending,
          progress: 0
        };
        setFiles(prev => [newFile, ...prev]);
        setActiveFileId(newId);
      };
      reader.readAsText(file);
    }
  }, []);

  // 处理导出 - 使用纯前端转换
  const handleExport = useCallback(async (format: ExportFormat) => {
    // 检查游客限制
    if (isGuest && !hasRecordedUsage) {
      if (!checkGuestUsage()) {
        return;
      }
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }

    try {
      const fileName = activeFileName.replace(/\.md$/, '');
      
      // 使用前端转换器
      let blob: Blob;
      
      if (format === 'docx') {
        blob = await markdownToDocx(activeContent, selectedTemplate);
      } else if (format === 'pdf') {
        blob = await markdownToPdf(activeContent, selectedTemplate);
      } else if (format === 'html') {
        const htmlContent = markdownToHtml(activeContent, selectedTemplate);
        blob = new Blob([htmlContent], { type: 'text/html' });
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }
      
      // 下载文件
      downloadFile(blob, fileName, format);
      
      // 显示成功消息
      showToast(
        t('md2word.export_success', { fileName, format }),
        'success'
      );
    } catch (error) {
      console.error('Export failed:', error);
      showToast(
        t('md2word.export_failed', { error: error instanceof Error ? error.message : 'Unknown error' }),
        'error'
      );
    }
  }, [activeFileName, activeContent, selectedTemplate, t, showToast, isGuest, hasRecordedUsage, checkGuestUsage, recordGuestToolUsage]);

  // 返回仪表盘
  const handleBack = useCallback(() => {
    setPage('dashboard');
  }, [setPage]);

  // 批量模式：添加文件
  const handleFilesAdd = useCallback((newFiles: File[]) => {
    const fileItems: FileItem[] = newFiles.map(file => ({
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      content: '',
      lastEdited: 'Just now',
      type: 'markdown',
      size: file.size,
      status: FileStatus.Pending,
      progress: 0,
      file // 保存原始 File 对象以便后续读取
    }));
    
    // 读取文件内容
    fileItems.forEach((item, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBatchFiles(prev => prev.map(f => 
          f.id === item.id 
            ? { ...f, content: e.target?.result as string }
            : f
        ));
      };
      reader.readAsText(newFiles[index]);
    });
    
    setBatchFiles(prev => [...prev, ...fileItems]);
  }, []);

  // 批量模式：移除文件
  const handleFileRemove = useCallback((id: string) => {
    setBatchFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // 批量模式：设置模板覆盖
  const handleTemplateOverride = useCallback((id: string, template: string) => {
    setBatchFiles(prev => prev.map(f => 
      f.id === id ? { ...f, templateOverride: template || undefined } : f
    ));
  }, []);

  // 批量模式：开始转换 - 使用纯前端转换
  const handleStartConversion = useCallback(async () => {
    // 检查游客限制
    if (isGuest && !hasRecordedUsage) {
      if (!checkGuestUsage()) {
        return;
      }
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }

    const pendingFiles = batchFiles.filter(f => f.status === FileStatus.Pending);
    if (pendingFiles.length === 0) return;

    // 逐个转换文件
    for (const file of pendingFiles) {
      try {
        // 设置为转换中
        setBatchFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: FileStatus.Converting, progress: 0 } : f
        ));

        // 模拟进度更新
        const progressInterval = setInterval(() => {
          setBatchFiles(prev => {
            const currentFile = prev.find(f => f.id === file.id);
            if (!currentFile || currentFile.status !== FileStatus.Converting) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev.map(f => 
              f.id === file.id ? { ...f, progress: Math.min(f.progress + 25, 90) } : f
            );
          });
        }, 300);

        // 使用前端转换器
        const template = file.templateOverride || globalSettings.template;
        const fileName = file.name.replace(/\.md$/, '');
        
        let blob: Blob;
        
        if (globalSettings.format === 'docx') {
          blob = await markdownToDocx(file.content, template);
        } else if (globalSettings.format === 'pdf') {
          blob = await markdownToPdf(file.content, template);
        } else if (globalSettings.format === 'html') {
          const htmlContent = markdownToHtml(file.content, template);
          blob = new Blob([htmlContent], { type: 'text/html' });
        } else {
          throw new Error(`Unsupported format: ${globalSettings.format}`);
        }

        clearInterval(progressInterval);

        // 保存 blob 到文件对象中以便后续下载
        setBatchFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { 
                ...f, 
                status: FileStatus.Done, 
                progress: 100,
                file: new File([blob], `${fileName}.${globalSettings.format}`)
              }
            : f
        ));

      } catch (error) {
        console.error(`Conversion failed for ${file.name}:`, error);
        setBatchFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { 
                ...f, 
                status: FileStatus.Error, 
                progress: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            : f
        ));
      }
    }
  }, [batchFiles, globalSettings, isGuest, hasRecordedUsage, checkGuestUsage, recordGuestToolUsage]);

  // 批量模式：清除已完成
  const handleClearCompleted = useCallback(() => {
    setBatchFiles(prev => prev.filter(f => f.status !== FileStatus.Done));
  }, []);

  // 批量模式：下载全部
  const handleDownloadAll = useCallback(() => {
    const doneFiles = batchFiles.filter(f => f.status === FileStatus.Done && f.file);
    
    if (doneFiles.length === 0) {
      showToast(
        t('md2word.no_files'),
        'warning'
      );
      return;
    }

    // 逐个下载文件
    doneFiles.forEach(file => {
      if (file.file) {
        const url = window.URL.createObjectURL(file.file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    });

    showToast(
      t('md2word.downloaded_files', { count: doneFiles.length }),
      'success'
    );
  }, [batchFiles, t, showToast]);

  // 批量模式：重试
  const handleRetry = useCallback((id: string) => {
    setBatchFiles(prev => prev.map(f => 
      f.id === id ? { ...f, status: FileStatus.Pending, progress: 0, error: undefined } : f
    ));
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Toast 提示容器 */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* 顶部导航栏 */}
      <TopNavigation 
        activeFileName={tabMode === 'editor' ? activeFileName : undefined}
        tabMode={tabMode}
        onTabChange={setTabMode}
        onBack={handleBack}
      />

      {/* 主内容区域 */}
      {tabMode === 'editor' ? (
        // 编辑器模式
        <div className="flex flex-1 overflow-hidden min-h-0">
          <SidebarLeft 
            files={files} 
            activeFileId={activeFileId} 
            onFileSelect={setActiveFileId}
            onNewFile={handleNewFile}
            onFileUpload={handleSidebarFileUpload}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={setSelectedTemplate}
          />
          <Editor 
            content={activeContent}
            onChange={handleContentChange}
            selectedTemplate={selectedTemplate}
            customStyles={customStyles}
            exportSettings={exportSettings}
          />
          <SidebarRight 
            onExport={handleExport} 
            showToast={showToast}
            onStylesChange={setCustomStyles}
            onExportSettingsChange={setExportSettings}
          />
        </div>
      ) : (
        // 批量转换模式
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
            <div className="p-6 space-y-6 max-w-7xl mx-auto">
              {/* 批量工具栏 */}
              <BatchToolbar 
                settings={globalSettings}
                onSettingsChange={setGlobalSettings}
                files={batchFiles}
                onStartConversion={handleStartConversion}
                onClearCompleted={handleClearCompleted}
                onDownloadAll={handleDownloadAll}
              />

              {/* 文件上传区 */}
              <FileUploader onFilesAdd={handleFilesAdd} />

              {/* 文件列表 */}
              {batchFiles.length > 0 && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                  <FileList 
                    files={batchFiles}
                    globalTemplate={globalSettings.template}
                    onRemove={handleFileRemove}
                    onTemplateOverride={handleTemplateOverride}
                    onRetry={handleRetry}
                  />
                </div>
              )}

              {/* 空状态提示 */}
              {batchFiles.length === 0 && (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500">
                  <span className="material-symbols-outlined text-6xl mb-4 block opacity-50">upload_file</span>
                  <p className="text-lg font-medium">
                    {t('md2word.upload_to_start')}
                  </p>
                  <p className="text-sm mt-2 opacity-75">
                    {t('md2word.batch_processing')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Md2Word;
