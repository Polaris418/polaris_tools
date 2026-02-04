import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Icon } from '../components/Icon';

type Section = {
  title: string;
  paragraphs?: string[];
  list?: string[];
  subsections?: { subtitle: string; paragraphs?: string[]; list?: string[] }[];
  contact?: { email: string; address: string };
};

const privacyContent: Record<'zh' | 'en', Section[]> = {
  zh: [
    {
      title: '1. 我们收集的信息',
      paragraphs: [
        '我们可能收集您在使用北极星工具箱时主动提供的个人信息（如邮箱、昵称），以及系统自动收集的设备与日志信息（如 IP、浏览器类型、访问时间）。'
      ]
    },
    {
      title: '2. 信息的使用',
      list: [
        '提供和维护服务功能（账户、验证、通知等）',
        '改进产品体验与性能',
        '安全风控与滥用检测',
        '在获得授权的前提下发送服务通知或营销邮件'
      ]
    },
    {
      title: '3. 信息的共享与披露',
      paragraphs: [
        '除非获得您的明确同意，或基于法律法规、执法要求、保护用户或公众安全的必要，我们不会向第三方出售或出租您的个人信息。'
      ]
    },
    {
      title: '4. 数据存储与安全',
      paragraphs: [
        '我们采用加密、访问控制等措施保护数据安全，但任何网络传输或存储都无法保证 100% 安全，请您理解并注意账户保护。'
      ]
    },
    {
      title: '5. 您的权利',
      list: [
        '访问、更正或删除您的个人信息',
        '撤回同意或调整通信偏好',
        '在支持的情况下导出数据副本'
      ]
    },
    {
      title: '6. Cookie 与本地存储',
      paragraphs: [
        '我们使用 Cookie 或本地存储以维持会话、记住偏好并进行统计分析。您可在浏览器中限制或清除，但可能影响部分功能。'
      ]
    },
    {
      title: '7. 未成年人保护',
      paragraphs: [
        '本服务面向年满 13 周岁的用户。若您未满 13 周岁，请在监护人同意与指导下使用本服务。'
      ]
    },
    {
      title: '8. 政策更新',
      paragraphs: [
        '当隐私政策有重大变更时，我们会通过站内通知或邮件告知。更新后继续使用服务即表示您接受新的政策。'
      ]
    },
    {
      title: '9. 联系我们',
      paragraphs: ['如有隐私相关问题或请求，请联系我们：'],
      contact: {
        email: 'support@polaristools.online',
        address: '北极星工具箱隐私团队'
      }
    }
  ],
  en: [
    {
      title: '1. Information We Collect',
      paragraphs: [
        'We may collect personal information you provide (e.g., email, nickname) and device/log data (e.g., IP, browser, access time) generated while using Polaris Tools.'
      ]
    },
    {
      title: '2. How We Use Information',
      list: [
        'Provide and maintain services (accounts, verification, notifications, etc.)',
        'Improve product experience and performance',
        'Security, fraud and abuse detection',
        'Send service notices or marketing emails with your consent'
      ]
    },
    {
      title: '3. Sharing & Disclosure',
      paragraphs: [
        'We do not sell or rent your personal data to third parties. We may share data only with your consent or when required by law, enforcement, or to protect users and the public.'
      ]
    },
    {
      title: '4. Data Storage & Security',
      paragraphs: [
        'We use encryption and access controls to protect data, but no method is 100% secure. Please keep your account safe and understand the inherent risks.'
      ]
    },
    {
      title: '5. Your Rights',
      list: [
        'Access, correct, or delete your personal data',
        'Withdraw consent or adjust communication preferences',
        'Export a copy of your data when supported'
      ]
    },
    {
      title: '6. Cookies & Local Storage',
      paragraphs: [
        'We use cookies/local storage to maintain sessions, remember preferences, and perform analytics. You can restrict or clear them in your browser, which may affect functionality.'
      ]
    },
    {
      title: '7. Children’s Privacy',
      paragraphs: [
        'The service is intended for users aged 13 or older. If you are under 13, please use the service with guardian consent and supervision.'
      ]
    },
    {
      title: '8. Policy Updates',
      paragraphs: [
        'We will notify you via in-app notices or email when this policy changes materially. Continuing to use the service after updates indicates acceptance.'
      ]
    },
    {
      title: '9. Contact Us',
      paragraphs: ['For privacy-related questions or requests, contact us:'],
      contact: {
        email: 'support@polaristools.online',
        address: 'Polaris Tools Privacy Team'
      }
    }
  ]
};

export const Privacy: React.FC = () => {
  const { language, t } = useAppContext();
  const langKey = language === 'zh' ? 'zh' : 'en';
  const content = privacyContent[langKey];
  const lastUpdated = langKey === 'zh' ? '2026年2月4日' : 'February 4, 2026';

  return (
    <div className="fixed inset-0 overflow-y-auto bg-slate-50 dark:bg-background-dark">
      {/* Header */}
      <header className="bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-border-dark sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <a href="/" className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-4">
            <Icon name="arrow_back" />
            <span>{t('common.back_home')}</span>
          </a>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            {t('privacy.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t('privacy.last_updated', { date: lastUpdated })}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 pb-20">
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-8 space-y-8">
          {content.map((section, idx) => (
            <section key={idx}>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{section.title}</h2>
              {section.paragraphs?.map((p, i) => (
                <p key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">{p}</p>
              ))}
              {section.list && (
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-1">
                  {section.list.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
              {section.subsections?.map((sub, i) => (
                <div key={i} className="mt-4 space-y-2">
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{sub.subtitle}</h3>
                  {sub.paragraphs?.map((p, j) => (
                    <p key={j} className="text-slate-700 dark:text-slate-300 leading-relaxed">{p}</p>
                  ))}
                  {sub.list && (
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 ml-1">
                      {sub.list.map((item, j) => <li key={j}>{item}</li>)}
                    </ul>
                  )}
                </div>
              ))}
              {section.contact && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong>{t('privacy.contact.email_label')}：</strong>{' '}
                    <a href={`mailto:${section.contact.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                      {section.contact.email}
                    </a>
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 mt-2">
                    <strong>{t('privacy.contact.address_label')}：</strong> {section.contact.address}
                  </p>
                </div>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
};
