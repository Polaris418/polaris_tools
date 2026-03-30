import React, { useMemo, useState } from 'react';
import { ToolLayout } from '../components/ToolLayout';

type UnitGroupKey = 'length' | 'weight' | 'temperature' | 'area' | 'storage';

interface UnitOption {
  key: string;
  label: string;
  toBase: (value: number) => number;
  fromBase: (value: number) => number;
}

interface UnitGroup {
  key: UnitGroupKey;
  label: string;
  baseLabel: string;
  units: UnitOption[];
}

const identity = (value: number) => value;

const UNIT_GROUPS: UnitGroup[] = [
  {
    key: 'length',
    label: '长度',
    baseLabel: '米',
    units: [
      { key: 'm', label: '米 (m)', toBase: identity, fromBase: identity },
      { key: 'km', label: '千米 (km)', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { key: 'cm', label: '厘米 (cm)', toBase: (v) => v / 100, fromBase: (v) => v * 100 },
      { key: 'mm', label: '毫米 (mm)', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { key: 'inch', label: '英寸 (in)', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
      { key: 'ft', label: '英尺 (ft)', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
    ],
  },
  {
    key: 'weight',
    label: '重量',
    baseLabel: '千克',
    units: [
      { key: 'kg', label: '千克 (kg)', toBase: identity, fromBase: identity },
      { key: 'g', label: '克 (g)', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { key: 'lb', label: '磅 (lb)', toBase: (v) => v * 0.45359237, fromBase: (v) => v / 0.45359237 },
      { key: 'oz', label: '盎司 (oz)', toBase: (v) => v * 0.028349523125, fromBase: (v) => v / 0.028349523125 },
    ],
  },
  {
    key: 'temperature',
    label: '温度',
    baseLabel: '摄氏度',
    units: [
      { key: 'c', label: '摄氏度 (°C)', toBase: identity, fromBase: identity },
      { key: 'f', label: '华氏度 (°F)', toBase: (v) => (v - 32) / 1.8, fromBase: (v) => v * 1.8 + 32 },
      { key: 'k', label: '开尔文 (K)', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  {
    key: 'area',
    label: '面积',
    baseLabel: '平方米',
    units: [
      { key: 'sqm', label: '平方米 (m²)', toBase: identity, fromBase: identity },
      { key: 'sqkm', label: '平方千米 (km²)', toBase: (v) => v * 1_000_000, fromBase: (v) => v / 1_000_000 },
      { key: 'sqft', label: '平方英尺 (ft²)', toBase: (v) => v * 0.09290304, fromBase: (v) => v / 0.09290304 },
      { key: 'acre', label: '英亩 (acre)', toBase: (v) => v * 4046.8564224, fromBase: (v) => v / 4046.8564224 },
    ],
  },
  {
    key: 'storage',
    label: '存储',
    baseLabel: '字节',
    units: [
      { key: 'b', label: '字节 (B)', toBase: identity, fromBase: identity },
      { key: 'kb', label: 'KB', toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
      { key: 'mb', label: 'MB', toBase: (v) => v * 1024 ** 2, fromBase: (v) => v / 1024 ** 2 },
      { key: 'gb', label: 'GB', toBase: (v) => v * 1024 ** 3, fromBase: (v) => v / 1024 ** 3 },
      { key: 'tb', label: 'TB', toBase: (v) => v * 1024 ** 4, fromBase: (v) => v / 1024 ** 4 },
    ],
  },
];

const formatValue = (value: number) => {
  if (!Number.isFinite(value)) {
    return '-';
  }

  if (Math.abs(value) >= 1_000_000 || (Math.abs(value) > 0 && Math.abs(value) < 0.0001)) {
    return value.toExponential(4);
  }

  return Number(value.toFixed(6)).toString();
};

export const UnitConverter: React.FC = () => {
  const [groupKey, setGroupKey] = useState<UnitGroupKey>('length');
  const [fromUnitKey, setFromUnitKey] = useState('m');
  const [toUnitKey, setToUnitKey] = useState('cm');
  const [inputValue, setInputValue] = useState('1');

  const group = useMemo(
    () => UNIT_GROUPS.find((item) => item.key === groupKey) ?? UNIT_GROUPS[0],
    [groupKey]
  );

  const fromUnit = group.units.find((item) => item.key === fromUnitKey) ?? group.units[0];
  const toUnit = group.units.find((item) => item.key === toUnitKey) ?? group.units[1] ?? group.units[0];
  const numericValue = Number(inputValue);
  const baseValue = Number.isFinite(numericValue) ? fromUnit.toBase(numericValue) : Number.NaN;
  const convertedValue = Number.isFinite(baseValue) ? toUnit.fromBase(baseValue) : Number.NaN;

  const handleGroupChange = (nextGroupKey: UnitGroupKey) => {
    const nextGroup = UNIT_GROUPS.find((item) => item.key === nextGroupKey) ?? UNIT_GROUPS[0];
    setGroupKey(nextGroup.key);
    setFromUnitKey(nextGroup.units[0].key);
    setToUnitKey(nextGroup.units[1]?.key ?? nextGroup.units[0].key);
  };

  const copyResult = async () => {
    if (!Number.isFinite(convertedValue)) {
      return;
    }
    await navigator.clipboard.writeText(formatValue(convertedValue));
  };

  return (
    <ToolLayout toolId="unit-converter">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {UNIT_GROUPS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleGroupChange(item.key)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.key === group.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-end">
            <div className="space-y-2">
              <label htmlFor="unit-from-value" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                输入数值
              </label>
              <input
                id="unit-from-value"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                placeholder="请输入数值"
              />
              <select
                value={fromUnit.key}
                onChange={(event) => setFromUnitKey(event.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                {group.units.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setFromUnitKey(toUnit.key);
                setToUnitKey(fromUnit.key);
              }}
              className="h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              交换
            </button>

            <div className="space-y-2">
              <label htmlFor="unit-to-value" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                转换结果
              </label>
              <div
                id="unit-to-value"
                className="w-full px-4 py-3 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/20 text-lg font-semibold text-slate-900 dark:text-white"
              >
                {formatValue(convertedValue)}
              </div>
              <select
                value={toUnit.key}
                onChange={(event) => setToUnitKey(event.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                {group.units.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span>当前基准单位：{group.baseLabel}</span>
            <button
              type="button"
              onClick={copyResult}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              复制结果
            </button>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
};
