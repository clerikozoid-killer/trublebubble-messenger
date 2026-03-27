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
      // - For Russian UI: ru -> en -> key
      // - For other UIs: selected -> en -> key
      // This avoids mixing Russian and English when the selected language has partial coverage.
      if (cur === 'ru') return DICT.ru?.[key] ?? DICT.en?.[key] ?? key;
      return DICT[cur]?.[key] ?? DICT.en?.[key] ?? key;
    },
    [language]
  );

  return { t, language };
}

