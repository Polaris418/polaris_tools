import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { VerificationCodeInput } from '../components/VerificationCodeInput';
import { apiClient, ApiError } from '../api/client';

export const Settings: React.FC = () => {
  const { t, theme, toggleTheme, language, toggleLanguage, user, isAuthenticated, navigate, refreshUser, showToast } = useAppContext();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('login');
    }
  }, [isAuthenticated, navigate]);

  // Email language preference state (synced with server)
  const [emailLanguage, setEmailLanguage] = useState<string>(user?.language || 'zh-CN');
  
  // Sync email language state with user data
  useEffect(() => {
    if (user?.language) {
      setEmailLanguage(user.language);
    } else {
      // Default to zh-CN if not set
      setEmailLanguage('zh-CN');
    }
  }, [user?.language]);



  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordStep, setPasswordStep] = useState<'input' | 'verify'>('input');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    verificationCode: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [expirySeconds, setExpirySeconds] = useState(0);

  // Remember Me state (Requirements: 3.5, 3.6)
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    const stored = localStorage.getItem('rememberMe');
    return stored === 'true';
  });
  const [rememberMeChanged, setRememberMeChanged] = useState(false);

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

  // Session Timeout state (Requirements: 4.7)
  const [showSessionTimeout, setShowSessionTimeout] = useState<boolean>(() => {
    const stored = localStorage.getItem('showSessionTimeout');
    return stored !== 'false'; // Default to true if not set
  });



  /**
   * Handle Remember Me toggle
   * Requirements: 3.5, 3.6
   */
  const handleRememberMeToggle = () => {
    const newValue = !rememberMe;
    setRememberMe(newValue);
    localStorage.setItem('rememberMe', newValue.toString());
    setRememberMeChanged(true);
    
    // Clear the notification after 5 seconds
    setTimeout(() => setRememberMeChanged(false), 5000);
  };

  /**
   * Handle Session Timeout toggle
   * Requirements: 4.7
   */
  const handleSessionTimeoutToggle = () => {
    const newValue = !showSessionTimeout;
    setShowSessionTimeout(newValue);
    localStorage.setItem('showSessionTimeout', newValue.toString());
    
    // Trigger a custom event to notify AppContext of the change
    window.dispatchEvent(new CustomEvent('sessionTimeoutPrefChanged', { 
      detail: { enabled: newValue } 
    }));
  };



  /**
   * Handle sending verification code for password change
   */
  const handleSendPasswordCode = async () => {
    setPasswordError(null);
    
    if (!user?.email) {
      setPasswordError(t('settings.password.error.no_email'));
      return;
    }
    
    setPasswordSaving(true);
    
    try {
      const result = await apiClient.auth.sendChangePasswordCode({
        email: user.email,
        purpose: 'CHANGE'
      });
      
      if (result.data) {
        setCodeSent(true);
        setPasswordStep('verify');
        setCooldownSeconds(result.data.cooldownSeconds || 60);
        setExpirySeconds(result.data.expiresIn || 600);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setPasswordError(err.message);
      } else {
        setPasswordError(t('settings.password.send_code_failed'));
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  /**
   * Handle resend verification code
   */
  const handleResendPasswordCode = async () => {
    if (cooldownSeconds > 0) return;
    await handleSendPasswordCode();
  };

  /**
   * Handle password change
   * Requirements: 1.3, 1.4
   */
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    
    // Step 1: Validate and send code
    if (passwordStep === 'input') {
      // Validation
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        setPasswordError(t('settings.password.error.all_required'));
        return;
      }
      
      if (passwordForm.newPassword.length < 8) {
        setPasswordError(t('settings.password.error.min_length'));
        return;
      }
      
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setPasswordError(t('settings.password.error.not_match'));
        return;
      }
      
      // Check password contains letters and numbers
      if (!/[a-zA-Z]/.test(passwordForm.newPassword) || !/[0-9]/.test(passwordForm.newPassword)) {
        setPasswordError(t('settings.password.error.complex'));
        return;
      }
      
      // Send verification code
      await handleSendPasswordCode();
      return;
    }
    
    // Step 2: Verify code and change password
    if (passwordStep === 'verify') {
      if (!passwordForm.verificationCode || passwordForm.verificationCode.length !== 6) {
        setPasswordError(t('settings.password.error.code_required'));
        return;
      }
      
      setPasswordSaving(true);
      
      try {
        await apiClient.auth.changePassword({
          oldPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          code: passwordForm.verificationCode,
        });
        
        // Refresh user data to get updated passwordUpdatedAt
        await refreshUser();
        
        // Reset form and state
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          verificationCode: '',
        });
        setCodeSent(false);
        setPasswordStep('input');
        setIsChangingPassword(false);
        
        // Show success toast notification
        showToast(t('settings.password.update_success'), 'success');
      } catch (err) {
        if (err instanceof ApiError) {
          setPasswordError(err.message);
        } else {
          setPasswordError(t('settings.password.update_failed'));
        }
      } finally {
        setPasswordSaving(false);
      }
    }
  };

  const getPlanName = (planType: number) => {
    switch (planType) {
      case 0: return t('settings.plan.free');
      case 1: return t('settings.plan.pro');
      case 2: return t('settings.plan.enterprise');
      default: return t('settings.plan.unknown');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="pb-6 border-b border-slate-200 dark:border-border-dark">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('settings.title')}</h2>
            </div>

            <div className="grid gap-6">
                {/* Account Section */}
                <section className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Icon name="person" className="text-indigo-500" />
                        {t('settings.account')}
                    </h3>
                    
                    <div className="flex items-center gap-4 mb-6">
                        <div className="size-16 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{user.nickname || user.username}</p>
                            <p className="text-sm text-slate-500 dark:text-text-secondary">{getPlanName(user.planType)}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400">{t('settings.profile.username')}</span>
                        <span className="text-slate-900 dark:text-white font-medium">{user.username}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400">{t('settings.profile.email_label')}</span>
                        <span className="text-slate-900 dark:text-white font-medium">{user.email}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400">{t('settings.profile.member_since')}</span>
                        <span className="text-slate-900 dark:text-white font-medium">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                </section>

                {/* Password Section */}
                <section className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Icon name="lock" className="text-rose-500" />
                        {t('settings.password.title')}
                    </h3>
                    
                    {!isChangingPassword ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">{t('settings.password.title')}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t('settings.password.last_changed_label', { 
                              date: user.passwordUpdatedAt
                                ? new Date(user.passwordUpdatedAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : t('settings.password.never')
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => setIsChangingPassword(true)}
                          className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors"
                        >
                          {t('settings.password.change')}
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handlePasswordChange} className="space-y-4">
                        {passwordError && (
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                            <Icon name="error" className="text-red-600 dark:text-red-400 text-[20px] flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                          </div>
                        )}
                        
                        {passwordStep === 'input' ? (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                {t('settings.password.current')}
                              </label>
                              <input
                                type="password"
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder={t('settings.password.current_placeholder')}
                                disabled={passwordSaving}
                                required
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                {t('settings.password.new')}
                              </label>
                              <input
                                type="password"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder={t('settings.password.new_placeholder')}
                                disabled={passwordSaving}
                                required
                                minLength={8}
                              />
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {t('settings.password.error.complex')}
                              </p>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                {t('settings.password.confirm')}
                              </label>
                              <input
                                type="password"
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder={t('settings.password.confirm_placeholder')}
                                disabled={passwordSaving}
                                required
                              />
                            </div>
                            
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                                <Icon name="info" className="text-[18px] flex-shrink-0 mt-0.5" />
                                <span dangerouslySetInnerHTML={{ __html: t('settings.password.security_notice', { email: `<strong>${user?.email}</strong>` }) }} />
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600 dark:text-slate-400">{t('settings.profile.email_label')}:</span>
                                <span className="text-slate-900 dark:text-white font-medium">{user?.email}</span>
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                {t('settings.password.code_label')}
                              </label>
                              <VerificationCodeInput
                                length={6}
                                onComplete={(code) => setPasswordForm({ ...passwordForm, verificationCode: code })}
                                onChange={(code) => setPasswordForm({ ...passwordForm, verificationCode: code })}
                                error={!!passwordError}
                                errorMessage={passwordError || undefined}
                                autoFocus
                              />
                              
                              {/* Expiry countdown */}
                              {expirySeconds > 0 && (
                                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                  <Icon name="schedule" className="text-[18px]" />
                                  <span>{t('settings.password.code_expiry', { time: formatTime(expirySeconds) })}</span>
                                </div>
                              )}
                              
                              {/* Resend button */}
                              <div className="mt-3 text-center">
                                {cooldownSeconds > 0 ? (
                                  <span className="text-sm text-slate-500 dark:text-slate-400">
                                    {t('settings.password.resend_wait', { seconds: cooldownSeconds })}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={handleResendPasswordCode}
                                    disabled={passwordSaving}
                                    className="text-sm text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {t('settings.password.resend')}
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setPasswordStep('input');
                                setPasswordError(null);
                              }}
                              className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                            >
                              <Icon name="arrow_back" className="text-[18px]" />
                              <span>{t('settings.password.back')}</span>
                            </button>
                          </>
                        )}
                        
                        <div className="flex gap-3 pt-2">
                          <button
                            type="submit"
                            disabled={passwordSaving}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                          >
                            {passwordSaving ? (passwordStep === 'input' ? t('settings.password.sending') : t('settings.password.updating')) : (passwordStep === 'input' ? t('settings.password.next') : t('settings.password.confirm_update'))}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsChangingPassword(false);
                              setPasswordStep('input');
                              setPasswordError(null);
                              setPasswordForm({
                                currentPassword: '',
                                newPassword: '',
                                confirmPassword: '',
                                verificationCode: '',
                              });
                              setCodeSent(false);
                            }}
                            disabled={passwordSaving}
                            className="px-4 py-2 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </form>
                    )}
                </section>

                {/* Remember Me Section */}
                <section className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Icon name="schedule" className="text-indigo-500" />
                        {t('settings.remember_me.title')}
                    </h3>
                    
                    {/* Change notification */}
                    {rememberMeChanged && (
                      <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                        <Icon name="info" className="text-amber-600 dark:text-amber-400 text-[20px] flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          {t('settings.remember_me.relogin_required')}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="font-medium text-slate-900 dark:text-white mb-1">
                              {t('settings.remember_me.title')}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-text-secondary mb-2">
                              {t('settings.remember_me.description')}
                            </p>
                            <div className="flex items-center gap-2">
                              <Icon 
                                name={rememberMe ? 'check_circle' : 'cancel'} 
                                className={`text-[18px] ${rememberMe ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}
                              />
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {rememberMe ? t('settings.remember_me.enabled') : t('settings.remember_me.disabled')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                              {t('settings.remember_me.note')}
                            </p>
                        </div>
                        <button 
                            onClick={handleRememberMeToggle}
                            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${rememberMe ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                            aria-label={t('settings.remember_me.title')}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${rememberMe ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                </section>

                {/* Session Timeout Section */}
                <section className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Icon name="timer" className="text-amber-500" />
                        {t('settings.session_timeout.title')}
                    </h3>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="font-medium text-slate-900 dark:text-white mb-1">
                              {t('settings.session_timeout.title')}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-text-secondary mb-2">
                              {t('settings.session_timeout.description')}
                            </p>
                            <div className="flex items-center gap-2">
                              <Icon 
                                name={showSessionTimeout ? 'check_circle' : 'cancel'} 
                                className={`text-[18px] ${showSessionTimeout ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}
                              />
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {showSessionTimeout ? t('settings.session_timeout.enabled') : t('settings.session_timeout.disabled')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                              {t('settings.session_timeout.note')}
                            </p>
                        </div>
                        <button 
                            onClick={handleSessionTimeoutToggle}
                            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${showSessionTimeout ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                            aria-label={t('settings.session_timeout.title')}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${showSessionTimeout ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                </section>

                {/* Appearance Section */}
                <section className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Icon name="palette" className="text-purple-500" />
                        {t('settings.theme')}
                    </h3>
                    
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">{t('settings.dark_mode')}</p>
                                <p className="text-sm text-slate-500 dark:text-text-secondary">{t('settings.theme.desc')}</p>
                            </div>
                            <button 
                                onClick={toggleTheme}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="font-medium text-slate-900 dark:text-white">{t('settings.lang')}</p>
                                <p className="text-sm text-slate-500 dark:text-text-secondary">{t('settings.lang.desc')}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                  {t('settings.lang.note')}
                                </p>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-[#1e293b] rounded-lg p-1">
                                <button 
                                    onClick={() => language !== 'en' && toggleLanguage()}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${language === 'en' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                    {t('settings.email.lang.en')}
                                </button>
                                <button 
                                    onClick={() => language !== 'zh' && toggleLanguage()}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${language === 'zh' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    {t('settings.email.lang.zh')}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Email Language Preference Section */}
                <section className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Icon name="mail" className="text-blue-500" />
                        {t('settings.email.pref_title')}
                    </h3>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="font-medium text-slate-900 dark:text-white mb-1">
                              {t('settings.email.pref_label')}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-text-secondary mb-2">
                              {t('settings.email.pref_desc')}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                              {t('settings.email.pref_note')}
                            </p>
                            <div className="flex items-center gap-2">
                              <Icon 
                                name="check_circle" 
                                className="text-[18px] text-green-600 dark:text-green-400"
                              />
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {t('settings.email.current_prefix', { lang: emailLanguage === 'en-US' ? t('settings.email.lang.en') : t('settings.email.lang.zh') })}
                              </span>
                            </div>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-[#1e293b] rounded-lg p-1">
                            <button 
                                onClick={async () => {
                                  if (emailLanguage === 'en-US') return;
                                  try {
                                    setEmailLanguage('en-US'); // Update UI immediately
                                    await apiClient.user.updateProfile({ language: 'en-US' });
                                    await refreshUser();
                                    showToast(t('settings.email.update_success_en'), 'success');
                                  } catch (err) {
                                    setEmailLanguage(user?.language || 'zh-CN'); // Revert on error
                                    showToast(t('settings.email.update_failed'), 'error');
                                  }
                                }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${emailLanguage === 'en-US' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                {t('settings.email.lang.en')}
                            </button>
                            <button 
                                onClick={async () => {
                                  if (emailLanguage === 'zh-CN') return;
                                  try {
                                    setEmailLanguage('zh-CN'); // Update UI immediately
                                    await apiClient.user.updateProfile({ language: 'zh-CN' });
                                    await refreshUser();
                                    showToast(t('settings.email.update_success_zh'), 'success');
                                  } catch (err) {
                                    setEmailLanguage(user?.language || 'zh-CN'); // Revert on error
                                    showToast(t('settings.email.update_failed'), 'error');
                                  }
                                }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${emailLanguage === 'zh-CN' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                {t('settings.email.lang.zh')}
                            </button>
                        </div>
                    </div>
                </section>

                 {/* Notifications (Dummy) */}
                 <section className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Icon name="notifications" className="text-rose-500" />
                        {t('settings.notifications')}
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" defaultChecked />
                            <span className="text-sm text-slate-700 dark:text-slate-300">{t('settings.notifications.email_digest')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" defaultChecked />
                            <span className="text-sm text-slate-700 dark:text-slate-300">{t('settings.notifications.product_announcements')}</span>
                        </div>
                    </div>
                 </section>
            </div>
        </div>
    </main>
  );
};
