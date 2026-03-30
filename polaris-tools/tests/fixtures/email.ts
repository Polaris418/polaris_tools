export const mockEmailTemplate = {
  id: 1,
  code: 'WELCOME',
  name: '欢迎邮件模板',
  subject: '欢迎使用 Polaris Tools',
  htmlContent: '<p>你好 ${username}，欢迎加入！</p>',
  textContent: '你好 ${username}，欢迎加入！',
  language: 'zh-CN',
  enabled: true,
  updatedAt: '2026-01-01T00:00:00Z',
};

export const mockEmailLog = {
  id: 1,
  recipient: 'user@example.com',
  subject: '欢迎使用 Polaris Tools',
  status: 'SENT',
  provider: 'resend',
  messageId: 'msg_123',
  sentAt: '2026-01-01T00:00:00Z',
};

export const mockEmailMetrics = {
  totalSent: 100,
  totalFailed: 3,
  totalPending: 5,
  successRate: 0.97,
};
