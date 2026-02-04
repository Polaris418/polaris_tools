import React, { useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';

interface FileUploaderProps {
  onFilesAdd: (files: File[]) => void;
}

/**
 * 文件上传组件 - 支持拖拽和点击上传
 */
export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesAdd }) => {
  const { language, t } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files).filter(
        (file: File) => file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt')
      );
      if (filesArray.length > 0) {
        onFilesAdd(filesArray);
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesAdd(filesArray);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleButtonClick}
      className={`flex flex-col items-center gap-6 rounded-xl border-2 border-dashed px-6 py-12 transition-all cursor-pointer
        ${isDragging 
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500'
        }`}
    >
      <input 
        type="file" 
        multiple 
        accept=".md,.markdown,.txt" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleInputChange}
      />
      
      <div className="flex flex-col items-center gap-4 pointer-events-none">
        <div className={`p-4 rounded-full transition-colors ${isDragging ? 'bg-indigo-100 dark:bg-indigo-800' : 'bg-indigo-50 dark:bg-indigo-900/30'}`}>
          <span className="material-symbols-outlined text-4xl text-indigo-600 dark:text-indigo-400">upload_file</span>
        </div>
        <div className="text-center">
          <p className="text-slate-900 dark:text-white text-lg font-bold">
            {t('md2word.upload_title')}
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            {t('md2word.upload_description')}
          </p>
        </div>
      </div>
      
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleButtonClick();
        }}
        className="flex items-center justify-center gap-2 rounded-lg h-10 px-6 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-sm font-bold transition-colors"
      >
        <span className="material-symbols-outlined text-lg">folder_open</span>
        <span>{t('md2word.select_files_button')}</span>
      </button>
    </div>
  );
};
