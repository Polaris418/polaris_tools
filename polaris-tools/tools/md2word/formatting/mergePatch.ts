import type {
  CodeFormatPatch,
  DocumentFormatPatch,
  DocumentSettingsPatch,
  TextFormatPatch,
} from './types';

const removeUndefined = <T extends Record<string, unknown>>(value: T): T => {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);
  return Object.fromEntries(entries) as T;
};

const mergeTextPatch = <T extends TextFormatPatch | CodeFormatPatch>(
  base: T | undefined,
  incoming: Partial<T> | undefined
): T | undefined => {
  if (!base && !incoming) {
    return undefined;
  }

  return removeUndefined({
    ...(base ?? {}),
    ...(incoming ?? {}),
  } as T);
};

const mergeDocumentSettings = (
  base: DocumentSettingsPatch | undefined,
  incoming: DocumentSettingsPatch | undefined
): DocumentSettingsPatch | undefined => {
  if (!base && !incoming) {
    return undefined;
  }

  return removeUndefined({
    ...(base ?? {}),
    ...(incoming ?? {}),
  });
};

export const mergeDocumentFormatPatch = (
  base: DocumentFormatPatch,
  incoming: DocumentFormatPatch
): DocumentFormatPatch => ({
  h1: mergeTextPatch(base.h1, incoming.h1),
  h2: mergeTextPatch(base.h2, incoming.h2),
  h3: mergeTextPatch(base.h3, incoming.h3),
  body: mergeTextPatch(base.body, incoming.body),
  code: mergeTextPatch(base.code, incoming.code),
  document: mergeDocumentSettings(base.document, incoming.document),
});
