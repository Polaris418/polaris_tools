import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  buildPaletteSuggestions,
  getAccessibleTextColor,
  getContrastRatio,
  hexToRgb,
  normalizeHexColor,
  rgbToHex,
  ColorConverter,
} from '../tools/ColorConverter';

const appContextState = vi.hoisted(() => ({
  language: 'zh' as 'zh' | 'en',
  isGuest: false,
  checkGuestUsage: vi.fn(() => true),
  recordGuestToolUsage: vi.fn(),
}));

vi.mock('../components/ToolLayout', () => ({
  ToolLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    t: (key: string) => key,
    language: appContextState.language,
    isGuest: appContextState.isGuest,
    checkGuestUsage: appContextState.checkGuestUsage,
    recordGuestToolUsage: appContextState.recordGuestToolUsage,
  }),
}));

describe('ColorConverter helpers', () => {
  beforeEach(() => {
    appContextState.language = 'zh';
    appContextState.isGuest = false;
    appContextState.checkGuestUsage.mockReset();
    appContextState.recordGuestToolUsage.mockReset();
  });

  it('应规范化 HEX 并保持原有格式转换能力', () => {
    expect(normalizeHexColor('#abc')).toBe('#aabbcc');
    expect(normalizeHexColor('667eea')).toBe('#667eea');
    expect(hexToRgb('#667eea')).toEqual({ r: 102, g: 126, b: 234 });
    expect(rgbToHex(102, 126, 234)).toBe('#667eea');
  });

  it('应计算黑白文字对比度并推荐可读性更高的前景色', () => {
    const lightBackground = { r: 245, g: 245, b: 245 };
    const darkBackground = { r: 18, g: 18, b: 18 };

    expect(getContrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBe(21);
    expect(getAccessibleTextColor(lightBackground).recommended.hex).toBe('#000000');
    expect(getAccessibleTextColor(darkBackground).recommended.hex).toBe('#ffffff');
    expect(getAccessibleTextColor(lightBackground).black.passesAA).toBe(true);
  });

  it('应生成互补、类似和三色系建议', () => {
    const palettes = buildPaletteSuggestions({ r: 255, g: 0, b: 0 });

    expect(palettes).toHaveLength(3);
    expect(palettes[0].key).toBe('complementary');
    expect(palettes[0].colors.map((item) => item.hex)).toEqual(['#ff0000', '#00ffff']);
    expect(palettes[1].key).toBe('analogous');
    expect(palettes[1].colors).toHaveLength(3);
    expect(palettes[2].key).toBe('triadic');
    expect(palettes[2].colors.map((item) => item.hex)).toEqual(['#ff0000', '#00ff00', '#0000ff']);
  });
});

describe('ColorConverter UI', () => {
  beforeEach(() => {
    appContextState.language = 'zh';
    appContextState.isGuest = false;
    appContextState.checkGuestUsage.mockReset();
    appContextState.recordGuestToolUsage.mockReset();
  });

  it('应展示对比度和配色建议', () => {
    render(<ColorConverter />);

    expect(screen.getByText('无障碍对比度')).toBeInTheDocument();
    expect(screen.getByText('配色建议')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('HEX 输入'), { target: { value: '#111111' } });

    expect(screen.getByText('#FFFFFF')).toBeInTheDocument();
    expect(screen.getByText('推荐前景色')).toBeInTheDocument();
  });
});
