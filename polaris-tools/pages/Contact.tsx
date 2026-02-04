/**
 * Contact Page - 联系我们页面
 */

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Icon } from '../components/Icon';

export const Contact: React.FC = () => {
  const { t, user } = useAppContext();

  const [formData, setFormData] = useState({
    name: user?.nickname || user?.username || '',
    email: user?.email || '',
    subject: '',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));

    setSubmitted(true);
    setSubmitting(false);

    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        name: user?.nickname || user?.username || '',
        email: user?.email || '',
        subject: '',
        message: '',
      });
    }, 3000);
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-slate-50 dark:bg-background-dark">
      {/* Header */}
      <header className="bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-border-dark sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <a href="/" className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-4">
            <Icon name="arrow_back" />
            <span>{t('contact.back_home')}</span>
          </a>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            {t('contact.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t('contact.subtitle')}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 pb-20">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                {t('contact.info.title')}
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="size-10 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="email" className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                      {t('contact.email')}
                    </h3>
                    <a href="mailto:support@polaristools.online" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                      support@polaristools.online
                    </a>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {t('contact.email_response')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="size-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="help" className="text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                      {t('contact.help_center')}
                    </h3>
                    <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                      {t('contact.help_center_link')}
                    </a>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {t('contact.help_center_desc')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="size-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="schedule" className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                      {t('contact.business_hours')}
                    </h3>
                    <p className="text-slate-700 dark:text-slate-300">
                      {t('contact.business_hours_days')}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t('contact.business_hours_time')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                {t('contact.tip_title')}
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {t('contact.tip_desc')}
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              {t('contact.form.title')}
            </h2>

            {submitted ? (
              <div className="py-12 text-center">
                <div className="size-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="check_circle" className="text-3xl text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {t('contact.form.success')}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {t('contact.form.success_desc')}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t('contact.form.name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 dark:border-border-dark rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={t('contact.form.name_placeholder')}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t('contact.form.email')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 dark:border-border-dark rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={t('contact.form.email_placeholder')}
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t('contact.form.subject')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 dark:border-border-dark rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">{t('contact.form.subject_placeholder')}</option>
                    <option value="general">{t('contact.form.subject_general')}</option>
                    <option value="technical">{t('contact.form.subject_technical')}</option>
                    <option value="billing">{t('contact.form.subject_billing')}</option>
                    <option value="feature">{t('contact.form.subject_feature')}</option>
                    <option value="bug">{t('contact.form.subject_bug')}</option>
                    <option value="other">{t('contact.form.subject_other')}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t('contact.form.message')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-border-dark rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    placeholder={t('contact.form.message_placeholder')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Icon name="hourglass_empty" className="animate-spin" />
                      {t('contact.form.sending')}
                    </>
                  ) : (
                    <>
                      <Icon name="send" />
                      {t('contact.form.send')}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
