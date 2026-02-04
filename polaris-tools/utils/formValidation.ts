/**
 * Form Validation Utilities
 * 
 * Validates user profile form data
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

export interface EditFormData {
  nickname: string;
  email: string;
  bio: string;
}

export interface FormErrors {
  nickname?: string;
  email?: string;
  bio?: string;
}

/**
 * Validates the profile edit form
 * 
 * @param formData - The form data to validate
 * @returns An object containing validation errors, empty if all valid
 */
export const validateForm = (formData: EditFormData): FormErrors => {
  const errors: FormErrors = {};
  
  // 验证邮箱格式（正则表达式）
  // Requirements: 5.1, 5.2
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (formData.email && !emailRegex.test(formData.email)) {
    errors.email = '请输入有效的邮箱地址';
  }
  
  // 验证昵称长度（最大 50 字符）
  // Requirements: 5.3, 5.4
  if (formData.nickname && formData.nickname.length > 50) {
    errors.nickname = '昵称不能超过 50 个字符';
  }
  
  // 验证简介长度（最大 200 字符）
  // Requirements: 5.5, 5.6
  if (formData.bio && formData.bio.length > 200) {
    errors.bio = '个人简介不能超过 200 个字符';
  }
  
  return errors;
};
