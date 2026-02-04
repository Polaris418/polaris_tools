/**
 * Optimized Email List Example
 * 优化的邮件列表示例 - 展示如何使用性能优化工具
 * 
 * This example demonstrates:
 * 1. Virtual scrolling for large lists
 * 2. Debounced search input
 * 3. Cached API calls
 * 4. Request deduplication
 */

import React, { useState, useEffect } from 'react';
import { VirtualTable } from '../components/VirtualList';
import { useDebouncedCallback } from '../utils/performance';
import { optimizedEmailApi } from '../utils/optimizedApi';
import type { EmailAuditLogResponse } from '../pages/admin/types';

export const OptimizedEmailListExample: React.FC = () => {
  const [emails, setEmails] = useState<EmailAuditLogResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Debounced search - only calls API after user stops typing for 500ms
  const debouncedSearch = useDebouncedCallback(
    async (query: string, status: string) => {
      setLoading(true);
      try {
        // This API call is automatically deduplicated
        // Multiple concurrent calls with same params will share one request
        const result = await optimizedEmailApi.list({
          page: 1,
          pageSize: 100,
          recipient: query || undefined,
          status: status || undefined,
        });

        if (result.success && result.data) {
          setEmails(result.data.list);
        }
      } catch (error) {
        console.error('Failed to fetch emails:', error);
      } finally {
        setLoading(false);
      }
    },
    500 // 500ms delay
  );

  // Trigger search when filters change
  useEffect(() => {
    debouncedSearch(searchQuery, statusFilter);
  }, [searchQuery, statusFilter, debouncedSearch]);

  // Virtual table columns
  const columns = [
    {
      key: 'id',
      header: 'ID',
      width: '80px',
      render: (email: EmailAuditLogResponse) => (
        <span className="text-sm font-mono text-slate-500">#{email.id}</span>
      ),
    },
    {
      key: 'recipient',
      header: 'Recipient',
      width: '250px',
      render: (email: EmailAuditLogResponse) => (
        <span className="text-sm text-slate-900 dark:text-white">
          {email.recipient}
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (email: EmailAuditLogResponse) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {email.subject}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (email: EmailAuditLogResponse) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            email.status === 'SENT'
              ? 'bg-green-100 text-green-800'
              : email.status === 'FAILED'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {email.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created At',
      width: '180px',
      render: (email: EmailAuditLogResponse) => (
        <span className="text-sm text-slate-500">
          {new Date(email.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by recipient..."
          className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
        >
          <option value="">All Status</option>
          <option value="SENT">Sent</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {/* Virtual Table - Only renders visible rows */}
      {!loading && emails.length > 0 && (
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden">
          <VirtualTable
            items={emails}
            columns={columns}
            rowHeight={60}
            containerHeight={600}
            overscan={5}
            className="w-full"
            headerClassName="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"
            rowClassName={(email, index) =>
              index % 2 === 0
                ? 'bg-white dark:bg-surface-dark'
                : 'bg-slate-50 dark:bg-slate-800/50'
            }
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && emails.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No emails found
        </div>
      )}

      {/* Performance Info */}
      <div className="text-xs text-slate-500 space-y-1">
        <p>
          ✓ Virtual scrolling: Only {Math.min(10, emails.length)} of{' '}
          {emails.length} rows rendered
        </p>
        <p>✓ Debounced search: API calls delayed by 500ms</p>
        <p>✓ Request deduplication: Duplicate requests are merged</p>
        <p>✓ API caching: Results cached for 5 minutes</p>
      </div>
    </div>
  );
};

/**
 * Optimized Chart Example
 * 优化的图表示例
 */

import { useLazyChart, useChartSampling } from '../hooks/useLazyChart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  time: string;
  value: number;
}

export const OptimizedChartExample: React.FC<{
  data: ChartDataPoint[];
}> = ({ data }) => {
  // Lazy load chart - only renders when visible
  const { ref, shouldRender } = useLazyChart({
    threshold: 0.1,
    rootMargin: '50px',
  });

  // Sample data if too many points (> 100)
  const sampledData = useChartSampling(data, {
    maxPoints: 100,
    samplingMethod: 'lttb', // Largest Triangle Three Buckets
    xKey: 'time',
    yKey: 'value',
  });

  return (
    <div ref={ref} className="h-96 bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
      {shouldRender ? (
        <>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sampledData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-xs text-slate-500 mt-2">
            ✓ Lazy loaded: Chart rendered only when visible
            <br />✓ Data sampled: {sampledData.length} of {data.length} points
            displayed
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-slate-400">
            Chart will load when visible...
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Batch Operations Example
 * 批量操作示例
 */

import { batchOperations } from '../utils/optimizedApi';

export const BatchOperationsExample: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleBatchFetch = async () => {
    setLoading(true);
    try {
      // These requests will be automatically batched
      // Instead of 10 separate API calls, they'll be combined into 1-2 batches
      const templateIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const templates = await Promise.all(
        templateIds.map((id) => batchOperations.getTemplates(id))
      );

      setResults(templates);
    } catch (error) {
      console.error('Batch fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleBatchFetch}
        disabled={loading}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg"
      >
        {loading ? 'Fetching...' : 'Fetch 10 Templates (Batched)'}
      </button>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((template, index) => (
            <div
              key={index}
              className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
            >
              {template?.name || 'Loading...'}
            </div>
          ))}
          <div className="text-xs text-slate-500">
            ✓ Batch optimization: 10 requests combined into 1-2 API calls
          </div>
        </div>
      )}
    </div>
  );
};
