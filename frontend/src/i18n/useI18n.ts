import { useCallback } from 'react';
import { DICT, type I18nKey } from './dictionary';
import { DEFAULT_LANG } from './languages';
import { useLanguageStore } from '../stores/languageStore';
import type { LangCode } from './languages';

export function useI18n() {
  const language = useLanguageStore((s) => s.language);

  const t = useCallback(
    (key: I18nKey) => {
      const cur: LangCode = language ?? DEFAULT_LANG;
      // Fallback order:
      // 1) currently selected language
      // 2) English (so translations "work" even when other langs miss keys)
      // 3) Russian (final)
      return DICT[cur]?.[key] ?? DICT.en?.[key] ?? DICT.ru[key] ?? key;
    },
    [language]
  );

  return { t, language };
}

