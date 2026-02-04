import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

interface FormatSelectorProps {
  onStyleChange: (style: {id: string; css: string; description: string}) => void;
}

type ElementType = 'h1' | 'h2' | 'h3' | 'body' | '';
type FontSize = '12' | '14' | '16' | '18' | '20' | '24' | '';
type FontFamily = 'SimSun' | 'SimHei' | 'Microsoft YaHei' | 'Arial' | '';
type Color = 'black' | 'red' | 'blue' | 'green' | '';
type Alignment = 'left' | 'center' | 'right' | '';

/**
 * 可视化格式选择器
 * 用户可以通过点击按钮组合来生成样式规则
 */
export const FormatSelector: React.FC<FormatSelectorProps> = ({ onStyleChange }) => {
  const { t, language } = useAppContext();
  
  const [selectedElement, setSelectedElement] = useState<ElementType>('');
  const [selectedFontSize, setSelectedFontSize] = useState<FontSize>('');
  const [selectedFontFamily, setSelectedFontFamily] = useState<FontFamily>('');
  const [selectedColor, setSelectedColor] = useState<Color>('');
  const [selectedAlignment, setSelectedAlignment] = useState<Alignment>('');

  const elementLabels = {
    h1: t('md2word.h1'),
    h2: t('md2word.h2'),
    h3: t('md2word.h3'),
    body: t('md2word.body'),
  };

  const fontSizeLabels = {
    '12': '12号',
    '14': '14号',
    '16': '16号',
    '18': '18号',
    '20': '20号',
    '24': '24号',
  };

  const fontFamilyLabels = {
    'SimSun': t('md2word.font_simsun'),
    'SimHei': t('md2word.font_simhei'),
    'Microsoft YaHei': t('md2word.font_yahei'),
    'Arial': 'Arial',
  };

  const colorLabels = {
    black: t('md2word.color_black'),
    red: t('md2word.color_red'),
    blue: t('md2word.color_blue'),
    green: t('md2word.color_green'),
  };

  const alignmentLabels = {
    left: t('md2word.align_left'),
    center: t('md2word.align_center'),
    right: t('md2word.align_right'),
  };

  const colorValues = {
    black: '#000000',
    red: '#dc2626',
    blue: '#2563eb',
    green: '#16a34a',
  };

  const handleApply = () => {
    if (!selectedElement) {
      return;
    }

    let css = '';
    let description = '';
    const selector = selectedElement === 'body' ? '.markdown-preview p' : `.markdown-preview ${selectedElement}`;

    // 构建描述
    const parts: string[] = [elementLabels[selectedElement]];
    
    if (selectedFontFamily) {
      css += `font-family: ${selectedFontFamily} !important; `;
      parts.push(fontFamilyLabels[selectedFontFamily]);
    }
    
    if (selectedFontSize) {
      css += `font-size: ${selectedFontSize}pt !important; `;
      parts.push(fontSizeLabels[selectedFontSize]);
    }
    
    if (selectedColor) {
      css += `color: ${colorValues[selectedColor]} !important; `;
      parts.push(colorLabels[selectedColor]);
    }
    
    if (selectedAlignment) {
      css += `text-align: ${selectedAlignment} !important; `;
      parts.push(alignmentLabels[selectedAlignment]);
    }

    if (css) {
      const fullCss = `${selector} { ${css}}`;
      description = parts.join(' + ');
      
      onStyleChange({
        id: Date.now().toString(),
        css: fullCss,
        description,
      });

      // 重置选择
      setSelectedElement('');
      setSelectedFontSize('');
      setSelectedFontFamily('');
      setSelectedColor('');
      setSelectedAlignment('');
    }
  };

  const handleReset = () => {
    setSelectedElement('');
    setSelectedFontSize('');
    setSelectedFontFamily('');
    setSelectedColor('');
    setSelectedAlignment('');
  };

  const ButtonGroup: React.FC<{
    title: string;
    options: Record<string, string>;
    selected: string;
    onSelect: (value: string) => void;
  }> = ({ title, options, selected, onSelect }) => (
    <div className="mb-4">
      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{title}</div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(options).map(([value, label]) => (
          <button
            key={value}
            onClick={() => onSelect(selected === value ? '' : value)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
              selected === value
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 提示信息 */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base">info</span>
          <div className="flex-1 text-xs text-amber-800 dark:text-amber-200">
            <div className="font-medium mb-1">
              {language === 'zh' ? '样式智能：未激活' : 'Style Intelligence: Inactive'}
            </div>
            <div className="text-amber-700 dark:text-amber-300 text-[10px]">
              {language === 'zh' 
                ? '自然语言样式解析器即将上线，敬请期待！' 
                : 'Natural language style parser coming soon!'}
            </div>
          </div>
        </div>
      </div>

      {/* 格式选择器 */}
      <div>
        <ButtonGroup
          title={language === 'zh' ? '元素类型' : 'Element Type'}
          options={elementLabels}
          selected={selectedElement}
          onSelect={(v) => setSelectedElement(v as ElementType)}
        />

        <ButtonGroup
          title={language === 'zh' ? '字号' : 'Font Size'}
          options={fontSizeLabels}
          selected={selectedFontSize}
          onSelect={(v) => setSelectedFontSize(v as FontSize)}
        />

        <ButtonGroup
          title={language === 'zh' ? '字体' : 'Font Family'}
          options={fontFamilyLabels}
          selected={selectedFontFamily}
          onSelect={(v) => setSelectedFontFamily(v as FontFamily)}
        />

        <ButtonGroup
          title={language === 'zh' ? '颜色' : 'Color'}
          options={colorLabels}
          selected={selectedColor}
          onSelect={(v) => setSelectedColor(v as Color)}
        />

        <ButtonGroup
          title={language === 'zh' ? '对齐' : 'Alignment'}
          options={alignmentLabels}
          selected={selectedAlignment}
          onSelect={(v) => setSelectedAlignment(v as Alignment)}
        />

        {/* 操作按钮 */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleApply}
            disabled={!selectedElement}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {language === 'zh' ? '应用样式' : 'Apply Style'}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
          >
            {language === 'zh' ? '重置' : 'Reset'}
          </button>
        </div>
      </div>
    </div>
  );
};
