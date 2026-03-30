import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { VerificationCodeInput } from '../components/VerificationCodeInput';
import { apiClient, ApiError } from '../api/client';
import { tokenManager } from '../utils/tokenManager';
import { guestUsageManager } from '../utils/guestUsageManager';

export const Register: React.FC = () => {
  const { t, refreshUser, language, toggleLanguage } = useAppContext();
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  
  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
    nickname?: string;
  }>({});
  
  // Checking states
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // UI state
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  // Countdown state
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [expirySeconds, setExpirySeconds] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  // Countdown timer for code expiry
  useEffect(() => {
    if (expirySeconds > 0) {
      const timer = setTimeout(() => setExpirySeconds(expirySeconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [expirySeconds]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Validate email format
  const validateEmail = (email: string): string | null => {
    if (!email) {
      return t('register.error.email_required');
    }
    
    // Check for Chinese characters
    if (/[\u4e00-\u9fa5]/.test(email)) {
      return t('register.error.email_chinese');
    }
    
    // Basic email format check
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return t('register.error.email_invalid');
    }
    
    return null;
  };

  // Validate username
  const validateUsername = (username: string): string | null => {
    if (!username) {
      return t('register.error.username_required');
    }
    
    // Check for Chinese characters
    if (/[\u4e00-\u9fa5]/.test(username)) {
      return t('register.error.username_chinese');
    }
    
    // Only allow letters and numbers (8-20 characters)
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      return t('register.error.username_charset');
    }
    
    if (username.length < 8) {
      return t('register.error.username_min');
    }
    
    if (username.length > 20) {
      return t('register.error.username_max');
    }
    
    return null;
  };

  // Validate password
  const validatePassword = (password: string): string | null => {
    if (!password) {
      return t('register.error.password_required');
    }
    
    if (password.length < 8) {
      return t('register.error.password_min');
    }
    
    if (password.length > 32) {
      return t('register.error.password_max');
    }
    
    // Check for at least one letter and one number
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return t('register.error.password_complex');
    }
    
    return null;
  };

  // Validate nickname
  const validateNickname = (nickname: string): string | null => {
    if (!nickname) {
      return null; // Nickname is optional
    }
    
    if (nickname.length > 20) {
      return t('register.error.nickname_max');
    }
    
    return null;
  };

  // Check email availability with debounce
  const checkEmailAvailability = async (email: string) => {
    const emailError = validateEmail(email);
    if (emailError) {
      return; // Don't check if format is invalid
    }

    setCheckingEmail(true);
    try {
      const result = await apiClient.auth.checkEmailAvailable(email);
      if (result.data && !result.data.available) {
        setFieldErrors(prev => ({ ...prev, email: t('register.error.email_used') }));
      }
    } catch (err) {
      // Silently fail - don't show error for availability check
    } finally {
      setCheckingEmail(false);
    }
  };

  // Check username availability with debounce
  const checkUsernameAvailability = async (username: string) => {
    const usernameError = validateUsername(username);
    if (usernameError) {
      return; // Don't check if format is invalid
    }

    setCheckingUsername(true);
    try {
      const result = await apiClient.auth.checkUsernameAvailable(username);
      if (result.data && !result.data.available) {
        setFieldErrors(prev => ({ ...prev, username: t('register.error.username_used') }));
      }
    } catch (err) {
      // Silently fail - don't show error for availability check
    } finally {
      setCheckingUsername(false);
    }
  };

  // Handle send verification code
  const handleSendCode = async () => {
    setError('');
    setFieldErrors({});

    // Only validate email and username before sending code
    const emailError = validateEmail(email);
    const usernameError = validateUsername(username);
    const nicknameError = validateNickname(nickname);

    if (emailError || usernameError || nicknameError) {
      setFieldErrors({
        email: emailError || undefined,
        username: usernameError || undefined,
        nickname: nicknameError || undefined,
      });
      setError(t('register.error.fix_form'));
      return;
    }

    setLoading(true);

    try {
      // Call API to send verification code
      const result = await apiClient.auth.sendRegisterCode({ 
        email,
        purpose: 'REGISTER'
      });

      if (result.data) {
        setCodeSent(true);
        setStep('verify');
        setCooldownSeconds(result.data.cooldownSeconds || 60);
        setExpirySeconds(result.data.expiresIn || 600);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('register.send_code_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle resend verification code
  const handleResendCode = async () => {
    if (cooldownSeconds > 0) return;
    await handleSendCode();
  };

  // Handle verification code complete
  const handleCodeComplete = (code: string) => {
    setVerificationCode(code);
  };

  // Handle register with verification code
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Validate all fields
    if (!email || !verificationCode || !username || !password) {
      setError(t('register.error.required_fields'));
      return;
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      setFieldErrors({ password: passwordError });
      setError(passwordError);
      return;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: t('register.error.password_mismatch') });
      setError(t('register.error.password_mismatch'));
      return;
    }

    setLoading(true);

    try {
      // Call API to verify and register
      const result = await apiClient.auth.verifyRegister({
        email,
        code: verificationCode,
        username,
        password,
        nickname: nickname || username,
      });

      if (result.data && result.data.token && result.data.refreshToken && result.data.user) {
        // Store token in API client
        apiClient.setToken(result.data.token);
        
        // Store tokens in localStorage
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('refreshToken', result.data.refreshToken);
        
        // Store user data to localStorage for persistence
        localStorage.setItem('user', JSON.stringify(result.data.user));
        
        // Store rememberMe state (default to false for registration)
        localStorage.setItem('rememberMe', 'false');
        
        // Start TokenManager for auto-refresh
        tokenManager.setToken(result.data.token, result.data.refreshToken);
        
        // Clear guest usage records
        guestUsageManager.clear();
        
        // Refresh user state in AppContext
        await refreshUser();
        
        // Navigate to dashboard
        navigate('/');
      } else {
        setError(t('register.error.response_incomplete'));
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('register.failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle back to input step
  const handleBackToInput = () => {
    setStep('input');
    setVerificationCode('');
    setError('');
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-[#020617] transition-colors duration-300">
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleLanguage}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
        >
          <Icon name="translate" className="text-[16px]" />
          <span>{t('common.switch_lang', { lang: language === 'zh' ? t('common.lang.en') : t('common.lang.zh') })}</span>
        </button>
      </div>
      <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-2xl shadow-xl border border-slate-200 dark:border-border-dark p-8 animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="size-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-emerald-500/20">
            <Icon name="person_add" className="text-[24px]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('auth.register.title')}
          </h2>
          <p className="text-slate-500 dark:text-text-secondary text-sm mt-2">
            {t('auth.register.subtitle')}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <Icon name="error" className="text-[20px]" />
            <span>{error}</span>
          </div>
        )}

        {step === 'input' ? (
          /* Step 1: Input email and user info */
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSendCode(); }}>
            {/* Email field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {t('register.email_label')}
              </label>
              <div className="relative">
                <Icon name="mail" className="absolute left-3 top-2.5 text-slate-400 text-[20px]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEmail(value);
                    if (fieldErrors.email) {
                      setFieldErrors({ ...fieldErrors, email: undefined });
                    }
                  }}
                  onBlur={() => {
                    if (email) {
                      checkEmailAvailability(email);
                    }
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border ${
                    fieldErrors.email
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm`}
                  placeholder={t('register.email_placeholder')}
                  required
                />
                {checkingEmail && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Icon name="error" className="text-[14px]" />
                  {fieldErrors.email}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('register.email_helper')}
              </p>
            </div>

            {/* Username field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {t('register.username_label')}
              </label>
              <div className="relative">
                <Icon name="badge" className="absolute left-3 top-2.5 text-slate-400 text-[20px]" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    const value = e.target.value;
                    setUsername(value);
                    if (fieldErrors.username) {
                      setFieldErrors({ ...fieldErrors, username: undefined });
                    }
                  }}
                  onBlur={() => {
                    if (username) {
                      checkUsernameAvailability(username);
                    }
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border ${
                    fieldErrors.username
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm`}
                  placeholder={t('register.username_placeholder')}
                  required
                />
                {checkingUsername && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              {fieldErrors.username && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Icon name="error" className="text-[14px]" />
                  {fieldErrors.username}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('register.username_helper')}
              </p>
            </div>

            {/* Nickname field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {t('register.nickname_label')}
              </label>
              <div className="relative">
                <Icon name="person" className="absolute left-3 top-2.5 text-slate-400 text-[20px]" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    if (fieldErrors.nickname) {
                      setFieldErrors({ ...fieldErrors, nickname: undefined });
                    }
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border ${
                    fieldErrors.nickname
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm`}
                  placeholder={t('register.nickname_placeholder')}
                />
              </div>
              {fieldErrors.nickname && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Icon name="error" className="text-[14px]" />
                  {fieldErrors.nickname}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('register.nickname_helper')}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
            >
              {loading ? t('register.send_code_loading') : t('register.send_code')}
            </button>
          </form>
        ) : (
          /* Step 2: Verify code and complete registration */
          <form className="space-y-5" onSubmit={handleRegister}>
            {/* Back button */}
            <button
              type="button"
              onClick={handleBackToInput}
              className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
            >
              <Icon name="arrow_back" className="text-[18px]" />
              <span>{t('register.back_edit')}</span>
            </button>

            {/* Info display */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">{t('register.info_email')}</span>
                <span className="text-slate-900 dark:text-white font-medium">{email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">{t('register.info_username')}</span>
                <span className="text-slate-900 dark:text-white font-medium">{username}</span>
              </div>
            </div>

            {/* Verification code input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                {t('register.code_label')}
              </label>
              <VerificationCodeInput
                length={6}
                onComplete={handleCodeComplete}
                onChange={setVerificationCode}
                error={!!error}
                errorMessage={error || undefined}
                autoFocus
              />

              {/* Expiry countdown */}
              {expirySeconds > 0 && (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Icon name="schedule" className="text-[18px]" />
                  <span>{t('register.code_expiry', { time: formatTime(expirySeconds) })}</span>
                </div>
              )}

              {/* Resend button */}
              <div className="mt-3 text-center">
                {cooldownSeconds > 0 ? (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t('register.resend_wait', { seconds: cooldownSeconds })}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-sm text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('register.resend')}
                  </button>
                )}
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {t('register.password_label')}
              </label>
              <div className="relative">
                <Icon name="lock" className="absolute left-3 top-2.5 text-slate-400 text-[20px]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors({ ...fieldErrors, password: undefined });
                    }
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border ${
                    fieldErrors.password
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm`}
                  placeholder={t('register.password_placeholder')}
                  required
                  minLength={8}
                />
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Icon name="error" className="text-[14px]" />
                  {fieldErrors.password}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('register.password_helper')}
              </p>
            </div>

            {/* Confirm Password field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {t('register.confirm_password')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Icon name="lock" className="absolute left-3 top-2.5 text-slate-400 text-[20px]" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                    }
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border ${
                    fieldErrors.confirmPassword
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-slate-200 dark:border-slate-700'
                  } rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm`}
                  placeholder={t('register.confirm_password')}
                  required
                />
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Icon name="error" className="text-[14px]" />
                  {fieldErrors.confirmPassword}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('register.confirm_password_hint')}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6 || !password || !confirmPassword}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
            >
              {loading ? t('register.register_loading') : t('auth.submit.register')}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {t('auth.has_account')}{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-emerald-500 font-semibold hover:underline"
          >
            {t('auth.link.signin')}
          </button>
        </div>
      </div>
    </div>
  );
};
