import { TEMPLATE_DEFAULTS } from './defaults';
import { mergeDocumentFormatPatch } from './mergePatch';
import type {
  DocumentFormatPatch,
  FormatScope,
  FormatState,
  ResolvedCodeStyle,
  ResolvedDocumentSettings,
  ResolvedFormatConfig,
  ResolvedTextStyle,
} from './types';

const applyTextPatch = (
  base: ResolvedTextStyle,
  patch?: DocumentFormatPatch['h1']
): ResolvedTextStyle => ({
  ...base,
  ...(patch ?? {}),
});

const applyCodePatch = (
  base: ResolvedCodeStyle,
  patch?: DocumentFormatPatch['code']
): ResolvedCodeStyle => ({
  ...base,
  ...(patch ?? {}),
});

const applyDocumentSettingsPatch = (
  base: ResolvedDocumentSettings,
  patch?: DocumentFormatPatch['document']
): ResolvedDocumentSettings => ({
  ...base,
  ...(patch ?? {}),
});

const applyPatch = (
  base: ResolvedFormatConfig,
  patch: DocumentFormatPatch
): ResolvedFormatConfig => ({
  ...base,
  h1: applyTextPatch(base.h1, patch.h1),
  h2: applyTextPatch(base.h2, patch.h2),
  h3: applyTextPatch(base.h3, patch.h3),
  body: applyTextPatch(base.body, patch.body),
  code: applyCodePatch(base.code, patch.code),
  document: applyDocumentSettingsPatch(base.document, patch.document),
});

const matchesScope = (scope: FormatScope, targetScope?: FormatScope): boolean => {
  if (!targetScope) {
    return false;
  }

  if (scope.scopeType !== targetScope.scopeType) {
    return false;
  }

  if (scope.scopeType === 'document' && targetScope.scopeType === 'document') {
    return true;
  }

  if (scope.scopeType === 'block' && targetScope.scopeType === 'block') {
    return scope.blockId === targetScope.blockId;
  }

  if (scope.scopeType === 'selection' && targetScope.scopeType === 'selection') {
    return scope.start === targetScope.start && scope.end === targetScope.end;
  }

  return false;
};

export const resolveFormatConfig = (
  state: FormatState,
  targetScope?: FormatScope
): ResolvedFormatConfig => {
  const templateDefaults = TEMPLATE_DEFAULTS[state.baseTemplate] ?? TEMPLATE_DEFAULTS.corporate;
  const documentLevelPatch = mergeDocumentFormatPatch({}, state.documentPatch);

  let resolved = applyPatch(templateDefaults, documentLevelPatch);

  if (!targetScope) {
    return resolved;
  }

  for (const scopedPatch of state.scopedPatches) {
    if (matchesScope(scopedPatch.scope, targetScope)) {
      resolved = applyPatch(resolved, scopedPatch.patch);
    }
  }

  return resolved;
};
