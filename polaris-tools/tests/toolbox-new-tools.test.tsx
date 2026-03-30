import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { applyTextFormatting, getTextFormatterStats, TextFormatter } from '../tools/TextFormatter';
import { buildDiffSummary, buildTextDiffRows } from '../tools/TextDiff';
import { formatJsonText, minifyJsonText, parseJsonText } from '../tools/JsonFormatter';
import { md5Hex } from '../tools/HashGenerator';
import { UnitConverter } from '../tools/UnitConverter';
import { CurrencyConverter } from '../tools/CurrencyConverter';
import { TextEncryptor } from '../tools/TextEncryptor';
import { QrGenerator } from '../tools/QrGenerator';
import { getToolRegistryItem } from '../toolRegistry';

vi.mock('../components/ToolLayout', () => ({
  ToolLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    t: (key: string) => key,
    language: 'zh',
    isGuest: false,
    checkGuestUsage: vi.fn(() => true),
    recordGuestToolUsage: vi.fn(),
  }),
}));

describe('第一批缺失工具纯函数', () => {
  it('TextFormatter 应支持清理和去重', () => {
    const output = applyTextFormatting('  Foo  \nFoo\n\tBar', {
      trimLines: true,
      collapseSpaces: true,
      removeBlankLines: false,
      uniqueLines: true,
      sortLines: false,
      reverseLines: false,
      tabsToSpaces: true,
      spacesPerTab: 2,
    });

    expect(output).toBe('Foo\nBar');
    expect(getTextFormatterStats(output)).toMatchObject({
      lines: 2,
      nonEmptyLines: 2,
    });
  });

  it('TextDiff 应生成插入与删除摘要', () => {
    const rows = buildTextDiffRows('a\nb', 'a\nc', {
      ignoreCase: false,
      ignoreWhitespace: false,
      ignoreEmptyLines: false,
    });
    const summary = buildDiffSummary(rows);

    expect(summary.insertions).toBeGreaterThan(0);
    expect(summary.deletions).toBeGreaterThan(0);
  });

  it('JsonFormatter 应支持格式化和压缩', () => {
    expect(parseJsonText(' {\"a\":1,\"b\":[2]} ').valid).toBe(true);
    expect(formatJsonText('{\"a\":1}')).toContain('\n');
    expect(minifyJsonText('{\n  \"a\": 1\n}')).toBe('{"a":1}');
  });

  it('HashGenerator 应生成稳定 MD5', () => {
    expect(md5Hex('hello')).toBe('5d41402abc4b2a76b9719d911017c592');
  });
});

describe('第一批缺失工具组件', () => {
  it('应渲染 UnitConverter', () => {
    render(<UnitConverter />);
    expect(screen.getByText('长度')).toBeInTheDocument();
    expect(screen.getByText('当前基准单位：米')).toBeInTheDocument();
    expect(screen.getByText('复制结果')).toBeInTheDocument();
  });

  it('应渲染 CurrencyConverter', () => {
    render(<CurrencyConverter />);
    expect(screen.getByText('自定义汇率（基准：1 单位外币兑人民币）')).toBeInTheDocument();
  });

  it('应渲染 TextFormatter 和 TextEncryptor', () => {
    render(
      <div>
        <TextFormatter />
        <TextEncryptor />
      </div>
    );
    expect(screen.getByText('文本格式化')).toBeInTheDocument();
    expect(screen.getByText('文本加密')).toBeInTheDocument();
  });

  it('应渲染 QrGenerator', () => {
    render(<QrGenerator />);
    expect(screen.getByText('二维码生成器')).toBeInTheDocument();
  });

  it('注册表应同时兼容 /tools 路径和裸 slug', () => {
    expect(getToolRegistryItem('/tools/text-formatter')?.id).toBe('text-formatter');
    expect(getToolRegistryItem('text-formatter')?.id).toBe('text-formatter');
    expect(getToolRegistryItem('/tools/hash-generator')?.id).toBe('hash-generator');
  });
});
