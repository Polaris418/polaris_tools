import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WordCounter } from '../tools/WordCounter';
import { PasswordGenerator } from '../tools/PasswordGenerator';
import { UuidGenerator, parseUuidInfo } from '../tools/UuidGenerator';
import { CaseConverter, convertCaseLineByLine } from '../tools/CaseConverter';

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

const stubCrypto = (fillValue = 0) => {
  const cryptoMock = {
    getRandomValues: <T extends ArrayBufferView>(array: T) => {
      if (array instanceof Uint8Array) {
        array.fill(fillValue);
      } else if (array instanceof Uint32Array) {
        array.fill(fillValue);
      } else {
        new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(fillValue);
      }
      return array;
    },
    randomUUID: vi.fn(() => '01234567-89ab-4cde-8f01-23456789abcd'),
  } as Crypto;

  vi.stubGlobal('crypto', cryptoMock);
};

describe('WordCounter', () => {
  beforeEach(() => {
    appContextState.language = 'zh';
    appContextState.isGuest = false;
    appContextState.checkGuestUsage.mockReset();
    appContextState.recordGuestToolUsage.mockReset();
  });

  it('应展示关键词统计和搜索命中数', () => {
    render(<WordCounter />);

    fireEvent.change(screen.getByPlaceholderText('word_counter.placeholder'), {
      target: {
        value: 'hello hello world world world\n\ncode sample code',
      },
    });

    expect(screen.getByText('关键词与搜索')).toBeInTheDocument();
    expect(screen.getAllByText(/^hello$/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/^world$/).length).toBeGreaterThanOrEqual(1);

    fireEvent.change(screen.getByPlaceholderText('输入要查找的词或短语'), {
      target: { value: 'world' },
    });

    expect(screen.getByText('命中 3 次')).toBeInTheDocument();
  });

  it('应展示重复词与高频词诊断', () => {
    render(<WordCounter />);

    fireEvent.change(screen.getByPlaceholderText('word_counter.placeholder'), {
      target: {
        value: 'alpha alpha beta beta beta gamma gamma delta',
      },
    });

    expect(screen.getByText('重复词与高频词')).toBeInTheDocument();
    expect(screen.getAllByText(/^alpha$/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/^beta$/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/重复率/)).toBeInTheDocument();
  });
});

describe('PasswordGenerator', () => {
  beforeEach(() => {
    appContextState.isGuest = false;
    appContextState.checkGuestUsage.mockReset();
    appContextState.recordGuestToolUsage.mockReset();
    stubCrypto(0);
  });

  it('应确保生成密码覆盖已选择的字符集', () => {
    render(<PasswordGenerator />);

    fireEvent.change(screen.getByLabelText('password.count'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /password\.generate/ }));

    const generated = screen.getByText((_, element) => element?.tagName.toLowerCase() === 'code');
    const password = generated.textContent ?? '';

    expect(password).toHaveLength(16);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[^A-Za-z0-9]/);
  });

  it('长度不足时应给出提示并禁用生成按钮', () => {
    render(<PasswordGenerator />);

    fireEvent.change(screen.getByLabelText('password.count'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('password.length'), { target: { value: '1' } });

    expect(screen.getByText(/密码长度至少需要 4 位/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /password\.generate/ })).toBeDisabled();
  });
});

describe('UuidGenerator', () => {
  beforeEach(() => {
    appContextState.isGuest = false;
    appContextState.checkGuestUsage.mockReset();
    appContextState.recordGuestToolUsage.mockReset();
    stubCrypto(0);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T12:34:56.789Z'));
  });

  it('应生成 UUID v7', () => {
    render(<UuidGenerator />);

    fireEvent.click(screen.getByRole('button', { name: /UUID v7/ }));
    fireEvent.click(screen.getByRole('button', { name: /uuid\.generate/ }));

    const uuid = screen.getByText(/[0-9a-fA-F-]{36}/).textContent ?? '';
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('应支持 UUID 校验与解析', () => {
    expect(parseUuidInfo('018f4f7c-8e53-7b64-83d3-66dfa24e1234')).toMatchObject({
      valid: true,
      version: 'v7',
      variant: 'RFC 4122',
    });
    expect(parseUuidInfo('bad-uuid').valid).toBe(false);
  });
});

describe('CaseConverter', () => {
  beforeEach(() => {
    appContextState.isGuest = false;
    appContextState.checkGuestUsage.mockReset();
    appContextState.recordGuestToolUsage.mockReset();
  });

  it('应正确转换驼峰和分隔符命名', () => {
    render(<CaseConverter />);

    fireEvent.change(screen.getByPlaceholderText('case_converter.placeholder'), {
      target: { value: 'FooBarBaz' },
    });

    expect(screen.getByText('foo_bar_baz')).toBeInTheDocument();
    expect(screen.getByText('foo-bar-baz')).toBeInTheDocument();
    expect(screen.getByText('fooBarBaz')).toBeInTheDocument();
    expect(screen.getAllByText('FooBarBaz').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('FOOBARBAZ')).toBeInTheDocument();
  });

  it('应支持逐行转换并复制全部结果', () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<CaseConverter />);

    fireEvent.change(screen.getByPlaceholderText('case_converter.placeholder'), {
      target: { value: 'FooBarBaz\nHelloWorld' },
    });
    fireEvent.click(screen.getByText('逐行转换'));

    expect(convertCaseLineByLine('FooBarBaz\nHelloWorld', (line) => `${line}!`)).toBe(
      'FooBarBaz!\nHelloWorld!'
    );
    expect(
      screen.getByText((_, element) => element?.textContent === 'foo_bar_baz\nhello_world')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('复制全部结果'));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('foo_bar_baz');
    expect(writeText.mock.calls[0][0]).toContain('hello_world');
  });
});
