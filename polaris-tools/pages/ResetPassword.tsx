import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { VerificationCodeInput } from '../components/VerificationCodeInput';
import { apiClient, ApiError } from '../api/client';

type ResetStep = 'email' | 'code' | 'password';

export const ResetPassword: React.FC = () => {
  const { t } = useAppContext();
  const navigate = useNavigate();

  // 当前流程步骤
  const [step, setStep] = useState<ResetStep>('email');

  // 表单状态
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI 状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 倒计时状态
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [expirySeconds, setExpirySeconds] = useState(0);

  // 重发按钮倒计时
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  // 验证码过期倒计时
  useEffect(() => {
    if (expirySeconds > 0) {
      const timer = setTimeout(() => setExpirySeconds(expirySeconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [expirySeconds]);

  // 将秒格式化为 MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Handle send reset code
   * Requirements: 需求5, 需求15
   */
  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 校验邮箱
    if (!email) {
      setError(t('reset.error.email_required'));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('reset.error.email_invalid'));
      return;
    }

    setLoading(true);

    try {
      // Call API to send reset verification code
      const result = await apiClient.request<{ cooldownSeconds: number; expiresIn: number }>(
        '/api/v1/auth/password/send-reset-code',
        {
          method: 'POST',
          body: JSON.stringify({ email, purpose: 'RESET' }),
        }
      );

      if (result.data) {
        setCooldownSeconds(result.data.cooldownSeconds || 60);
        setExpirySeconds(result.data.expiresIn || 600);
        setStep('code');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('reset.send_code_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle resend reset code
   * Requirements: 需求15
   */
  const handleResendResetCode = async () => {
    if (cooldownSeconds > 0) return;
    
    setError('');
    setLoading(true);

    try {
      const result = await apiClient.request<{ cooldownSeconds: number; expiresIn: number }>(
        '/api/v1/auth/password/send-reset-code',
        {
          method: 'POST',
          body: JSON.stringify({ email, purpose: 'RESET' }),
        }
      );

      if (result.data) {
        setCooldownSeconds(result.data.cooldownSeconds || 60);
        setExpirySeconds(result.data.expiresIn || 600);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('reset.send_code_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle verification code complete
   * Requirements: 需求15
   */
  const handleCodeComplete = (code: string) => {
    setVerificationCode(code);
  };

  /**
   * Handle verify reset code
   * Requirements: 需求5, 需求15
   */
  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 校验验证码
    if (!verificationCode || verificationCode.length !== 6) {
      setError(t('reset.error.code_required'));
      return;
    }

    setLoading(true);

    try {
      // Call API to verify reset code
      const result = await apiClient.request<{ resetToken: string; expiresIn: number }>(
        '/api/v1/auth/password/verify-code',
        {
          method: 'POST',
          body: JSON.stringify({
            email,
            code: verificationCode,
            purpose: 'RESET',
          }),
        }
      );

      if (result.data) {
        setResetToken(result.data.resetToken);
        setStep('password');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('reset.verify_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle reset password
   * Requirements: 需求5, 需求15
   */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 校验密码
    if (!newPassword || !confirmPassword) {
      setError(t('reset.error.fields_required'));
      return;
    }

    if (newPassword.length < 8) {
      setError(t('reset.error.password_length'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('reset.error.password_mismatch'));
      return;
    }

    setLoading(true);

    try {
      // Call API to reset password
      await apiClient.request<void>(
        '/api/v1/auth/password/reset',
        {
          method: 'POST',
          body: JSON.stringify({
            resetToken,
            newPassword,
          }),
        }
      );

      // Show success message
      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('reset.reset_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-[#020617] transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-2xl shadow-xl border border-slate-200 dark:border-border-dark p-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="size-12 bg-amber-500 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-amber-500/20">
            <Icon name="lock_reset" className="text-[24px]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('reset.title')}
          </h2>
          <p className="text-slate-500 dark:text-text-secondary text-sm mt-2">
            {step === 'email' && t('reset.email_placeholder')}
            {step === 'code' && t('reset.step.code')}
            {step === 'password' && t('reset.step.password')}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <Icon name="error" className="text-[20px]" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
            <Icon name="check_circle" className="text-[20px]" />
            <span>{t('reset.success')}</span>
          </div>
        )}

        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {/* Step 1 */}
            <div className="flex flex-col items-center flex-1">
              <div className={`size-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                step === 'email' 
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' 
                  : 'bg-emerald-500 text-white'
              }`}>
                {step === 'email' ? '1' : <Icon name="check" className="text-[18px]" />}
              </div>
              <span className="text-xs mt-2 text-slate-600 dark:text-slate-400">{t('reset.step.email')}</span>
            </div>

            {/* Connector */}
            <div className={`h-0.5 flex-1 mx-2 transition-colors ${
              step !== 'email' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
            }`} />

            {/* Step 2 */}
            <div className="flex flex-col items-center flex-1">
              <div className={`size-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                step === 'code' 
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' 
                  : step === 'password'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {step === 'password' ? <Icon name="check" className="text-[18px]" /> : '2'}
              </div>
              <span className="text-xs mt-2 text-slate-600 dark:text-slate-400">{t('reset.step.code')}</span>
            </div>

            {/* Connector */}
            <div className={`h-0.5 flex-1 mx-2 transition-colors ${
              step === 'password' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
            }`} />

            {/* Step 3 */}
            <div className="flex flex-col items-center flex-1">
              <div className={`size-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                step === 'password' 
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' 
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                3
              </div>
              <span className="text-xs mt-2 text-slate-600 dark:text-slate-400">{t('reset.step.password')}</span>
            </div>
          </div>
        </div>

        {/* Step content */}
        {step === 'email' && (
          /* Step 1: Input email and send code */
          <form className="space-y-5" onSubmit={handleSendResetCode}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {t('reset.email_label')}
              </label>
              <div className="relative">
                <Icon name="mail" className="absolute left-3 top-2.5 text-slate-400 text-[20px]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder={t('reset.email_placeholder')}
                  disabled={loading}
                  required
                />
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {t('reset.email_help')}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
            >
              {loading ? t('reset.send_loading') : t('reset.send')}
            </button>
          </form>
        )}

        {step === 'code' && (
          /* Step 2: Input verification code */
          <form className="space-y-5" onSubmit={handleVerifyResetCode}>
            {/* Back button */}
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setVerificationCode('');
                setError('');
              }}
              className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
            >
              <Icon name="arrow_back" className="text-[18px]" />
              <span>{t('reset.back_to_email')}</span>
            </button>

            {/* Email display */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{t('reset.email_display')}</span>
                <span className="text-slate-900 dark:text-white font-medium">{email}</span>
              </div>
            </div>

            {/* Verification code input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                验证码 *
              </label>
              <VerificationCodeInput
                length={6}
                onComplete={handleCodeComplete}
                onChange={setVerificationCode}
                error={!!error && error.includes('验证码')}
                errorMessage={error.includes('验证码') ? error : undefined}
                autoFocus
              />

              {/* Expiry countdown */}
              {expirySeconds > 0 && (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Icon name="schedule" className="text-[18px]" />
                  <span>{t('reset.code_expiry', { time: formatTime(expirySeconds) })}</span>
                </div>
              )}

              {/* Resend button */}
              <div className="mt-3 text-center">
                {cooldownSeconds > 0 ? (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t('reset.resend_wait', { seconds: cooldownSeconds })}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendResetCode}
                    disabled={loading}
                    className="text-sm text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('reset.resend')}
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
            >
              {loading ? t('reset.verify_loading') : t('reset.verify')}
            </button>
          </form>
        )}

        {step === 'password' && (
          /* Step 3: Input new password */
          <form className="space-y-5" onSubmit={handleResetPassword}>
            {/* Back button */}
            <button
              type="button"
              onClick={() => {
                setStep('code');
                setNewPassword('');
                setConfirmPassword('');
                setError('');
              }}
              className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
            >
              <Icon name="arrow_back" className="text-[18px]" />
              <span>{t('reset.back_prev')}</span>
            </button>

            {/* New password input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {t('reset.new_password_label')}
              </label>
              <div className="relative">
                <Icon name="lock" className="absolute left-3 top-2.5 text-slate-400 text-[20px]" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder={t('reset.new_password_placeholder')}
                  disabled={loading}
                  required
                  minLength={8}
                />
              </div>
            </div>

            {/* Confirm password input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {t('reset.confirm_password')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Icon name="lock" className="absolute left-3 top-2.5 text-slate-400 text-[20px]" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="请再次输入新密码"
                  disabled={loading}
                  required
                  minLength={8}
                />
              </div>
            </div>

            {/* Password requirements */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">密码要求：</p>
              <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                <li className="flex items-center gap-2">
                  <Icon name={newPassword.length >= 8 ? 'check_circle' : 'radio_button_unchecked'} className="text-[14px]" />
                  <span>{t('reset.requirement_length')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name={newPassword === confirmPassword && newPassword ? 'check_circle' : 'radio_button_unchecked'} className="text-[14px]" />
                  <span>{t('reset.requirement_match')}</span>
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
            >
              {loading ? t('reset.reset_loading') : t('reset.reset')}
            </button>
          </form>
        )}

        {/* Back to login link */}
        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {t('reset.remembered')}{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-amber-500 font-semibold hover:underline"
          >
            {t('reset.back_login')}
          </button>
        </div>
      </div>
    </div>
  );
};
