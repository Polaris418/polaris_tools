import React, { useState, useMemo, useEffect } from 'react';
import { createAvatar } from '@dicebear/core';
import { Icon } from './Icon';
import { AVATAR_STYLES } from './AvatarStylePicker';
import { encodeSvgToDataUri } from '../utils/encoding';

interface AvatarEditorProps {
  isOpen: boolean;
  username: string;
  currentStyle: string;
  currentConfig: Record<string, any>;
  onSave: (styleId: string, config: Record<string, any>) => Promise<void>;
  onClose: () => void;
}

// 常用的头像配置选项（用于随机生成）
// 使用最小配置，主要依赖 seed 变化来生成不同头像
const COMMON_OPTIONS: Record<string, any> = {
  lorelei: {
    // Lorelei 主要依赖 seed，不使用旋转和翻转以保持头像方向正常
  },
  avataaars: {
    // Avataaars 不需要额外配置，seed 会自动生成不同的五官组合
  },
  bottts: {
    // Bottts 不需要额外配置，seed 会自动生成不同的机器人
  },
  pixelArt: {
    // Pixel Art 不需要额外配置，seed 会自动生成不同的像素头像
  },
};

// 生成随机配置
const generateRandomConfig = (styleId: string): Record<string, any> => {
  const options = COMMON_OPTIONS[styleId];
  if (!options) return {};

  const config: Record<string, any> = {};
  Object.keys(options).forEach(key => {
    const values = options[key];
    if (Array.isArray(values) && values.length > 0) {
      config[key] = values[Math.floor(Math.random() * values.length)];
    }
  });
  
  return config;
};

interface AvatarOption {
  id: number;
  config: Record<string, any>;
  preview: string;
}

export const AvatarEditor: React.FC<AvatarEditorProps> = ({
  isOpen,
  username,
  currentStyle,
  currentConfig,
  onSave,
  onClose,
}) => {
  const [selectedStyle, setSelectedStyle] = useState(currentStyle);
  const [avatarOptions, setAvatarOptions] = useState<AvatarOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelectedStyle(currentStyle);
  }, [currentStyle]);

  // 初始化时生成头像选项
  useEffect(() => {
    if (isOpen && selectedStyle) {
      generateAvatarOptions();
    }
  }, [isOpen, selectedStyle, username]);

  // 生成多个随机头像选项
  const generateAvatarOptions = () => {
    setIsGenerating(true);
    
    const styleConfig = AVATAR_STYLES.find(s => s.id === selectedStyle);
    if (!styleConfig) {
      setIsGenerating(false);
      return;
    }

    const options: AvatarOption[] = [];
    const count = 9; // 生成9个选项
    const timestamp = Date.now();

    for (let i = 0; i < count; i++) {
      // 使用完全随机的 seed 来生成不同的头像
      const randomSeed = `avatar-${timestamp}-${i}-${Math.random().toString(36).substring(2, 15)}`;
      const config = generateRandomConfig(selectedStyle);
      
      try {
        // @ts-ignore
        const avatar = createAvatar(styleConfig.style, {
          seed: randomSeed,
          size: 150,
          ...config,
        });

        const svgString = avatar.toString();
        const dataUri = encodeSvgToDataUri(svgString);

        options.push({
          id: timestamp + i,
          config: {
            seed: randomSeed,
            ...config,
          },
          preview: dataUri,
        });
      } catch (error) {
        console.error('Error generating avatar:', error);
      }
    }

    setAvatarOptions(options);
    setSelectedOptionId(null);
    setIsGenerating(false);
  };

  const handleSave = async () => {
    if (selectedOptionId === null) {
      return;
    }

    const selectedOption = avatarOptions.find(opt => opt.id === selectedOptionId);
    if (selectedOption) {
      setIsSaving(true);
      try {
        await onSave(selectedStyle, selectedOption.config);
        onClose();
      } catch (error) {
        console.error('Failed to save avatar:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // 生成风格预览图
  const generateStylePreview = (styleId: string): string => {
    const styleConfig = AVATAR_STYLES.find(s => s.id === styleId);
    if (!styleConfig) return '';

    try {
      // @ts-ignore
      const avatar = createAvatar(styleConfig.style, {
        seed: `style-preview-${styleId}`,
        size: 60,
      });
      return encodeSvgToDataUri(avatar.toString());
    } catch (error) {
      return '';
    }
  };

  const handleStyleChange = (newStyle: string) => {
    setSelectedStyle(newStyle);
    setSelectedOptionId(null);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" 
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-surface-dark rounded-xl md:rounded-2xl p-4 md:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 animate-scale-in" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">选择你的头像</h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              点击选择一个头像，或点击"换一批"生成更多选项
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-500 hover:text-slate-700 dark:text-text-secondary dark:hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="关闭"
          >
            <Icon name="close" className="text-2xl" />
          </button>
        </div>

        {/* Style Selector */}
        <div className="mb-4">
          <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            头像风格
          </label>
          <div className="grid grid-cols-4 gap-2">
            {AVATAR_STYLES.map(style => {
              const previewImage = generateStylePreview(style.id);
              return (
                <button
                  key={style.id}
                  onClick={() => handleStyleChange(style.id)}
                  className={`flex flex-col items-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedStyle === style.id
                      ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {previewImage ? (
                    <img 
                      src={previewImage}
                      alt={style.name}
                      className="size-8 rounded-full bg-white dark:bg-slate-700 object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="size-8 rounded-full bg-white dark:bg-slate-700 flex-shrink-0" />
                  )}
                  <span className="truncate text-center w-full">{style.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Avatar Options Grid */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm md:text-base font-semibold text-slate-900 dark:text-white">
              选择一个头像
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={generateAvatarOptions}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm"
              >
                <Icon name="refresh" className={`text-base ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? '生成中...' : '换一批'}
              </button>
              <button
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={selectedOptionId === null || isSaving}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isSaving ? (
                  <>
                    <Icon name="hourglass_empty" className="text-base animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Icon name="check" className="text-base" />
                    保存
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {avatarOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedOptionId(option.id)}
                className={`relative aspect-square rounded-lg overflow-hidden transition-all hover:scale-105 bg-slate-100 dark:bg-slate-800 ${
                  selectedOptionId === option.id
                    ? 'ring-4 ring-indigo-500 shadow-xl'
                    : 'ring-2 ring-slate-200 dark:ring-slate-700 hover:ring-slate-300 dark:hover:ring-slate-600'
                }`}
              >
                {option.preview ? (
                  <img 
                    src={option.preview}
                    alt="Avatar option"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon name="image" className="text-3xl text-slate-400" />
                  </div>
                )}
                {selectedOptionId === option.id && (
                  <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                    <div className="bg-indigo-500 rounded-full p-1.5 shadow-lg">
                      <Icon name="check" className="text-white text-lg" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {avatarOptions.length === 0 && !isGenerating && (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500">
              <Icon name="image" className="text-4xl mb-2" />
              <p className="text-sm">点击"换一批"生成头像</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
