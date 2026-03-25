import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LangCode } from '../i18n/languages';
import { DEFAULT_LANG } from '../i18n/languages';

interface LanguageState {
  language: LangCode;
  setLanguage: (language: LangCode) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: DEFAULT_LANG,
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'truble-bubble-language',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ language: state.language }),
    }
  )
);

