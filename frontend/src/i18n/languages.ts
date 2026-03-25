export type LangCode = 'ru' | 'en' | 'ang' | 'grc' | 'sa' | 'eo' | 'dothraki' | 'tlh';

export const LANGUAGES: Array<{
  code: LangCode;
  label: string;
  htmlLang: string;
}> = [
  { code: 'ru', label: 'Русский', htmlLang: 'ru' },
  { code: 'en', label: 'English', htmlLang: 'en' },
  { code: 'ang', label: 'Anglo-Saxon', htmlLang: 'ang' },
  { code: 'grc', label: 'Ancient Greek', htmlLang: 'el' },
  { code: 'sa', label: 'Sanskrit', htmlLang: 'sa' },
  { code: 'eo', label: 'Esperanto', htmlLang: 'eo' },
  { code: 'dothraki', label: 'Dothraki', htmlLang: 'x-dothraki' },
  { code: 'tlh', label: 'Klingon', htmlLang: 'tlh' },
];

export const DEFAULT_LANG: LangCode = 'ru';

