import type { LangCode } from '../i18n/languages';
import { api } from '../services/api';

const LANG_TO_GOOGLE: Partial<Record<LangCode, string>> = {
  ru: 'ru',
  en: 'en',
  ang: 'en',
  grc: 'el',
  sa: 'sa',
  eo: 'eo',
  dothraki: 'en',
  tlh: 'en',
};

const cache = new Map<string, string>();

export async function translateText(text: string, lang: LangCode): Promise<string> {
  const target = LANG_TO_GOOGLE[lang] ?? LANG_TO_GOOGLE.ru!;
  if (!text.trim() || target === 'ru' && lang === 'ru') return text;

  const key = `${lang}:${target}:${text}`;
  const hit = cache.get(key);
  if (hit) return hit;

  // For ru we don't translate.
  if (lang === 'ru') return text;

  try {
    const r = await api.post<{ translatedText: string }>('/translate', {
      text,
      target,
    });
    const out = typeof r.translatedText === 'string' ? r.translatedText : text;
    cache.set(key, out);
    return out;
  } catch {
    return text;
  }
}

