import type {
  CoverConfig,
  DocumentPresentationState,
  FragmentViewModel,
  PageKind,
  PageViewModel,
  PagedPreviewState,
} from '../types';

const PAGE_DIMENSIONS = {
  a4: {
    widthPx: 794,
    heightPx: 1123,
  },
  letter: {
    widthPx: 816,
    heightPx: 1056,
  },
} as const;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const estimateNodeHeight = (element: HTMLElement): number => {
  const textLength = (element.textContent ?? '').trim().length;
  const baseHeight = (() => {
    switch (element.tagName) {
      case 'H1':
        return 100;
      case 'H2':
        return 70;
      case 'H3':
        return 58;
      case 'BLOCKQUOTE':
        return 78;
      case 'PRE':
        return 120;
      case 'UL':
      case 'OL':
        return 88;
      case 'HR':
        return 24;
      default:
        return 42;
    }
  })();

  return baseHeight + Math.ceil(textLength / 48) * 18;
};

const getPageHeightBudget = (presentation: DocumentPresentationState): number => {
  const pageFrame = PAGE_DIMENSIONS[presentation.pageSettings.pageSize];
  return pageFrame.heightPx - 168;
};

const getPageFrame = (presentation: DocumentPresentationState) =>
  PAGE_DIMENSIONS[presentation.pageSettings.pageSize];

const getCoverLayoutClass = (coverConfig: CoverConfig): string => {
  if (coverConfig.layoutVariant === 'academic') {
    return 'md2word-cover-academic';
  }
  if (coverConfig.layoutVariant === 'corporate') {
    return 'md2word-cover-corporate';
  }
  return 'md2word-cover-classic';
};

const buildCoverPageHtml = (coverConfig: CoverConfig): string => {
  if (!coverConfig.enabled) {
    return '';
  }

  return `
    <section class="md2word-cover-layout ${getCoverLayoutClass(coverConfig)}" data-page-kind="cover">
      <div class="md2word-cover-header">
        ${coverConfig.organization ? `<p class="md2word-cover-organization">${escapeHtml(coverConfig.organization)}</p>` : ''}
        ${coverConfig.date ? `<p class="md2word-cover-date">${escapeHtml(coverConfig.date)}</p>` : ''}
      </div>
      <div class="md2word-cover-main">
        ${coverConfig.title ? `<h1 class="md2word-cover-title">${escapeHtml(coverConfig.title)}</h1>` : ''}
        ${coverConfig.subtitle ? `<p class="md2word-cover-subtitle">${escapeHtml(coverConfig.subtitle)}</p>` : ''}
      </div>
      <div class="md2word-cover-meta">
        ${coverConfig.author ? `<p class="md2word-cover-author">${escapeHtml(coverConfig.author)}</p>` : ''}
        ${coverConfig.abstract ? `<div class="md2word-cover-abstract"><h2>${'摘要 / Abstract'}</h2><p>${escapeHtml(coverConfig.abstract)}</p></div>` : ''}
      </div>
    </section>
  `;
};

const isHeadingBlock = (element: HTMLElement): boolean => {
  const blockType = element.dataset.blockType;
  return blockType === 'heading1' || blockType === 'heading2' || blockType === 'heading3';
};

const isStructuredContainer = (element: HTMLElement, type: 'toc' | 'references'): boolean =>
  element.dataset.docStructure === type;

const buildPaginationUnits = (elements: HTMLElement[]): HTMLElement[][] => {
  const units: HTMLElement[][] = [];

  for (let index = 0; index < elements.length; index += 1) {
    const current = elements[index];
    const next = elements[index + 1];

    if (
      current &&
      next &&
      isHeadingBlock(current) &&
      !isHeadingBlock(next) &&
      next.dataset.blockType !== 'hr'
    ) {
      units.push([current, next]);
      index += 1;
      continue;
    }

    units.push([current]);
  }

  return units;
};

const canSplitElement = (element: HTMLElement): boolean => {
  if (isStructuredContainer(element, 'toc') || isStructuredContainer(element, 'references')) {
    return true;
  }

  if (!(element.tagName === 'P' || element.tagName === 'BLOCKQUOTE')) {
    return false;
  }

  const segment = element.querySelector<HTMLElement>('[data-segment-id]');
  if (!segment) {
    return false;
  }

  return !segment.querySelector('[data-selection-id], [data-preview-selection-active], [data-ai-review]');
};

const splitTextByBoundary = (text: string, preferredLength: number): [string, string] => {
  const normalized = text.trim();
  if (normalized.length <= preferredLength) {
    return [normalized, ''];
  }

  const sentenceBoundaries: string[] = ['。', '！', '？', '.', ';', '；', '，', ','];
  let splitIndex = -1;

  for (let index = Math.min(preferredLength, normalized.length - 1); index >= Math.max(32, preferredLength - 80); index -= 1) {
    if (sentenceBoundaries.includes(normalized[index])) {
      splitIndex = index + 1;
      break;
    }
  }

  if (splitIndex < 0) {
    splitIndex = Math.max(32, preferredLength);
  }

  return [normalized.slice(0, splitIndex).trim(), normalized.slice(splitIndex).trim()];
};

const createContinuationFragment = (
  sourceElement: HTMLElement,
  sourceSegment: HTMLElement,
  text: string,
  partIndex: number,
  offsetBase: number
): HTMLElement => {
  const fragment = sourceElement.cloneNode(false) as HTMLElement;
  fragment.dataset.fragmentContinuation = partIndex > 0 ? 'true' : 'false';
  fragment.dataset.fragmentPartIndex = String(partIndex);

  const segmentClone = sourceSegment.cloneNode(false) as HTMLElement;
  segmentClone.dataset.sourceSegmentId = sourceSegment.dataset.sourceSegmentId ?? sourceSegment.dataset.segmentId ?? '';
  segmentClone.dataset.segmentId = `${sourceSegment.dataset.segmentId ?? 'segment'}__part_${partIndex}`;
  segmentClone.dataset.segmentOffsetBase = String(offsetBase);
  segmentClone.textContent = text;
  fragment.appendChild(segmentClone);

  return fragment;
};

const cloneContainerShell = (element: HTMLElement): HTMLElement => element.cloneNode(false) as HTMLElement;

const splitStructuredContainer = (
  element: HTMLElement,
  remainingHeight: number,
  fullPageHeight: number
): HTMLElement[] => {
  const isToc = isStructuredContainer(element, 'toc');
  const titleSelector = isToc ? '.toc-title' : '.references-title';
  const itemSelector = isToc ? '.toc-item' : '.reference-item';
  const title = element.querySelector<HTMLElement>(titleSelector);
  const items = Array.from(element.querySelectorAll<HTMLElement>(itemSelector));

  if (!title || items.length === 0) {
    return [element];
  }

  const fragments: HTMLElement[] = [];
  let currentShell = cloneContainerShell(element);
  currentShell.appendChild(title.cloneNode(true));
  let currentHeight = estimateNodeHeight(title);
  let currentBudget = Math.max(remainingHeight, fullPageHeight * 0.4);

  items.forEach((item, index) => {
    const clonedItem = item.cloneNode(true) as HTMLElement;
    const itemHeight = estimateNodeHeight(clonedItem);

    if (currentShell.children.length > 1 && currentHeight + itemHeight > currentBudget) {
      fragments.push(currentShell);
      currentShell = cloneContainerShell(element);
      currentShell.dataset.fragmentContinuation = 'true';
      currentShell.dataset.fragmentPartIndex = String(fragments.length);
      currentShell.appendChild(title.cloneNode(true));
      currentHeight = estimateNodeHeight(title);
      currentBudget = fullPageHeight;
    }

    clonedItem.dataset.fragmentItemIndex = String(index);
    currentShell.appendChild(clonedItem);
    currentHeight += itemHeight;
  });

  if (currentShell.children.length > 0) {
    fragments.push(currentShell);
  }

  return fragments;
};

const splitElementAcrossPages = (
  element: HTMLElement,
  remainingHeight: number,
  fullPageHeight: number
): HTMLElement[] => {
  if (isStructuredContainer(element, 'toc') || isStructuredContainer(element, 'references')) {
    return splitStructuredContainer(element, remainingHeight, fullPageHeight);
  }

  const segment = element.querySelector<HTMLElement>('[data-segment-id]');
  if (!segment) {
    return [element];
  }

  const fullText = (segment.textContent ?? '').trim();
  if (!fullText) {
    return [element];
  }

  const estimatedHeight = estimateNodeHeight(element);
  const safeRemainingHeight = Math.max(remainingHeight, fullPageHeight * 0.35);
  const charsPerHeight = fullText.length / Math.max(estimatedHeight, 1);
  const fragments: HTMLElement[] = [];
  let rest = fullText;
  let consumedLength = 0;
  let partIndex = 0;
  let currentBudget = safeRemainingHeight;

  while (rest.length > 0) {
    const preferredLength = Math.max(48, Math.floor(charsPerHeight * currentBudget));
    const [head, tail] = splitTextByBoundary(rest, preferredLength);
    const chunk = head || rest;
    fragments.push(createContinuationFragment(element, segment, chunk, partIndex, consumedLength));
    consumedLength += chunk.length;
    const nextRest = tail;
    partIndex += 1;
    currentBudget = fullPageHeight;

    if (!nextRest || nextRest === rest) {
      break;
    }

    rest = nextRest;
  }

  return fragments.length > 0 ? fragments : [element];
};

export interface BuiltPagedPreview {
  html: string;
  state: PagedPreviewState;
}

export const buildPagedPreview = (
  bodyHtml: string,
  presentation: DocumentPresentationState
): BuiltPagedPreview => {
  const emptyState: PagedPreviewState = {
    pages: [],
    fragments: [],
  };

  if (typeof DOMParser === 'undefined') {
    return { html: bodyHtml, state: emptyState };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="paged-preview-root">${bodyHtml}</div>`, 'text/html');
  const root = doc.getElementById('paged-preview-root');

  if (!root) {
    return { html: bodyHtml, state: emptyState };
  }

  const topLevelBlocks = Array.from(root.children).filter(
    (node): node is HTMLElement => node instanceof HTMLElement
  );
  const paginationUnits = buildPaginationUnits(topLevelBlocks);

  const heightBudget = getPageHeightBudget(presentation);
  const pageFrame = getPageFrame(presentation);
  const pages: Array<{
    kind: PageKind;
    pageNumber: number | null;
    htmlParts: string[];
    fragmentIds: string[];
    side: 'left' | 'right';
  }> = [];
  const fragments: FragmentViewModel[] = [];

  if (presentation.coverConfig.enabled) {
    pages.push({
      kind: 'cover',
      pageNumber: presentation.pageSettings.showPageNumberOnCover ? 1 : null,
      htmlParts: [buildCoverPageHtml(presentation.coverConfig)],
      fragmentIds: [],
      side: 'right',
    });
  }

  const ensureBodyPage = () => {
    const nextPageNumber = pages.filter((page) => page.kind === 'body').length + 1;
    const pageNumberBase = presentation.coverConfig.enabled ? 1 : 0;
    const pageNumber = presentation.pageSettings.showPageNumbers ? nextPageNumber + pageNumberBase : null;
    const absolutePageIndex = pages.length;
    pages.push({
      kind: 'body',
      pageNumber,
      htmlParts: [],
      fragmentIds: [],
      side: absolutePageIndex % 2 === 0 ? 'right' : 'left',
    });
  };

  ensureBodyPage();
  let currentHeight = 0;

  paginationUnits.forEach((unit, unitIndex) => {
    const estimatedHeight = unit.reduce((sum, element) => sum + estimateNodeHeight(element), 0);
    const currentPage = pages[pages.length - 1];
    const shouldSplitUnit =
      unit.length === 1 &&
      canSplitElement(unit[0]) &&
      currentPage.kind === 'body' &&
      (estimatedHeight > heightBudget ||
        (currentPage.htmlParts.length > 0 && currentHeight + estimatedHeight > heightBudget));

    if (shouldSplitUnit) {
      const splitFragments = splitElementAcrossPages(
        unit[0],
        heightBudget - currentHeight,
        heightBudget
      );

      splitFragments.forEach((fragment, fragmentIndex) => {
        const fragmentHeight = estimateNodeHeight(fragment);
        const activeBeforePlacement = pages[pages.length - 1];
        if (
          activeBeforePlacement.kind === 'body' &&
          activeBeforePlacement.htmlParts.length > 0 &&
          currentHeight + fragmentHeight > heightBudget
        ) {
          ensureBodyPage();
          currentHeight = 0;
        }

        const activePage = pages[pages.length - 1];
        const blockId = fragment.dataset.blockId ?? unit[0].dataset.blockId ?? `fragment-block-${unitIndex}-${fragmentIndex}`;
        const fragmentId = `page-${pages.length - 1}-fragment-${unitIndex}-${fragmentIndex}`;
        activePage.htmlParts.push(fragment.outerHTML);
        activePage.fragmentIds.push(fragmentId);
        fragments.push({
          fragmentId,
          blockId,
          blockType: fragment.dataset.blockType ?? fragment.tagName.toLowerCase(),
          segmentIds: Array.from(fragment.querySelectorAll<HTMLElement>('[data-segment-id]')).map(
            (node) => node.dataset.sourceSegmentId ?? node.dataset.segmentId ?? ''
          ).filter(Boolean),
          pageIndex: pages.length - 1,
          measuredHeight: fragmentHeight,
          textPreview: (fragment.textContent ?? '').trim().slice(0, 120),
        });
        currentHeight += fragmentHeight;
      });
      return;
    }

    if (currentPage.kind === 'body' && currentPage.htmlParts.length > 0 && currentHeight + estimatedHeight > heightBudget) {
      ensureBodyPage();
      currentHeight = 0;
    }

    const activePage = pages[pages.length - 1];
    unit.forEach((element, elementIndex) => {
      const blockId = element.dataset.blockId ?? `fragment-block-${unitIndex}-${elementIndex}`;
      const fragmentId = `page-${pages.length - 1}-fragment-${unitIndex}-${elementIndex}`;
      activePage.htmlParts.push(element.outerHTML);
      activePage.fragmentIds.push(fragmentId);

      fragments.push({
        fragmentId,
        blockId,
        blockType: element.dataset.blockType ?? element.tagName.toLowerCase(),
        segmentIds: Array.from(element.querySelectorAll<HTMLElement>('[data-segment-id]')).map(
          (segment) => segment.dataset.segmentId ?? ''
        ).filter(Boolean),
        pageIndex: pages.length - 1,
        measuredHeight: estimateNodeHeight(element),
        textPreview: (element.textContent ?? '').trim().slice(0, 120),
      });
    });
    currentHeight += estimatedHeight;
  });

  const pageViewModels: PageViewModel[] = pages.map((page, pageIndex) => ({
    pageId: `md2word-page-${pageIndex}`,
    pageIndex,
    pageKind: page.kind,
    templateVariant: page.kind === 'cover' ? presentation.coverConfig.layoutVariant : 'body',
    pageNumber: page.pageNumber,
    availableContentHeight: heightBudget,
    fragmentIds: page.fragmentIds,
  }));

  const pageMarkup = pages
    .map((page, pageIndex) => {
      const pageView = pageViewModels[pageIndex];
      const baseMargins = presentation.pageSettings.margins;
      const leftPadding =
        presentation.pageSettings.mirrorMargins && page.kind === 'body' && page.side === 'left'
          ? `${baseMargins.rightCm}cm`
          : `${baseMargins.leftCm}cm`;
      const rightPadding =
        presentation.pageSettings.mirrorMargins && page.kind === 'body' && page.side === 'left'
          ? `${baseMargins.leftCm}cm`
          : `${baseMargins.rightCm}cm`;
      return `
        <section
          class="md2word-page md2word-page-${page.kind}"
          data-page-id="${pageView.pageId}"
          data-page-kind="${page.kind}"
          data-page-index="${pageIndex}"
          data-page-side="${page.side}"
          data-page-number="${page.pageNumber ?? ''}"
          style="--md2word-page-width:${pageFrame.widthPx}px; --md2word-page-height:${pageFrame.heightPx}px;"
        >
          <div class="md2word-page-inner">
            <div
              class="md2word-page-content"
              style="padding-top:${baseMargins.topCm}cm; padding-right:${rightPadding}; padding-bottom:${baseMargins.bottomCm}cm; padding-left:${leftPadding};"
            >
              ${page.htmlParts.join('')}
            </div>
          </div>
        </section>
      `;
    })
    .join('');

  return {
    html: `<div class="md2word-pages">${pageMarkup}</div>`,
    state: {
      pages: pageViewModels,
      fragments,
    },
  };
};
