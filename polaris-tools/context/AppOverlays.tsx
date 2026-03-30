import React from 'react';
import { ToastContainer } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoginPrompt } from '../components/LoginPrompt';
import { GuestLimitDialog } from '../components/GuestLimitDialog';
import { SessionTimeoutDialog } from '../components/SessionTimeoutDialog';
import { guestUsageManager } from '../utils/guestUsageManager';
import type { TranslationKey } from '../i18n';
import type { UiContextType } from './UiContext';
import type { AuthContextValue } from './useAuthState';

interface AppOverlaysProps {
  ui: UiContextType;
  auth: AuthContextValue;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  onLoginPromptLogin: () => void;
  onGuestLimitLogin: () => void;
  onGuestLimitRegister: () => void;
}

export const AppOverlays: React.FC<AppOverlaysProps> = ({
  ui,
  auth,
  t,
  onLoginPromptLogin,
  onGuestLimitLogin,
  onGuestLimitRegister,
}) => {
  return (
    <>
      <ToastContainer toasts={ui.toasts} onRemove={ui.removeToast} />

      <ConfirmDialog
        isOpen={ui.confirmState.isOpen}
        title={ui.confirmState.options.title}
        message={ui.confirmState.options.message}
        confirmText={ui.confirmState.options.confirmText || t('common.confirm')}
        cancelText={ui.confirmState.options.cancelText || t('common.cancel')}
        isDangerous={ui.confirmState.options.type === 'danger'}
        onConfirm={ui.handleConfirm}
        onCancel={ui.handleCancel}
      />

      {ui.loginPromptState.isOpen && (
        <LoginPrompt
          message={ui.loginPromptState.message}
          onLogin={onLoginPromptLogin}
          onCancel={ui.closeLoginPrompt}
        />
      )}

      {ui.guestLimitState.isOpen && (
        <GuestLimitDialog
          remainingCount={guestUsageManager.getRemainingCount()}
          isBlocked={ui.guestLimitState.isBlocked || auth.isGuestBlocked}
          onLogin={onGuestLimitLogin}
          onRegister={onGuestLimitRegister}
          onClose={ui.guestLimitState.isBlocked || auth.isGuestBlocked ? undefined : ui.closeGuestLimit}
        />
      )}

      {auth.showSessionTimeoutWarning && auth.sessionExpiresAt && (
        <SessionTimeoutDialog
          expiresAt={auth.sessionExpiresAt}
          onContinue={auth.handleSessionContinue}
          onLogout={auth.handleSessionLogout}
          onClose={auth.handleSessionClose}
        />
      )}
    </>
  );
};
