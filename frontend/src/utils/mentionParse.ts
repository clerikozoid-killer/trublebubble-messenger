/** Активное упоминание @query сразу перед курсором (без пробелов в query). */
export function parseActiveMention(text: string, cursor: number): { start: number; query: string } | null {
  const before = text.slice(0, cursor);
  const at = before.lastIndexOf('@');
  if (at < 0) return null;
  const prev = at > 0 ? before[at - 1] : ' ';
  if (prev !== ' ' && prev !== '\n' && at !== 0) return null;
  const afterAt = before.slice(at + 1);
  if (/[\s\n]/.test(afterAt)) return null;
  return { start: at, query: afterAt };
}
