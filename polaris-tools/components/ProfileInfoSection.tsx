import React, { useState } from 'react';
import { UserResponse } from '../types';
import { PlanBadge } from './PlanBadge';
import { Icon } from './Icon';
import { apiClient } from '../api/client';
import { VerificationCodeInput } from './VerificationCodeInput';

interface ProfileInfoSectionProps {
  user: UserResponse;
  isEditing: boolean;
  editForm: {
    nickname: string;
    email: string;
    bio: string;
  };
  errors: {
    nickname?: string;
    email?: string;
    bio?: string;
  };
  onFormChange: (field: string, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onRefreshUser?: () => Promise<void>;
}

/**
 * ProfileInfoSection 组件 - 显示和编辑用户信息
 * 
 * 功能：
 * - 查看模式：显示用户名、昵称、邮箱、个人简介、计划类型、邮箱验证状态
 * - 编辑模式：提供表单编辑用户信息
 * 
 * Requirements: 12.3 避免不必要的重新渲染
 * 
 * @param user - 用户信息
 * @param isEditing - 是否处于编辑模式
 * @param editForm - 编辑表单数据
 * @param errors - 表单验证错误
 * @param onFormChange - 表单字段变化回调
 * @param onSave - 保存回调
 * @param onCancel - 取消回调
 * @param onEdit - 进入编辑模式回调
 * @param onShowToast - 显示提示消息回调
 */
export const ProfileInfoSection: React.FC<ProfileInfoSectionProps> = React.memo(({
  user,
  isEditing,
  editForm,
  errors,
  onFormChange,
  onSave,
  onCancel,
  onEdit,
  onShowToast,
  onRefreshUser,
}) => {
  const [isResending, setIsResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState<'input' | 'verify'>('input');
  const [emailChangeForm, setEmailChangeForm] = useState({
    newEmail: '',
    password: '',
    code: '',
  });
  const [emailChangeErrors, setEmailChangeErrors] = useState<{
    newEmail?: string;
    password?: string;
    code?: string;
  }>({});
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [codeExpiresIn, setCodeExpiresIn] = useState(600); // 10 minutes in seconds
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [isSendingCode, setIsSendingCode] = useState(false);

  // Load initial cooldown from verification status
  React.useEffect(() => {
    const loadVerificationStatus = async () => {
      try {
        const response = await apiClient.email.getVerificationStatus();
        if (response.code === 200 && response.data) {
          setCooldownSeconds(response.data.cooldownSeconds);
          if (response.data.cooldownSeconds > 0) {
            const interval = setInterval(() => {
              setCooldownSeconds(prev => {
                if (prev <= 1) {
                  clearInterval(interval);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Failed to load verification status:', error);
      }
    };

    if (!user.emailVerified) {
      loadVerificationStatus();
    }
  }, [user.emailVerified]);

  // Countdown timer for verification code expiry
  React.useEffect(() => {
    if (!verificationCodeSent || codeExpiresIn <= 0) return;

    const interval = setInterval(() => {
      setCodeExpiresIn(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [verificationCodeSent, codeExpiresIn]);

  // Countdown timer for code resend cooldown
  React.useEffect(() => {
    if (codeCooldown <= 0) return;

    const interval = setInterval(() => {
      setCodeCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [codeCooldown]);

  const handleResendVerification = async () => {
    if (isResending || cooldownSeconds > 0) return;

    try {
      setIsResending(true);
      const response = await apiClient.email.resendVerification();
      
      if (response.code === 200) {
        onShowToast?.('验证邮件已发送，请查收', 'success');
        // 设置60秒冷却时间
        setCooldownSeconds(60);
        const interval = setInterval(() => {
          setCooldownSeconds(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        onShowToast?.(response.message || '发送失败，请重试', 'error');
      }
    } catch (error: any) {
      console.error('Resend verification error:', error);
      if (error.code === 429) {
        onShowToast?.(error.message || '发送过于频繁，请稍后再试', 'error');
      } else {
        onShowToast?.('发送失败，请重试', 'error');
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleOpenEmailChange = () => {
    setShowEmailChangeModal(true);
    setEmailChangeStep('input');
    setEmailChangeForm({
      newEmail: '',
      password: '',
      code: '',
    });
    setEmailChangeErrors({});
    setVerificationCodeSent(false);
    setCodeExpiresIn(600);
    setCodeCooldown(0);
  };

  const handleCloseEmailChange = () => {
    setShowEmailChangeModal(false);
    setEmailChangeStep('input');
    setEmailChangeForm({
      newEmail: '',
      password: '',
      code: '',
    });
    setEmailChangeErrors({});
    setVerificationCodeSent(false);
    setCodeExpiresIn(600);
    setCodeCooldown(0);
  };

  const handleSendVerificationCode = async () => {
    // Validate form
    const errors: { newEmail?: string; password?: string } = {};
    
    if (!emailChangeForm.newEmail) {
      errors.newEmail = '请输入新邮箱地址';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailChangeForm.newEmail)) {
      errors.newEmail = '请输入有效的邮箱地址';
    } else if (emailChangeForm.newEmail === user.email) {
      errors.newEmail = '新邮箱不能与当前邮箱相同';
    }
    
    if (!emailChangeForm.password) {
      errors.password = '请输入密码以确认身份';
    }
    
    if (Object.keys(errors).length > 0) {
      setEmailChangeErrors(errors);
      return;
    }

    try {
      setIsSendingCode(true);
      const response = await apiClient.email.sendChangeEmailCode(
        emailChangeForm.newEmail,
        emailChangeForm.password
      );
      
      if (response.code === 200 && response.data) {
        onShowToast?.('验证码已发送到新邮箱，请查收', 'success');
        setVerificationCodeSent(true);
        setEmailChangeStep('verify');
        setCodeExpiresIn(response.data.expiresIn || 600);
        setCodeCooldown(response.data.cooldownSeconds || 60);
        setEmailChangeErrors({});
      } else {
        onShowToast?.(response.message || '发送验证码失败', 'error');
      }
    } catch (error: any) {
      console.error('Send verification code error:', error);
      if (error.code === 401) {
        setEmailChangeErrors({ password: '密码错误' });
      } else if (error.code === 429) {
        onShowToast?.(error.message || '发送过于频繁，请稍后再试', 'error');
      } else {
        onShowToast?.(error.message || '发送验证码失败，请重试', 'error');
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleResendVerificationCode = async () => {
    if (codeCooldown > 0 || isSendingCode) return;
    await handleSendVerificationCode();
  };

  const handleVerifyEmailChange = async () => {
    // Validate code
    if (!emailChangeForm.code || emailChangeForm.code.length !== 6) {
      setEmailChangeErrors({ code: '请输入6位验证码' });
      return;
    }

    try {
      const response = await apiClient.email.verifyChangeEmail(
        emailChangeForm.newEmail,
        emailChangeForm.code
      );
      
      if (response.code === 200) {
        onShowToast?.('邮箱修改成功', 'success');
        handleCloseEmailChange();
        // Refresh user data
        window.location.reload();
      } else {
        setEmailChangeErrors({ code: response.message || '验证码错误' });
      }
    } catch (error: any) {
      console.error('Verify email change error:', error);
      if (error.code === 4001) {
        setEmailChangeErrors({ code: '验证码无效' });
      } else if (error.code === 4002) {
        setEmailChangeErrors({ code: '验证码已过期' });
      } else if (error.code === 4003) {
        setEmailChangeErrors({ code: '验证码已使用' });
      } else if (error.code === 4004) {
        setEmailChangeErrors({ code: '验证失败次数过多，请重新发送验证码' });
      } else {
        setEmailChangeErrors({ code: error.message || '验证失败，请重试' });
      }
    }
  };

  const handleBackToInput = () => {
    setEmailChangeStep('input');
    setVerificationCodeSent(false);
    setEmailChangeForm(prev => ({ ...prev, code: '' }));
    setEmailChangeErrors({});
  };

  if (!isEditing) {
    // 查看模式
    return (
      <>
        <div className="space-y-3 md:space-y-4">
          {/* 用户名和昵称 */}
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {user.nickname || user.username}
            </h1>
            <p className="text-sm md:text-base text-slate-500 dark:text-text-secondary mb-2 md:mb-3">
              @{user.username}
            </p>
          </div>

          {/* 计划类型徽章 */}
          <div className="inline-flex items-center gap-2">
            <PlanBadge planType={user.planType} />
          </div>

          {/* 邮箱 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs md:text-sm text-slate-500 dark:text-text-secondary">邮箱</p>
              <button
                onClick={handleOpenEmailChange}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline"
              >
                修改邮箱
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm md:text-base text-slate-900 dark:text-white break-all">{user.email}</p>
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                  <Icon name="verified" className="text-sm" />
                  已验证
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
                    <Icon name="warning" className="text-sm" />
                    未验证
                  </span>
                  <button
                    onClick={handleResendVerification}
                    disabled={isResending || cooldownSeconds > 0}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed underline"
                  >
                    {isResending ? '发送中...' : cooldownSeconds > 0 ? `${cooldownSeconds}秒后重试` : '重新发送验证邮件'}
                  </button>
                </div>
              )}
            </div>
            {user.emailVerifiedAt && (
              <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
                验证时间: {new Date(user.emailVerifiedAt).toLocaleString('zh-CN')}
              </p>
            )}
            {!user.emailVerified && (
              <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Icon name="info" className="text-yellow-600 dark:text-yellow-400 text-lg flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                      请验证您的邮箱地址以接收重要通知和确保账户安全。
                    </p>
                    {onRefreshUser && (
                      <button
                        onClick={async () => {
                          try {
                            await onRefreshUser();
                            onShowToast?.('状态已刷新', 'success');
                          } catch (error) {
                            console.error('Failed to refresh user:', error);
                            onShowToast?.('刷新失败', 'error');
                          }
                        }}
                        className="mt-2 text-xs text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 underline"
                      >
                        已验证？点击刷新状态
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 个人简介 */}
          <div>
            <p className="text-xs md:text-sm text-slate-500 dark:text-text-secondary mb-1">个人简介</p>
            <p className="text-sm md:text-base text-slate-900 dark:text-white">
              {user.bio || '暂无个人简介'}
            </p>
          </div>
        </div>

        {/* Email Change Modal */}
        {showEmailChangeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {emailChangeStep === 'input' ? '修改邮箱地址' : '验证新邮箱'}
                </h3>
                <button
                  onClick={handleCloseEmailChange}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <Icon name="close" className="text-xl" />
                </button>
              </div>

              {emailChangeStep === 'input' ? (
                <div className="space-y-4">
                  {/* Current Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      当前邮箱
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-border-dark rounded-lg cursor-not-allowed"
                    />
                  </div>

                  {/* New Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      新邮箱地址 *
                    </label>
                    <input
                      type="email"
                      value={emailChangeForm.newEmail}
                      onChange={(e) => setEmailChangeForm(prev => ({ ...prev, newEmail: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-surface-dark text-slate-900 dark:text-white border border-slate-200 dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="输入新邮箱地址"
                    />
                    {emailChangeErrors.newEmail && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{emailChangeErrors.newEmail}</p>
                    )}
                  </div>

                  {/* Password Confirmation */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      确认密码 *
                    </label>
                    <input
                      type="password"
                      value={emailChangeForm.password}
                      onChange={(e) => setEmailChangeForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-surface-dark text-slate-900 dark:text-white border border-slate-200 dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="输入密码以确认身份"
                    />
                    {emailChangeErrors.password && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{emailChangeErrors.password}</p>
                    )}
                  </div>

                  {/* Warning */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Icon name="info" className="text-blue-600 dark:text-blue-400 text-lg flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        我们将向新邮箱发送验证码，请确保您可以访问该邮箱。
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleCloseEmailChange}
                      className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSendVerificationCode}
                      disabled={isSendingCode}
                      className="flex-1 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSendingCode ? '发送中...' : '发送验证码'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Info */}
                  <div className="text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      验证码已发送到
                    </p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white break-all">
                      {emailChangeForm.newEmail}
                    </p>
                  </div>

                  {/* Verification Code Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 text-center">
                      请输入6位验证码
                    </label>
                    <VerificationCodeInput
                      length={6}
                      onChange={(code) => {
                        setEmailChangeForm(prev => ({ ...prev, code }));
                        setEmailChangeErrors(prev => ({ ...prev, code: undefined }));
                      }}
                      onComplete={handleVerifyEmailChange}
                      error={!!emailChangeErrors.code}
                      errorMessage={emailChangeErrors.code}
                      autoFocus
                    />
                  </div>

                  {/* Timer and Resend */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-slate-600 dark:text-slate-400">
                      {codeExpiresIn > 0 ? (
                        <span>
                          验证码有效期: {Math.floor(codeExpiresIn / 60)}:{String(codeExpiresIn % 60).padStart(2, '0')}
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">验证码已过期</span>
                      )}
                    </div>
                    <button
                      onClick={handleResendVerificationCode}
                      disabled={codeCooldown > 0 || isSendingCode}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed underline"
                    >
                      {isSendingCode ? '发送中...' : codeCooldown > 0 ? `${codeCooldown}秒后重试` : '重新发送'}
                    </button>
                  </div>

                  {/* Warning */}
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Icon name="warning" className="text-yellow-600 dark:text-yellow-400 text-lg flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-800 dark:text-yellow-300">
                        验证码输入错误5次后将失效，请仔细核对。
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleBackToInput}
                      className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      返回
                    </button>
                    <button
                      onClick={handleVerifyEmailChange}
                      disabled={emailChangeForm.code.length !== 6}
                      className="flex-1 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      确认修改
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // 编辑模式
  return (
    <div className="space-y-3 md:space-y-4">
      {/* 用户名（只读） */}
      <div>
        <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          用户名
        </label>
        <input
          type="text"
          value={user.username}
          disabled
          className="w-full px-3 py-2.5 md:py-2 text-sm md:text-base bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-border-dark rounded-lg cursor-not-allowed min-h-[44px]"
        />
        <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">用户名不可修改</p>
      </div>

      {/* 邮箱（只读，通过单独的修改邮箱流程） */}
      <div>
        <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          邮箱
        </label>
        <input
          type="email"
          value={user.email}
          disabled
          className="w-full px-3 py-2.5 md:py-2 text-sm md:text-base bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-border-dark rounded-lg cursor-not-allowed min-h-[44px]"
        />
        <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
          邮箱需要通过"修改邮箱"功能单独修改
        </p>
      </div>

      {/* 昵称 */}
      <div>
        <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          昵称
        </label>
        <input
          type="text"
          value={editForm.nickname}
          onChange={(e) => onFormChange('nickname', e.target.value)}
          className="w-full px-3 py-2.5 md:py-2 text-sm md:text-base bg-white dark:bg-surface-dark text-slate-900 dark:text-white border border-slate-200 dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          placeholder="输入昵称"
        />
        {errors.nickname && (
          <p className="text-xs md:text-sm text-red-600 dark:text-red-400 mt-1">{errors.nickname}</p>
        )}
      </div>

      {/* 个人简介 */}
      <div>
        <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          个人简介
        </label>
        <textarea
          value={editForm.bio}
          onChange={(e) => onFormChange('bio', e.target.value)}
          className="w-full px-3 py-2.5 md:py-2 text-sm md:text-base bg-white dark:bg-surface-dark text-slate-900 dark:text-white border border-slate-200 dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[88px]"
          placeholder="介绍一下自己"
          rows={4}
        />
        {errors.bio && (
          <p className="text-xs md:text-sm text-red-600 dark:text-red-400 mt-1">{errors.bio}</p>
        )}
      </div>
    </div>
  );
});
