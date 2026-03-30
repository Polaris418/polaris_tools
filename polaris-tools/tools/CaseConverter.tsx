import React, { useCallback, useMemo, useState } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

type CaseType =
  | 'upper'
  | 'lower'
  | 'title'
  | 'sentence'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'kebab'
  | 'constant';

const identifierTokenRegex = /[A-Z]+(?=[A-Z][a-z0-9]|\d|$)|[A-Z]?[a-z0-9]+|\d+|[\u4e00-\u9fff]+/g;

export const splitCaseTokens = (input: string): string[] => {
  const normalized = input.trim().replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return normalized.match(identifierTokenRegex) ?? [];
};

const isAsciiWord = (token: string) => /^[A-Za-z]+$/.test(token);

const capitalizeToken = (token: string) => {
  if (!isAsciiWord(token)) {
    return token;
  }

  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
};

const lowerToken = (token: string) => (isAsciiWord(token) ? token.toLowerCase() : token);

const toDelimitedCase = (text: string, separator: string) => splitCaseTokens(text).map(lowerToken).join(separator);
const toTitleCase = (text: string) => splitCaseTokens(text).map(capitalizeToken).join(' ');

const toSentenceCase = (text: string) => {
  const tokens = splitCaseTokens(text);
  if (tokens.length === 0) {
    return '';
  }
  return [capitalizeToken(tokens[0]), ...tokens.slice(1).map(lowerToken)].join(' ');
};

export const convertCaseLineByLine = (text: string, convert: (value: string) => string) =>
  text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      return trimmed ? convert(trimmed) : '';
    })
    .join('\n');

/**
 */
export const CaseConverter: React.FC = () => {
  const { t, isGuest, checkGuestUsage, recordGuestToolUsage } = useAppContext();
  const [text, setText] = useState('');
  const [lineMode, setLineMode] = useState(false);
  const [hasRecordedUsage, setHasRecordedUsage] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const conversions = useMemo(
    () =>
      [
        {
          type: 'upper' as const,
          label: t('case_converter.uppercase'),
          convert: (s: string) => s.toUpperCase(),
        },
        {
          type: 'lower' as const,
          label: t('case_converter.lowercase'),
          convert: (s: string) => s.toLowerCase(),
        },
        {
          type: 'title' as const,
          label: t('case_converter.title_case'),
          convert: (s: string) => toTitleCase(s),
        },
        {
          type: 'sentence' as const,
          label: t('case_converter.sentence_case'),
          convert: (s: string) => toSentenceCase(s),
        },
        {
          type: 'camel' as const,
          label: 'camelCase',
          convert: (s: string) => {
            const words = splitCaseTokens(s);
            if (words.length === 0) {
              return '';
            }
            return [words[0].toLowerCase(), ...words.slice(1).map(capitalizeToken)].join('');
          },
        },
        {
          type: 'pascal' as const,
          label: 'PascalCase',
          convert: (s: string) => splitCaseTokens(s).map(capitalizeToken).join(''),
        },
        {
          type: 'snake' as const,
          label: 'snake_case',
          convert: (s: string) => toDelimitedCase(s, '_'),
        },
        {
          type: 'kebab' as const,
          label: 'kebab-case',
          convert: (s: string) => toDelimitedCase(s, '-'),
        },
        {
          type: 'constant' as const,
          label: 'CONSTANT_CASE',
          convert: (s: string) => toDelimitedCase(s, '_').toUpperCase(),
        },
      ] as { type: CaseType; label: string; convert: (s: string) => string }[],
    [t]
  );

  const getResult = useCallback(
    (convert: (s: string) => string) => (lineMode ? convertCaseLineByLine(text, convert) : convert(text)),
    [lineMode, text]
  );

  const handleTextChange = (newText: string) => {
    if (isGuest && !hasRecordedUsage && newText.length > 0 && text.length === 0) {
      if (!checkGuestUsage()) return;
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }
    setText(newText);
  };

  const copyToClipboard = useCallback((value: string, type: string) => {
    navigator.clipboard.writeText(value);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  }, []);

  const copyAllResults = useCallback(() => {
    const result = conversions
      .map(({ label, convert }) => `${label}\n${getResult(convert) || '-'}`)
      .join('\n\n');
    navigator.clipboard.writeText(result);
    setCopiedType('all');
    setTimeout(() => setCopiedType(null), 2000);
  }, [conversions, getResult]);

  const useAsInput = (value: string) => {
    setText(value);
  };

  const handleClear = () => setText('');

  return (
    <ToolLayout toolId="case-converter">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('case_converter.input')}</h3>
            <div className="flex items-center gap-3">
              {text && (
                <>
                  <button
                    onClick={copyAllResults}
                    className={`text-sm transition-colors ${
                      copiedType === 'all'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300'
                    }`}
                  >
                    {copiedType === 'all' ? t('case_converter.copied') : '复制全部结果'}
                  </button>
                  <button
                    onClick={handleClear}
                    className="text-sm text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                  >
                    {t('case_converter.clear')}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={lineMode}
                onChange={(e) => setLineMode(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500"
              />
              <span>逐行转换</span>
            </label>
          </div>
          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={t('case_converter.placeholder')}
            className="w-full h-40 p-4 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none"
          />
        </div>

        {text && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conversions.map(({ type, label, convert }) => {
              const result = getResult(convert);
              const isCopied = copiedType === type;
              return (
                <div
                  key={type}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => useAsInput(result)}
                        className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                      >
                        作为输入
                      </button>
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
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-900 dark:text-white font-mono text-sm break-all whitespace-pre-wrap max-h-28 overflow-y-auto">
                    {result || '-'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
