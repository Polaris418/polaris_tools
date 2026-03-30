import { describe, expect, it } from 'vitest';
import {
  buildRelativeTimeLabel,
  buildTimestampFormats,
  formatLocalIsoString,
  parseTimestampInput,
} from '../tools/TimestampConverter';
import {
  decodeBase64Text,
  encodeBase64Text,
  normalizeBase64UrlInput,
  toBase64Url,
} from '../tools/Base64Encoder';
import { buildQueryString, decodeUrlValue, encodeUrlValue, parseQueryParams } from '../tools/UrlEncoder';

describe('工具箱编码增强', () => {
  it('时间戳工具应输出更实用的格式快捷项', () => {
    const formats = buildTimestampFormats(1_704_067_200, 'zh');

    expect(formats).toHaveLength(6);
    expect(formats.find((item) => item.key === 'unix-seconds')?.value).toBe('1704067200');
    expect(formats.find((item) => item.key === 'unix-milliseconds')?.value).toBe('1704067200000');
    expect(formats.find((item) => item.key === 'iso-utc')?.value).toBe('2024-01-01T00:00:00.000Z');
    expect(formats.find((item) => item.key === 'iso-local')?.value).toMatch(/T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(formatLocalIsoString(new Date('2024-01-01T00:00:00.000Z'))).toMatch(
      /T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/
    );
    expect(parseTimestampInput('1704067200')).toEqual({ milliseconds: 1704067200000, unit: 'seconds' });
    expect(parseTimestampInput('2024-01-01T00:00:00.000Z')).toEqual({
      milliseconds: 1704067200000,
      unit: 'milliseconds',
    });
    expect(buildRelativeTimeLabel(1704067200000, 1704070800000, 'zh')).toBe('1小时前');
  });

  it('Base64 工具应支持 URL-safe 编码与解码', () => {
    expect(encodeBase64Text('Hello world', true)).toBe('SGVsbG8gd29ybGQ');
    expect(decodeBase64Text('SGVsbG8gd29ybGQ')).toBe('Hello world');
    expect(toBase64Url('a+b/c==')).toBe('a-b_c');
    expect(normalizeBase64UrlInput('a-b_c')).toBe('a+b/c');
  });

  it('URL 工具应支持 form-urlencoded 编码', () => {
    const encoded = encodeUrlValue('a b&c=1', 'form');
    expect(encoded).toBe('a+b%26c%3D1');
    expect(decodeUrlValue(encoded, 'form')).toBe('a b&c=1');
    expect(parseQueryParams('https://a.com?a=1&b=hello+world')).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: 'hello world' },
    ]);
    expect(buildQueryString([
      { key: 'a', value: '1' },
      { key: 'b', value: 'hello world' },
    ])).toBe('a=1&b=hello+world');
  });
});
