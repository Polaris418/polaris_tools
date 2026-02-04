/**
 * Email Verification Code API Usage Examples
 * 
 * This file demonstrates how to use the new verification code APIs
 * for registration, login, password reset, and email change flows.
 */

import { apiClient, ApiError } from './client';

/**
 * Example 1: Register with verification code
 */
export async function registerWithCode() {
  try {
    // Step 1: Send verification code to email
    const sendResult = await apiClient.auth.sendRegisterCode({
      email: 'user@example.com',
    });

    console.log('Verification code sent!');
    console.log(`Cooldown: ${sendResult.data.cooldownSeconds} seconds`);
    console.log(`Expires in: ${sendResult.data.expiresIn} seconds`);

    // Step 2: User enters the code, then verify and register
    const registerResult = await apiClient.auth.verifyRegister({
      email: 'user@example.com',
      code: '123456',
      username: 'testuser',
      password: 'SecurePassword123!',
      nickname: 'Test User',
    });

    console.log('Registration successful!');
    console.log('Token:', registerResult.data.token);
    console.log('User:', registerResult.data.user);

    // Save token for future requests
    apiClient.setToken(registerResult.data.token);
    localStorage.setItem('refreshToken', registerResult.data.refreshToken);

  } catch (error) {
    if (error instanceof ApiError) {
      console.error('Registration failed:', error.getUserMessage());
      
      if (error.isRateLimitError()) {
        console.log('Rate limit hit, please wait before retrying');
      } else if (error.isVerificationError()) {
        console.log('Verification code issue:', error.message);
      }
    }
  }
}

/**
 * Example 2: Login with verification code
 */
export async function loginWithCode() {
  try {
    // Step 1: Send login verification code
    const sendResult = await apiClient.auth.sendLoginCode({
      email: 'user@example.com',
    });

    console.log('Login code sent!');
    console.log(`Cooldown: ${sendResult.data.cooldownSeconds} seconds`);

    // Step 2: Verify code and login
    const loginResult = await apiClient.auth.verifyLoginCode({
      email: 'user@example.com',
      code: '123456',
      rememberMe: true, // 30 days token vs 1 day
    });

    console.log('Login successful!');
    console.log('Token:', loginResult.data.token);

    // Save token
    apiClient.setToken(loginResult.data.token);
    localStorage.setItem('refreshToken', loginResult.data.refreshToken);

  } catch (error) {
    if (error instanceof ApiError) {
      console.error('Login failed:', error.getUserMessage());
    }
  }
}

/**
 * Example 3: Reset password with verification code
 */
export async function resetPassword() {
  try {
    // Step 1: Send reset code
    const sendResult = await apiClient.auth.sendResetCode({
      email: 'user@example.com',
    });

    console.log('Reset code sent!');

    // Step 2: Verify reset code and get temporary token
    const verifyResult = await apiClient.auth.verifyResetCode({
      email: 'user@example.com',
      code: '123456',
    });

    console.log('Code verified!');
    console.log('Reset token:', verifyResult.data.resetToken);
    console.log(`Token expires in: ${verifyResult.data.expiresIn} seconds`);

    // Step 3: Reset password with temporary token
    await apiClient.auth.resetPassword({
      resetToken: verifyResult.data.resetToken,
      newPassword: 'NewSecurePassword123!',
    });

    console.log('Password reset successful!');

  } catch (error) {
    if (error instanceof ApiError) {
      console.error('Password reset failed:', error.getUserMessage());
    }
  }
}

/**
 * Example 4: Change email with verification code
 */
export async function changeEmail() {
  try {
    // Step 1: Send verification code to new email (requires current password)
    const sendResult = await apiClient.email.sendChangeEmailCode({
      newEmail: 'newemail@example.com',
      password: 'CurrentPassword123!',
    });

    console.log('Verification code sent to new email!');
    console.log(`Cooldown: ${sendResult.data.cooldownSeconds} seconds`);

    // Step 2: Verify code and complete email change
    await apiClient.email.verifyChangeEmail({
      newEmail: 'newemail@example.com',
      code: '123456',
    });

    console.log('Email changed successfully!');
    console.log('Notification sent to old email');

  } catch (error) {
    if (error instanceof ApiError) {
      console.error('Email change failed:', error.getUserMessage());
    }
  }
}

/**
 * Example 5: Error handling patterns
 */
export async function handleErrors() {
  try {
    await apiClient.auth.sendRegisterCode({
      email: 'user@example.com',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      // Check error type
      if (error.isRateLimitError()) {
        console.log('Rate limit error:', error.getUserMessage());
        // Show countdown timer to user
        if (error.data?.seconds) {
          console.log(`Please wait ${error.data.seconds} seconds`);
        }
      } else if (error.isVerificationError()) {
        // Handle verification-specific errors
        switch (error.code) {
          case 4001:
            console.log('Invalid verification code');
            break;
          case 4002:
            console.log('Verification code expired');
            break;
          case 4003:
            console.log('Verification code already used');
            break;
          case 4011:
            console.log('Email already registered');
            break;
          case 4012:
            console.log('Email not registered');
            break;
          default:
            console.log('Verification error:', error.getUserMessage());
        }
      } else if (error.isAuthError()) {
        console.log('Authentication error:', error.getUserMessage());
        // Redirect to login
      } else {
        console.log('General error:', error.getUserMessage());
      }
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * Example 6: Complete registration flow with UI feedback
 */
export async function completeRegistrationFlow(
  email: string,
  onCodeSent: (cooldown: number, expiresIn: number) => void,
  onError: (message: string) => void,
  onSuccess: (user: any) => void
) {
  try {
    // Send code
    const sendResult = await apiClient.auth.sendRegisterCode({ email });
    onCodeSent(sendResult.data.cooldownSeconds, sendResult.data.expiresIn);

    // Wait for user to enter code...
    // Then verify (this would be called from a form submit)
    
  } catch (error) {
    if (error instanceof ApiError) {
      onError(error.getUserMessage());
    } else {
      onError('An unexpected error occurred');
    }
  }
}

/**
 * Example 7: Resend verification code with cooldown handling
 */
export async function resendCode(
  email: string,
  onSuccess: (cooldown: number) => void,
  onError: (message: string, remainingSeconds?: number) => void
) {
  try {
    const result = await apiClient.auth.sendRegisterCode({ email });
    onSuccess(result.data.cooldownSeconds);
  } catch (error) {
    if (error instanceof ApiError && error.isRateLimitError()) {
      // Extract remaining seconds from error data
      const remainingSeconds = error.data?.seconds;
      onError(error.getUserMessage(), remainingSeconds);
    } else if (error instanceof ApiError) {
      onError(error.getUserMessage());
    } else {
      onError('Failed to resend code');
    }
  }
}
