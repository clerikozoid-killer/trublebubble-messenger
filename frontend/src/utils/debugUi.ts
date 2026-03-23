/**
 * Verbose UI / network logging for local debugging.
 *
 * Enable any of:
 * - URL: ?debug=1
 * - localStorage: localStorage.setItem('truble_debug_ui', '1')
 * - Build-time: VITE_DEBUG_UI=true
 * - Console: window.__TRUBLE_DEBUG__.enable()
 */

const PREFIX = '[TrubleBubble:debug]';

export function isDebugUiEnabled(): boolean {
  if (import.meta.env.VITE_DEBUG_UI === 'true') return true;
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('debug') === '1') return true;
    if (localStorage.getItem('truble_debug_ui') === '1') return true;
  } catch {
    /* ignore */
  }
  return false;
}

function safeJson(detail: unknown): string {
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

export function logUi(scope: string, action: string, detail?: Record<string, unknown>): void {
  if (!isDebugUiEnabled()) return;
  const ts = new Date().toISOString();
  const line = { ts, scope, action, ...detail };
  console.log(PREFIX, safeJson(line));
}

function describeElement(el: Element): Record<string, unknown> {
  const tag = el.tagName;
  const id = el.id || undefined;
  const aria = el.getAttribute('aria-label') || undefined;
  const title = el.getAttribute('title') || undefined;
  const testId = el.getAttribute('data-testid') || undefined;
  const name = (el as HTMLInputElement).name || undefined;
  const type = (el as HTMLInputElement).type || undefined;
  const placeholder = el.getAttribute('placeholder') || undefined;
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160) || undefined;
  const cls =
    typeof (el as HTMLElement).className === 'string'
      ? (el as HTMLElement).className.slice(0, 100)
      : undefined;
  return {
    tag,
    id,
    dataTestId: testId,
    ariaLabel: aria,
    title,
    name,
    inputType: type,
    placeholder,
    textPreview: text,
    className: cls,
  };
}

/**
 * Logs every click that hits a button-like control (capture phase).
 */
export function installGlobalInteractionLogging(): () => void {
  const onClick = (e: MouseEvent) => {
    if (!isDebugUiEnabled()) return;
    const el = e.target;
    if (!(el instanceof Element)) return;

    const interactive = el.closest(
      'button, [role="button"], a[href], input[type="submit"], input[type="button"], input[type="reset"], [data-testid]'
    );
    if (!interactive) return;

    logUi('ui.click', interactive.tagName.toLowerCase(), {
      ...describeElement(interactive),
      path: window.location.pathname,
      defaultPrevented: e.defaultPrevented,
      button: e.button,
    });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!isDebugUiEnabled()) return;
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.tagName !== 'TEXTAREA' && t.tagName !== 'INPUT') return;

    logUi('ui.keydown', e.key, {
      tag: t.tagName,
      path: window.location.pathname,
      placeholder: t.getAttribute('placeholder') || undefined,
      inputType: (t as HTMLInputElement).type || undefined,
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      meta: e.metaKey,
    });
  };

  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);

  return () => {
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
  };
}

/** Redact / trim payloads for console (never log full tokens). */
export function sanitizeSocketPayload(data: unknown): unknown {
  if (data == null) return data;
  if (typeof data === 'string') return data.length > 200 ? `${data.slice(0, 200)}…` : data;
  if (typeof data !== 'object') return data;
  const o = { ...(data as Record<string, unknown>) };
  if (typeof o.content === 'string' && o.content.length > 160) {
    o.content = `${o.content.slice(0, 160)}…`;
  }
  if (typeof o.mediaUrl === 'string' && o.mediaUrl.length > 120) {
    o.mediaUrl = `${o.mediaUrl.slice(0, 120)}…`;
  }
  return o;
}

export function installDebugUiConsoleApi(): void {
  if (typeof window === 'undefined') return;

  type DebugApi = {
    enable: () => void;
    disable: () => void;
    isEnabled: () => boolean;
    log: typeof logUi;
  };

  (window as unknown as { __TRUBLE_DEBUG__: DebugApi }).__TRUBLE_DEBUG__ = {
    enable: () => {
      try {
        localStorage.setItem('truble_debug_ui', '1');
      } catch {
        /* ignore */
      }
      console.info(PREFIX, 'enabled: reload optional; logs active now');
    },
    disable: () => {
      try {
        localStorage.removeItem('truble_debug_ui');
      } catch {
        /* ignore */
      }
      console.info(PREFIX, 'disabled');
    },
    isEnabled: isDebugUiEnabled,
    log: logUi,
  };
}
