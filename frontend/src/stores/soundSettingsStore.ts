import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SoundSettingsState {
  enabled: boolean;
  volume: number; // 0..1
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
}

export const useSoundSettingsStore = create<SoundSettingsState>()(
  persist(
    (set) => ({
      enabled: true,
      volume: 0.9,
      setEnabled: (enabled) => set({ enabled }),
      setVolume: (volume) =>
        set({
          volume: Math.max(0, Math.min(1, volume)),
        }),
    }),
    {
      name: 'truble-bubble-sound-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

