import React, { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';

interface VerificationCodeInputProps {
  /** 验证码长度，默认为 6 */
  length?: number;
  /** 当验证码输入完成时的回调 */
  onComplete?: (code: string) => void;
  /** 当验证码改变时的回调 */
  onChange?: (code: string) => void;
  /** 是否禁用输入 */
  disabled?: boolean;
  /** 是否显示错误状态 */
  error?: boolean;
  /** 错误提示信息 */
  errorMessage?: string;
  /** 是否自动聚焦第一个输入框 */
  autoFocus?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 验证码输入组件
 * Verification Code Input Component
 * 
 * 用于输入邮件验证码，支持自动聚焦、粘贴、键盘导航等功能
 * Used for entering email verification codes with auto-focus, paste, keyboard navigation support
 */
export const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({
  length = 6,
  onComplete,
  onChange,
  disabled = false,
  error = false,
  errorMessage,
  autoFocus = true,
  className = ''
}) => {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 初始化 refs 数组
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // 自动聚焦第一个输入框
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // 处理输入变化
  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // 只允许输入数字
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);

    // 触发 onChange 回调
    if (onChange) {
      onChange(newValues.join(''));
    }

    // 如果输入了值，自动跳转到下一个输入框
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // 如果所有输入框都填满了，触发 onComplete 回调
    if (newValues.every(v => v !== '') && onComplete) {
      onComplete(newValues.join(''));
    }
  };

  // 处理键盘事件
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // 退格键：删除当前值并跳转到上一个输入框
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newValues = [...values];
      
      if (values[index]) {
        // 如果当前输入框有值，删除当前值
        newValues[index] = '';
        setValues(newValues);
        if (onChange) {
          onChange(newValues.join(''));
        }
      } else if (index > 0) {
        // 如果当前输入框没有值，删除上一个输入框的值并聚焦
        newValues[index - 1] = '';
        setValues(newValues);
        inputRefs.current[index - 1]?.focus();
        if (onChange) {
          onChange(newValues.join(''));
        }
      }
    }
    
    // 左箭头：跳转到上一个输入框
    else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
    
    // 右箭头：跳转到下一个输入框
    else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
    
    // Home 键：跳转到第一个输入框
    else if (e.key === 'Home') {
      e.preventDefault();
      inputRefs.current[0]?.focus();
    }
    
    // End 键：跳转到最后一个输入框
    else if (e.key === 'End') {
      e.preventDefault();
      inputRefs.current[length - 1]?.focus();
    }
  };

  // 处理粘贴事件
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    
    // 只处理纯数字的粘贴内容
    if (!/^\d+$/.test(pastedData)) {
      return;
    }

    // 截取前 length 位数字
    const digits = pastedData.slice(0, length).split('');
    const newValues = [...values];
    
    digits.forEach((digit, index) => {
      if (index < length) {
        newValues[index] = digit;
      }
    });
    
    setValues(newValues);

    // 触发 onChange 回调
    if (onChange) {
      onChange(newValues.join(''));
    }

    // 聚焦到下一个空输入框或最后一个输入框
    const nextEmptyIndex = newValues.findIndex(v => v === '');
    const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : length - 1;
    inputRefs.current[focusIndex]?.focus();

    // 如果所有输入框都填满了，触发 onComplete 回调
    if (newValues.every(v => v !== '') && onComplete) {
      onComplete(newValues.join(''));
    }
  };

  // 处理聚焦事件：选中输入框内容
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* 输入框容器 */}
      <div 
        className="flex gap-2 justify-center"
        role="group"
        aria-label="验证码输入"
      >
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={values[index]}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={handleFocus}
            disabled={disabled}
            className={`
              w-12 h-14 text-center text-2xl font-bold rounded-lg
              border-2 transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error 
                ? 'border-red-500 text-red-600 dark:border-red-400 dark:text-red-400 focus:border-red-500 focus:ring-red-500' 
                : 'border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500'
              }
              ${values[index] 
                ? 'bg-indigo-50 dark:bg-indigo-900/20' 
                : 'bg-white dark:bg-slate-800'
              }
              hover:border-indigo-400 dark:hover:border-indigo-500
            `}
            aria-label={`验证码第 ${index + 1} 位`}
            aria-invalid={error}
            aria-describedby={error && errorMessage ? 'verification-code-error' : undefined}
          />
        ))}
      </div>

      {/* 错误提示 */}
      {error && errorMessage && (
        <div 
          id="verification-code-error"
          className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-1 duration-200"
          role="alert"
        >
          <span className="material-symbols-outlined text-base">error</span>
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
