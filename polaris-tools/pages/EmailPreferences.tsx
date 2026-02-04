import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { apiClient } from '../api/client';

interface EmailPreference {
  emailType: string;
  subscribed: boolean;
  updatedAt: string;
}

interface EmailHistory {
  id: number;
  emailType: string;
  subject: string;
  sentAt: string;
  status: string;
}

export const EmailPreferences: React.FC = () => {
  const { user, showToast, t, navigate } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    SYSTEM_NOTIFICATION: true,
    MARKETING: false,
    PRODUCT_UPDATE: true,
  });
  const [history, setHistory] = useState<EmailHistory[]>([]);
  const [emailVerified, setEmailVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('login');
    }
  }, [user, navigate]);

  // Load preferences
  useEffect(() => {
    if (user) {
      loadPreferences();
      loadHistory();
      setEmailVerified(user.emailVerified || false);
    }
  }, [user]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await apiClient.request<EmailPreference[]>('/api/subscription/preferences');
      
      if (response.code === 200 && response.data) {
        const prefs: Record<string, boolean> = {};
        response.data.forEach((pref) => {
          prefs[pref.emailType] = pref.subscribed;
        });
        setPreferences(prefs);
      }
    } catch (error: any) {
      console.error('Failed to load preferences:', error);
      showToast(t('email.preferences.load_error') || 'Failed to load preferences', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await apiClient.request<EmailHistory[]>('/api/subscription/history');
      if (response.code === 200 && response.data) {
        setHistory(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load history:', error);
    }
  };

  const handleTogglePreference = (emailType: string) => {
    setPreferences((prev) => ({
      ...prev,
      [emailType]: !prev[emailType],
    }));
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      const response = await apiClient.request('/api/subscription/preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferences }),
      });

      if (response.code === 200) {
        showToast(t('email.preferences.save_success') || 'Preferences saved successfully', 'success');
      }
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      showToast(t('email.preferences.save_error') || 'Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;

    try {
      const response = await apiClient.request('/api/email/resend-verification', {
        method: 'POST',
      });

      if (response.code === 200) {
        showToast(t('email.verification.resend_success') || 'Verification email sent', 'success');
        setResendCooldown(60); // 60 seconds cooldown
      }
    } catch (error: any) {
      console.error('Failed to resend verification:', error);
      showToast(t('email.verification.resend_error') || 'Failed to send verification email', 'error');
    }
  };

  const getEmailTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      SYSTEM_NOTIFICATION: t('email.type.system_notification') || 'System Notifications',
      MARKETING: t('email.type.marketing') || 'Marketing Emails',
      PRODUCT_UPDATE: t('email.type.product_update') || 'Product Updates',
    };
    return labels[type] || type;
  };

  const getEmailTypeDescription = (type: string): string => {
    const descriptions: Record<string, string> = {
      SYSTEM_NOTIFICATION: t('email.type.system_notification_desc') || 'Important system updates and security alerts',
      MARKETING: t('email.type.marketing_desc') || 'Promotional offers and newsletters',
      PRODUCT_UPDATE: t('email.type.product_update_desc') || 'New features and product announcements',
    };
    return descriptions[type] || '';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (!user) {
    return null;
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 scrollbar-thin scrollbar-thumb-slate-700">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <div className="pb-4 md:pb-6 border-b border-slate-200 dark:border-border-dark">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            {t('email.preferences.title') || 'Email Preferences'}
          </h2>
          <p className="text-sm md:text-base text-slate-500 dark:text-text-secondary mt-2">
            {t('email.preferences.subtitle') || 'Manage your email subscriptions and verification status'}
          </p>
        </div>

        {/* Email Verification Status */}
        <section className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-4 md:p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Icon name="verified" className={emailVerified ? 'text-green-500' : 'text-amber-500'} />
            {t('email.verification.title') || 'Email Verification'}
          </h3>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-slate-900 dark:text-white mb-1">
                  {user.email}
                </p>
                <div className="flex items-center gap-2">
                  <Icon 
                    name={emailVerified ? 'check_circle' : 'warning'} 
                    className={`text-[18px] ${emailVerified ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}
                  />
                  <span className={`text-sm ${emailVerified ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {emailVerified 
                      ? (t('email.verification.verified') || 'Verified') 
                      : (t('email.verification.not_verified') || 'Not Verified')}
                  </span>
                </div>
              </div>

              {!emailVerified && (
                <button
                  onClick={handleResendVerification}
                  disabled={resendCooldown > 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                >
                  {resendCooldown > 0 
                    ? `${t('email.verification.resend_cooldown') || 'Resend'} (${resendCooldown}s)`
                    : (t('email.verification.resend') || 'Resend Verification Email')}
                </button>
              )}
            </div>

            {!emailVerified && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {t('email.verification.warning') || 'Please verify your email address to receive important notifications.'}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Subscription Preferences */}
        <section className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-4 md:p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Icon name="mail" className="text-indigo-500" />
            {t('email.preferences.subscription_title') || 'Email Subscriptions'}
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Icon name="hourglass_empty" className="text-2xl text-slate-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(preferences).map(([emailType, subscribed]) => (
                <div key={emailType} className="flex items-start justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-slate-900 dark:text-white mb-1">
                      {getEmailTypeLabel(emailType)}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {getEmailTypeDescription(emailType)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleTogglePreference(emailType)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex-shrink-0 ${
                      subscribed ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    aria-label={`Toggle ${getEmailTypeLabel(emailType)}`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${
                        subscribed ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    ></div>
                  </button>
                </div>
              ))}

              <div className="pt-4">
                <button
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Icon name="hourglass_empty" className="text-[18px] animate-spin" />
                      {t('common.saving') || 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Icon name="save" className="text-[18px]" />
                      {t('common.save') || 'Save Preferences'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Subscription History */}
        <section className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-4 md:p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Icon name="history" className="text-purple-500" />
            {t('email.preferences.history_title') || 'Email History'}
          </h3>

          {history.length === 0 ? (
            <div className="text-center py-8">
              <Icon name="inbox" className="text-4xl text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-slate-500 dark:text-slate-400">
                {t('email.preferences.no_history') || 'No email history yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <Icon name="mail" className="text-slate-400 dark:text-slate-500 text-[20px] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {item.subject}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {getEmailTypeLabel(item.emailType)}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(item.sentAt)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                      item.status === 'SENT'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
