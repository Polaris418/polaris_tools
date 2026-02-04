import React, { useState, useRef } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

/**
 * 颜色转换器工具
 * 支持 HEX、RGB、HSL、CMYK 格式互转
 */
export const ColorConverter: React.FC = () => {
  const { t, isGuest, checkGuestUsage, recordGuestToolUsage } = useAppContext();
  
  const [hex, setHex] = useState('#667eea');
  const [rgb, setRgb] = useState({ r: 102, g: 126, b: 234 });
  const [hsl, setHsl] = useState({ h: 229, s: 75, l: 66 });
  const [cmyk, setCmyk] = useState({ c: 56, m: 46, y: 0, k: 8 });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [hasRecordedUsage, setHasRecordedUsage] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // HEX 转 RGB（支持简写如 #fff）
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    // 移除 # 号
    hex = hex.replace('#', '');
    
    // 支持简写格式 fff -> ffffff
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // RGB 转 HEX
  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, x)).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  // RGB 转 HSL
  const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  // HSL 转 RGB
  const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  };

  // RGB 转 CMYK
  const rgbToCmyk = (r: number, g: number, b: number): { c: number; m: number; y: number; k: number } => {
    r /= 255;
    g /= 255;
    b /= 255;

    const k = 1 - Math.max(r, g, b);
    if (k === 1) {
      return { c: 0, m: 0, y: 0, k: 100 };
    }

    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y = (1 - b - k) / (1 - k);

    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100)
    };
  };

  // CMYK 转 RGB
  const cmykToRgb = (c: number, m: number, y: number, k: number): { r: number; g: number; b: number } => {
    c /= 100;
    m /= 100;
    y /= 100;
    k /= 100;

    return {
      r: Math.round(255 * (1 - c) * (1 - k)),
      g: Math.round(255 * (1 - m) * (1 - k)),
      b: Math.round(255 * (1 - y) * (1 - k))
    };
  };

  // 更新所有格式从 RGB
  const updateAllFromRgb = (newRgb: { r: number; g: number; b: number }) => {
    setRgb(newRgb);
    setHex(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
    setHsl(rgbToHsl(newRgb.r, newRgb.g, newRgb.b));
    setCmyk(rgbToCmyk(newRgb.r, newRgb.g, newRgb.b));
  };

  // 检查游客限制并记录使用
  const checkAndRecordUsage = (): boolean => {
    if (isGuest && !hasRecordedUsage) {
      if (!checkGuestUsage()) {
        return false;
      }
      recordGuestToolUsage();
      setHasRecordedUsage(true);
    }
    return true;
  };

  // 处理 HEX 输入变更
  const handleHexChange = (newHex: string) => {
    if (!checkAndRecordUsage()) return;
    setHex(newHex);
    
    // 验证并更新（支持 #fff 和 #ffffff）
    const cleanHex = newHex.replace('#', '');
    if (/^[0-9A-F]{3}$/i.test(cleanHex) || /^[0-9A-F]{6}$/i.test(cleanHex)) {
      const rgbValue = hexToRgb(newHex);
      if (rgbValue) {
        setRgb(rgbValue);
        setHsl(rgbToHsl(rgbValue.r, rgbValue.g, rgbValue.b));
        setCmyk(rgbToCmyk(rgbValue.r, rgbValue.g, rgbValue.b));
      }
    }
  };

  // 处理颜色选择器变更
  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!checkAndRecordUsage()) return;
    const newHex = e.target.value;
    setHex(newHex);
    const rgbValue = hexToRgb(newHex);
    if (rgbValue) {
      updateAllFromRgb(rgbValue);
    }
  };

  // 处理 RGB 输入变更
  const handleRgbChange = (channel: 'r' | 'g' | 'b', value: number) => {
    if (!checkAndRecordUsage()) return;
    const newRgb = { ...rgb, [channel]: Math.max(0, Math.min(255, value)) };
    updateAllFromRgb(newRgb);
  };

  // 处理 HSL 输入变更
  const handleHslChange = (channel: 'h' | 's' | 'l', value: number) => {
    if (!checkAndRecordUsage()) return;
    const maxVal = channel === 'h' ? 360 : 100;
    const newHsl = { ...hsl, [channel]: Math.max(0, Math.min(maxVal, value)) };
    setHsl(newHsl);
    const rgbValue = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
    setRgb(rgbValue);
    setHex(rgbToHex(rgbValue.r, rgbValue.g, rgbValue.b));
    setCmyk(rgbToCmyk(rgbValue.r, rgbValue.g, rgbValue.b));
  };

  // 处理 CMYK 输入变更
  const handleCmykChange = (channel: 'c' | 'm' | 'y' | 'k', value: number) => {
    if (!checkAndRecordUsage()) return;
    const newCmyk = { ...cmyk, [channel]: Math.max(0, Math.min(100, value)) };
    setCmyk(newCmyk);
    const rgbValue = cmykToRgb(newCmyk.c, newCmyk.m, newCmyk.y, newCmyk.k);
    setRgb(rgbValue);
    setHex(rgbToHex(rgbValue.r, rgbValue.g, rgbValue.b));
    setHsl(rgbToHsl(rgbValue.r, rgbValue.g, rgbValue.b));
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // 生成色相条的颜色
  const generateHueGradient = () => {
    const colors = [];
    for (let i = 0; i <= 360; i += 30) {
      colors.push(`hsl(${i}, 100%, 50%)`);
    }
    return `linear-gradient(to right, ${colors.join(', ')})`;
  };

  return (
    <ToolLayout toolId="color-converter">
      <style dangerouslySetInnerHTML={{ __html: `
        .color-preview-bg { background-color: ${hex}; }
        .hue-gradient { background: ${generateHueGradient()}; }
        .saturation-gradient { background: linear-gradient(to right, hsl(${hsl.h}, 0%, ${hsl.l}%), hsl(${hsl.h}, 100%, ${hsl.l}%)); }
        .lightness-gradient { background: linear-gradient(to right, hsl(${hsl.h}, ${hsl.s}%, 0%), hsl(${hsl.h}, ${hsl.s}%, 50%), hsl(${hsl.h}, ${hsl.s}%, 100%)); }
      `}} />
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 颜色预览 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* 颜色块和选择器 */}
            <div className="flex-1">
              <div
                className="w-full h-48 rounded-lg shadow-lg cursor-pointer transition-all hover:shadow-xl relative overflow-hidden color-preview-bg"
                onClick={() => colorInputRef.current?.click()}
              >
                <input
                  ref={colorInputRef}
                  id="color-picker-input"
                  type="color"
                  value={hex.length === 4 ? hex.replace(/#([0-9a-f])([0-9a-f])([0-9a-f])/i, '#$1$1$2$2$3$3') : hex}
                  onChange={handleColorPickerChange}
                  aria-label="颜色选择器"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-slate-800/80 rounded px-2 py-1 text-xs">
                  点击选择颜色
                </div>
              </div>
            </div>
            
            {/* 颜色值显示 */}
            <div className="flex-1 flex flex-col justify-center space-y-3">
              <div className="text-center md:text-left">
                <p className="text-4xl font-bold text-slate-900 dark:text-white tracking-wider">
                  {hex.toUpperCase()}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  rgb({rgb.r}, {rgb.g}, {rgb.b})
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  hsl({hsl.h}, {hsl.s}%, {hsl.l}%)
                </p>
              </div>
            </div>
          </div>

          {/* HSL 滑块 */}
          <div className="mt-6 space-y-4">
            {/* 色相滑块 */}
            <div>
              <label htmlFor="hsl-h-range" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                色相 (H: {hsl.h}°)
              </label>
              <input
                id="hsl-h-range"
                type="range"
                min="0"
                max="360"
                value={hsl.h}
                onChange={(e) => handleHslChange('h', parseInt(e.target.value))}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer hue-gradient"
              />
            </div>
            {/* 饱和度滑块 */}
            <div>
              <label htmlFor="hsl-s-range" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                饱和度 (S: {hsl.s}%)
              </label>
              <input
                id="hsl-s-range"
                type="range"
                min="0"
                max="100"
                value={hsl.s}
                onChange={(e) => handleHslChange('s', parseInt(e.target.value))}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer saturation-gradient"
              />
            </div>
            {/* 亮度滑块 */}
            <div>
              <label htmlFor="hsl-l-range" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                亮度 (L: {hsl.l}%)
              </label>
              <input
                id="hsl-l-range"
                type="range"
                min="0"
                max="100"
                value={hsl.l}
                onChange={(e) => handleHslChange('l', parseInt(e.target.value))}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer lightness-gradient"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* HEX 输入 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-rose-600 dark:text-rose-400">tag</span>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">HEX</h3>
              </div>
              <button
                onClick={() => copyToClipboard(hex, 'hex')}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                {copiedField === 'hex' ? t('color_converter.copied') : t('color_converter.copy')}
              </button>
            </div>
            <label htmlFor="hex-input" className="sr-only">
              HEX 输入
            </label>
            <input
              id="hex-input"
              type="text"
              value={hex}
              onChange={(e) => handleHexChange(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              placeholder="#667eea 或 #fff"
            />
          </div>

          {/* RGB 输入 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">palette</span>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">RGB</h3>
              </div>
              <button
                onClick={() => copyToClipboard(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                {copiedField === 'rgb' ? t('color_converter.copied') : t('color_converter.copy')}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['r', 'g', 'b'] as const).map((channel) => (
                <div key={channel}>
                  <label htmlFor={`rgb-${channel}`} className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 text-center">
                    {channel.toUpperCase()}
                  </label>
                  <input
                    id={`rgb-${channel}`}
                    type="number"
                    min="0"
                    max="255"
                    value={rgb[channel]}
                    onChange={(e) => handleRgbChange(channel, parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* HSL 输入 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">tune</span>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">HSL</h3>
              </div>
              <button
                onClick={() => copyToClipboard(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'hsl')}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                {copiedField === 'hsl' ? t('color_converter.copied') : t('color_converter.copy')}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="hsl-h-input" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 text-center">
                  H (0-360)
                </label>
                <input
                  id="hsl-h-input"
                  type="number"
                  min="0"
                  max="360"
                  value={hsl.h}
                  onChange={(e) => handleHslChange('h', parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono"
                />
              </div>
              <div>
                <label htmlFor="hsl-s-input" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 text-center">
                  S (0-100)
                </label>
                <input
                  id="hsl-s-input"
                  type="number"
                  min="0"
                  max="100"
                  value={hsl.s}
                  onChange={(e) => handleHslChange('s', parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono"
                />
              </div>
              <div>
                <label htmlFor="hsl-l-input" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 text-center">
                  L (0-100)
                </label>
                <input
                  id="hsl-l-input"
                  type="number"
                  min="0"
                  max="100"
                  value={hsl.l}
                  onChange={(e) => handleHslChange('l', parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono"
                />
              </div>
            </div>
          </div>

          {/* CMYK 输入 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">print</span>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">CMYK</h3>
              </div>
              <button
                onClick={() => copyToClipboard(`cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`, 'cmyk')}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                {copiedField === 'cmyk' ? t('color_converter.copied') : t('color_converter.copy')}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['c', 'm', 'y', 'k'] as const).map((channel) => (
                <div key={channel}>
                  <label htmlFor={`cmyk-${channel}`} className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 text-center">
                    {channel.toUpperCase()}
                  </label>
                  <input
                    id={`cmyk-${channel}`}
                    type="number"
                    min="0"
                    max="100"
                    value={cmyk[channel]}
                    onChange={(e) => handleCmykChange(channel, parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
};
