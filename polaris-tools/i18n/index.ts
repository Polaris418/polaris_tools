/**
 * i18n Internationalization System
 * 国际化系统
 */

import { zhCN } from './locales/zh-CN.js';
import { enUS } from './locales/en-US.js';

export type Language = 'zh' | 'en';
export type TranslationKey = keyof typeof zhCN;

const translations = {
  zh: zhCN,
  en: enUS,
};

/**
 * Get translation function
 * 获取翻译函数
 */
export const getTranslation = (language: Language) => {
  return (key: TranslationKey, params?: Record<string, string | number>): string => {
    let text: string = translations[language][key] || key;
    
    // Replace parameters
    if (params) {
      Object.keys(params).forEach((paramKey) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
      });
    }
    
    return text;
  };
};

/**
 * Create translation hook
 * 创建翻译钩子
 */
export const createTranslationHook = (language: Language) => {
  return () => getTranslation(language);
};

export { zhCN, enUS };
