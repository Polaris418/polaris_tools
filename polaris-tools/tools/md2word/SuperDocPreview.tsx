import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SuperDocEditor,
  type SuperDocEditorCreateEvent,
  type SuperDocEditorUpdateEvent,
  type SuperDocRef,
} from '@superdoc-dev/react';
import '@superdoc-dev/react/style.css';
import type { Editor as SuperDocEditorInstance } from 'superdoc';
import { markdownToDocx, type SuperDocDocxExportAdapter } from '../../utils/documentConverter';
import type { ResolvedFormatConfig, ScopedFormatPatch } from './formatting/types';
import { parseMarkdownBlocks } from './formatting/parseMarkdownBlocks';
import type {
  SuperDocFormattingApplicationRequest,
  SuperDocFormattingApplicationResult,
  SuperDocFormattingReviewState,
  SuperDocRuntimeSelectionState,
} from './superdocSelection';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const SUPERDOC_INGEST_ORIGIN = 'https://ingest.superdoc.dev';
const SUPERDOC_PREVIEW_PAGE_BREAK = '[[SUPERDOC_PAGE_BREAK]]';
const SUPERDOC_PREVIEW_TOC_TITLE = '[[SUPERDOC_TOC_TITLE:';
const SUPERDOC_PREVIEW_TOC_ITEM = '[[SUPERDOC_TOC_ITEM:';

export interface SuperDocPreviewStatus {
  phase: 'idle' | 'preparing' | 'ready' | 'error';
  message?: string;
}

interface SuperDocFocusState {
  title: string;
  description: string;
  kind: 'document' | 'block' | 'selection';
  badge: string;
  targetTypeLabel?: string;
}

interface SuperDocPreviewProps {
  markdown: string;
  documentName: string;
  language?: string;
  formatConfig: ResolvedFormatConfig;
  scopedPatches: ScopedFormatPatch[];
  focusState?: SuperDocFocusState | null;
  onSelectionChange?: (selection: SuperDocRuntimeSelectionState | null) => void;
  onRuntimeAdapterChange?: (adapter: SuperDocDocxExportAdapter | null) => void;
  onStatusChange?: (status: SuperDocPreviewStatus) => void;
  pendingFormattingRequest?: SuperDocFormattingApplicationRequest | null;
  reviewState?: SuperDocFormattingReviewState | null;
  undoSignal?: number;
  onApplyFormatting?: (result: SuperDocFormattingApplicationResult) => void;
  onOpenReview?: () => void;
  onCloseReview?: () => void;
}

const normalizeDocumentName = (fileName: string): string => {
  const trimmed = fileName.trim() || 'Untitled';
  return trimmed.toLowerCase().endsWith('.docx') ? trimmed : `${trimmed.replace(/\.md$/i, '')}.docx`;
};

const stripHeadingMarkdown = (value: string): string => value.replace(/^#{1,6}\s+/, '').trim();

const getLanguageTag = (language?: string): 'zh' | 'en' =>
  language?.startsWith('zh') ? 'zh' : 'en';

const resolveSuperDocAnchorTarget = (
  container: HTMLElement,
  href: string
): HTMLElement | null => {
  const hash = href.replace(/^#/, '');
  if (!hash) {
    return null;
  }

  const escapedHash =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(hash) : hash;
  const directMatch =
    document.getElementById(hash) ??
    container.querySelector<HTMLElement>(`#${escapedHash}, [id="${escapedHash}"], [name="${escapedHash}"]`);
  if (directMatch) {
    return directMatch;
  }

  const referenceMatch = hash.match(/^ref-(\d+)$/i);
  if (!referenceMatch) {
    return null;
  }

  const referenceLabel = `[${referenceMatch[1]}]`;
  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>('.superdoc-line, .superdoc-fragment, p, div')
  );

  return (
    candidates.find((element) => {
      const text = element.textContent?.trim() ?? '';
      return text.startsWith(referenceLabel) && !element.closest('.generic-popover');
    }) ?? null
  );
};

export const decorateSuperDocPageNumbers = (
  container: HTMLElement,
  enabled: boolean
): number => {
  const existing = Array.from(
    container.querySelectorAll<HTMLElement>('[data-md2word-page-number="true"]')
  );
  existing.forEach((element) => element.remove());

  const pages = Array.from(container.querySelectorAll<HTMLElement>('.superdoc-page'));
  pages.forEach((page) => {
    if (page.dataset.md2wordPatchedPosition === 'true') {
      page.style.position = '';
      delete page.dataset.md2wordPatchedPosition;
    }
  });

  if (!enabled) {
    return 0;
  }

  pages.forEach((page, index) => {
    if (getComputedStyle(page).position === 'static') {
      page.style.position = 'relative';
      page.dataset.md2wordPatchedPosition = 'true';
    }

    const pageNumber = document.createElement('div');
    pageNumber.dataset.md2wordPageNumber = 'true';
    pageNumber.className = 'md2word-superdoc-page-number';
    pageNumber.textContent = String(index + 1);
    page.appendChild(pageNumber);
  });

  return pages.length;
};

export const buildSuperDocPreviewMarkdown = (
  markdown: string,
  config: ResolvedFormatConfig,
  language: string
): { markdown: string; config: ResolvedFormatConfig } => {
  return {
    markdown,
    config: {
      ...config,
      document: {
        ...config.document,
        includeTableOfContents: false,
      },
    },
  };
};

const isTruthy = (value: unknown): boolean => value === true || value === 'true' || value === 1;

const HEADING_LEVEL_BY_TARGET: Record<string, number> = {
  h1: 1,
  h2: 2,
  h3: 3,
};

const callCommand = (
  editor: SuperDocEditorInstance,
  names: string[],
  ...args: unknown[]
): boolean => {
  const commands = (editor.commands ?? {}) as Record<string, (...innerArgs: unknown[]) => unknown>;
  for (const name of names) {
    const command = commands[name];
    if (typeof command !== 'function') {
      continue;
    }

    try {
      const result = command(...args);
      if (typeof result === 'boolean') {
        return result;
      }
      return true;
    } catch {
      continue;
    }
  }

  return false;
};

const applyFormattingTargetPrelude = (
  editor: SuperDocEditorInstance,
  target: string
): boolean => {
  if (target in HEADING_LEVEL_BY_TARGET) {
    return callCommand(editor, ['setHeading'], { level: HEADING_LEVEL_BY_TARGET[target] });
  }

  return ['body', 'document', 'paragraph', 'blockquote', 'list', 'code'].includes(target);
};

const applyFormattingPropertyChange = (
  editor: SuperDocEditorInstance,
  change: SuperDocFormattingApplicationRequest['changes'][number]
): boolean => {
  switch (change.property) {
    case 'bold':
      if (isTruthy(change.value)) {
        return callCommand(editor, ['setBold', 'toggleBold']);
      }
      return callCommand(editor, ['unsetBold']);
    case 'italic':
      if (isTruthy(change.value)) {
        return callCommand(editor, ['setItalic', 'toggleItalic']);
      }
      return callCommand(editor, ['unsetItalic']);
    case 'fontFamily':
      return callCommand(editor, ['setFontFamily'], String(change.value));
    case 'fontSizePt':
      return callCommand(editor, ['setFontSize'], `${change.value}pt`);
    case 'color':
      return callCommand(editor, ['setTextColor', 'setColor'], String(change.value));
    case 'align':
      return callCommand(editor, ['setTextAlign'], String(change.value));
    case 'lineSpacing':
      return callCommand(editor, ['setLineHeight'], change.value);
    case 'indentLeftPt':
      return callCommand(editor, ['setTextIndentation'], change.value);
    default:
      return false;
  }
};

export const applySuperDocFormattingChanges = (
  editor: SuperDocEditorInstance,
  changes: SuperDocFormattingApplicationRequest['changes']
): Pick<SuperDocFormattingApplicationResult, 'appliedLabels' | 'unsupportedLabels'> => {
  const appliedLabels: string[] = [];
  const unsupportedLabels: string[] = [];
  const changesByTarget = new Map<string, SuperDocFormattingApplicationRequest['changes']>();

  changes.forEach((change) => {
    const bucket = changesByTarget.get(change.target);
    if (bucket) {
      bucket.push(change);
      return;
    }

    changesByTarget.set(change.target, [change]);
  });

  changesByTarget.forEach((targetChanges, target) => {
    if (!applyFormattingTargetPrelude(editor, target)) {
      unsupportedLabels.push(...targetChanges.map((change) => change.label));
      return;
    }

    targetChanges.forEach((change) => {
      if (applyFormattingPropertyChange(editor, change)) {
        appliedLabels.push(change.label);
      } else {
        unsupportedLabels.push(change.label);
      }
    });
  });

  return {
    appliedLabels,
    unsupportedLabels,
  };
};

const buildSelectionState = (
  editor: SuperDocEditorInstance | null,
  language: string
): SuperDocRuntimeSelectionState => {
  const selection = editor?.view?.state.selection;
  if (!editor || !selection) {
    return {
      source: 'superdoc',
      isReady: false,
      hasSelection: false,
      text: '',
      from: 0,
      to: 0,
      detailLabel:
        language === 'zh'
          ? 'SuperDoc 正在初始化，当前还没有可读取的选区。'
          : 'SuperDoc is initializing and selection is not ready yet.',
    };
  }

  const text = selection.empty
    ? ''
    : editor.view?.state.doc.textBetween(selection.from, selection.to, '\n', ' ') ?? '';
  const trimmedText = text.trim();

  return {
    source: 'superdoc',
    isReady: true,
    hasSelection: !selection.empty && trimmedText.length > 0,
    text: trimmedText,
    from: selection.from,
    to: selection.to,
    detailLabel:
      !selection.empty && trimmedText.length > 0
        ? language === 'zh'
          ? '当前选区来自 SuperDoc 文档，AI 会基于所选文本生成格式建议。'
          : 'The current selection comes from the SuperDoc document and will be used for AI suggestions.'
        : language === 'zh'
          ? '当前未选择文本，AI 会回退为整篇文档建议。'
          : 'No text is selected, so AI will fall back to the whole document.',
  };
};

export const SuperDocPreview: React.FC<SuperDocPreviewProps> = ({
  markdown,
  documentName,
  language: languageProp,
  formatConfig,
  scopedPatches,
  focusState = null,
  onSelectionChange,
  onRuntimeAdapterChange,
  onStatusChange,
  pendingFormattingRequest = null,
  reviewState = null,
  undoSignal = 0,
  onApplyFormatting,
  onOpenReview,
  onCloseReview,
}) => {
  const editorRef = useRef<SuperDocEditorInstance | null>(null);
  const superDocRef = useRef<SuperDocRef>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const generationIdRef = useRef(0);
  const appliedRequestRef = useRef<string | null>(null);
  const lastUndoSignalRef = useRef(undoSignal);
  const lastReviewStatusRef = useRef<SuperDocFormattingReviewState['status'] | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [status, setStatus] = useState<SuperDocPreviewStatus>({ phase: 'idle' });
  const language = useMemo(
    () => getLanguageTag(languageProp ?? document.documentElement.lang),
    [languageProp]
  );
  const focusToneClass = focusState
      ? focusState.kind === 'document'
      ? 'border-l-4 border-emerald-200 bg-emerald-50/90 text-emerald-950 ring-emerald-200/80'
      : focusState.kind === 'block'
        ? 'border-l-4 border-indigo-200 bg-indigo-50/90 text-indigo-950 ring-indigo-200/80'
        : 'border-l-4 border-cyan-200 bg-cyan-50/90 text-cyan-950 ring-cyan-200/80'
    : '';
  const focusTargetTypeLabel = focusState?.targetTypeLabel
    ? focusState.targetTypeLabel
    : focusState?.kind === 'document'
      ? language === 'zh'
        ? '整篇文档'
        : 'Whole document'
      : focusState?.kind === 'block'
        ? language === 'zh'
          ? '当前块'
          : 'Current block'
        : language === 'zh'
          ? '当前选区'
          : 'Current selection';
  const focusKindLabel = focusState
    ? focusState.kind === 'document'
      ? language === 'zh'
        ? '文档级聚焦'
        : 'Document focus'
      : focusState.kind === 'block'
        ? language === 'zh'
          ? '块级聚焦'
          : 'Block focus'
        : language === 'zh'
          ? '选区聚焦'
          : 'Selection focus'
    : '';
  const isRealBrowserRuntime = useMemo(() => {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    return typeof window !== 'undefined' && !userAgent.includes('happy-dom') && !userAgent.includes('jsdom');
  }, []);

  const pushStatus = useCallback(
    (nextStatus: SuperDocPreviewStatus) => {
      setStatus(nextStatus);
      onStatusChange?.(nextStatus);
    },
    [onStatusChange]
  );

  const syncSelection = useCallback(() => {
    const nextSelection = buildSelectionState(editorRef.current, language);
    onSelectionChange?.(nextSelection);
  }, [language, onSelectionChange]);

  const buildRuntimeAdapter = useCallback((): SuperDocDocxExportAdapter | null => {
    if (!documentFile || !superDocRef.current?.getInstance()) {
      return null;
    }

    return {
      exportDocx: async () => {
        const instance = superDocRef.current?.getInstance();
        if (!instance) {
          return null;
        }

        let result: unknown;
        try {
          result = await instance.export({
            exportType: 'docx',
            triggerDownload: false,
          });
        } catch {
          return null;
        }

        if (result instanceof Blob) {
          return result;
        }

        if (result instanceof ArrayBuffer) {
          return new Blob([result], { type: DOCX_MIME });
        }

        if (ArrayBuffer.isView(result)) {
          return new Blob([result.buffer], { type: DOCX_MIME });
        }

        return null;
      },
    };
  }, [documentFile]);

  useEffect(() => {
    onRuntimeAdapterChange?.(buildRuntimeAdapter());
  }, [buildRuntimeAdapter, onRuntimeAdapterChange]);

  useEffect(() => {
    const nextStatus = reviewState?.status ?? 'idle';
    const previousStatus = lastReviewStatusRef.current;
    if (nextStatus === previousStatus) {
      return;
    }

    if (nextStatus === 'review') {
      onOpenReview?.();
    } else if (previousStatus === 'review' && nextStatus !== 'review') {
      onCloseReview?.();
    }

    lastReviewStatusRef.current = nextStatus;
  }, [onCloseReview, onOpenReview, reviewState?.status]);

  useEffect(() => {
    let disposed = false;
    const currentGeneration = generationIdRef.current + 1;
    generationIdRef.current = currentGeneration;

    pushStatus({
      phase: 'preparing',
      message: language === 'zh' ? '正在生成 SuperDoc 文档…' : 'Preparing SuperDoc document…',
    });

    const timer = window.setTimeout(async () => {
      try {
        const previewDocument = buildSuperDocPreviewMarkdown(markdown, formatConfig, language);
        const blob = await markdownToDocx(
          previewDocument.markdown,
          previewDocument.config,
          scopedPatches
        );
        if (disposed || generationIdRef.current !== currentGeneration) {
          return;
        }

        const nextFile = new File([blob], normalizeDocumentName(documentName), {
          type: DOCX_MIME,
        });
        setDocumentFile(nextFile);
        pushStatus({
          phase: 'ready',
          message: language === 'zh' ? 'SuperDoc 文档已就绪' : 'SuperDoc document is ready',
        });
      } catch (error) {
        if (disposed || generationIdRef.current !== currentGeneration) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : language === 'zh'
              ? 'SuperDoc 文档准备失败'
              : 'Failed to prepare SuperDoc document';
        setDocumentFile(null);
        pushStatus({ phase: 'error', message });
        onSelectionChange?.(null);
      }
    }, 180);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [documentName, formatConfig, language, markdown, onSelectionChange, pushStatus, scopedPatches]);

  useEffect(() => {
    if (status.phase === 'error') {
      onRuntimeAdapterChange?.(null);
    }
  }, [onRuntimeAdapterChange, status.phase]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    let frameId = 0;
    let disposed = false;
    const applyDecoration = () => {
      if (disposed) {
        return;
      }

      decorateSuperDocPageNumbers(shell, formatConfig.document.pageNumbers);
    };

    frameId = window.requestAnimationFrame(applyDecoration);
    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(applyDecoration);
    });

    observer.observe(shell, {
      childList: true,
      subtree: true,
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      decorateSuperDocPageNumbers(shell, false);
    };
  }, [documentFile, formatConfig.document.pageNumbers, status.phase]);

  useEffect(() => {
    if (!pendingFormattingRequest || pendingFormattingRequest.changes.length === 0) {
      return;
    }

    if (appliedRequestRef.current === pendingFormattingRequest.requestId) {
      return;
    }

    const editor = editorRef.current;
    if (!editor) {
      onApplyFormatting?.({
        requestId: pendingFormattingRequest.requestId,
        success: false,
        appliedCount: 0,
        appliedLabels: [],
        unsupportedLabels: pendingFormattingRequest.changes.map((change) => change.label),
        error: language === 'zh' ? 'SuperDoc 编辑器尚未就绪' : 'SuperDoc editor is not ready',
      });
      appliedRequestRef.current = pendingFormattingRequest.requestId;
      return;
    }

    const { appliedLabels, unsupportedLabels } = applySuperDocFormattingChanges(
      editor,
      pendingFormattingRequest.changes
    );

    syncSelection();
    onApplyFormatting?.({
      requestId: pendingFormattingRequest.requestId,
      success: appliedLabels.length > 0,
      appliedCount: appliedLabels.length,
      appliedLabels,
      unsupportedLabels,
      error:
        appliedLabels.length === 0
          ? language === 'zh'
            ? '当前选中的格式项暂不支持直接写入 SuperDoc'
            : 'The selected formatting changes are not supported by SuperDoc yet'
          : undefined,
    });
    appliedRequestRef.current = pendingFormattingRequest.requestId;
  }, [language, onApplyFormatting, pendingFormattingRequest, syncSelection]);

  useEffect(() => {
    if (undoSignal === lastUndoSignalRef.current) {
      return;
    }

    lastUndoSignalRef.current = undoSignal;
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    callCommand(editor, ['undo']);
    syncSelection();
  }, [syncSelection, undoSignal]);

  const handleEditorCreate = useCallback(
    ({ editor }: SuperDocEditorCreateEvent) => {
      editorRef.current = editor;
      if (typeof editor.on === 'function') {
        editor.on('selectionUpdate', syncSelection);
        editor.on('focus', syncSelection);
        editor.on('blur', syncSelection);
        editor.on('update', syncSelection);
      }
      syncSelection();
    },
    [syncSelection]
  );

  const handleEditorUpdate = useCallback(
    (_event: SuperDocEditorUpdateEvent) => {
      syncSelection();
    },
    [syncSelection]
  );

  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (editor && typeof editor.off === 'function') {
        editor.off('selectionUpdate', syncSelection);
        editor.off('focus', syncSelection);
        editor.off('blur', syncSelection);
        editor.off('update', syncSelection);
      }
      onRuntimeAdapterChange?.(null);
      onSelectionChange?.(null);
    };
  }, [onRuntimeAdapterChange, onSelectionChange, syncSelection]);

  const handleShellClickCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor || !(event.ctrlKey || event.metaKey)) {
        return;
      }

      const href = anchor.getAttribute('href');
      const shell = shellRef.current;
      if (!href || !shell) {
        return;
      }

      const anchorTarget = resolveSuperDocAnchorTarget(shell, href);
      if (!anchorTarget) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      anchorTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      anchorTarget.dataset.ctrlAnchorTarget = 'true';
      window.setTimeout(() => {
        delete anchorTarget.dataset.ctrlAnchorTarget;
      }, 1600);
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const originalFetch = window.fetch.bind(window);
    const originalSendBeacon =
      typeof navigator.sendBeacon === 'function' ? navigator.sendBeacon.bind(navigator) : null;

    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (requestUrl.startsWith(SUPERDOC_INGEST_ORIGIN)) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return originalFetch(input, init);
    }) as typeof window.fetch;

    if (originalSendBeacon) {
      navigator.sendBeacon = ((url: string | URL) => {
        const requestUrl = typeof url === 'string' ? url : url.toString();
        if (requestUrl.startsWith(SUPERDOC_INGEST_ORIGIN)) {
          return true;
        }
        return originalSendBeacon(url);
      }) as typeof navigator.sendBeacon;
    }

    return () => {
      window.fetch = originalFetch;
      if (originalSendBeacon) {
        navigator.sendBeacon = originalSendBeacon;
      }
    };
  }, []);

  if (status.phase === 'error') {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
        <div className="max-w-md space-y-2">
          <p className="text-sm font-semibold text-rose-700">
            {language === 'zh' ? 'SuperDoc 初始化失败' : 'SuperDoc initialization failed'}
          </p>
          <p className="text-xs leading-5 text-slate-500">
            {status.message ??
              (language === 'zh'
                ? '请切回 HTML 回退继续编辑。'
                : 'Switch back to the HTML fallback preview to continue editing.')}
          </p>
        </div>
      </div>
    );
  }

  if (!isRealBrowserRuntime) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
          <span>{language === 'zh' ? 'SuperDoc 文档预览' : 'SuperDoc document preview'}</span>
          <span>
            {language === 'zh'
              ? '当前运行环境不支持挂载 SuperDoc，已回退为隐藏 HTML 兼容层。'
              : 'This runtime does not support mounting SuperDoc, so the hidden HTML compatibility layer is used.'}
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-500">
          <div className="max-w-md space-y-2">
            <p className="font-semibold text-slate-700">
              {language === 'zh' ? 'SuperDoc 仅在真实浏览器里启用' : 'SuperDoc only runs in a real browser'}
            </p>
            <p>
              {language === 'zh'
                ? '当前环境用于自动化测试或预览降级，不会初始化 SuperDoc 实例。'
                : 'This environment is used for tests or fallback rendering, so SuperDoc is not initialized.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={shellRef}
      className={`md2word-superdoc-shell flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition-shadow ${focusToneClass}`}
      data-superdoc-focus-shell={focusState ? 'active' : 'idle'}
      onClickCapture={handleShellClickCapture}
    >
      <style>
        {`
          .md2word-superdoc-shell .generic-popover {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
          .md2word-superdoc-shell [data-ctrl-anchor-target="true"] {
            animation: md2word-superdoc-anchor-flash 1.6s ease;
            background: rgba(99, 102, 241, 0.12);
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.16);
            border-radius: 8px;
          }
          .md2word-superdoc-shell .md2word-superdoc-page-number {
            position: absolute;
            left: 50%;
            bottom: 14px;
            transform: translateX(-50%);
            font-size: 12px;
            line-height: 1;
            color: rgb(100 116 139);
            letter-spacing: 0.02em;
            pointer-events: none;
            user-select: none;
            z-index: 2;
          }
          @keyframes md2word-superdoc-anchor-flash {
            0% { background: rgba(99, 102, 241, 0.24); }
            100% { background: rgba(99, 102, 241, 0.06); }
          }
        `}
      </style>
      {focusState && (
        <div
          className="border-b border-slate-100 bg-slate-50/80 px-4 py-3"
          data-superdoc-focus-summary="true"
        >
          <div
            className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2 shadow-sm ${focusToneClass}`}
            data-superdoc-focus-banner="true"
            data-superdoc-focus-kind={focusState.kind}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-current/70">
                {language === 'zh' ? '当前聚焦目标' : 'Current focus'}
              </p>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-current">my_location</span>
                <p className="text-xs font-semibold text-current" data-superdoc-focus-title="true">
                  {focusState.title}
                </p>
              </div>
              <p
                className="mt-1 text-[11px] leading-5 text-current/80"
                data-superdoc-focus-description="true"
              >
                {focusState.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold">
                <span
                  className="rounded-full bg-white/90 px-2 py-0.5 text-current shadow-sm"
                  data-superdoc-focus-target-type="true"
                >
                  {focusTargetTypeLabel}
                </span>
                <span
                  className="rounded-full bg-white/70 px-2 py-0.5 text-current/80"
                  data-superdoc-focus-scope="true"
                >
                  {focusState.badge}
                </span>
                <span
                  className="rounded-full bg-white/80 px-2 py-0.5 text-current/80"
                  data-superdoc-focus-kind="true"
                >
                  {focusKindLabel}
                </span>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-current shadow-sm">
              {language === 'zh' ? '已聚焦' : 'Focused'}
            </span>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {focusState && (
          <div
            className="border-b border-slate-100 bg-white/90 px-4 py-2 text-[11px] text-slate-600"
            data-superdoc-inline-focus-note="true"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-indigo-500">pin_drop</span>
              <span className="font-semibold text-slate-900" data-superdoc-inline-focus-title="true">
                {focusState.title}
              </span>
              <span
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                data-superdoc-inline-focus-badge="true"
              >
                {focusState.badge}
              </span>
            </div>
          </div>
        )}
        {documentFile ? (
          <SuperDocEditor
            ref={superDocRef}
            document={documentFile}
            documentMode="editing"
            pagination
            hideToolbar
            className="h-full"
            style={{ height: '100%' }}
            onEditorCreate={handleEditorCreate}
            onEditorUpdate={handleEditorUpdate}
            onApplyFormatting={onApplyFormatting}
            onOpenReview={onOpenReview}
            onCloseReview={onCloseReview}
            reviewState={
              reviewState
                ? {
                    status: reviewState.status,
                    selectedCount: reviewState.selectedCount,
                    hasPendingChanges: reviewState.hasPendingChanges,
                    summary: reviewState.summary,
                  }
                : undefined
            }
            renderLoading={() => (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                {language === 'zh' ? '正在加载 SuperDoc 编辑器…' : 'Loading SuperDoc editor…'}
              </div>
            )}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            {status.message ?? (language === 'zh' ? '正在准备文档…' : 'Preparing document…')}
          </div>
        )}
      </div>
    </div>
  );
};
