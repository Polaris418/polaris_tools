import React, { useState, useCallback } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

type CaseType = 'upper' | 'lower' | 'title' | 'sentence' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant';

/**
 * 大小写转换工具
 * 支持多种文本格式转换
 */
export const CaseConverter: React.FC = () => {
  const { t, isGuest, checkGuestUsage, recordGuestToolUsage } = useAppContext();
  const [text, setText] = useState('');
  const [hasRecordedUsage, setHasRecordedUsage] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // 转换函数
  const conversions: { type: CaseType; label: string; convert: (s: string) => string }[] = [
    {
      type: 'upper',
      label: t('case_converter.uppercase'),
      convert: (s) => s.toUpperCase()
    },
    {
      type: 'lower',
      label: t('case_converter.lowercase'),
      convert: (s) => s.toLowerCase()
    },
    {
      type: 'title',
      label: t('case_converter.title_case'),
      convert: (s) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    },
    {
      type: 'sentence',
      label: t('case_converter.sentence_case'),
      convert: (s) => s.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, c => c.toUpperCase())
    },
    {
      type: 'camel',
      label: 'camelCase',
      convert: (s) => {
        const words = s.toLowerCase().split(/[\s_-]+/);
        return words.map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('');
      }
    },
    {
      type: 'pascal',
      label: 'PascalCase',
      convert: (s) => {
        const words = s.toLowerCase().split(/[\s_-]+/);
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
      }
    },
    {
      type: 'snake',
      label: 'snake_case',
      convert: (s) => s.toLowerCase().replace(/[\s-]+/g, '_').replace(/[A-Z]/g, m => '_' + m.toLowerCase())
    },
    {
      type: 'kebab',
      label: 'kebab-case',
      convert: (s) => s.toLowerCase().replace(/[\s_]+/g, '-').replace(/[A-Z]/g, m => '-' + m.toLowerCase())
    },
    {
      type: 'constant',
      label: 'CONSTANT_CASE',
      convert: (s) => s.toUpperCase().replace(/[\s-]+/g, '_')
    }
  ];

  // 处理文本输入
  const handleTextChange = (newText: string) => {
    if (isGuest && !hasRecordedUsage && newText.length > 0 && text.length === 0) {
      if (!checkGuestUsage()) return;
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }
    setText(newText);
  };

  // 复制到剪贴板
  const copyToClipboard = useCallback((value: string, type: string) => {
    navigator.clipboard.writeText(value);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  }, []);

  // 清空
  const handleClear = () => setText('');

  return (
    <ToolLayout toolId="case-converter">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 输入区域 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {t('case_converter.input')}
            </h3>
            {text && (
              <button
                onClick={handleClear}
                className="text-sm text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
              >
                {t('case_converter.clear')}
              </button>
            )}
          </div>
          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={t('case_converter.placeholder')}
            className="w-full h-40 p-4 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none"
          />
        </div>

        {/* 转换结果 */}
        {text && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conversions.map(({ type, label, convert }) => {
              const result = convert(text);
              const isCopied = copiedType === type;
              return (
                <div
                  key={type}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {label}
                    </span>
                    <button
                      onClick={() => copyToClipboard(result, type)}
                      className={`text-sm transition-colors ${
                        isCopied 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300'
                      }`}
                    >
                      {isCopied ? t('case_converter.copied') : t('case_converter.copy')}
                    </button>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white font-mono text-sm break-all max-h-24 overflow-y-auto">
                    {result || '-'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 空状态 */}
        {!text && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-slate-400">text_format</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">{t('case_converter.empty_hint')}</p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};
