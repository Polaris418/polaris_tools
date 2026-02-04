import React, { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { Icon } from './Icon';
import { 
  lorelei, 
  avataaars, 
  bottts, 
  initials, 
  pixelArt,
  thumbs,
  funEmoji,
  bigSmile
} from '@dicebear/collection';
import { encodeSvgToDataUri } from '../utils/encoding';

// 头像风格配置常量
export const AVATAR_STYLES = [
  { id: 'lorelei', name: 'Lorelei', style: lorelei, description: '可爱卡通风格' },
  { id: 'avataaars', name: 'Avataaars', style: avataaars, description: '经典卡通头像' },
  { id: 'bottts', name: 'Bottts', style: bottts, description: '机器人风格' },
  { id: 'pixelArt', name: 'Pixel Art', style: pixelArt, description: '像素艺术' },
  { id: 'thumbs', name: 'Thumbs', style: thumbs, description: '竖起大拇指' },
  { id: 'funEmoji', name: 'Fun Emoji', style: funEmoji, description: '有趣表情' },
  { id: 'bigSmile', name: 'Big Smile', style: bigSmile, description: '大笑脸' },
  { id: 'initials', name: 'Initials', style: initials, description: '首字母' },
] as const;

interface AvatarStylePickerProps {
  isOpen: boolean;
  currentStyle: string;
  username: string;
  onSelect: (styleId: string) => void;
  onClose: () => void;
}

export const AvatarStylePicker: React.FC<AvatarStylePickerProps> = ({
  isOpen,
  currentStyle,
  username,
  onSelect,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" 
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-surface-dark rounded-xl md:rounded-2xl p-4 md:p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 animate-scale-in" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">选择头像风格</h2>
          <button 
            onClick={onClose} 
            className="text-slate-500 hover:text-slate-700 dark:text-text-secondary dark:hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="关闭"
          >
            <Icon name="close" className="text-xl md:text-2xl" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {AVATAR_STYLES.map((style) => (
            <AvatarStyleOption
              key={style.id}
              style={style}
              username={username}
              isSelected={currentStyle === style.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface AvatarStyleOptionProps {
  style: typeof AVATAR_STYLES[number];
  username: string;
  isSelected: boolean;
  onSelect: (styleId: string) => void;
}

/**
 * AvatarStyleOption 组件 - 单个头像风格选项
 * 
 * Requirements: 12.3 避免不必要的重新渲染
 */
const AvatarStyleOption: React.FC<AvatarStyleOptionProps> = React.memo(({
  style,
  username,
  isSelected,
  onSelect,
}) => {
  const previewSvg = useMemo(() => {
    try {
      // @ts-ignore - DiceBear styles have different option types
      const avatar = createAvatar(style.style, {
        seed: username,
        size: 80,
      });
      return encodeSvgToDataUri(avatar.toString());
    } catch (error) {
      console.error(`Avatar preview generation error for ${style.id}:`, error);
      return '';
    }
  }, [style.id, username]);

  return (
    <button
      onClick={() => onSelect(style.id)}
      className={`p-3 md:p-4 rounded-lg md:rounded-xl border-2 transition-all hover:scale-105 min-h-[120px] md:min-h-[140px] ${
        isSelected
          ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
          : 'border-slate-200 dark:border-border-dark hover:border-slate-300 dark:hover:border-slate-600'
      }`}
      aria-label={`选择 ${style.name} 风格`}
      aria-pressed={isSelected}
    >
      <div 
        className="size-16 md:size-20 mx-auto mb-2 rounded-full bg-slate-100 dark:bg-slate-800 bg-cover bg-center" 
        style={{ backgroundImage: `url("${previewSvg}")` }}
      />
      <p className="text-xs md:text-sm font-medium text-slate-900 dark:text-white">{style.name}</p>
      <p className="text-[10px] md:text-xs text-slate-500 dark:text-text-secondary mt-1">{style.description}</p>
    </button>
  );
});
