/**
 * Random incoming-message sound: "Эй!" (speech) | synthetic shot | synthetic "hurt".
 * Browsers may block audio until user gesture — call unlockNotificationAudio() on first interaction.
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

function playNoiseBurst(durationMs: number, gain: number): void {
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
  g.gain.setValueAtTime(0.35, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + durationMs / 1000);
  src.connect(g);
  g.connect(c.destination);
  src.start();
}

function playTone(freq: number, durationMs: number, type: OscillatorType = 'sine'): void {
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  g.gain.setValueAtTime(0.12, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + durationMs / 1000);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + durationMs / 1000 + 0.02);
}

/** «Эй!» — короткая речь или два тона. */
function playHey(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('Эй!');
      u.lang = 'ru-RU';
      u.rate = 1.35;
      u.volume = 1;
      u.pitch = 1.1;
      window.speechSynthesis.speak(u);
      return;
    } catch {
      /* fall through */
    }
  }
  playTone(880, 80, 'square');
  setTimeout(() => playTone(660, 100, 'square'), 70);
}

/** Выстрел — шумовой импульс. */
function playShot(): void {
  playNoiseBurst(90, 1);
  playTone(180, 40, 'sawtooth');
}

/** «А-а-а» — низкий свип + шум. */
function playHit(): void {
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(90, c.currentTime + 0.35);
  g.gain.setValueAtTime(0.2, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.4);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.45);
  setTimeout(() => playNoiseBurst(200, 0.45), 0);
}

export function playIncomingMessageSound(): void {
  try {
    unlockNotificationAudio();
    const r = Math.floor(Math.random() * 3);
    if (r === 0) playHey();
    else if (r === 1) playShot();
    else playHit();
  } catch (e) {
    console.warn('Notification sound failed:', e);
  }
}
