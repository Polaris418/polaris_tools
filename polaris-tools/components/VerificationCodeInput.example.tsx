import React, { useState } from 'react';
import { VerificationCodeInput } from './VerificationCodeInput';

/**
 * VerificationCodeInput 组件使用示例
 * VerificationCodeInput Component Usage Examples
 */
export const VerificationCodeInputExamples: React.FC = () => {
  const [code1, setCode1] = useState('');
  const [code2, setCode2] = useState('');
  const [code3, setCode3] = useState('');
  const [showError, setShowError] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  const handleComplete = (code: string) => {
    console.log('验证码输入完成:', code);
    // 这里可以调用 API 验证验证码
  };

  const handleChange = (code: string) => {
    console.log('验证码变化:', code);
    setCode1(code);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            验证码输入组件示例
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Verification Code Input Component Examples
          </p>
        </div>

        {/* 基础用法 */}
        <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            基础用法 / Basic Usage
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            默认 6 位数字验证码输入，支持自动聚焦和跳转
          </p>
          <VerificationCodeInput
            onComplete={handleComplete}
            onChange={handleChange}
          />
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            当前输入: <span className="font-mono font-bold">{code1 || '(空)'}</span>
          </p>
        </section>

        {/* 错误状态 */}
        <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            错误状态 / Error State
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            显示错误提示信息
          </p>
          <VerificationCodeInput
            error={showError}
            errorMessage="验证码错误，请重新输入"
            onChange={(code) => {
              setCode2(code);
              if (code.length === 6) {
                setShowError(true);
              } else {
                setShowError(false);
              }
            }}
          />
          <button
            onClick={() => setShowError(!showError)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {showError ? '隐藏错误' : '显示错误'}
          </button>
        </section>

        {/* 禁用状态 */}
        <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            禁用状态 / Disabled State
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            禁用输入框，通常在验证过程中使用
          </p>
          <VerificationCodeInput
            disabled={isDisabled}
            onChange={setCode3}
          />
          <button
            onClick={() => setIsDisabled(!isDisabled)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {isDisabled ? '启用输入' : '禁用输入'}
          </button>
        </section>

        {/* 自定义长度 */}
        <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            自定义长度 / Custom Length
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            4 位验证码
          </p>
          <VerificationCodeInput
            length={4}
            onComplete={(code) => console.log('4位验证码:', code)}
          />
        </section>

        {/* 完整示例：注册流程 */}
        <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            完整示例：注册流程 / Complete Example: Registration Flow
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                邮箱地址
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              发送验证码
            </button>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                输入验证码
              </label>
              <VerificationCodeInput
                onComplete={(code) => {
                  console.log('注册验证码:', code);
                  // 调用注册 API
                }}
              />
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                验证码已发送到您的邮箱，有效期 10 分钟
              </p>
            </div>
          </div>
        </section>

        {/* 使用说明 */}
        <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            功能特性 / Features
          </h2>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-base mt-0.5">check_circle</span>
              <span>自动聚焦第一个输入框</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-base mt-0.5">check_circle</span>
              <span>输入后自动跳转到下一个输入框</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-base mt-0.5">check_circle</span>
              <span>删除时自动跳转到上一个输入框</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-base mt-0.5">check_circle</span>
              <span>支持粘贴验证码自动分割（Ctrl+V / Cmd+V）</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-base mt-0.5">check_circle</span>
              <span>支持键盘导航（Tab、方向键、Home、End）</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-base mt-0.5">check_circle</span>
              <span>移动端优化（数字键盘）</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-base mt-0.5">check_circle</span>
              <span>无障碍支持（ARIA 标签）</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-base mt-0.5">check_circle</span>
              <span>深色模式支持</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};
