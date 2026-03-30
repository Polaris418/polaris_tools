import type {
  MarkdownBlock,
  PreviewSegment,
  PreviewSelectionInfo,
  PreviewSelectionSegment,
} from './scopeTypes';

const PREVIEW_SELECTION_HIGHLIGHT_ATTR = 'data-preview-selection-active';

const toPreviewText = (value: string): string =>
  value
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 120);

const sanitizeSegmentId = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]/g, '-');

const createSegment = (
  block: MarkdownBlock,
  index: number,
  segmentRole: PreviewSegment['segmentRole'],
  text: string,
  sourceStart: number,
  sourceEnd: number
): PreviewSegment | null => {
  const trimmedText = text.trim();
  if (!trimmedText || sourceEnd <= sourceStart) {
    return null;
  }

  return {
    segmentId: sanitizeSegmentId(`${block.blockId}-seg-${index}`),
    blockId: block.blockId,
    blockType: block.blockType,
    segmentRole,
    text: trimmedText,
    textPreview: toPreviewText(trimmedText),
    sourceStart,
    sourceEnd,
  };
};

const buildHeadingSegment = (block: MarkdownBlock): PreviewSegment[] => {
  const match = block.text.match(/^\s*#{1,6}\s+(.+)$/);
  if (!match) {
    return [];
  }

  const visibleText = match[1].trim();
  const relativeStart = block.text.indexOf(visibleText);
  if (relativeStart < 0) {
    return [];
  }

  const segment = createSegment(
    block,
    0,
    'heading',
    visibleText,
    block.startOffset + relativeStart,
    block.startOffset + relativeStart + visibleText.length
  );

  return segment ? [segment] : [];
};

const buildParagraphSegment = (block: MarkdownBlock): PreviewSegment[] => {
  const visibleText = block.text.trim();
  const relativeStart = block.text.indexOf(visibleText);
  if (!visibleText || relativeStart < 0) {
    return [];
  }

  const segment = createSegment(
    block,
    0,
    'paragraph',
    visibleText,
    block.startOffset + relativeStart,
    block.startOffset + relativeStart + visibleText.length
  );

  return segment ? [segment] : [];
};

const buildBlockquoteSegment = (block: MarkdownBlock): PreviewSegment[] => {
  const lines = block.text.split('\n');
  const visibleText = lines
    .map((line) => line.replace(/^\s*>\s?/, ''))
    .join('\n')
    .trim();

  if (!visibleText) {
    return [];
  }

  const firstContentLine = lines.find((line) => line.replace(/^\s*>\s?/, '').trim());
  if (!firstContentLine) {
    return [];
  }

  const firstVisibleLine = firstContentLine.replace(/^\s*>\s?/, '').trim();
  const relativeStart = block.text.indexOf(firstVisibleLine);
  if (relativeStart < 0) {
    return [];
  }

  const segment = createSegment(
    block,
    0,
    'blockquote',
    visibleText,
    block.startOffset + relativeStart,
    block.startOffset + relativeStart + visibleText.length
  );

  return segment ? [segment] : [];
};

const LIST_PREFIX_PATTERN = /^\s*(?:[-*+]|\d+\.)\s+/;

const buildListSegments = (block: MarkdownBlock): PreviewSegment[] => {
  const segments: PreviewSegment[] = [];
  const lines = block.text.split('\n');
  let lineOffset = 0;

  lines.forEach((line, index) => {
    const markerMatch = line.match(LIST_PREFIX_PATTERN);
    if (!markerMatch) {
      lineOffset += line.length + 1;
      return;
    }

    const visibleText = line.slice(markerMatch[0].length).trim();
    if (!visibleText) {
      lineOffset += line.length + 1;
      return;
    }

    const sourceStart = block.startOffset + lineOffset + markerMatch[0].length;
    const sourceEnd = sourceStart + visibleText.length;
    const segment = createSegment(block, index, 'list-item', visibleText, sourceStart, sourceEnd);
    if (segment) {
      segments.push(segment);
    }

    lineOffset += line.length + 1;
  });

  return segments;
};

export const buildPreviewSegments = (blocks: MarkdownBlock[]): PreviewSegment[] =>
  blocks.flatMap((block) => {
    switch (block.blockType) {
      case 'heading1':
      case 'heading2':
      case 'heading3':
        return buildHeadingSegment(block);
      case 'paragraph':
        return buildParagraphSegment(block);
      case 'blockquote':
        return buildBlockquoteSegment(block);
      case 'list':
        return buildListSegments(block);
      default:
        return [];
    }
  });

const wrapElementContentInSegment = (documentNode: Document, element: HTMLElement, segment: PreviewSegment) => {
  if (!element.textContent?.trim()) {
    return;
  }

  const wrapper = documentNode.createElement('span');
  wrapper.dataset.segmentId = segment.segmentId;
  wrapper.dataset.segmentRole = segment.segmentRole;

  while (element.firstChild) {
    wrapper.appendChild(element.firstChild);
  }

  element.appendChild(wrapper);
};

const getSegmentLookupKey = (element: HTMLElement): string | null =>
  element.dataset.sourceSegmentId ?? element.dataset.segmentId ?? null;

const resolveBoundarySegmentElement = (
  boundaryNode: Node | null,
  previewRoot: HTMLElement
): HTMLElement | null => {
  if (!boundaryNode) {
    return null;
  }

  const element =
    boundaryNode instanceof Element ? boundaryNode : boundaryNode.parentElement;

  if (!element) {
    return null;
  }

  const segmentElement = element.closest<HTMLElement>('[data-segment-id], [data-source-segment-id]');
  if (!segmentElement || !previewRoot.contains(segmentElement)) {
    return null;
  }

  return segmentElement;
};

export const annotatePreviewSegments = (root: HTMLElement, segments: PreviewSegment[]) => {
  const grouped = new Map<string, PreviewSegment[]>();
  segments.forEach((segment) => {
    const current = grouped.get(segment.blockId) ?? [];
    current.push(segment);
    grouped.set(segment.blockId, current);
  });

  const blockElements = Array.from(root.querySelectorAll<HTMLElement>('[data-block-id]'));
  blockElements.forEach((element) => {
    const blockId = element.dataset.blockId;
    if (!blockId) {
      return;
    }

    const blockSegments = grouped.get(blockId);
    if (!blockSegments || blockSegments.length === 0) {
      return;
    }

    if ((element.tagName === 'UL' || element.tagName === 'OL') && blockSegments.length > 0) {
      const listItems = Array.from(element.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement && child.tagName === 'LI'
      );

      listItems.forEach((item, index) => {
        const segment = blockSegments[index];
        if (segment) {
          wrapElementContentInSegment(root.ownerDocument, item, segment);
        }
      });
      return;
    }

    wrapElementContentInSegment(root.ownerDocument, element, blockSegments[0]);
  });
};

const wrapSelectedTextInSegment = (
  documentNode: Document,
  segmentElement: HTMLElement,
  selectedStart: number,
  selectedEnd: number
) => {
  const walker = documentNode.createTreeWalker(segmentElement, NodeFilter.SHOW_TEXT);
  let currentOffset = 0;
  const textNodes: Array<{ node: Text; start: number; end: number }> = [];

  let currentNode = walker.nextNode();
  while (currentNode) {
    const textNode = currentNode as Text;
    const nodeText = textNode.textContent ?? '';
    const nodeLength = nodeText.length;
    if (nodeLength > 0) {
      textNodes.push({
        node: textNode,
        start: currentOffset,
        end: currentOffset + nodeLength,
      });
      currentOffset += nodeLength;
    }
    currentNode = walker.nextNode();
  }

  for (let index = textNodes.length - 1; index >= 0; index -= 1) {
    const textNodeInfo = textNodes[index];
    const overlapStart = Math.max(selectedStart, textNodeInfo.start);
    const overlapEnd = Math.min(selectedEnd, textNodeInfo.end);

    if (overlapEnd <= overlapStart) {
      continue;
    }

    const localStart = overlapStart - textNodeInfo.start;
    const localEnd = overlapEnd - textNodeInfo.start;
    const originalNode = textNodeInfo.node;

    if (!originalNode.parentNode) {
      continue;
    }

    if (localEnd < originalNode.length) {
      originalNode.splitText(localEnd);
    }

    const highlightedNode = localStart > 0 ? originalNode.splitText(localStart) : originalNode;
    const wrapper = documentNode.createElement('span');
    wrapper.setAttribute(PREVIEW_SELECTION_HIGHLIGHT_ATTR, 'true');
    highlightedNode.parentNode?.insertBefore(wrapper, highlightedNode);
    wrapper.appendChild(highlightedNode);
  }
};

export const annotatePreviewSelectionHighlights = (
  root: HTMLElement,
  previewSelectionInfo?: PreviewSelectionInfo
) => {
  if (!previewSelectionInfo?.segments?.length) {
    return;
  }

  previewSelectionInfo.segments.forEach((segment) => {
    const segmentElements = Array.from(
      root.querySelectorAll<HTMLElement>(
        `[data-segment-id="${segment.segmentId}"], [data-source-segment-id="${segment.segmentId}"]`
      )
    );

    segmentElements.forEach((segmentElement) => {
      const offsetBase = Number(segmentElement.dataset.segmentOffsetBase ?? '0');
      const localStart = Math.max(0, segment.selectedStart - offsetBase);
      const localEnd = Math.max(0, segment.selectedEnd - offsetBase);
      const segmentTextLength = (segmentElement.textContent ?? '').length;
      if (localStart >= segmentTextLength || localEnd <= 0) {
        return;
      }

      wrapSelectedTextInSegment(
        root.ownerDocument,
        segmentElement,
        Math.max(0, localStart),
        Math.min(segmentTextLength, localEnd)
      );
    });
  });
};

interface ResolvedPreviewBoundary {
  segmentElement: HTMLElement;
  segmentId: string;
  offset: number;
}

const getTextOffsetWithinSegment = (
  segmentElement: HTMLElement,
  node: Node,
  offset: number
): number | null => {
  const documentNode = segmentElement.ownerDocument;

  try {
    const range = documentNode.createRange();
    range.selectNodeContents(segmentElement);
    range.setEnd(node, offset);
    return range.toString().length;
  } catch {
    return null;
  }
};

const resolvePreviewBoundaryFromPoint = (
  previewRoot: HTMLElement,
  x: number,
  y: number
): ResolvedPreviewBoundary | null => {
  const documentNode = previewRoot.ownerDocument;
  const anyDocument = documentNode as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number
    ) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  let boundaryNode: Node | null = null;
  let boundaryOffset = 0;

  if (typeof anyDocument.caretPositionFromPoint === 'function') {
    const position = anyDocument.caretPositionFromPoint(x, y);
    if (position) {
      boundaryNode = position.offsetNode;
      boundaryOffset = position.offset;
    }
  } else if (typeof anyDocument.caretRangeFromPoint === 'function') {
    const range = anyDocument.caretRangeFromPoint(x, y);
    if (range) {
      boundaryNode = range.startContainer;
      boundaryOffset = range.startOffset;
    }
  }

  if (!boundaryNode) {
    return null;
  }

  const segmentElement = resolveBoundarySegmentElement(boundaryNode, previewRoot);
  if (!segmentElement) {
    return null;
  }

  const segmentId = getSegmentLookupKey(segmentElement);
  if (!segmentId) {
    return null;
  }

  const localOffset = getTextOffsetWithinSegment(segmentElement, boundaryNode, boundaryOffset);
  if (localOffset === null) {
    return null;
  }

  return {
    segmentElement,
    segmentId,
    offset: Number(segmentElement.dataset.segmentOffsetBase ?? '0') + localOffset,
  };
};

const buildPreviewSelectionFromBoundaries = (
  previewRoot: HTMLElement,
  segments: PreviewSegment[],
  startBoundary: ResolvedPreviewBoundary,
  endBoundary: ResolvedPreviewBoundary
): PreviewSelectionInfo | null => {
  const segmentMap = new Map(segments.map((segment) => [segment.segmentId, segment]));
  const segmentElements = Array.from(
    previewRoot.querySelectorAll<HTMLElement>('[data-segment-id], [data-source-segment-id]')
  );
  const startIndex = segmentElements.indexOf(startBoundary.segmentElement);
  const endIndex = segmentElements.indexOf(endBoundary.segmentElement);

  if (startIndex < 0 || endIndex < 0) {
    return null;
  }

  const ordered =
    startIndex <= endIndex
      ? { startIndex, endIndex, startBoundary, endBoundary }
      : {
          startIndex: endIndex,
          endIndex: startIndex,
          startBoundary: endBoundary,
          endBoundary: startBoundary,
        };

  const selectedSegments = new Map<string, PreviewSelectionSegment>();

  for (let index = ordered.startIndex; index <= ordered.endIndex; index += 1) {
    const element = segmentElements[index];
    const segmentId = getSegmentLookupKey(element);
    if (!segmentId) {
      continue;
    }

    const segment = segmentMap.get(segmentId);
    if (!segment) {
      continue;
    }

    const offsetBase = Number(element.dataset.segmentOffsetBase ?? '0');
    const elementText = element.textContent ?? '';
    const elementLength = elementText.length;
    const selectedStart = index === ordered.startIndex ? ordered.startBoundary.offset : offsetBase;
    const selectedEnd = index === ordered.endIndex ? ordered.endBoundary.offset : offsetBase + elementLength;
    const localStart = Math.max(0, selectedStart - offsetBase);
    const localEnd = Math.min(elementLength, Math.max(localStart, selectedEnd - offsetBase));

    if (localEnd <= localStart) {
      continue;
    }

    const selectedText = elementText.slice(localStart, localEnd);
    if (!selectedText) {
      continue;
    }

    const nextSegment: PreviewSelectionSegment = {
      ...segment,
      selectedText,
      selectedStart,
      selectedEnd,
      sourceStart: segment.sourceStart + localStart + offsetBase,
      sourceEnd: segment.sourceStart + localEnd + offsetBase,
    };

    const existing = selectedSegments.get(segment.segmentId);
    if (!existing) {
      selectedSegments.set(segment.segmentId, nextSegment);
      continue;
    }

    selectedSegments.set(segment.segmentId, {
      ...existing,
      selectedText: `${existing.selectedText}${nextSegment.selectedText}`,
      selectedStart: Math.min(existing.selectedStart, nextSegment.selectedStart),
      selectedEnd: Math.max(existing.selectedEnd, nextSegment.selectedEnd),
      sourceStart: Math.min(existing.sourceStart, nextSegment.sourceStart),
      sourceEnd: Math.max(existing.sourceEnd, nextSegment.sourceEnd),
    });
  }

  const orderedSegments = Array.from(selectedSegments.values()).sort(
    (left, right) => left.sourceStart - right.sourceStart
  );

  if (orderedSegments.length === 0) {
    return null;
  }

  return {
    segmentIds: orderedSegments.map((segment) => segment.segmentId),
    segments: orderedSegments,
    selectedText: orderedSegments.map((segment) => segment.selectedText).join('\n'),
  };
};

const getSelectedTextWithinSegment = (
  range: Range,
  segmentElement: HTMLElement
): { text: string; start: number; end: number } | null => {
  const documentNode = segmentElement.ownerDocument;
  const segmentRange = documentNode.createRange();
  segmentRange.selectNodeContents(segmentElement);

  if (!range.intersectsNode(segmentElement)) {
    return null;
  }

  const intersection = documentNode.createRange();
  const isBoundaryInsideSegment = (node: Node, offset: number) => {
    try {
      return segmentRange.comparePoint(node, offset) === 0;
    } catch {
      return segmentElement === node || segmentElement.contains(node);
    }
  };
  const startInsideSegment = isBoundaryInsideSegment(range.startContainer, range.startOffset);
  const endInsideSegment = isBoundaryInsideSegment(range.endContainer, range.endOffset);

  if (startInsideSegment) {
    intersection.setStart(range.startContainer, range.startOffset);
  } else {
    intersection.setStart(segmentRange.startContainer, segmentRange.startOffset);
  }

  if (endInsideSegment) {
    intersection.setEnd(range.endContainer, range.endOffset);
  } else {
    intersection.setEnd(segmentRange.endContainer, segmentRange.endOffset);
  }

  const selectedText = intersection.toString();
  if (!selectedText) {
    return null;
  }

  const startMeasureRange = documentNode.createRange();
  startMeasureRange.selectNodeContents(segmentElement);
  startMeasureRange.setEnd(intersection.startContainer, intersection.startOffset);
  const selectionStart = startMeasureRange.toString().length;

  const endMeasureRange = documentNode.createRange();
  endMeasureRange.selectNodeContents(segmentElement);
  endMeasureRange.setEnd(intersection.endContainer, intersection.endOffset);
  const selectionEnd = endMeasureRange.toString().length;

  if (selectionEnd <= selectionStart) {
    return null;
  }

  return {
    text: selectedText,
    start: selectionStart,
    end: selectionEnd,
  };
};

export const resolvePreviewSelection = (
  previewRoot: HTMLElement | null,
  selection: Selection | null,
  segments: PreviewSegment[]
): PreviewSelectionInfo | null => {
  if (!previewRoot || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const commonAncestor = range.commonAncestorContainer;
  if (!commonAncestor) {
    return null;
  }
  const commonElement =
    commonAncestor instanceof Element ? commonAncestor : commonAncestor.parentElement;

  if (!commonElement || !previewRoot.contains(commonElement)) {
    return null;
  }

  const segmentMap = new Map(segments.map((segment) => [segment.segmentId, segment]));
  const selectedSegments = new Map<string, PreviewSelectionSegment>();
  const segmentElements = Array.from(
    previewRoot.querySelectorAll<HTMLElement>('[data-segment-id], [data-source-segment-id]')
  );
  const startBoundaryElement = resolveBoundarySegmentElement(range.startContainer, previewRoot);
  const endBoundaryElement = resolveBoundarySegmentElement(range.endContainer, previewRoot);
  const startBoundaryIndex = startBoundaryElement ? segmentElements.indexOf(startBoundaryElement) : -1;
  const endBoundaryIndex = endBoundaryElement ? segmentElements.indexOf(endBoundaryElement) : -1;
  const candidateRange =
    startBoundaryIndex >= 0 && endBoundaryIndex >= 0
      ? {
          start: Math.min(startBoundaryIndex, endBoundaryIndex),
          end: Math.max(startBoundaryIndex, endBoundaryIndex),
        }
      : startBoundaryIndex >= 0
        ? { start: startBoundaryIndex, end: startBoundaryIndex }
        : endBoundaryIndex >= 0
          ? { start: endBoundaryIndex, end: endBoundaryIndex }
          : null;

  segmentElements.forEach((element, index) => {
    if (candidateRange && (index < candidateRange.start || index > candidateRange.end)) {
      return;
    }

    if (!range.intersectsNode(element)) {
      return;
    }

    const segmentId = getSegmentLookupKey(element);
    if (!segmentId) {
      return;
    }

    const segment = segmentMap.get(segmentId);
    if (!segment) {
      return;
    }

    const selectedTextInfo = getSelectedTextWithinSegment(range, element);
    if (!selectedTextInfo) {
      return;
    }

    const nextSegment: PreviewSelectionSegment = {
      ...segment,
      selectedText: selectedTextInfo.text,
      selectedStart: Number(element.dataset.segmentOffsetBase ?? '0') + selectedTextInfo.start,
      selectedEnd: Number(element.dataset.segmentOffsetBase ?? '0') + selectedTextInfo.end,
      sourceStart: segment.sourceStart + Number(element.dataset.segmentOffsetBase ?? '0') + selectedTextInfo.start,
      sourceEnd: segment.sourceStart + Number(element.dataset.segmentOffsetBase ?? '0') + selectedTextInfo.end,
    };

    const existing = selectedSegments.get(segment.segmentId);
    if (!existing) {
      selectedSegments.set(segment.segmentId, nextSegment);
      return;
    }

    selectedSegments.set(segment.segmentId, {
      ...existing,
      selectedText: `${existing.selectedText}${nextSegment.selectedText}`,
      selectedStart: Math.min(existing.selectedStart, nextSegment.selectedStart),
      selectedEnd: Math.max(existing.selectedEnd, nextSegment.selectedEnd),
      sourceStart: Math.min(existing.sourceStart, nextSegment.sourceStart),
      sourceEnd: Math.max(existing.sourceEnd, nextSegment.sourceEnd),
    });
  });

  const orderedSegments = Array.from(selectedSegments.values()).sort(
    (left, right) => left.sourceStart - right.sourceStart
  );

  if (orderedSegments.length === 0) {
    return null;
  }

  return {
    segmentIds: orderedSegments.map((segment) => segment.segmentId),
    segments: orderedSegments,
    selectedText: orderedSegments.map((segment) => segment.selectedText).join('\n'),
  };
};

export const resolvePreviewSelectionFromPoints = (
  previewRoot: HTMLElement | null,
  segments: PreviewSegment[],
  startPoint: { x: number; y: number } | null,
  endPoint: { x: number; y: number } | null
): PreviewSelectionInfo | null => {
  if (!previewRoot || !startPoint || !endPoint) {
    return null;
  }

  const startBoundary = resolvePreviewBoundaryFromPoint(previewRoot, startPoint.x, startPoint.y);
  const endBoundary = resolvePreviewBoundaryFromPoint(previewRoot, endPoint.x, endPoint.y);

  if (!startBoundary || !endBoundary) {
    return null;
  }

  return buildPreviewSelectionFromBoundaries(previewRoot, segments, startBoundary, endBoundary);
};
