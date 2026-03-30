import React, { useMemo, useState } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

type StatTone = 'indigo' | 'purple' | 'blue' | 'emerald' | 'amber' | 'rose';

interface StatToneClasses {
  badge: string;
  icon: string;
}

const STAT_TONE_CLASSES: Record<StatTone, StatToneClasses> = {
  indigo: {
    badge: 'bg-indigo-500/10',
    icon: 'text-indigo-600 dark:text-indigo-400',
  },
  purple: {
    badge: 'bg-purple-500/10',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  blue: {
    badge: 'bg-blue-500/10',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  emerald: {
    badge: 'bg-emerald-500/10',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    badge: 'bg-amber-500/10',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  rose: {
    badge: 'bg-rose-500/10',
    icon: 'text-rose-600 dark:text-rose-400',
  },
};

const EN_STOP_WORDS = new Set([
  'the',
  'and',
  'or',
  'to',
  'of',
  'a',
  'in',
  'is',
  'it',
  'for',
  'on',
  'with',
  'as',
  'at',
  'by',
  'an',
  'be',
  'this',
  'that',
  'are',
  'was',
  'were',
  'from',
  'but',
  'not',
  'we',
  'you',
  'they',
  'i',
  'he',
  'she',
  'them',
  'our',
  'your',
  'their',
  'if',
  'into',
  'than',
  'then',
]);

const WORD_SEGMENTER_OPTIONS = { granularity: 'word' as const };

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const tokenizeWordCounterText = (text: string, locale: 'zh' | 'en') => {
  if (!text.trim()) {
    return [];
  }

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(locale === 'zh' ? 'zh' : 'en', WORD_SEGMENTER_OPTIONS);
    return Array.from(segmenter.segment(text))
      .map((segment) => segment.segment.trim())
      .filter(Boolean)
      .filter((segment) => {
        if (/^[a-zA-Z]+$/.test(segment)) {
          return !EN_STOP_WORDS.has(segment.toLowerCase());
        }
        if (/^\d+$/.test(segment)) {
          return true;
        }
        return /[\u4e00-\u9fff]/.test(segment) && segment.length >= 2;
      });
  }

  return (text.match(/[A-Za-z]+|\d+|[\u4e00-\u9fff]{2,}/g) || []).filter((segment) => {
    if (/^[a-zA-Z]+$/.test(segment)) {
      return !EN_STOP_WORDS.has(segment.toLowerCase());
    }
    return true;
  });
};

export const extractTopKeywords = (text: string, locale: 'zh' | 'en', limit = 5) => {
  const tokens = tokenizeWordCounterText(text, locale);
  const counts = new Map<string, number>();

  tokens.forEach((token) => {
    const normalized = /^[a-zA-Z]+$/.test(token) ? token.toLowerCase() : token;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || b.term.length - a.term.length || a.term.localeCompare(b.term))
    .slice(0, limit);
};

export interface WordCounterInsights {
  readabilityLabel: string;
  readabilityHint: string;
  avgSentenceLength: number;
  lexicalDensity: number;
}

export interface WordCounterRepetitionItem {
  term: string;
  count: number;
  share: number;
}

export interface WordCounterDiagnostics {
  repeatedTerms: WordCounterRepetitionItem[];
  repeatedTokenCount: number;
  repetitionRate: number;
  mostRepeated: WordCounterRepetitionItem | null;
}

export const buildWordCounterInsights = ({
  language,
  totalWords,
  sentences,
  uniqueKeywordCount,
}: {
  language: 'zh' | 'en';
  totalWords: number;
  sentences: number;
  uniqueKeywordCount: number;
}): WordCounterInsights => {
  const avgSentenceLength = sentences > 0 ? Number((totalWords / sentences).toFixed(1)) : 0;
  const lexicalDensity = totalWords > 0 ? Math.round((uniqueKeywordCount / totalWords) * 100) : 0;

  let readabilityLabel = language === 'zh' ? '易读' : 'Easy';
  let readabilityHint = language === 'zh' ? '句子较短，阅读压力低。' : 'Short sentences, easy to scan.';

  if ((language === 'zh' && avgSentenceLength > 20) || (language === 'en' && avgSentenceLength > 18)) {
    readabilityLabel = language === 'zh' ? '适中' : 'Moderate';
    readabilityHint = language === 'zh'
      ? '句子长度中等，适合一般说明文。'
      : 'Sentence length is moderate and works for general writing.';
  }

  if ((language === 'zh' && avgSentenceLength > 35) || (language === 'en' && avgSentenceLength > 28)) {
    readabilityLabel = language === 'zh' ? '偏密' : 'Dense';
    readabilityHint = language === 'zh'
      ? '句子偏长，建议拆分提升阅读体验。'
      : 'Sentences are getting long; splitting them may improve readability.';
  }

  return {
    readabilityLabel,
    readabilityHint,
    avgSentenceLength,
    lexicalDensity,
  };
};

const countOccurrences = (text: string, query: string) => {
  const trimmed = query.trim();
  if (!trimmed) {
    return 0;
  }

  const matches = text.match(new RegExp(escapeRegExp(trimmed), 'gi'));
  return matches?.length ?? 0;
};

export const buildWordCounterDiagnostics = (
  text: string,
  language: 'zh' | 'en',
  limit = 8
): WordCounterDiagnostics => {
  const tokens = tokenizeWordCounterText(text, language);
  if (tokens.length === 0) {
    return {
      repeatedTerms: [],
      repeatedTokenCount: 0,
      repetitionRate: 0,
      mostRepeated: null,
    };
  }

  const counts = new Map<string, number>();
  tokens.forEach((token) => {
    const normalized = /^[a-zA-Z]+$/.test(token) ? token.toLowerCase() : token;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  });

  const repeatedTerms = Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([term, count]) => ({
      term,
      count,
      share: Number(((count / tokens.length) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count || b.share - a.share || a.term.localeCompare(b.term))
    .slice(0, limit);

  const repeatedTokenCount = repeatedTerms.reduce((sum, item) => sum + item.count, 0);
  const repetitionRate = Number(((repeatedTokenCount / tokens.length) * 100).toFixed(1));

  return {
    repeatedTerms,
    repeatedTokenCount,
    repetitionRate,
    mostRepeated: repeatedTerms[0] ?? null,
  };
};

/**
 * 字数统计工具
 * 统计文本的字符数、单词数、行数、段落数等
 * 支持中英文混合文本
 */
export const WordCounter: React.FC = () => {
  const { t, language, isGuest, checkGuestUsage, recordGuestToolUsage } = useAppContext();
  const [text, setText] = useState('');
  const [keywordQuery, setKeywordQuery] = useState('');
  const [hasRecordedUsage, setHasRecordedUsage] = useState(false);

  // 统计数据（使用 useMemo 优化性能）
  const stats = useMemo(() => {
    // 基础统计
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const lines = text ? text.split('\n').length : 0;
    const paragraphs = text.trim() ? text.split(/\n\n+/).filter((p) => p.trim()).length : 0;

    // 中文字符统计（包括中文标点）
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const chinesePunctuation = (text.match(/[\u3000-\u303f\uff00-\uffef]/g) || []).length;

    // 英文单词统计（移除中文后统计）
    const textWithoutChinese = text.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g, ' ');
    const englishWords = textWithoutChinese.trim()
      ? textWithoutChinese.trim().split(/\s+/).filter((w) => /[a-zA-Z]/.test(w)).length
      : 0;

    // 数字统计
    const numbers = (text.match(/\d+/g) || []).length;

    // 总单词数 = 中文字符 + 英文单词（中文按字计数，英文按词计数）
    const totalWords = chineseChars + englishWords;

    // 句子统计（支持中英文句号）
    const sentences = text.trim()
      ? text.split(/[.!?。！？]+/).filter((s) => s.trim()).length
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

  const keywords = useMemo(() => extractTopKeywords(text, language), [text, language]);
  const keywordHits = useMemo(() => countOccurrences(text, keywordQuery), [keywordQuery, text]);
  const diagnostics = useMemo(() => buildWordCounterDiagnostics(text, language), [language, text]);
  const insights = useMemo(
    () =>
      buildWordCounterInsights({
        language,
        totalWords: stats.totalWords,
        sentences: stats.sentences,
        uniqueKeywordCount: keywords.length,
      }),
    [keywords.length, language, stats.sentences, stats.totalWords]
  );

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
    setKeywordQuery('');
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
关键词：${keywords.map((item) => `${item.term}(${item.count})`).join('，') || '-'}
    `.trim();
    navigator.clipboard.writeText(statsText);
  };

  // 主要统计卡片
  const mainStatCards = [
    {
      label: t('word_counter.characters'),
      value: stats.characters,
      icon: 'text_fields',
      tone: 'indigo' as StatTone,
    },
    {
      label: t('word_counter.characters_no_spaces'),
      value: stats.charactersNoSpaces,
      icon: 'space_bar',
      tone: 'purple' as StatTone,
    },
    {
      label: t('word_counter.words'),
      value: stats.totalWords,
      icon: 'article',
      tone: 'blue' as StatTone,
    },
    {
      label: t('word_counter.lines'),
      value: stats.lines,
      icon: 'format_list_numbered',
      tone: 'emerald' as StatTone,
    },
    {
      label: t('word_counter.paragraphs'),
      value: stats.paragraphs,
      icon: 'notes',
      tone: 'amber' as StatTone,
    },
    {
      label: t('word_counter.sentences'),
      value: stats.sentences,
      icon: 'format_quote',
      tone: 'rose' as StatTone,
    },
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

          {stats.totalWords > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">
                    visibility
                  </span>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">可读性</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {insights.readabilityLabel}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      平均每句 {insights.avgSentenceLength} 词
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {insights.readabilityHint}
                </p>
              </div>
              <div className="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-200 dark:border-sky-800">
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-sky-600 dark:text-sky-400">
                    analytics
                  </span>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">关键词密度</p>
                    <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
                      {insights.lexicalDensity}%
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      基于已提取关键词估算
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

          {/* 关键词与搜索 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                关键词与搜索
              </h4>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {keywords.length > 0 ? `已提取 ${keywords.length} 个关键词` : '输入文本后自动提取'}
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  查找关键词
                </label>
                <input
                  type="text"
                  value={keywordQuery}
                  onChange={(e) => setKeywordQuery(e.target.value)}
                  placeholder="输入要查找的词或短语"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {keywordQuery.trim()
                    ? `命中 ${keywordHits} 次`
                    : '输入关键词后会统计命中次数'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  热门关键词
                </p>
                {keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <span
                        key={keyword.term}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-sm"
                      >
                        <span className="font-medium">{keyword.term}</span>
                        <span className="text-xs opacity-80">x{keyword.count}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    暂无可提取关键词
                  </p>
                )}
              </div>
            </div>
          </div>

          {text && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between gap-4 mb-3">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  重复词与高频词
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {diagnostics.repeatedTerms.length > 0
                    ? `检测到 ${diagnostics.repeatedTerms.length} 个重复项`
                    : '未发现明显重复词'}
                </span>
              </div>
              {diagnostics.repeatedTerms.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1">
                      重复词总量 {diagnostics.repeatedTokenCount}
                    </span>
                    <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1">
                      重复率 {diagnostics.repetitionRate}%
                    </span>
                    {diagnostics.mostRepeated && (
                      <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 text-indigo-700 dark:text-indigo-300">
                        最常重复 {diagnostics.mostRepeated.term} x{diagnostics.mostRepeated.count}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {diagnostics.repeatedTerms.map((item) => (
                      <div
                        key={item.term}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 dark:text-white truncate">{item.term}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">占全文 {item.share}%</div>
                        </div>
                        <span className="text-sm font-mono text-indigo-600 dark:text-indigo-400">
                          x{item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  当前文本没有出现重复次数较高的词语
                </p>
              )}
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
                  <div className={`w-10 h-10 rounded-lg ${STAT_TONE_CLASSES[stat.tone].badge} flex items-center justify-center`}>
                    <span className={`material-symbols-outlined ${STAT_TONE_CLASSES[stat.tone].icon}`}>
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
