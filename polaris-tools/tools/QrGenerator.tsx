import React, { useMemo, useState, useCallback } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

type ErrorLevel = 'L';

interface QrOptions {
  text: string;
  margin: number;
  darkColor: string;
  lightColor: string;
}

interface QrMatrixResult {
  version: number;
  size: number;
  modules: boolean[][];
  capacity: number;
}

const BYTE_CAPACITY_L: Record<number, number> = {
  1: 17,
  2: 32,
  3: 53,
  4: 78,
};

const DATA_CODEWORDS_L: Record<number, number> = {
  1: 19,
  2: 34,
  3: 55,
  4: 80,
};

const ECC_CODEWORDS_L: Record<number, number> = {
  1: 7,
  2: 10,
  3: 15,
  4: 20,
};

const ALIGNMENT_POSITIONS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
};

const pushBits = (bits: number[], value: number, length: number) => {
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push((value >> i) & 1);
  }
};

const bitsToBytes = (bits: number[]) => {
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) {
      value = (value << 1) | (bits[i + j] ?? 0);
    }
    bytes.push(value);
  }
  return bytes;
};

const bytesToBits = (bytes: number[]) => {
  const bits: number[] = [];
  bytes.forEach((byte) => pushBits(bits, byte, 8));
  return bits;
};

const createGfTables = () => {
  const exp = new Array(512).fill(0);
  const log = new Array(256).fill(0);
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    exp[i] = x;
    log[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i += 1) {
    exp[i] = exp[i - 255];
  }
  return { exp, log };
};

const GF = createGfTables();

const gfMul = (a: number, b: number) => {
  if (a === 0 || b === 0) return 0;
  return GF.exp[GF.log[a] + GF.log[b]];
};

const polyMul = (a: number[], b: number[]) => {
  const result = new Array(a.length + b.length - 1).fill(0);
  a.forEach((av, i) => {
    b.forEach((bv, j) => {
      result[i + j] ^= gfMul(av, bv);
    });
  });
  return result;
};

const buildGeneratorPolynomial = (eccLength: number) => {
  let poly = [1];
  for (let i = 0; i < eccLength; i += 1) {
    poly = polyMul(poly, [1, GF.exp[i]]);
  }
  return poly;
};

const reedSolomonEncode = (data: number[], eccLength: number) => {
  const generator = buildGeneratorPolynomial(eccLength);
  const padded = [...data, ...new Array(eccLength).fill(0)];

  for (let i = 0; i < data.length; i += 1) {
    const factor = padded[i];
    if (factor === 0) continue;
    for (let j = 0; j < generator.length; j += 1) {
      padded[i + j] ^= gfMul(generator[j], factor);
    }
  }

  return padded.slice(data.length);
};

const chooseVersion = (text: string) => {
  const encoder = new TextEncoder();
  const size = encoder.encode(text).length;
  const versions = [1, 2, 3, 4];
  return versions.find((candidate) => size <= BYTE_CAPACITY_L[candidate]) ?? null;
};

const buildDataCodewords = (text: string, version: number) => {
  const encoder = new TextEncoder();
  const bytes = Array.from(encoder.encode(text));
  const capacity = DATA_CODEWORDS_L[version];
  const bits: number[] = [];
  pushBits(bits, 0b0100, 4);
  pushBits(bits, bytes.length, 8);
  bytes.forEach((byte) => pushBits(bits, byte, 8));

  const terminator = Math.min(4, capacity * 8 - bits.length);
  for (let i = 0; i < terminator; i += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = bitsToBytes(bits);
  const pads = [0xec, 0x11];
  let padIndex = 0;
  while (codewords.length < capacity) {
    codewords.push(pads[padIndex % pads.length]);
    padIndex += 1;
  }
  return codewords.slice(0, capacity);
};

const drawFinder = (matrix: (boolean | null)[][], reserved: boolean[][], row: number, col: number) => {
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || rr >= matrix.length || cc < 0 || cc >= matrix.length) continue;
      reserved[rr][cc] = true;
      const inPattern =
        r >= 0 && r <= 6 && c >= 0 && c <= 6 &&
        (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      matrix[rr][cc] = inPattern;
    }
  }
};

const drawAlignment = (matrix: (boolean | null)[][], reserved: boolean[][], row: number, col: number) => {
  for (let r = -2; r <= 2; r += 1) {
    for (let c = -2; c <= 2; c += 1) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || rr >= matrix.length || cc < 0 || cc >= matrix.length) continue;
      reserved[rr][cc] = true;
      const dist = Math.max(Math.abs(r), Math.abs(c));
      matrix[rr][cc] = dist !== 1;
    }
  }
};

const reserveFormatInfo = (reserved: boolean[][], size: number) => {
  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      reserved[8][i] = true;
      reserved[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i += 1) {
    if (i !== 6) {
      reserved[size - 1 - i][8] = true;
      reserved[8][size - 1 - i] = true;
    }
  }
  reserved[size - 8][8] = true;
};

const bitLength = (value: number) => {
  let length = 0;
  let n = value;
  while (n > 0) {
    length += 1;
    n >>= 1;
  }
  return length;
};

const getFormatBits = (level: ErrorLevel, mask: number) => {
  const eccBitsMap: Record<ErrorLevel, number> = { L: 0b01 };
  let data = (eccBitsMap[level] << 3) | mask;
  let value = data << 10;
  const generator = 0x537;
  while (bitLength(value) >= 11) {
    value ^= generator << (bitLength(value) - 11);
  }
  return (((data << 10) | value) ^ 0x5412) & 0x7fff;
};

const maskPredicate = (mask: number, row: number, col: number) => {
  switch (mask) {
    case 0: return (row + col) % 2 === 0;
    case 1: return row % 2 === 0;
    case 2: return col % 3 === 0;
    case 3: return (row + col) % 3 === 0;
    case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    case 7: return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
    default: return false;
  }
};

const isPenaltyPattern = (line: boolean[]) => {
  let score = 0;
  let runColor = line[0];
  let runLength = 1;
  for (let i = 1; i < line.length; i += 1) {
    if (line[i] === runColor) {
      runLength += 1;
    } else {
      if (runLength >= 5) score += 3 + (runLength - 5);
      runColor = line[i];
      runLength = 1;
    }
  }
  if (runLength >= 5) score += 3 + (runLength - 5);
  return score;
};

const calculatePenalty = (matrix: boolean[][]) => {
  const size = matrix.length;
  let score = 0;
  for (let r = 0; r < size; r += 1) score += isPenaltyPattern(matrix[r]);
  for (let c = 0; c < size; c += 1) score += isPenaltyPattern(matrix.map((row) => row[c]));

  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const value = matrix[r][c];
      if (matrix[r][c + 1] === value && matrix[r + 1][c] === value && matrix[r + 1][c + 1] === value) {
        score += 3;
      }
    }
  }

  const finderLike = [true, false, true, true, true, false, true, false, false, false, false];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c <= size - finderLike.length; c += 1) {
      const slice = matrix[r].slice(c, c + finderLike.length);
      if (finderLike.every((bit, index) => slice[index] === bit)) score += 40;
    }
  }
  for (let c = 0; c < size; c += 1) {
    for (let r = 0; r <= size - finderLike.length; r += 1) {
      const slice = finderLike.map((_, index) => matrix[r + index][c]);
      if (finderLike.every((bit, index) => slice[index] === bit)) score += 40;
    }
  }

  let darkCount = 0;
  matrix.forEach((row) => row.forEach((cell) => { if (cell) darkCount += 1; }));
  score += Math.floor(Math.abs((darkCount * 100) / (size * size) - 50) / 5) * 10;
  return score;
};

const addFormatInfo = (matrix: boolean[][], mask: number) => {
  const size = matrix.length;
  const bits = getFormatBits('L', mask);
  const placements: Array<[number, number]> = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  const placements2: Array<[number, number]> = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1],
  ];
  placements.forEach(([r, c], index) => {
    matrix[r][c] = ((bits >> (14 - index)) & 1) === 1;
  });
  placements2.forEach(([r, c], index) => {
    matrix[r][c] = ((bits >> (14 - index)) & 1) === 1;
  });
};

const buildQrMatrix = (text: string): QrMatrixResult | null => {
  const version = chooseVersion(text);
  if (!version) return null;
  const size = 21 + (version - 1) * 4;
  const dataCodewords = buildDataCodewords(text, version);
  const eccCodewords = reedSolomonEncode(dataCodewords, ECC_CODEWORDS_L[version]);
  const dataBits = bytesToBits([...dataCodewords, ...eccCodewords]);

  const baseMatrix: (boolean | null)[][] = Array.from({ length: size }, () => Array<boolean | null>(size).fill(null));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  drawFinder(baseMatrix, reserved, 0, 0);
  drawFinder(baseMatrix, reserved, 0, size - 7);
  drawFinder(baseMatrix, reserved, size - 7, 0);

  for (let i = 8; i < size - 8; i += 1) {
    const value = i % 2 === 0;
    baseMatrix[6][i] = value;
    baseMatrix[i][6] = value;
    reserved[6][i] = true;
    reserved[i][6] = true;
  }

  reserveFormatInfo(reserved, size);
  baseMatrix[size - 8][8] = true;
  reserved[size - 8][8] = true;

  const centers = ALIGNMENT_POSITIONS[version];
  if (centers.length > 0) {
    centers.forEach((row) => {
      centers.forEach((col) => {
        const overlapsFinder =
          (row <= 8 && col <= 8) ||
          (row <= 8 && col >= size - 8) ||
          (row >= size - 8 && col <= 8);
        if (!overlapsFinder) {
          drawAlignment(baseMatrix, reserved, row, col);
        }
      });
    });
  }

  const finalMatrices: boolean[][][] = [];
  for (let mask = 0; mask < 8; mask += 1) {
    const matrix = baseMatrix.map((row) => row.map((cell) => Boolean(cell)));
    let bitIndex = 0;
    let upward = true;
    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col -= 1;
      const rows = upward ? [...Array(size).keys()].reverse() : [...Array(size).keys()];
      rows.forEach((row) => {
        for (let c = 0; c < 2; c += 1) {
          const currentCol = col - c;
          if (reserved[row][currentCol]) continue;
          const bit = dataBits[bitIndex] ?? 0;
          const masked = maskPredicate(mask, row, currentCol) ? bit ^ 1 : bit;
          matrix[row][currentCol] = masked === 1;
          bitIndex += 1;
        }
      });
      upward = !upward;
    }
    addFormatInfo(matrix, mask);
    finalMatrices.push(matrix);
  }

  let bestMatrix = finalMatrices[0];
  let bestScore = calculatePenalty(bestMatrix);
  for (let i = 1; i < finalMatrices.length; i += 1) {
    const score = calculatePenalty(finalMatrices[i]);
    if (score < bestScore) {
      bestScore = score;
      bestMatrix = finalMatrices[i];
    }
  }

  return {
    version,
    size,
    modules: bestMatrix,
    capacity: BYTE_CAPACITY_L[version],
  };
};

const matrixToSvg = (
  matrix: boolean[][],
  size: number,
  margin: number,
  darkColor: string,
  lightColor: string
) => {
  const dimension = size + margin * 2;
  const svgSize = 320;
  const moduleSize = svgSize / dimension;
  const rects: string[] = [];

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!matrix[r][c]) continue;
      const x = (c + margin) * moduleSize;
      const y = (r + margin) * moduleSize;
      rects.push(`<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="${darkColor}" />`);
    }
  }

  return `
    <svg viewBox="0 0 ${svgSize} ${svgSize}" width="100%" height="100%" role="img" aria-label="二维码预览" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${lightColor}" />
      ${rects.join('')}
    </svg>
  `;
};

/**
 * 二维码生成器
 */
export const QrGenerator: React.FC = () => {
  const { language } = useAppContext();
  const [text, setText] = useState('https://polaris.example.com');
  const [options, setOptions] = useState<QrOptions>({
    text: 'https://polaris.example.com',
    margin: 4,
    darkColor: '#111827',
    lightColor: '#ffffff',
  });
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const matrixResult = useMemo(() => buildQrMatrix(text), [text]);
  const svgMarkup = useMemo(
    () =>
      matrixResult
        ? matrixToSvg(matrixResult.modules, matrixResult.size, options.margin, options.darkColor, options.lightColor)
        : '',
    [matrixResult, options.margin, options.darkColor, options.lightColor]
  );

  const handleGenerate = () => {
    setOptions((prev) => ({
      ...prev,
      text,
    }));
  };

  const copySvg = useCallback(async () => {
    if (!svgMarkup) return;
    await navigator.clipboard.writeText(svgMarkup);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [svgMarkup]);

  const downloadSvg = useCallback(() => {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'polaris-qr.svg';
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  }, [svgMarkup]);

  return (
    <ToolLayout toolId="qr-generator">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {language === 'zh' ? '二维码生成器' : 'QR Code Generator'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {language === 'zh'
                  ? '纯前端生成 SVG 二维码，优先支持短文本和常见 URL。'
                  : 'Client-side SVG QR generation with support for short text and common URLs.'}
              </p>
            </div>
            {matrixResult && (
              <div className="text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'zh' ? '版本' : 'Version'}
                </p>
                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">V{matrixResult.version}</p>
              </div>
            )}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={language === 'zh' ? '输入文本或 URL' : 'Enter text or URL'}
            className="w-full h-36 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <label className="block">
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {language === 'zh' ? '边距模块数' : 'Quiet zone modules'}
              </span>
              <input
                type="number"
                min="0"
                max="16"
                value={options.margin}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, margin: Math.max(0, Math.min(16, Number(e.target.value) || 0)) }))
                }
                className="mt-1 w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {language === 'zh' ? '深色' : 'Dark color'}
              </span>
              <input
                type="color"
                value={options.darkColor}
                onChange={(e) => setOptions((prev) => ({ ...prev, darkColor: e.target.value }))}
                className="mt-1 w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {language === 'zh' ? '浅色' : 'Light color'}
              </span>
              <input
                type="color"
                value={options.lightColor}
                onChange={(e) => setOptions((prev) => ({ ...prev, lightColor: e.target.value }))}
                className="mt-1 w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
              />
            </label>
          </div>

          {matrixResult ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-4 text-sm text-emerald-800 dark:text-emerald-200">
              {language === 'zh'
                ? `可生成二维码，当前版本 V${matrixResult.version}，容量约 ${matrixResult.capacity} 字节。`
                : `QR code can be generated. Version V${matrixResult.version}, capacity about ${matrixResult.capacity} bytes.`}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 text-sm text-amber-800 dark:text-amber-200">
              {language === 'zh'
                ? '内容过长，当前仅支持到 V4-L，建议缩短文本或 URL。'
                : 'Content is too long. This tool currently supports up to V4-L; shorten the text or URL.'}
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={handleGenerate}
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              {language === 'zh' ? '生成二维码' : 'Generate QR'}
            </button>
            <button
              onClick={copySvg}
              disabled={!svgMarkup}
              className="px-5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {copied ? (language === 'zh' ? '已复制 SVG' : 'SVG copied') : (language === 'zh' ? '复制 SVG' : 'Copy SVG')}
            </button>
            <button
              onClick={downloadSvg}
              disabled={!svgMarkup}
              className="px-5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {downloaded ? (language === 'zh' ? '已下载' : 'Downloaded') : (language === 'zh' ? '下载 SVG' : 'Download SVG')}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {language === 'zh' ? '二维码预览' : 'QR Preview'}
            </h3>
            {matrixResult && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {matrixResult.size} x {matrixResult.size}
              </span>
            )}
          </div>
          {svgMarkup ? (
            <div
              className="mx-auto w-full max-w-[360px] aspect-square rounded-2xl border border-slate-200 dark:border-slate-700 bg-white overflow-hidden"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          ) : (
            <div className="h-72 flex items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400">
              {language === 'zh' ? '暂无可生成内容' : 'No content to encode'}
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
};
