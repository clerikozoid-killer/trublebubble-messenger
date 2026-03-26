export type LangCode =
  | 'ru'
  | 'en'
  | 'zh'
  | 'ja'
  | 'sr'
  | 'de'
  | 'fr'
  | 'es'
  | 'it'
  | 'pt'
  | 'ar'
  | 'hi'
  | 'uk'
  | 'tr'
  | 'ang'
  | 'grc'
  | 'sa'
  | 'eo'
  | 'dothraki'
  | 'tlh';

export const LANGUAGES: Array<{
  code: LangCode;
  label: string;
  htmlLang: string;
}> = [
  { code: 'ru', label: 'Русский', htmlLang: 'ru' },
  { code: 'en', label: 'English', htmlLang: 'en' },
  { code: 'zh', label: '中文 (Chinese)', htmlLang: 'zh' },
  { code: 'ja', label: '日本語 (Japanese)', htmlLang: 'ja' },
  { code: 'sr', label: 'Српски (Serbian)', htmlLang: 'sr' },
  { code: 'de', label: 'Deutsch', htmlLang: 'de' },
  { code: 'fr', label: 'Français', htmlLang: 'fr' },
  { code: 'es', label: 'Español', htmlLang: 'es' },
  { code: 'it', label: 'Italiano', htmlLang: 'it' },
  { code: 'pt', label: 'Português', htmlLang: 'pt' },
  { code: 'ar', label: 'العربية (Arabic)', htmlLang: 'ar' },
  { code: 'hi', label: 'हिन्दी (Hindi)', htmlLang: 'hi' },
  { code: 'uk', label: 'Українська', htmlLang: 'uk' },
  { code: 'tr', label: 'Türkçe', htmlLang: 'tr' },
  { code: 'ang', label: 'Anglo-Saxon', htmlLang: 'ang' },
  { code: 'grc', label: 'Ancient Greek', htmlLang: 'el' },
  { code: 'sa', label: 'Sanskrit', htmlLang: 'sa' },
  { code: 'eo', label: 'Esperanto', htmlLang: 'eo' },
  { code: 'dothraki', label: 'Dothraki', htmlLang: 'x-dothraki' },
  { code: 'tlh', label: 'Klingon', htmlLang: 'tlh' },
];

export const DEFAULT_LANG: LangCode = 'ru';

