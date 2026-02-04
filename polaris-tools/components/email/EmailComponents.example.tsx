/**
 * Email Components Usage Examples
 * 
 * This file demonstrates how to use the email-related shared components
 */

import React, { useState } from 'react';
import { EmailStatusBadge } from '../EmailStatusBadge';
import { EmailVerificationBanner } from '../EmailVerificationBanner';
import { EmailMetricsChart } from '../EmailMetricsChart';
import { EmailTemplateEditor } from '../EmailTemplateEditor';

export const EmailComponentsExample: React.FC = () => {
  const [htmlContent, setHtmlContent] = useState('<p>Hello ${username},</p><p>Welcome to Polaris Tools!</p>');
  const [textContent, setTextContent] = useState('Hello ${username},\n\nWelcome to Polaris Tools!');

  // Example: EmailStatusBadge
  const StatusBadgeExample = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">EmailStatusBadge Examples</h3>
      <div className="flex flex-wrap gap-2">
        <EmailStatusBadge status="PENDING" />
        <EmailStatusBadge status="PROCESSING" />
        <EmailStatusBadge status="SENT" />
        <EmailStatusBadge status="FAILED" />
        <EmailStatusBadge status="RETRYING" />
      </div>
      <div className="flex flex-wrap gap-2">
        <EmailStatusBadge status="HARD_BOUNCE" type="suppression" />
        <EmailStatusBadge status="SOFT_BOUNCE" type="suppression" />
        <EmailStatusBadge status="COMPLAINT" type="suppression" />
      </div>
    </div>
  );

  // Example: EmailVerificationBanner
  const VerificationBannerExample = () => {
    const handleResend = async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
    };

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">EmailVerificationBanner Example</h3>
        <EmailVerificationBanner
          email="user@example.com"
          onResendVerification={handleResend}
          cooldownSeconds={60}
        />
      </div>
    );
  };

  // Example: EmailMetricsChart
  const MetricsChartExample = () => {
    const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');

    const sampleData = [
      { timestamp: '2024-01-01', label: '1月1日', sent: 120, failed: 5, bounced: 2 },
      { timestamp: '2024-01-02', label: '1月2日', sent: 150, failed: 3, bounced: 1 },
      { timestamp: '2024-01-03', label: '1月3日', sent: 180, failed: 7, bounced: 3 },
      { timestamp: '2024-01-04', label: '1月4日', sent: 200, failed: 4, bounced: 2 },
      { timestamp: '2024-01-05', label: '1月5日', sent: 170, failed: 6, bounced: 1 },
      { timestamp: '2024-01-06', label: '1月6日', sent: 190, failed: 2, bounced: 0 },
      { timestamp: '2024-01-07', label: '1月7日', sent: 210, failed: 5, bounced: 2 },
    ];

    const metrics = [
      { key: 'sent', name: '已发送', color: '#10b981' },
      { key: 'failed', name: '失败', color: '#ef4444' },
      { key: 'bounced', name: '退信', color: '#f59e0b' },
    ];

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">EmailMetricsChart Examples</h3>
        
        <EmailMetricsChart
          data={sampleData}
          metrics={metrics}
          chartType="line"
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          title="邮件发送趋势（折线图）"
          height={300}
        />

        <EmailMetricsChart
          data={sampleData}
          metrics={metrics}
          chartType="bar"
          title="邮件发送统计（柱状图）"
          height={300}
        />
      </div>
    );
  };

  // Example: EmailTemplateEditor
  const TemplateEditorExample = () => {
    const variables = ['username', 'email', 'verificationLink', 'resetLink'];

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">EmailTemplateEditor Example</h3>
        <div className="h-[500px]">
          <EmailTemplateEditor
            htmlContent={htmlContent}
            textContent={textContent}
            variables={variables}
            onHtmlChange={setHtmlContent}
            onTextChange={setTextContent}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
        Email Components Examples
      </h1>

      <StatusBadgeExample />
      <VerificationBannerExample />
      <MetricsChartExample />
      <TemplateEditorExample />
    </div>
  );
};
