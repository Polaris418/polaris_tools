/**
 * Unit Tests: Email Components
 * Task 15.1 - 组件单元测试
 * 
 * Tests for email-related components:
 * - EmailTemplateEditor
 * - EmailMetricsChart
 * - EmailStatusBadge
 * - EmailVerificationBanner
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmailTemplateEditor } from '../components/EmailTemplateEditor';
import { EmailMetricsChart } from '../components/EmailMetricsChart';
import { EmailStatusBadge } from '../components/EmailStatusBadge';
import { EmailVerificationBanner } from '../components/EmailVerificationBanner';

describe('EmailTemplateEditor Component', () => {
  const mockOnHtmlChange = vi.fn();
  const mockOnTextChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with initial content', () => {
    render(
      <EmailTemplateEditor
        htmlContent="<p>Test HTML</p>"
        textContent="Test Text"
        onHtmlChange={mockOnHtmlChange}
        onTextChange={mockOnTextChange}
      />
    );

    expect(screen.getByText('HTML 内容')).toBeInTheDocument();
    expect(screen.getByText('纯文本内容')).toBeInTheDocument();
    expect(screen.getByText('预览')).toBeInTheDocument();
  });

  it('should switch between tabs', () => {
    render(
      <EmailTemplateEditor
        htmlContent="<p>Test HTML</p>"
        textContent="Test Text"
        onHtmlChange={mockOnHtmlChange}
        onTextChange={mockOnTextChange}
      />
    );

    const textTab = screen.getByText('纯文本内容');
    fireEvent.click(textTab);

    const textEditor = screen.getByPlaceholderText('输入纯文本内容...');
    expect(textEditor).toBeInTheDocument();
  });

  it('should call onHtmlChange when HTML content changes', () => {
    render(
      <EmailTemplateEditor
        htmlContent="<p>Test HTML</p>"
        textContent="Test Text"
        onHtmlChange={mockOnHtmlChange}
        onTextChange={mockOnTextChange}
      />
    );

    const htmlEditor = screen.getByPlaceholderText('输入 HTML 内容...');
    fireEvent.change(htmlEditor, { target: { value: '<p>New HTML</p>' } });

    expect(mockOnHtmlChange).toHaveBeenCalledWith('<p>New HTML</p>');
  });

  it('should call onTextChange when text content changes', () => {
    render(
      <EmailTemplateEditor
        htmlContent="<p>Test HTML</p>"
        textContent="Test Text"
        onHtmlChange={mockOnHtmlChange}
        onTextChange={mockOnTextChange}
      />
    );

    const textTab = screen.getByText('纯文本内容');
    fireEvent.click(textTab);

    const textEditor = screen.getByPlaceholderText('输入纯文本内容...');
    fireEvent.change(textEditor, { target: { value: 'New Text' } });

    expect(mockOnTextChange).toHaveBeenCalledWith('New Text');
  });

  it('should display variables when provided', () => {
    render(
      <EmailTemplateEditor
        htmlContent="<p>Test HTML</p>"
        textContent="Test Text"
        variables={['username', 'email', 'verificationCode']}
        onHtmlChange={mockOnHtmlChange}
        onTextChange={mockOnTextChange}
      />
    );

    expect(screen.getByText('可用变量：')).toBeInTheDocument();
    // Check for variables in the select dropdown
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getAllByText('username').length).toBeGreaterThan(0);
  });

  it('should enable variable insertion button when variable is selected', () => {
    render(
      <EmailTemplateEditor
        htmlContent="<p>Test HTML</p>"
        textContent="Test Text"
        variables={['username', 'email']}
        onHtmlChange={mockOnHtmlChange}
        onTextChange={mockOnTextChange}
      />
    );

    const select = screen.getByRole('combobox');
    const insertButton = screen.getByText('插入变量');

    expect(insertButton).toBeDisabled();

    fireEvent.change(select, { target: { value: 'username' } });
    expect(insertButton).not.toBeDisabled();
  });

  it('should be read-only when readOnly prop is true', () => {
    render(
      <EmailTemplateEditor
        htmlContent="<p>Test HTML</p>"
        textContent="Test Text"
        onHtmlChange={mockOnHtmlChange}
        onTextChange={mockOnTextChange}
        readOnly={true}
      />
    );

    const htmlEditor = screen.getByPlaceholderText('输入 HTML 内容...');
    expect(htmlEditor).toHaveAttribute('readonly');
  });

  it('should show preview with HTML content', () => {
    render(
      <EmailTemplateEditor
        htmlContent="<p>Preview Test</p>"
        textContent="Test Text"
        onHtmlChange={mockOnHtmlChange}
        onTextChange={mockOnTextChange}
      />
    );

    const previewTab = screen.getByText('预览');
    fireEvent.click(previewTab);

    expect(screen.getByText('Preview Test')).toBeInTheDocument();
  });
});

describe('EmailMetricsChart Component', () => {
  const mockData = [
    { timestamp: '2024-01-01T00:00:00Z', label: '00:00', sent: 100, failed: 5 },
    { timestamp: '2024-01-01T01:00:00Z', label: '01:00', sent: 150, failed: 3 },
    { timestamp: '2024-01-01T02:00:00Z', label: '02:00', sent: 120, failed: 8 },
  ];

  const mockMetrics = [
    { key: 'sent', name: '已发送', color: '#10b981' },
    { key: 'failed', name: '失败', color: '#ef4444' },
  ];

  it('should render chart with data', () => {
    render(
      <EmailMetricsChart
        data={mockData}
        metrics={mockMetrics}
        title="邮件发送趋势"
      />
    );

    expect(screen.getByText('邮件发送趋势')).toBeInTheDocument();
  });

  it('should render empty state when no data', () => {
    render(
      <EmailMetricsChart
        data={[]}
        metrics={mockMetrics}
        title="邮件发送趋势"
      />
    );

    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('should render time range buttons when onTimeRangeChange is provided', () => {
    const mockOnTimeRangeChange = vi.fn();

    render(
      <EmailMetricsChart
        data={mockData}
        metrics={mockMetrics}
        timeRange="7d"
        onTimeRangeChange={mockOnTimeRangeChange}
      />
    );

    expect(screen.getByText('24小时')).toBeInTheDocument();
    expect(screen.getByText('7天')).toBeInTheDocument();
    expect(screen.getByText('30天')).toBeInTheDocument();
    expect(screen.getByText('90天')).toBeInTheDocument();
  });

  it('should call onTimeRangeChange when time range button is clicked', () => {
    const mockOnTimeRangeChange = vi.fn();

    render(
      <EmailMetricsChart
        data={mockData}
        metrics={mockMetrics}
        timeRange="7d"
        onTimeRangeChange={mockOnTimeRangeChange}
      />
    );

    const button30d = screen.getByText('30天');
    fireEvent.click(button30d);

    expect(mockOnTimeRangeChange).toHaveBeenCalledWith('30d');
  });

  it('should highlight active time range', () => {
    render(
      <EmailMetricsChart
        data={mockData}
        metrics={mockMetrics}
        timeRange="7d"
        onTimeRangeChange={vi.fn()}
      />
    );

    const button7d = screen.getByText('7天');
    expect(button7d).toHaveClass('bg-primary');
  });
});

describe('EmailStatusBadge Component', () => {
  it('should render PENDING status correctly', () => {
    render(<EmailStatusBadge status="PENDING" />);
    expect(screen.getByText('待发送')).toBeInTheDocument();
  });

  it('should render PROCESSING status correctly', () => {
    render(<EmailStatusBadge status="PROCESSING" />);
    expect(screen.getByText('处理中')).toBeInTheDocument();
  });

  it('should render SENT status correctly', () => {
    render(<EmailStatusBadge status="SENT" />);
    expect(screen.getByText('已发送')).toBeInTheDocument();
  });

  it('should render FAILED status correctly', () => {
    render(<EmailStatusBadge status="FAILED" />);
    expect(screen.getByText('发送失败')).toBeInTheDocument();
  });

  it('should render RETRYING status correctly', () => {
    render(<EmailStatusBadge status="RETRYING" />);
    expect(screen.getByText('重试中')).toBeInTheDocument();
  });

  it('should render HARD_BOUNCE suppression reason correctly', () => {
    render(<EmailStatusBadge status="HARD_BOUNCE" type="suppression" />);
    expect(screen.getByText('硬退信')).toBeInTheDocument();
  });

  it('should render SOFT_BOUNCE suppression reason correctly', () => {
    render(<EmailStatusBadge status="SOFT_BOUNCE" type="suppression" />);
    expect(screen.getByText('软退信')).toBeInTheDocument();
  });

  it('should render COMPLAINT suppression reason correctly', () => {
    render(<EmailStatusBadge status="COMPLAINT" type="suppression" />);
    expect(screen.getByText('投诉')).toBeInTheDocument();
  });

  it('should apply correct color classes for success status', () => {
    const { container } = render(<EmailStatusBadge status="SENT" />);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('text-green-600');
    expect(badge).toHaveClass('bg-green-50');
  });

  it('should apply correct color classes for error status', () => {
    const { container } = render(<EmailStatusBadge status="FAILED" />);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('text-red-600');
    expect(badge).toHaveClass('bg-red-50');
  });
});

describe('EmailVerificationBanner Component', () => {
  const mockOnResendVerification = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with email address', () => {
    render(
      <EmailVerificationBanner
        email="test@example.com"
        onResendVerification={mockOnResendVerification}
      />
    );

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('尚未验证', { exact: false })).toBeInTheDocument();
  });

  it('should call onResendVerification when button is clicked', async () => {
    mockOnResendVerification.mockResolvedValue(undefined);

    render(
      <EmailVerificationBanner
        email="test@example.com"
        onResendVerification={mockOnResendVerification}
      />
    );

    const resendButton = screen.getByText('重新发送验证邮件');
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(mockOnResendVerification).toHaveBeenCalled();
    });
  });

  it('should show success message after resending', async () => {
    mockOnResendVerification.mockResolvedValue(undefined);

    render(
      <EmailVerificationBanner
        email="test@example.com"
        onResendVerification={mockOnResendVerification}
      />
    );

    const resendButton = screen.getByText('重新发送验证邮件');
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(screen.getByText('验证邮件已发送，请查收！')).toBeInTheDocument();
    });
  });

  it('should show error message when resending fails', async () => {
    mockOnResendVerification.mockRejectedValue(new Error('Network error'));

    render(
      <EmailVerificationBanner
        email="test@example.com"
        onResendVerification={mockOnResendVerification}
      />
    );

    const resendButton = screen.getByText('重新发送验证邮件');
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(screen.getByText('发送失败，请稍后重试')).toBeInTheDocument();
    });
  });

  it('should start cooldown after successful resend', async () => {
    mockOnResendVerification.mockResolvedValue(undefined);

    render(
      <EmailVerificationBanner
        email="test@example.com"
        onResendVerification={mockOnResendVerification}
        cooldownSeconds={60}
      />
    );

    const resendButton = screen.getByText('重新发送验证邮件');
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(screen.getByText(/重新发送 \(60s\)/)).toBeInTheDocument();
    });
  });

  it('should disable button during cooldown', async () => {
    mockOnResendVerification.mockResolvedValue(undefined);

    render(
      <EmailVerificationBanner
        email="test@example.com"
        onResendVerification={mockOnResendVerification}
      />
    );

    const resendButton = screen.getByText('重新发送验证邮件');
    fireEvent.click(resendButton);

    await waitFor(() => {
      const buttonWithCooldown = screen.getByText(/重新发送 \(/);
      expect(buttonWithCooldown).toBeDisabled();
    });
  });

  it('should hide banner when close button is clicked', () => {
    const { container } = render(
      <EmailVerificationBanner
        email="test@example.com"
        onResendVerification={mockOnResendVerification}
      />
    );

    const closeButton = screen.getByLabelText('关闭');
    fireEvent.click(closeButton);

    expect(container.firstChild).toBeNull();
  });

  it('should show loading state while resending', async () => {
    mockOnResendVerification.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(
      <EmailVerificationBanner
        email="test@example.com"
        onResendVerification={mockOnResendVerification}
      />
    );

    const resendButton = screen.getByText('重新发送验证邮件');
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(screen.getByText('发送中...')).toBeInTheDocument();
    });
  });
});
