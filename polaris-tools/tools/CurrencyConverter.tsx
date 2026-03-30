import React, { useMemo, useState } from 'react';
import { ToolLayout } from '../components/ToolLayout';

interface CurrencyRate {
  code: string;
  label: string;
  rateToCny: number;
}

const DEFAULT_RATES: CurrencyRate[] = [
  { code: 'CNY', label: '人民币', rateToCny: 1 },
  { code: 'USD', label: '美元', rateToCny: 7.2 },
  { code: 'EUR', label: '欧元', rateToCny: 7.8 },
  { code: 'JPY', label: '日元', rateToCny: 0.048 },
  { code: 'HKD', label: '港币', rateToCny: 0.92 },
  { code: 'GBP', label: '英镑', rateToCny: 9.1 },
];

const formatCurrencyNumber = (value: number) => {
  if (!Number.isFinite(value)) {
    return '-';
  }
  return Number(value.toFixed(4)).toString();
};

export const CurrencyConverter: React.FC = () => {
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [amount, setAmount] = useState('100');
  const [fromCode, setFromCode] = useState('USD');
  const [toCode, setToCode] = useState('CNY');

  const fromCurrency = useMemo(
    () => rates.find((item) => item.code === fromCode) ?? rates[0],
    [fromCode, rates]
  );
  const toCurrency = useMemo(
    () => rates.find((item) => item.code === toCode) ?? rates[0],
    [toCode, rates]
  );

  const amountNumber = Number(amount);
  const cnyValue = Number.isFinite(amountNumber) ? amountNumber * fromCurrency.rateToCny : Number.NaN;
  const convertedValue = Number.isFinite(cnyValue) ? cnyValue / toCurrency.rateToCny : Number.NaN;

  const updateRate = (code: string, nextValue: string) => {
    const parsed = Number(nextValue);
    setRates((current) =>
      current.map((item) =>
        item.code === code
          ? { ...item, rateToCny: Number.isFinite(parsed) && parsed > 0 ? parsed : item.rateToCny }
          : item
      )
    );
  };

  return (
    <ToolLayout toolId="currency-converter">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-end">
            <div className="space-y-2">
              <label htmlFor="currency-amount" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                金额
              </label>
              <input
                id="currency-amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                placeholder="请输入金额"
              />
              <select
                value={fromCode}
                onChange={(event) => setFromCode(event.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                {rates.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} · {item.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setFromCode(toCode);
                setToCode(fromCode);
              }}
              className="h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              交换
            </button>

            <div className="space-y-2">
              <label htmlFor="currency-result" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                转换结果
              </label>
              <div
                id="currency-result"
                className="w-full px-4 py-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/20 text-lg font-semibold text-slate-900 dark:text-white"
              >
                {formatCurrencyNumber(convertedValue)}
              </div>
              <select
                value={toCode}
                onChange={(event) => setToCode(event.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                {rates.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} · {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">自定义汇率（基准：1 单位外币兑人民币）</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">这是本地参考汇率，不连接外部行情服务。</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {rates.map((item) => (
                <label key={item.code} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-3 space-y-1">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {item.code} · {item.label}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={item.rateToCny}
                    onChange={(event) => updateRate(item.code, event.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
};
