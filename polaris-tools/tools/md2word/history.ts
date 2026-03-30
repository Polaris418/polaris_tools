export interface Md2WordHistoryEntry {
  id: number;
  clientFileId: string;
  documentName: string;
  content: string;
  previewText?: string;
  wordCount?: number;
  charCount?: number;
  updatedAt: string;
}

export const isSubscribedHistoryUser = (planType?: number | null): boolean =>
  typeof planType === 'number' && planType > 0;

export const formatMd2WordHistoryTime = (updatedAt: string, language: string): string => {
  const timestamp = new Date(updatedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return language === 'zh' ? '刚刚' : 'Just now';
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return language === 'zh' ? '刚刚' : 'Just now';
  }

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / minute));
    return language === 'zh' ? `${minutes} 分钟前` : `${minutes} min ago`;
  }

  if (diffMs < day) {
    const hours = Math.max(1, Math.floor(diffMs / hour));
    return language === 'zh' ? `${hours} 小时前` : `${hours}h ago`;
  }

  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
};

const STORAGE_PREFIX = 'md2word_history';
const DEFAULT_FREE_HISTORY_LIMIT = 5;

export const getMd2WordHistoryLimit = (planType?: number | null): number | null =>
  isSubscribedHistoryUser(planType) ? null : DEFAULT_FREE_HISTORY_LIMIT;

export const loadMd2WordHistory = (userId: string): Md2WordHistoryEntry[] => {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}_${userId}`);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Md2WordHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const upsertMd2WordHistory = ({
  userId,
  planType,
  entry,
}: {
  userId: string;
  planType?: number | null;
  entry: Omit<Md2WordHistoryEntry, 'updatedAt'> & { updatedAt: number };
}): Md2WordHistoryEntry[] => {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const nextEntry: Md2WordHistoryEntry = {
    ...entry,
    updatedAt: new Date(entry.updatedAt).toISOString(),
  };
  const current = loadMd2WordHistory(userId);
  const next = [nextEntry, ...current.filter((item) => item.id !== entry.id)].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
  const limit = getMd2WordHistoryLimit(planType);
  const trimmed = typeof limit === 'number' ? next.slice(0, limit) : next;

  localStorage.setItem(`${STORAGE_PREFIX}_${userId}`, JSON.stringify(trimmed));
  return trimmed;
};
