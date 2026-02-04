/**
 * Terms of Service Page - 服务条款页面
 */

import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Icon } from '../components/Icon';

const zhContent = [
  {
    title: '1. 服务条款的接受',
    paragraphs: [
      '欢迎使用北极星工具箱。通过访问或使用我们的服务，您同意受本服务条款的约束。如果您不同意这些条款，请不要使用我们的服务。'
    ]
  },
  {
    title: '2. 服务说明',
    paragraphs: [
      '北极星工具箱提供在线工具集合，包括但不限于：'
    ],
    list: [
      '文本处理工具（字数统计、大小写转换等）',
      '编码转换工具（Base64、URL编码等）',
      '开发工具（UUID生成、时间戳转换等）',
      '文档转换工具（Markdown转Word等）',
      '其他实用工具'
    ]
  },
  {
    title: '3. 用户账户',
    subsections: [
      {
        subtitle: '3.1 账户注册',
        list: [
          '您必须提供准确、完整的注册信息',
          '您有责任维护账户密码的安全性',
          '您对账户下的所有活动负责',
          '您必须年满13岁才能注册账户'
        ]
      },
      {
        subtitle: '3.2 账户安全',
        list: [
          '请勿与他人共享您的账户凭据',
          '如发现未经授权的访问，请立即通知我们',
          '我们保留暂停或终止可疑账户的权利'
        ]
      }
    ]
  },
  {
    title: '4. 使用规则',
    paragraphs: ['使用我们的服务时，您同意不会：'],
    list: [
      '违反任何适用的法律或法规',
      '侵犯他人的知识产权或隐私权',
      '上传恶意软件、病毒或有害代码',
      '进行未经授权的访问或破坏服务',
      '使用自动化工具过度访问服务（爬虫、机器人等）',
      '冒充他人或虚假陈述与他人的关系',
      '骚扰、威胁或伤害其他用户',
      '用于任何非法或未经授权的目的'
    ]
  },
  {
    title: '5. 订阅和付费',
    subsections: [
      {
        subtitle: '5.1 订阅计划',
        paragraphs: ['我们提供多种订阅计划：'],
        list: ['免费版：基础功能，有使用限制', '专业版：完整功能，更高的使用限额', '企业版：定制功能，无限使用']
      },
      {
        subtitle: '5.2 付费和退款',
        list: [
          '订阅费用按月或按年收取',
          '所有费用均不含税，税费由用户承担',
          '订阅自动续费，除非您取消',
          '退款政策：购买后7天内可申请全额退款'
        ]
      }
    ]
  },
  {
    title: '6. 知识产权',
    paragraphs: [
      '6.1 我们的权利：北极星工具箱的所有内容、功能和特性均为北极星工具箱或其内容提供商的财产，受中国和国际版权法保护。',
      '6.2 您的内容：您保留对上传到服务的内容的所有权利。通过上传内容，您授予我们使用、存储和处理该内容以提供服务的许可。',
      '6.3 许可限制：除非另有明确授权，您不得复制、修改、分发、出售或出租服务的任何部分，也不得对软件进行反向工程或尝试提取源代码。'
    ]
  },
  {
    title: '7. 免责声明',
    paragraphs: [
      '7.1 服务按"原样"提供：我们的服务按"原样"和"可用"基础提供，不提供任何明示或暗示的保证，包括但不限于适销性、特定用途适用性和非侵权的保证。',
      '7.2 不保证：我们不保证服务将不间断、及时、安全或无错误。我们不保证使用服务获得的结果准确或可靠。',
      '7.3 第三方链接：服务可能包含第三方网站或服务的链接。我们不对这些第三方的内容、隐私政策或做法负责。'
    ]
  },
  {
    title: '8. 责任限制',
    paragraphs: [
      '在法律允许的最大范围内，北极星工具箱及其供应商和许可方不对任何间接、附带、特殊、后果性或惩罚性损害负责，包括但不限于利润损失、数据丢失、使用损失或其他无形损失，即使我们已被告知此类损害的可能性。我们的总责任不超过您在过去12个月内支付给我们的金额。'
    ]
  },
  {
    title: '9. 赔偿',
    paragraphs: [
      '您同意赔偿、辩护并使北极星工具箱及其关联公司、高级职员、代理人、员工和合作伙伴免受因您使用服务、违反本条款或侵犯任何第三方权利而产生的任何索赔、损害、义务、损失、责任、成本或债务以及费用（包括但不限于律师费）的损害。'
    ]
  },
  {
    title: '10. 服务变更和终止',
    paragraphs: [
      '10.1 服务变更：我们保留随时修改或中断服务（或其任何部分）的权利，无论是否通知。我们不对您或任何第三方因服务的任何修改、暂停或中断承担责任。',
      '10.2 账户终止：我们可能因任何原因终止或暂停您的账户和访问权限，包括但不限于违反本条款。终止后，您使用服务的权利将立即停止。'
    ]
  },
  {
    title: '11. 适用法律',
    paragraphs: [
      '本条款受中华人民共和国法律管辖并按其解释。因本条款引起的或与之相关的任何争议应提交至我们所在地有管辖权的法院解决。'
    ]
  },
  {
    title: '12. 条款变更',
    paragraphs: [
      '我们保留随时修改本条款的权利。重大变更时，我们会通过邮件或网站通知您。变更生效后继续使用服务即表示您接受修改后的条款。'
    ]
  },
  {
    title: '13. 联系我们',
    paragraphs: [
      '如果您对本服务条款有任何疑问，请通过以下方式联系我们：'
    ],
    contact: {
      email: 'support@polaristools.online',
      address: '北极星工具箱法务团队'
    }
  }
];

const enContent = [
  {
    title: '1. Acceptance of Terms',
    paragraphs: [
      'Welcome to Polaris Tools. By accessing or using our services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.'
    ]
  },
  {
    title: '2. Service Description',
    paragraphs: [
      'Polaris Tools provides a collection of online tools, including but not limited to:'
    ],
    list: [
      'Text processing tools (word counter, case converter, etc.)',
      'Encoding conversion tools (Base64, URL encoding, etc.)',
      'Development tools (UUID generator, timestamp converter, etc.)',
      'Document conversion tools (Markdown to Word, etc.)',
      'Other utility tools'
    ]
  },
  {
    title: '3. User Accounts',
    subsections: [
      {
        subtitle: '3.1 Account Registration',
        list: [
          'You must provide accurate and complete registration information',
          'You are responsible for maintaining the security of your account password',
          'You are responsible for all activities under your account',
          'You must be at least 13 years old to register an account'
        ]
      },
      {
        subtitle: '3.2 Account Security',
        list: [
          'Do not share your account credentials with others',
          'Notify us immediately if you discover unauthorized access',
          'We reserve the right to suspend or terminate suspicious accounts'
        ]
      }
    ]
  },
  {
    title: '4. Usage Rules',
    paragraphs: ['When using our services, you agree not to:'],
    list: [
      'Violate any applicable laws or regulations',
      'Infringe on others’ intellectual property or privacy rights',
      'Upload malware, viruses, or harmful code',
      'Conduct unauthorized access or disrupt services',
      'Use automated tools to excessively access services (crawlers, bots, etc.)',
      'Impersonate others or misrepresent relationships with others',
      'Harass, threaten, or harm other users',
      'Use for any illegal or unauthorized purposes'
    ]
  },
  {
    title: '5. Subscriptions and Payments',
    subsections: [
      {
        subtitle: '5.1 Subscription Plans',
        paragraphs: ['We offer multiple subscription plans:'],
        list: ['Free: Basic features with usage limits', 'Pro: Full features with higher usage limits', 'Enterprise: Custom features with unlimited usage']
      },
      {
        subtitle: '5.2 Payments and Refunds',
        list: [
          'Subscription fees are charged monthly or annually',
          'All fees are exclusive of taxes, which are the user’s responsibility',
          'Subscriptions auto-renew unless you cancel',
          'Refund policy: Full refund available within 7 days of purchase'
        ]
      }
    ]
  },
  {
    title: '6. Intellectual Property',
    paragraphs: [
      '6.1 Our Rights: All content, features, and functionality of Polaris Tools are the property of Polaris Tools or its content providers and are protected by Chinese and international copyright laws.',
      '6.2 Your Content: You retain all rights to content you upload to the service. By uploading content, you grant us a license to use, store, and process that content to provide the service.',
      '6.3 License Restrictions: Unless explicitly authorized, you may not copy, modify, distribute, sell, or rent any part of the service, nor may you reverse engineer or attempt to extract source code.'
    ]
  },
  {
    title: '7. Disclaimers',
    paragraphs: [
      '7.1 Service Provided "As Is": Our services are provided on an "as is" and "as available" basis, without any warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.',
      '7.2 No Guarantees: We do not guarantee that the service will be uninterrupted, timely, secure, or error-free. We do not guarantee that results obtained from using the service will be accurate or reliable.',
      '7.3 Third-Party Links: The service may contain links to third-party websites or services. We are not responsible for the content, privacy policies, or practices of these third parties.'
    ]
  },
  {
    title: '8. Limitation of Liability',
    paragraphs: [
      'To the maximum extent permitted by law, Polaris Tools and its suppliers and licensors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data loss, loss of use, or other intangible losses, even if we have been advised of the possibility of such damages. Our total liability shall not exceed the amount you paid to us in the past 12 months.'
    ]
  },
  {
    title: '9. Indemnification',
    paragraphs: [
      'You agree to indemnify, defend, and hold harmless Polaris Tools and its affiliates, officers, agents, employees, and partners from any claims, damages, obligations, losses, liabilities, costs, or debts, and expenses (including but not limited to attorney’s fees) arising from your use of the service, violation of these terms, or infringement of any third-party rights.'
    ]
  },
  {
    title: '10. Service Changes and Termination',
    paragraphs: [
      '10.1 Service Changes: We reserve the right to modify or discontinue the service (or any part thereof) at any time, with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the service.',
      '10.2 Account Termination: We may terminate or suspend your account and access for any reason, including but not limited to violation of these terms. Upon termination, your right to use the service will immediately cease.'
    ]
  },
  {
    title: '11. Governing Law',
    paragraphs: [
      'These terms shall be governed by and construed in accordance with the laws of the People’s Republic of China. Any disputes arising from or related to these terms shall be submitted to the courts with jurisdiction in our location.'
    ]
  },
  {
    title: '12. Changes to Terms',
    paragraphs: [
      'We reserve the right to modify these terms at any time. For significant changes, we will notify you via email or website notice. Continued use of the service after changes take effect indicates your acceptance of the modified terms.'
    ]
  },
  {
    title: '13. Contact Us',
    paragraphs: [
      'If you have any questions about these Terms of Service, please contact us:'
    ],
    contact: {
      email: 'support@polaristools.online',
      address: 'Polaris Tools Legal Team'
    }
  }
];

export const Terms: React.FC = () => {
  const { language, t } = useAppContext();
  const isZh = language === 'zh';
  const content = isZh ? zhContent : enContent;

  return (
    <div className="fixed inset-0 overflow-y-auto bg-slate-50 dark:bg-background-dark">
      {/* Header */}
      <header className="bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-border-dark sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <a href="/" className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-4">
            <Icon name="arrow_back" />
            <span>{isZh ? '返回首页' : 'Back to Home'}</span>
          </a>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            {isZh ? '服务条款' : 'Terms of Service'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {isZh ? '最后更新：2026年2月4日' : 'Last Updated: February 4, 2026'}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 pb-20">
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-8 space-y-8">
          
          {isZh ? (
            <>
              {/* 中文版本 */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">1. 服务条款的接受</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  欢迎使用北极星工具箱。通过访问或使用我们的服务，您同意受本服务条款的约束。
                  如果您不同意这些条款，请不要使用我们的服务。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">2. 服务说明</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                  北极星工具箱提供在线工具集合，包括但不限于：
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-4">
                  <li>文本处理工具（字数统计、大小写转换等）</li>
                  <li>编码转换工具（Base64、URL编码等）</li>
                  <li>开发工具（UUID生成、时间戳转换等）</li>
                  <li>文档转换工具（Markdown转Word等）</li>
                  <li>其他实用工具</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">3. 用户账户</h2>
                <div className="space-y-4 text-slate-700 dark:text-slate-300">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">3.1 账户注册</h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>您必须提供准确、完整的注册信息</li>
                      <li>您有责任维护账户密码的安全性</li>
                      <li>您对账户下的所有活动负责</li>
                      <li>您必须年满13岁才能注册账户</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">3.2 账户安全</h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>请勿与他人共享您的账户凭据</li>
                      <li>如发现未经授权的访问，请立即通知我们</li>
                      <li>我们保留暂停或终止可疑账户的权利</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">4. 使用规则</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                  使用我们的服务时，您同意不会：
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-4">
                  <li>违反任何适用的法律或法规</li>
                  <li>侵犯他人的知识产权或隐私权</li>
                  <li>上传恶意软件、病毒或有害代码</li>
                  <li>进行未经授权的访问或破坏服务</li>
                  <li>使用自动化工具过度访问服务（爬虫、机器人等）</li>
                  <li>冒充他人或虚假陈述与他人的关系</li>
                  <li>骚扰、威胁或伤害其他用户</li>
                  <li>用于任何非法或未经授权的目的</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">5. 订阅和付费</h2>
                <div className="space-y-4 text-slate-700 dark:text-slate-300">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">5.1 订阅计划</h3>
                    <p className="mb-2">我们提供多种订阅计划：</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li><strong>免费版：</strong>基础功能，有使用限制</li>
                      <li><strong>专业版：</strong>完整功能，更高的使用限额</li>
                      <li><strong>企业版：</strong>定制功能，无限使用</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">5.2 付费和退款</h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>订阅费用按月或按年收取</li>
                      <li>所有费用均不含税，税费由用户承担</li>
                      <li>订阅自动续费，除非您取消</li>
                      <li>退款政策：购买后7天内可申请全额退款</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">6. 知识产权</h2>
                <div className="space-y-4 text-slate-700 dark:text-slate-300">
                  <p>
                    <strong>6.1 我们的权利：</strong>北极星工具箱的所有内容、功能和特性（包括但不限于文本、图形、
                    标志、图标、图像、音频剪辑、数字下载、数据编译和软件）均为北极星工具箱或其内容提供商的财产，
                    受中国和国际版权法保护。
                  </p>
                  <p>
                    <strong>6.2 您的内容：</strong>您保留对上传到服务的内容的所有权利。通过上传内容，
                    您授予我们使用、存储和处理该内容以提供服务的许可。
                  </p>
                  <p>
                    <strong>6.3 许可限制：</strong>除非另有明确授权，您不得复制、修改、分发、出售或出租
                    服务的任何部分，也不得对软件进行反向工程或尝试提取源代码。
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">7. 免责声明</h2>
                <div className="space-y-4 text-slate-700 dark:text-slate-300">
                  <p>
                    <strong>7.1 服务按"原样"提供：</strong>我们的服务按"原样"和"可用"基础提供，
                    不提供任何明示或暗示的保证，包括但不限于适销性、特定用途适用性和非侵权的保证。
                  </p>
                  <p>
                    <strong>7.2 不保证：</strong>我们不保证服务将不间断、及时、安全或无错误。
                    我们不保证使用服务获得的结果准确或可靠。
                  </p>
                  <p>
                    <strong>7.3 第三方链接：</strong>服务可能包含第三方网站或服务的链接。
                    我们不对这些第三方的内容、隐私政策或做法负责。
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">8. 责任限制</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  在法律允许的最大范围内，北极星工具箱及其供应商和许可方不对任何间接、附带、特殊、
                  后果性或惩罚性损害负责，包括但不限于利润损失、数据丢失、使用损失或其他无形损失，
                  即使我们已被告知此类损害的可能性。我们的总责任不超过您在过去12个月内支付给我们的金额。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">9. 赔偿</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  您同意赔偿、辩护并使北极星工具箱及其关联公司、高级职员、代理人、员工和合作伙伴
                  免受因您使用服务、违反本条款或侵犯任何第三方权利而产生的任何索赔、损害、义务、
                  损失、责任、成本或债务以及费用（包括但不限于律师费）的损害。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">10. 服务变更和终止</h2>
                <div className="space-y-4 text-slate-700 dark:text-slate-300">
                  <p>
                    <strong>10.1 服务变更：</strong>我们保留随时修改或中断服务（或其任何部分）的权利，
                    无论是否通知。我们不对您或任何第三方因服务的任何修改、暂停或中断承担责任。
                  </p>
                  <p>
                    <strong>10.2 账户终止：</strong>我们可能因任何原因终止或暂停您的账户和访问权限，
                    包括但不限于违反本条款。终止后，您使用服务的权利将立即停止。
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">11. 适用法律</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  本条款受中华人民共和国法律管辖并按其解释。因本条款引起的或与之相关的任何争议
                  应提交至我们所在地有管辖权的法院解决。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">12. 条款变更</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  我们保留随时修改本条款的权利。重大变更时，我们会通过邮件或网站通知您。
                  变更生效后继续使用服务即表示您接受修改后的条款。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">13. 联系我们</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  如果您对本服务条款有任何疑问，请通过以下方式联系我们：
                </p>
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong>邮箱：</strong> <a href="mailto:support@polaristools.online" className="text-indigo-600 dark:text-indigo-400 hover:underline">support@polaristools.online</a>
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 mt-2">
                    <strong>地址：</strong> 北极星工具箱法务团队
                  </p>
                </div>
              </section>
            </>
          ) : (
            <>
              {/* English Version */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  Welcome to Polaris Tools. By accessing or using our services, you agree to be bound by these Terms of Service.
                  If you do not agree to these terms, please do not use our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">2. Service Description</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                  Polaris Tools provides a collection of online tools, including but not limited to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-4">
                  <li>Text processing tools (word counter, case converter, etc.)</li>
                  <li>Encoding conversion tools (Base64, URL encoding, etc.)</li>
                  <li>Development tools (UUID generator, timestamp converter, etc.)</li>
                  <li>Document conversion tools (Markdown to Word, etc.)</li>
                  <li>Other utility tools</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">3. User Accounts</h2>
                <div className="space-y-4 text-slate-700 dark:text-slate-300">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">3.1 Account Registration</h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>You must provide accurate and complete registration information</li>
                      <li>You are responsible for maintaining the security of your account password</li>
                      <li>You are responsible for all activities under your account</li>
                      <li>You must be at least 13 years old to register an account</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">3.2 Account Security</h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Do not share your account credentials with others</li>
                      <li>Notify us immediately if you discover unauthorized access</li>
                      <li>We reserve the right to suspend or terminate suspicious accounts</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">4. Usage Rules</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                  When using our services, you agree not to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-4">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe on others' intellectual property or privacy rights</li>
                  <li>Upload malware, viruses, or harmful code</li>
                  <li>Conduct unauthorized access or disrupt services</li>
                  <li>Use automated tools to excessively access services (crawlers, bots, etc.)</li>
                  <li>Impersonate others or misrepresent relationships with others</li>
                  <li>Harass, threaten, or harm other users</li>
                  <li>Use for any illegal or unauthorized purposes</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">5. Subscriptions and Payments</h2>
                <div className="space-y-4 text-slate-700 dark:text-slate-300">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">5.1 Subscription Plans</h3>
                    <p className="mb-2">We offer multiple subscription plans:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li><strong>Free:</strong> Basic features with usage limits</li>
                      <li><strong>Pro:</strong> Full features with higher usage limits</li>
                      <li><strong>Enterprise:</strong> Custom features with unlimited usage</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">5.2 Payments and Refunds</h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Subscription fees are charged monthly or annually</li>
                      <li>All fees are exclusive of taxes, which are the user's responsibility</li>
                      <li>Subscriptions auto-renew unless you cancel</li>
                      <li>Refund policy: Full refund available within 7 days of purchase</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">6. Intellectual Property</h2>
                <div className="space-y-4 text-slate-700 dark:text-slate-300">
                  <p>
                    <strong>6.1 Our Rights:</strong> All content, features, and functionality of Polaris Tools 
                    (including but not limited to text, graphics, logos, icons, images, audio clips, digital downloads, 
                    data compilations, and software) are the property of Polaris Tools or its content providers and 
                    are protected by Chinese and international copyright laws.
                  </p>
                  <p>
                    <strong>6.2 Your Content:</strong> You retain all rights to content you upload to the service. 
                    By uploading content, you grant us a license to use, store, and process that content to provide the service.
                  </p>
                  <p>
                    <strong>6.3 License Restrictions:</strong> Unless explicitly authorized, you may not copy, modify, 
                    distribute, sell, or rent any part of the service, nor may you reverse engineer or attempt to extract 
                    source code from the software.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">7. Disclaimers</h2>
                <div className="space-y-4 text-slate-700 dark:text-slate-300">
                  <p>
                    <strong>7.1 Service Provided "As Is":</strong> Our services are provided on an "as is" and 
                    "as available" basis, without any warranties of any kind, either express or implied, including 
                    but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.
                  </p>
                  <p>
                    <strong>7.2 No Guarantees:</strong> We do not guarantee that the service will be uninterrupted, 
                    timely, secure, or error-free. We do not guarantee that results obtained from using the service 
                    will be accurate or reliable.
                  </p>
                  <p>
                    <strong>7.3 Third-Party Links:</strong> The service may contain links to third-party websites or services. 
                    We are not responsible for the content, privacy policies, or practices of these third parties.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">8. Limitation of Liability</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  To the maximum extent permitted by law, Polaris Tools and its suppliers and licensors shall not be 
                  liable for any indirect, incidental, special, consequential, or punitive damages, including but not 
                  limited to loss of profits, data loss, loss of use, or other intangible losses, even if we have been 
                  advised of the possibility of such damages. Our total liability shall not exceed the amount you paid 
                  to us in the past 12 months.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">9. Indemnification</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  You agree to indemnify, defend, and hold harmless Polaris Tools and its affiliates, officers, agents, 
                  employees, and partners from any claims, damages, obligations, losses, liabilities, costs, or debts, 
                  and expenses (including but not limited to attorney's fees) arising from your use of the service, 
                  violation of these terms, or infringement of any third-party rights.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">10. Service Changes and Termination</h2>
                <div className="space-y-4 text-slate-700 dark:text-slate-300">
                  <p>
                    <strong>10.1 Service Changes:</strong> We reserve the right to modify or discontinue the service 
                    (or any part thereof) at any time, with or without notice. We shall not be liable to you or any 
                    third party for any modification, suspension, or discontinuation of the service.
                  </p>
                  <p>
                    <strong>10.2 Account Termination:</strong> We may terminate or suspend your account and access 
                    for any reason, including but not limited to violation of these terms. Upon termination, your 
                    right to use the service will immediately cease.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">11. Governing Law</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  These terms shall be governed by and construed in accordance with the laws of the People's Republic of China. 
                  Any disputes arising from or related to these terms shall be submitted to the courts with jurisdiction 
                  in our location.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">12. Changes to Terms</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  We reserve the right to modify these terms at any time. For significant changes, we will notify you 
                  via email or website notice. Continued use of the service after changes take effect indicates your 
                  acceptance of the modified terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">13. Contact Us</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong>Email:</strong> <a href="mailto:support@polaristools.online" className="text-indigo-600 dark:text-indigo-400 hover:underline">support@polaristools.online</a>
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 mt-2">
                    <strong>Address:</strong> Polaris Tools Legal Team
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
