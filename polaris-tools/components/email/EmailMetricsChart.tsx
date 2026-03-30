import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type ChartType = 'line' | 'bar';
type TimeRange = '24h' | '7d' | '30d' | '90d';

interface DataPoint {
  timestamp: string;
  label: string;
  [key: string]: string | number;
}

interface MetricConfig {
  key: string;
  name: string;
  color: string;
}

interface EmailMetricsChartProps {
  data: DataPoint[];
  metrics: MetricConfig[];
  chartType?: ChartType;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  title?: string;
  height?: number;
}

/**
 * EmailMetricsChart 组件
 * 使用 Recharts 显示邮件指标趋势图，支持多种图表类型和可配置时间范围
 * 
 * 需求: 21.9 - 实时图表显示趋势
 */
export const EmailMetricsChart: React.FC<EmailMetricsChartProps> = ({
  data,
  metrics,
  chartType = 'line',
  timeRange = '7d',
  onTimeRangeChange,
  title,
  height = 300,
}) => {
  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '24h', label: '24小时' },
    { value: '7d', label: '7天' },
    { value: '30d', label: '30天' },
    { value: '90d', label: '90天' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-600 dark:text-slate-400">
                {entry.name}:
              </span>
              <span className="font-medium text-slate-900 dark:text-white">
                {typeof entry.value === 'number'
                  ? entry.value.toLocaleString()
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    if (chartType === 'bar') {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-slate-200 dark:stroke-slate-700"
          />
          <XAxis
            dataKey="label"
            className="text-xs text-slate-600 dark:text-slate-400"
          />
          <YAxis className="text-xs text-slate-600 dark:text-slate-400" />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '12px',
            }}
          />
          {metrics.map((metric) => (
            <Bar
              key={metric.key}
              dataKey={metric.key}
              name={metric.name}
              fill={metric.color}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      );
    }

    return (
      <LineChart {...commonProps}>
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        <XAxis
          dataKey="label"
          className="text-xs text-slate-600 dark:text-slate-400"
        />
        <YAxis className="text-xs text-slate-600 dark:text-slate-400" />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{
            paddingTop: '20px',
            fontSize: '12px',
          }}
        />
        {metrics.map((metric) => (
          <Line
            key={metric.key}
            type="monotone"
            dataKey={metric.key}
            name={metric.name}
            stroke={metric.color}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    );
  };

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {title && (
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>
        )}
        
        {onTimeRangeChange && (
          <div className="flex items-center gap-2">
            {timeRangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onTimeRangeChange(option.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  timeRange === option.value
                    ? 'bg-primary text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      ) : (
        <div
          className="flex items-center justify-center text-slate-400 dark:text-slate-600"
          style={{ height }}
        >
          <div className="text-center">
            <span className="material-symbols-outlined text-4xl mb-2">
              bar_chart
            </span>
            <p className="text-sm">暂无数据</p>
          </div>
        </div>
      )}
    </div>
  );
};
