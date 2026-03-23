import { useEffect } from 'react';
import { applyAppearanceToDom, useAppearanceStore } from '../stores/appearanceStore';

/** Keeps DOM theme class in sync with store and system preference. */
export default function ThemeSync() {
  const appearance = useAppearanceStore((s) => s.appearance);

  useEffect(() => {
    applyAppearanceToDom(appearance);
  }, [appearance]);

  useEffect(() => {
    if (appearance !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyAppearanceToDom('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [appearance]);

  return null;
}
