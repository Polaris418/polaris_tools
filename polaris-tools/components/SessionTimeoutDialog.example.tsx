import React, { useState } from 'react';
import { SessionTimeoutDialog } from './SessionTimeoutDialog';

/**
 * SessionTimeoutDialog Example
 * 演示会话超时对话框的使用
 */
export const SessionTimeoutDialogExample: React.FC = () => {
  const [showDialog, setShowDialog] = useState(false);
  
  // 设置2分钟后过期
  const expiresAt = Date.now() + 2 * 60 * 1000;

  const handleContinue = () => {
    console.log('用户选择继续使用，刷新 token');
    setShowDialog(false);
    // 在实际应用中，这里会调用 token 刷新逻辑
  };

  const handleLogout = () => {
    console.log('用户选择退出登录');
    setShowDialog(false);
    // 在实际应用中，这里会调用退出登录逻辑
  };

  const handleClose = () => {
    console.log('用户关闭对话框');
    setShowDialog(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">SessionTimeoutDialog Example</h1>
      
      <div className="space-y-4">
        <button
          onClick={() => setShowDialog(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          显示会话超时对话框
        </button>

        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <h2 className="font-semibold mb-2">功能说明：</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>显示倒计时（分:秒格式）</li>
            <li>显示进度条动画</li>
            <li>提供"继续使用"按钮刷新会话</li>
            <li>提供"退出登录"按钮安全退出</li>
            <li>可选的关闭按钮（非模态）</li>
            <li>滑入动画效果</li>
            <li>倒计时结束自动退出</li>
          </ul>
        </div>
      </div>

      {showDialog && (
        <SessionTimeoutDialog
          expiresAt={expiresAt}
          onContinue={handleContinue}
          onLogout={handleLogout}
          onClose={handleClose}
        />
      )}
    </div>
  );
};
