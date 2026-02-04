import React, { useState, useEffect } from 'react';
import { SkeletonCard } from './SkeletonCard';
import { SkeletonList } from './SkeletonList';
import { StandardToolCard } from './StandardToolCard';
import { RecentToolCard } from './RecentToolCard';
import { Tool } from '../types';

/**
 * Skeleton Components Example
 * 演示如何使用骨架屏组件
 */

// 模拟工具数据
const mockTools: Tool[] = [
  {
    id: '1',
    title: 'Word Counter',
    title_zh: '字数统计',
    description: 'Count words and characters',
    description_zh: '统计字数和字符数',
    icon: 'text_fields',
    path: '/tools/word-counter',
    colorClass: 'group-hover:text-indigo-600',
    bgHoverClass: 'bg-indigo-500/0 group-hover:bg-indigo-500/10',
  },
  {
    id: '2',
    title: 'Color Converter',
    title_zh: '颜色转换',
    description: 'Convert between color formats',
    description_zh: '转换颜色格式',
    icon: 'palette',
    path: '/tools/color-converter',
    colorClass: 'group-hover:text-purple-600',
    bgHoverClass: 'bg-purple-500/0 group-hover:bg-purple-500/10',
  },
];

/**
 * Example 1: 标准卡片骨架
 */
export const StandardSkeletonExample: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 模拟 2 秒加载时间
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-4">标准卡片骨架示例</h2>
      
      {isLoading ? (
        <SkeletonCard variant="standard" />
      ) : (
        <StandardToolCard tool={mockTools[0]} />
      )}
      
      <button
        onClick={() => setIsLoading(true)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        重新加载
      </button>
    </div>
  );
};

/**
 * Example 2: 最近使用卡片骨架
 */
export const RecentSkeletonExample: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">最近使用卡片骨架示例</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <SkeletonCard variant="recent" />
            <SkeletonCard variant="recent" />
            <SkeletonCard variant="recent" />
          </>
        ) : (
          <>
            <RecentToolCard tool={{ ...mockTools[0], lastUsed: '2 小时前' }} />
            <RecentToolCard tool={{ ...mockTools[1], lastUsed: '5 小时前' }} />
          </>
        )}
      </div>
      
      <button
        onClick={() => setIsLoading(true)}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        重新加载
      </button>
    </div>
  );
};

/**
 * Example 3: 垂直列表骨架
 */
export const VerticalListSkeletonExample: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">垂直列表骨架示例</h2>
      
      {isLoading ? (
        <SkeletonList count={6} variant="standard" layout="vertical" />
      ) : (
        <div className="flex flex-col gap-4">
          {mockTools.map(tool => (
            <StandardToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
      
      <button
        onClick={() => setIsLoading(true)}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        重新加载
      </button>
    </div>
  );
};

/**
 * Example 4: 网格布局骨架
 */
export const GridSkeletonExample: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">网格布局骨架示例</h2>
      
      {isLoading ? (
        <SkeletonList count={6} variant="recent" layout="grid" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockTools.map(tool => (
            <RecentToolCard key={tool.id} tool={{ ...tool, lastUsed: '刚刚' }} />
          ))}
        </div>
      )}
      
      <button
        onClick={() => setIsLoading(true)}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        重新加载
      </button>
    </div>
  );
};

/**
 * Example 5: 混合使用示例（实际页面场景）
 */
export const MixedSkeletonExample: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">混合使用示例（Dashboard 页面）</h2>
      
      {/* 最近使用区域 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">最近使用</h3>
        {isLoading ? (
          <SkeletonList count={3} variant="recent" layout="grid" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockTools.map(tool => (
              <RecentToolCard key={tool.id} tool={{ ...tool, lastUsed: '刚刚' }} />
            ))}
          </div>
        )}
      </div>
      
      {/* 所有工具区域 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">所有工具</h3>
        {isLoading ? (
          <SkeletonList count={4} variant="standard" layout="vertical" />
        ) : (
          <div className="flex flex-col gap-4">
            {mockTools.map(tool => (
              <StandardToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </div>
      
      <button
        onClick={() => setIsLoading(true)}
        className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        重新加载
      </button>
    </div>
  );
};

/**
 * Example 6: 自定义数量示例
 */
export const CustomCountExample: React.FC = () => {
  const [count, setCount] = useState(3);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">自定义数量示例</h2>
      
      <div className="mb-4 flex items-center gap-4">
        <label className="font-medium">骨架卡片数量:</label>
        <input
          type="number"
          min="1"
          max="20"
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value) || 1)}
          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg w-20"
        />
      </div>
      
      <SkeletonList count={count} variant="standard" layout="vertical" />
    </div>
  );
};

/**
 * 完整示例页面
 */
export const SkeletonExamplesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto py-8 space-y-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Skeleton Screen 组件示例</h1>
          <p className="text-slate-600 dark:text-slate-400">
            演示骨架屏组件的各种使用场景
          </p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
          <StandardSkeletonExample />
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
          <RecentSkeletonExample />
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
          <VerticalListSkeletonExample />
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
          <GridSkeletonExample />
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
          <MixedSkeletonExample />
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
          <CustomCountExample />
        </div>
      </div>
    </div>
  );
};
