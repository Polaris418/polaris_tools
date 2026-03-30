import React, { useEffect, useMemo, useState } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';

export interface HashResults {
  md5: string;
  sha1: string;
  sha256: string;
  sha512: string;
}

const encoder = new TextEncoder();

const bytesToHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const leftRotate = (value: number, shift: number) => ((value << shift) | (value >>> (32 - shift))) >>> 0;

const md5ShiftTable = [
  7, 12, 17, 22,
  7, 12, 17, 22,
  7, 12, 17, 22,
  7, 12, 17, 22,
  5, 9, 14, 20,
  5, 9, 14, 20,
  5, 9, 14, 20,
  5, 9, 14, 20,
  4, 11, 16, 23,
  4, 11, 16, 23,
  4, 11, 16, 23,
  4, 11, 16, 23,
  6, 10, 15, 21,
  6, 10, 15, 21,
  6, 10, 15, 21,
  6, 10, 15, 21,
];

const md5ConstantTable = Array.from({ length: 64 }, (_, index) =>
  Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0
);

export const md5Hex = (input: string): string => {
  const bytes = encoder.encode(input);
  const bitLength = bytes.length * 8;
  const paddedLength = (((bytes.length + 8) >>> 6) + 1) << 6;
  const buffer = new Uint8Array(paddedLength);
  buffer.set(bytes);
  buffer[bytes.length] = 0x80;

  const view = new DataView(buffer.buffer);
  view.setUint32(paddedLength - 8, bitLength >>> 0, true);
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < buffer.length; offset += 64) {
    const m = new Array<number>(16);
    for (let i = 0; i < 16; i += 1) {
      m[i] = view.getUint32(offset + i * 4, true);
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let i = 0; i < 64; i += 1) {
      let f = 0;
      let g = 0;

      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }

      const temp = d;
      d = c;
      c = b;
      const sum = (a + f + md5ConstantTable[i] + m[g]) >>> 0;
      b = (b + leftRotate(sum, md5ShiftTable[i])) >>> 0;
      a = temp;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  const digestWords = [a0, b0, c0, d0];
  return digestWords
    .flatMap((word) => [
      word & 0xff,
      (word >>> 8) & 0xff,
      (word >>> 16) & 0xff,
      (word >>> 24) & 0xff,
    ])
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const digestText = async (algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512', value: string): Promise<string> => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is not available');
  }

  const buffer = encoder.encode(value);
  const digest = await globalThis.crypto.subtle.digest(algorithm, buffer);
  return bytesToHex(digest);
};

export const computeHashes = async (value: string): Promise<HashResults> => {
  const [sha1, sha256, sha512] = await Promise.all([
    digestText('SHA-1', value),
    digestText('SHA-256', value),
    digestText('SHA-512', value),
  ]);

  return {
    md5: md5Hex(value),
    sha1,
    sha256,
    sha512,
  };
};

const hashCards: Array<{ algorithm: HashAlgorithm; label: string }> = [
  { algorithm: 'md5', label: 'MD5' },
  { algorithm: 'sha1', label: 'SHA-1' },
  { algorithm: 'sha256', label: 'SHA-256' },
  { algorithm: 'sha512', label: 'SHA-512' },
];

/**
 * Hash generator tool
 */
export const HashGenerator: React.FC = () => {
  const { language, isGuest, checkGuestUsage, recordGuestToolUsage } = useAppContext();
  const [input, setInput] = useState('');
  const [results, setResults] = useState<HashResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<HashAlgorithm | 'all' | null>(null);
  const [hasRecordedUsage, setHasRecordedUsage] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!input.trim()) {
      setResults(null);
      setError(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    computeHashes(input)
      .then((value) => {
        if (cancelled) {
          return;
        }
        setResults(value);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        setResults(null);
        setError(err instanceof Error ? err.message : language === 'zh' ? '哈希计算失败' : 'Hash calculation failed');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [input, language]);

  const handleInputChange = (value: string) => {
    if (isGuest && !hasRecordedUsage && value.length > 0 && input.length === 0) {
      if (!checkGuestUsage()) return;
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }
    setInput(value);
  };

  const copyValue = (algorithm: HashAlgorithm, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(algorithm);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAll = () => {
    if (!results) {
      return;
    }
    const combined = hashCards
      .map(({ algorithm, label }) => `${label}\n${results[algorithm]}`)
      .join('\n\n');
    navigator.clipboard.writeText(combined);
    setCopied('all');
    setTimeout(() => setCopied(null), 2000);
  };

  const outputEntries = useMemo(
    () =>
      hashCards.map(({ algorithm, label }) => ({
        algorithm,
        label,
        value: results?.[algorithm] ?? '',
      })),
    [results]
  );

  return (
    <ToolLayout toolId="hash-generator">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {language === 'zh' ? '输入内容' : 'Input'}
            </h3>
            <div className="flex items-center gap-2">
              {input && (
                <button
                  onClick={() => {
                    setInput('');
                    setResults(null);
                    setError(null);
                  }}
                  className="text-sm text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                >
                  {language === 'zh' ? '清空' : 'Clear'}
                </button>
              )}
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={language === 'zh' ? '输入文本，实时生成 MD5 / SHA-1 / SHA-256 / SHA-512' : 'Type text to generate MD5 / SHA-1 / SHA-256 / SHA-512'}
            className="w-full min-h-[220px] p-4 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-y focus:outline-none font-mono text-sm leading-6"
          />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {language === 'zh' ? '哈希结果' : 'Hashes'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'zh' ? '支持常见哈希，一键复制单项或全部结果' : 'Common hashes with single or bulk copy'}
              </p>
            </div>
            <button
              onClick={copyAll}
              disabled={!results || loading}
              className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:border-indigo-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied === 'all' ? (language === 'zh' ? '已复制' : 'Copied') : (language === 'zh' ? '复制全部' : 'Copy all')}
            </button>
          </div>

          {loading && (
            <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              {language === 'zh' ? '正在计算哈希...' : 'Calculating hashes...'}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outputEntries.map(({ algorithm, label, value }) => (
              <div key={algorithm} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{value ? `${value.length} chars` : language === 'zh' ? '等待输入' : 'Waiting for input'}</p>
                  </div>
                  <button
                    onClick={() => copyValue(algorithm, value)}
                    disabled={!value}
                    className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                      copied === algorithm
                        ? 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {copied === algorithm ? (language === 'zh' ? '已复制' : 'Copied') : (language === 'zh' ? '复制' : 'Copy')}
                  </button>
                </div>
                <div className="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                  <code className="block break-all whitespace-pre-wrap font-mono text-xs text-slate-800 dark:text-slate-100 leading-5">
                    {value || (language === 'zh' ? '结果会在这里显示' : 'Result will appear here')}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
};

