import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Appearance = 'dark' | 'light' | 'system';

export function resolveAppearance(a: Appearance): 'dark' | 'light' {
  if (a === 'system') {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return a;
}

export function applyAppearanceToDom(a: Appearance) {
  const r = resolveAppearance(a);
  document.documentElement.classList.toggle('light', r === 'light');
}

interface AppearanceState {
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      appearance: 'dark',
      setAppearance: (appearance) => {
        set({ appearance });
        applyAppearanceToDom(appearance);
      },
    }),
    {
      name: 'truble-bubble-appearance',
      onRehydrateStorage: () => (state) => {
        if (state) applyAppearanceToDom(state.appearance);
      },
    }
  )
);
