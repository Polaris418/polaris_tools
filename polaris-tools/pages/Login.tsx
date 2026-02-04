import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { VerificationCodeInput } from '../components/VerificationCodeInput';
import { apiClient, ApiError } from '../api/client';
import type { UserLoginRequest, UserRegisterRequest } from '../types';

type FormMode = 'login' | 'register';
type LoginMethod = 'password' | 'code';

export const Login: React.FC = () => {
  const { t, login, navigate, language, toggleLanguage } = useAppContext();
  
  const [mode, setMode] = useState<FormMode>('login');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdminChoice, setShowAdminChoice] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<UserLoginRequest | null>(null);
  
  // Login form state
  const [loginForm, setLoginForm] = useState<UserLoginRequest>({
    username: '',
    password: '',
  });
  
  // Remember me state
  const [rememberMe, setRememberMe] = useState(false);
  
  // Verification code login state
  const [codeLoginEmail, setCodeLoginEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [expirySeconds, setExpirySeconds] = useState(0);
  
  // Register form state
  const [registerForm, setRegisterForm] = useState<UserRegisterRequest>({
    username: '',
    password: '',
    email: '',
    nickname: '',
  });

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

  /**
   * Handle login form submission
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!loginForm.username || !loginForm.password) {
      setError(t('auth.error.fill_all_fields'));
      return;
    }
    
    setLoading(true);
    
    try {
      // First, try to login to check if user is admin
      const { apiClient } = await import('../api/client');
      const result = await apiClient.auth.login(loginForm);
      
      // Check if user is admin (planType = 999)
      // Using == instead of === to handle string/number type mismatch
      if (result.data?.user?.planType == 999) {
        // Admin user - show choice dialog
        setPendingCredentials(loginForm);
        setShowAdminChoice(true);
        setLoading(false);
      } else {
        // Regular user - login directly to dashboard
        await login(loginForm, false, rememberMe);
      }
    } catch (err: any) {
      setError(err.message || t('auth.error.login_failed'));
      setLoading(false);
    }
  };

  /**
   * Handle send verification code for login
   * Requirements: 需求4, 需求15
   */
  const handleSendLoginCode = async () => {
    setError(null);

    // Validate email
    if (!codeLoginEmail) {
      setError(t('auth.login.error.email_required'));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(codeLoginEmail)) {
      setError(t('auth.login.error.email_invalid'));
      return;
    }

    setLoading(true);

    try {
      // Call API to send login verification code
      const result = await apiClient.request<{ cooldownSeconds: number; expiresIn: number }>(
        '/api/v1/auth/login/send-code',
        {
          method: 'POST',
          body: JSON.stringify({ 
            email: codeLoginEmail,
            purpose: 'LOGIN' // 添加验证码用途
          }),
        }
      );

      if (result.data) {
        setCodeSent(true);
        setCooldownSeconds(result.data.cooldownSeconds || 60);
        setExpirySeconds(result.data.expiresIn || 600);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('auth.login.error.send_code_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle resend verification code
   * Requirements: 需求15
   */
  const handleResendLoginCode = async () => {
    if (cooldownSeconds > 0) return;
    await handleSendLoginCode();
  };

  /**
   * Handle verification code complete
   * Requirements: 需求15
   */
  const handleCodeComplete = (code: string) => {
    setVerificationCode(code);
  };

  /**
   * Handle login with verification code
   * Requirements: 需求4, 需求15
   */
  const handleLoginWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate fields
    if (!codeLoginEmail || !verificationCode) {
      setError(t('auth.error.fill_required_fields'));
      return;
    }

    if (verificationCode.length !== 6) {
      setError(t('auth.login.error.code_required'));
      return;
    }

    setLoading(true);

    try {
      // Call API to verify code and login
      const result = await apiClient.request<{
        token: string;
        refreshToken: string;
        user: any;
      }>('/api/v1/auth/login/verify-code', {
        method: 'POST',
        body: JSON.stringify({
          email: codeLoginEmail,
          code: verificationCode,
          rememberMe,
        }),
      });

      if (result.data) {
        // Check if user is admin (planType = 999)
        if (result.data.user?.planType == 999) {
          // Admin user - show choice dialog
          setPendingCredentials({ username: codeLoginEmail, password: '' });
          setShowAdminChoice(true);
          setLoading(false);
        } else {
          // Regular user - save token and navigate
          localStorage.setItem('token', result.data.token);
          localStorage.setItem('refreshToken', result.data.refreshToken);
          
          // Reload page to trigger authentication
          window.location.href = '/';
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('auth.error.login_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle admin choice selection
   */
  const handleAdminChoice = async (navigateToAdmin: boolean) => {
    if (!pendingCredentials) return;
    
    setLoading(true);
    setShowAdminChoice(false);
    
    try {
      await login(pendingCredentials, navigateToAdmin, rememberMe);
    } catch (err: any) {
      setError(err.message || t('auth.error.login_failed'));
    } finally {
      setLoading(false);
      setPendingCredentials(null);
    }
  };

  /**
   * Handle register form submission
   * Requirements: 1.1, 1.2, 1.3
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!registerForm.username || !registerForm.password || !registerForm.email) {
      setError(t('auth.error.fill_required_fields'));
      return;
    }
    
    if (registerForm.password.length < 8) {
      setError(t('auth.error.password_min_length'));
      return;
    }
    
    setLoading(true);
    
    try {
      const { apiClient } = await import('../api/client');
      await apiClient.auth.register(registerForm);
      
      // After successful registration, automatically log in
      await login({
        username: registerForm.username,
        password: registerForm.password,
      }, false, false); // Don't remember me by default for registration
    } catch (err: any) {
      setError(err.message || t('auth.error.registration_failed'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: FormMode) => {
    // 如果切换到注册模式，直接跳转到独立的注册页面
    if (newMode === 'register') {
      navigate('register');
      return;
    }
    
    setMode(newMode);
    setError(null);
    setLoginForm({ username: '', password: '' });
    setRegisterForm({ username: '', password: '', email: '', nickname: '' });
    setRememberMe(false);
    setLoginMethod('password');
    setCodeLoginEmail('');
    setVerificationCode('');
    setCodeSent(false);
    setCooldownSeconds(0);
    setExpirySeconds(0);
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
        {/* Admin Choice Modal */}
        {showAdminChoice && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-slate-200 dark:border-border-dark p-8 max-w-md w-full animate-scale-in">
              <div className="flex flex-col items-center mb-6">
                <div className="size-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-500/30">
                  <Icon name="admin_panel_settings" className="text-[32px]" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {t('auth.admin_choice.title')}
                </h3>
                <p className="text-slate-500 dark:text-text-secondary text-center text-sm">
                  {t('auth.admin_choice.subtitle')}
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleAdminChoice(true)}
                  disabled={loading}
                  className="w-full p-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-indigo-400 disabled:to-purple-400 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Icon name="dashboard" className="text-[22px]" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{t('auth.admin_choice.admin_panel')}</div>
                      <div className="text-xs text-white/80">{t('auth.admin_choice.admin_panel_desc')}</div>
                    </div>
                  </div>
                  <Icon name="arrow_forward" className="text-[20px] group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => handleAdminChoice(false)}
                  disabled={loading}
                  className="w-full p-4 bg-slate-100 dark:bg-[#1e293b] hover:bg-slate-200 dark:hover:bg-slate-700 disabled:bg-slate-50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-border-dark transition-all active:scale-[0.98] flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-slate-200 dark:bg-slate-600 rounded-lg flex items-center justify-center">
                      <Icon name="apps" className="text-[22px]" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{t('auth.admin_choice.user_panel')}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{t('auth.admin_choice.user_panel_desc')}</div>
                    </div>
                  </div>
                  <Icon name="arrow_forward" className="text-[20px] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {loading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  <span>{t('auth.admin_choice.logging_in')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-2xl shadow-xl border border-slate-200 dark:border-border-dark p-8 animate-fade-in">
            <div className="flex flex-col items-center mb-8">
                <div className="size-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-600/20">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"></path>
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {mode === 'login' ? t('auth.login.title') : t('auth.register.title')}
                </h2>
                <p className="text-slate-500 dark:text-text-secondary text-sm mt-2">
                  {mode === 'login' ? t('auth.login.subtitle') : t('auth.register.subtitle')}
                </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <Icon name="error" className="text-red-600 dark:text-red-400 text-[20px] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {mode === 'login' ? (
              <>
                {/* Login method tabs */}
                <div className="flex gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('password');
                      setError(null);
                      setCodeSent(false);
                    }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      loginMethod === 'password'
                        ? 'bg-white dark:bg-surface-dark text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Icon name="lock" className="text-[18px]" />
                      <span>{t('auth.login.password_tab')}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('code');
                      setError(null);
                    }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      loginMethod === 'code'
                        ? 'bg-white dark:bg-surface-dark text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Icon name="mail" className="text-[18px]" />
                      <span>{t('auth.login.code_tab')}</span>
                    </div>
                  </button>
                </div>

                {loginMethod === 'password' ? (
                  /* Password login form */
                  <form className="space-y-5" onSubmit={handleLogin}>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                          {t('auth.username')}
                        </label>
                        <div className="relative">
                            <Icon name="person" className="absolute left-3 top-2.5 text-slate-400 text-[20px]" />
                            <input 
                                type="text" 
                                value={loginForm.username}
                                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                                placeholder={t('auth.placeholder.username')}
                                disabled={loading}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t('auth.password')}</label>
                            <button
                              type="button"
                              onClick={() => navigate('reset-password')}
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              {t('auth.forgot')}
                            </button>
                        </div>
                        <div className="relative">
                            <Icon name="lock" className="absolute left-3 top-2.5 text-slate-400 text-[20px]" />
                            <input 
                                type="password" 
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                                placeholder={t('auth.placeholder.password')}
                                disabled={loading}
                                required
                            />
                        </div>
                    </div>

                    {/* Remember Me checkbox */}
                    <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                disabled={loading}
                                className="w-4 h-4 text-indigo-600 bg-slate-50 dark:bg-[#1e293b] border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors select-none">
                                {t('auth.remember_me')} <span className="text-slate-500 dark:text-slate-400 text-xs">{t('auth.remember_me_note')}</span>
                            </span>
                        </label>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
                    >
                        {loading ? t('auth.status.signing_in') : t('auth.submit.login')}
                    </button>
                  </form>
                ) : (
                  /* Verification code login form */
                  <form className="space-y-5" onSubmit={codeSent ? handleLoginWithCode : (e) => { e.preventDefault(); handleSendLoginCode(); }}>
                    {!codeSent ? (
                      /* Step 1: Input email */
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                            {t('auth.email')} *
                          </label>
                          <div className="relative">
                            <Icon name="mail" className="absolute left-3 top-2.5 text-slate-400 text-[20px]" />
                            <input
                              type="email"
                              value={codeLoginEmail}
                              onChange={(e) => setCodeLoginEmail(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                              placeholder={t('auth.placeholder.email')}
                              disabled={loading}
                              required
                            />
                          </div>
                        </div>

                        {/* Remember Me checkbox */}
                        <div className="flex items-center">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                              disabled={loading}
                              className="w-4 h-4 text-indigo-600 bg-slate-50 dark:bg-[#1e293b] border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors select-none">
                              {t('auth.remember_me')} <span className="text-slate-500 dark:text-slate-400 text-xs">{t('auth.remember_me_note')}</span>
                            </span>
                          </label>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
                        >
                          {loading ? t('auth.login.send_code_loading') : t('auth.login.send_code')}
                        </button>
                      </>
                    ) : (
                      /* Step 2: Input verification code */
                      <>
                        {/* Back button */}
                        <button
                          type="button"
                          onClick={() => {
                            setCodeSent(false);
                            setVerificationCode('');
                            setError(null);
                          }}
                          className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                        >
                          <Icon name="arrow_back" className="text-[18px]" />
                          <span>{t('auth.login.back_to_email')}</span>
                        </button>

                        {/* Email display */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">{t('auth.login.email_label').replace(' *','')}:</span>
                            <span className="text-slate-900 dark:text-white font-medium">{codeLoginEmail}</span>
                          </div>
                        </div>

                        {/* Verification code input */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                            {t('auth.login.code_label')}
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
                              <span>{t('auth.login.code_expiry', { time: formatTime(expirySeconds) })}</span>
                            </div>
                          )}

                          {/* Resend button */}
                          <div className="mt-3 text-center">
                            {cooldownSeconds > 0 ? (
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                {t('auth.login.resend_wait', { seconds: cooldownSeconds })}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handleResendLoginCode}
                                disabled={loading}
                                className="text-sm text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {t('auth.login.resend')}
                              </button>
                            )}
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={loading || verificationCode.length !== 6}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
                        >
                          {loading ? t('auth.status.signing_in') : t('auth.submit.login')}
                        </button>
                      </>
                    )}
                  </form>
                )}
              </>
            ) : (
              <form className="space-y-5" onSubmit={handleRegister}>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {t('auth.label.username_required')}
                    </label>
                    <div className="relative">
                        <Icon name="person" className="absolute left-3 top-2.5 text-slate-400 text-[20px]" />
                        <input 
                            type="text" 
                            value={registerForm.username}
                            onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                            placeholder={t('auth.placeholder.choose_username')}
                            disabled={loading}
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {t('auth.label.email_required')}
                    </label>
                    <div className="relative">
                        <Icon name="mail" className="absolute left-3 top-2.5 text-slate-400 text-[20px]" />
                        <input 
                            type="email" 
                            value={registerForm.email}
                            onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                            placeholder={t('auth.placeholder.email')}
                            disabled={loading}
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {t('auth.label.password_required')}
                    </label>
                    <div className="relative">
                        <Icon name="lock" className="absolute left-3 top-2.5 text-slate-400 text-[20px]" />
                        <input 
                            type="password" 
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                            placeholder={t('auth.placeholder.password_min')}
                            disabled={loading}
                            required
                            minLength={8}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {t('auth.label.nickname_optional')}
                    </label>
                    <div className="relative">
                        <Icon name="badge" className="absolute left-3 top-2.5 text-slate-400 text-[20px]" />
                        <input 
                            type="text" 
                            value={registerForm.nickname}
                            onChange={(e) => setRegisterForm({ ...registerForm, nickname: e.target.value })}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                            placeholder={t('auth.placeholder.display_name')}
                            disabled={loading}
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
                >
                    {loading ? t('auth.status.creating_account') : t('auth.submit.register')}
                </button>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {mode === 'login' ? (
                  <>
                    {t('auth.no_account')} <button onClick={() => navigate('register')} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">{t('auth.link.signup')}</button>
                  </>
                ) : (
                  <>
                    {t('auth.has_account')} <button onClick={() => switchMode('login')} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">{t('auth.link.signin')}</button>
                  </>
                )}
            </div>
        </div>
    </div>
  );
};
