import React, { useState } from 'react';
import { ToolLayout } from '../components/ToolLayout';
import { useAppContext } from '../context/AppContext';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const deriveKey = async (password: string, salt: Uint8Array) => {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 150000,
      hash: 'SHA-256',
    },
    material,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encryptText = async (plainText: string, password: string) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainText)
  );

  return JSON.stringify({
    version: 1,
    algorithm: 'AES-GCM',
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  });
};

export const decryptText = async (payload: string, password: string) => {
  const parsed = JSON.parse(payload) as {
    salt: string;
    iv: string;
    ciphertext: string;
  };
  const salt = base64ToBytes(parsed.salt);
  const iv = base64ToBytes(parsed.iv);
  const ciphertext = base64ToBytes(parsed.ciphertext);
  const key = await deriveKey(password, salt);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return decoder.decode(plainBuffer);
};

export const TextEncryptor: React.FC = () => {
  const { language } = useAppContext();
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [password, setPassword] = useState('');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!password.trim() || !input.trim()) {
      setError(language === 'zh' ? '请输入内容和密码' : 'Please enter text and password');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const result =
        mode === 'encrypt'
          ? await encryptText(input, password)
          : await decryptText(input, password);
      setOutput(result);
    } catch (err) {
      setOutput('');
      setError(
        err instanceof Error
          ? err.message
          : language === 'zh'
            ? '处理失败'
            : 'Failed'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolLayout toolId="text-encryptor">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              文本加密
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('encrypt')}
                className={`px-3 py-1.5 rounded-md text-sm ${mode === 'encrypt' ? 'bg-indigo-600 text-white' : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}
              >
                加密
              </button>
              <button
                type="button"
                onClick={() => setMode('decrypt')}
                className={`px-3 py-1.5 rounded-md text-sm ${mode === 'decrypt' ? 'bg-indigo-600 text-white' : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}
              >
                解密
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5">
            <div className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="输入密码"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
              />
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={mode === 'encrypt' ? '输入要加密的文本' : '粘贴加密后的 JSON 载荷'}
                className="w-full min-h-[320px] px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-sm"
              />
              <button
                type="button"
                onClick={run}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {busy ? '处理中...' : mode === 'encrypt' ? '开始加密' : '开始解密'}
              </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 min-h-[320px]">
                <pre className="text-sm whitespace-pre-wrap break-all font-mono text-slate-900 dark:text-white">
                  {output || '结果会显示在这里'}
                </pre>
              </div>
              {error ? (
                <div className="rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-200">
                  {error}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => output && navigator.clipboard.writeText(output)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                复制结果
              </button>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
};
