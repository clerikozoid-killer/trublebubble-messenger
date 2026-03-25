/**
 * Random incoming-message sound:
 * - "Письмо пришло!" (speech) OR real audio from /public/sounds
 * - "Ой-ой, кто-то пишет" (speech) OR real audio
 * - "Эй, гляди кто написал!" (speech) OR real audio
 *
 * Browsers may block audio until user gesture — call unlockNotificationAudio() on first interaction
 * (we do this after user enables sounds via UI and on generic pointer/click events).
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

/** Call once after first click/tap so sounds can play (autoplay policy). */
export function unlockNotificationAudio(): void {
  try {
    const c = getCtx();
    if (c.state === 'suspended') void c.resume();
  } catch {
    /* ignore */
  }
}

function playNoiseBurst(durationMs: number, gain: number, volume: number): void {
  const c = getCtx();
  const bufferSize = c.sampleRate * (durationMs / 1000);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * gain;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  g.gain.setValueAtTime(0.35 * volume, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01 * volume, c.currentTime + durationMs / 1000);
  src.connect(g);
  g.connect(c.destination);
  src.start();
}

function playTone(
  freq: number,
  durationMs: number,
  type: OscillatorType = 'sine',
  volume: number
): void {
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  g.gain.setValueAtTime(0.12 * volume, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01 * volume, c.currentTime + durationMs / 1000);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + durationMs / 1000 + 0.02);
}

function pickChildVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  if (!voices?.length) return undefined;

  const ruVoices = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('ru'));
  const pool = ruVoices.length ? ruVoices : voices;

  const wantsGirl = Math.random() < 0.5;
  const girlKeys = ['female', 'girl', 'дев', 'жен'];
  const boyKeys = ['male', 'boy', 'маль', 'пар'];
  const keys = wantsGirl ? girlKeys : boyKeys;

  const matched = pool.filter((v) => keys.some((k) => (v.name || '').toLowerCase().includes(k)));
  const chosen = matched.length ? matched[Math.floor(Math.random() * matched.length)] : pool[Math.floor(Math.random() * pool.length)];
  return chosen;
}

function speak(text: string, volume: number): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ru-RU';
    u.volume = Math.max(0, Math.min(1, volume));
    // Child-ish: faster + higher pitch.
    u.rate = 1.15;
    u.pitch = 1.35;

    const voice = pickChildVoice();
    if (voice) u.voice = voice;

    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

function playHey(volume: number): void {
  // Не полагаемся на speechSynthesis: на части mobile браузеров он "стартует" без фактического звука.
  // Поэтому всегда проигрываем хотя бы тон/шум.
  speak('Письмо пришло!', volume);
  playTone(880, 80, 'square', volume);
  setTimeout(() => playTone(660, 100, 'square', volume), 70);
}

function playShot(volume: number): void {
  speak('Ой-ой, кто-то пишет', volume);
  playNoiseBurst(90, 1, volume);
  playTone(180, 40, 'sawtooth', volume);
}

function playHit(volume: number): void {
  speak('Эй, гляди кто написал!', volume);
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(90, c.currentTime + 0.35);
  g.gain.setValueAtTime(0.2 * volume, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01 * volume, c.currentTime + 0.4);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.45);
  setTimeout(() => playNoiseBurst(200, 0.45, volume), 0);
}

type SoundKind = 'hey' | 'shot' | 'hit';

// Optional: real audio files. Put your own files into `frontend/public/sounds/`.
// Expected names (any of these can exist):
// - hey.mp3 / hey.wav
// - shot.mp3 / shot.wav
// - hit.mp3 / hit.wav
const SOUND_AUDIO_CANDIDATES: Record<SoundKind, string[]> = {
  hey: ['/sounds/hey.mp3', '/sounds/hey.wav'],
  shot: ['/sounds/shot.mp3', '/sounds/shot.wav'],
  hit: ['/sounds/hit.mp3', '/sounds/hit.wav'],
};

// Если у вас лежат звуки с другими именами (например, хеши),
// добавляем поддержку этих файлов как fallback.
const SOUND_AUDIO_FALLBACK_ANY: string[] = [
  '/sounds/3da538630a9ec9c.mp3',
  '/sounds/681e8fc7bfdf135.mp3',
  '/sounds/z_uk-rekoshet-puli.mp3',
];

async function tryPlayAudioFile(src: string, volume: number): Promise<boolean> {
  try {
    const a = new Audio(src);
    a.volume = Math.max(0, Math.min(1, volume));
    // If file is missing (404), play() often rejects; we catch and return false.
    await a.play();
    return true;
  } catch {
    return false;
  }
}

function kindRandom(): SoundKind {
  const r = Math.floor(Math.random() * 3);
  if (r === 0) return 'hey';
  if (r === 1) return 'shot';
  return 'hit';
}

export async function playIncomingMessageSound(volume: number = 0.9): Promise<void> {
  try {
    const v = Math.max(0, Math.min(1, volume));
    unlockNotificationAudio();

    // AudioContext.resume() может быть асинхронным: подстрахуемся и дождемся, если требуется.
    try {
      const c = getCtx();
      if (c.state === 'suspended') await c.resume();
    } catch {
      // ignore
    }

    const kind = kindRandom();
    const candidates = SOUND_AUDIO_CANDIDATES[kind];
    let playedFromAudio = false;
    for (const src of candidates) {
      if (await tryPlayAudioFile(src, v)) {
        playedFromAudio = true;
        break;
      }
    }

    // Если стандартных файлов нет, пробуем любой из ваших лежащих в /public/sounds.
    if (!playedFromAudio && SOUND_AUDIO_FALLBACK_ANY.length > 0) {
      const src = SOUND_AUDIO_FALLBACK_ANY[Math.floor(Math.random() * SOUND_AUDIO_FALLBACK_ANY.length)];
      playedFromAudio = await tryPlayAudioFile(src, v);
    }

    if (!playedFromAudio) {
      if (kind === 'hey') playHey(v);
      else if (kind === 'shot') playShot(v);
      else playHit(v);
    }
  } catch (e) {
    console.warn('Notification sound failed:', e);
  }
}
