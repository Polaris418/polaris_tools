import React, { useState, useMemo } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

/**
 * 字数统计工具
 * 统计文本的字符数、单词数、行数、段落数等
 * 支持中英文混合文本
 */
export const WordCounter: React.FC = () => {
  const { t, language, isGuest, checkGuestUsage, recordGuestToolUsage } = useAppContext();
  const [text, setText] = useState('');
  const [hasRecordedUsage, setHasRecordedUsage] = useState(false);
  
  // 统计数据（使用 useMemo 优化性能）
  const stats = useMemo(() => {
    // 基础统计
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const lines = text ? text.split('\n').length : 0;
    const paragraphs = text.trim() ? text.split(/\n\n+/).filter(p => p.trim()).length : 0;
    
    // 中文字符统计（包括中文标点）
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const chinesePunctuation = (text.match(/[\u3000-\u303f\uff00-\uffef]/g) || []).length;
    
    // 英文单词统计（移除中文后统计）
    const textWithoutChinese = text.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g, ' ');
    const englishWords = textWithoutChinese.trim() 
      ? textWithoutChinese.trim().split(/\s+/).filter(w => /[a-zA-Z]/.test(w)).length 
      : 0;
    
    // 数字统计
    const numbers = (text.match(/\d+/g) || []).length;
    
    // 总单词数 = 中文字符 + 英文单词（中文按字计数，英文按词计数）
    const totalWords = chineseChars + englishWords;
    
    // 句子统计（支持中英文句号）
    const sentences = text.trim() 
      ? text.split(/[.!?。！？]+/).filter(s => s.trim()).length 
      : 0;
    
    // 空白字符统计
    const spaces = (text.match(/ /g) || []).length;
    const tabs = (text.match(/\t/g) || []).length;
    const newlines = (text.match(/\n/g) || []).length;
    
    return {
      characters,
      charactersNoSpaces,
      chineseChars,
      englishWords,
      totalWords,
      lines,
      paragraphs,
      sentences,
      numbers,
      spaces,
      tabs,
      newlines,
      chinesePunctuation,
    };
  }, [text]);

  // 计算阅读时间（中文 400字/分钟，英文 200词/分钟）
  const readingTime = useMemo(() => {
    const chineseMinutes = stats.chineseChars / 400;
    const englishMinutes = stats.englishWords / 200;
    return Math.max(1, Math.ceil(chineseMinutes + englishMinutes));
  }, [stats.chineseChars, stats.englishWords]);

  // 计算朗读时间（中文 300字/分钟，英文 150词/分钟）
  const speakingTime = useMemo(() => {
    const chineseMinutes = stats.chineseChars / 300;
    const englishMinutes = stats.englishWords / 150;
    return Math.max(1, Math.ceil(chineseMinutes + englishMinutes));
  }, [stats.chineseChars, stats.englishWords]);

  // 处理文本输入 - 检查游客限制
  const handleTextChange = (newText: string) => {
    if (isGuest && !hasRecordedUsage && newText.length > 0 && text.length === 0) {
      if (!checkGuestUsage()) {
        return;
      }
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }
    setText(newText);
  };

  // 处理清空文本
  const handleClear = () => {
    setText('');
  };

  // 复制统计结果
  const handleCopyStats = () => {
    const statsText = `
字符统计结果
============
总字符数：${stats.characters}
不含空格：${stats.charactersNoSpaces}
中文字符：${stats.chineseChars}
英文单词：${stats.englishWords}
数字个数：${stats.numbers}
行数：${stats.lines}
段落数：${stats.paragraphs}
句子数：${stats.sentences}
预计阅读时间：${readingTime} 分钟
预计朗读时间：${speakingTime} 分钟
    `.trim();
    navigator.clipboard.writeText(statsText);
  };

  // 主要统计卡片
  const mainStatCards = [
    {
      label: t('word_counter.characters'),
      value: stats.characters,
      icon: 'text_fields',
      color: 'indigo'
    },
    {
      label: t('word_counter.characters_no_spaces'),
      value: stats.charactersNoSpaces,
      icon: 'space_bar',
      color: 'purple'
    },
    {
      label: t('word_counter.words'),
      value: stats.totalWords,
      icon: 'article',
      color: 'blue'
    },
    {
      label: t('word_counter.lines'),
      value: stats.lines,
      icon: 'format_list_numbered',
      color: 'emerald'
    },
    {
      label: t('word_counter.paragraphs'),
      value: stats.paragraphs,
      icon: 'notes',
      color: 'amber'
    },
    {
      label: t('word_counter.sentences'),
      value: stats.sentences,
      icon: 'format_quote',
      color: 'rose'
    }
  ];

  // 详细统计数据
  const detailStats = [
    { label: '中文字符', value: stats.chineseChars, color: 'text-red-600 dark:text-red-400' },
    { label: '英文单词', value: stats.englishWords, color: 'text-blue-600 dark:text-blue-400' },
    { label: '数字', value: stats.numbers, color: 'text-green-600 dark:text-green-400' },
    { label: '空格', value: stats.spaces, color: 'text-slate-600 dark:text-slate-400' },
    { label: '换行', value: stats.newlines, color: 'text-slate-600 dark:text-slate-400' },
  ];

  return (
    <ToolLayout toolId="word-counter">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：输入区域 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {t('word_counter.input_text')}
              </h3>
              <div className="flex items-center space-x-2">
                {text && (
                  <>
                    <button
                      onClick={handleCopyStats}
                      className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                    >
                      复制统计
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <button
                      onClick={handleClear}
                      className="text-sm text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                    >
                      {t('word_counter.clear')}
                    </button>
                  </>
                )}
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={t('word_counter.placeholder')}
              className="w-full h-80 p-4 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none font-mono text-sm leading-relaxed"
            />
          </div>

          {/* 阅读和朗读时间 */}
          {stats.totalWords > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400">
                    menu_book
                  </span>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('word_counter.reading_time')}
                    </p>
                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {readingTime} {t(readingTime === 1 ? 'word_counter.minute' : 'word_counter.minutes')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">
                    mic
                  </span>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('word_counter.speaking_time')}
                    </p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {speakingTime} {t(speakingTime === 1 ? 'word_counter.minute' : 'word_counter.minutes')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 详细统计 */}
          {text && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                详细统计
              </h4>
              <div className="flex flex-wrap gap-4">
                {detailStats.map((stat, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{stat.label}:</span>
                    <span className={`font-mono font-semibold ${stat.color}`}>
                      {stat.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右侧：统计卡片 */}
        <div className="space-y-4">
          {mainStatCards.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center`}>
                    <span className={`material-symbols-outlined text-${stat.color}-600 dark:text-${stat.color}-400`}>
                      {stat.icon}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
};
