const DEFAULT_URL = 'http://localhost:5173';

const form = document.getElementById('form');
const input = document.getElementById('url');
const statusEl = document.getElementById('status');

chrome.storage.sync.get(['messengerUrl'], (data) => {
  if (input && typeof data.messengerUrl === 'string' && data.messengerUrl.trim()) {
    input.value = data.messengerUrl.trim();
  } else if (input) {
    input.value = DEFAULT_URL;
  }
});

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const raw = (input?.value || '').trim();
  let messengerUrl = raw || DEFAULT_URL;
  try {
    new URL(messengerUrl);
  } catch {
    if (statusEl) {
      statusEl.textContent = 'Некорректный URL.';
      statusEl.style.color = '#c00';
    }
    return;
  }
  chrome.storage.sync.set({ messengerUrl }, () => {
    if (statusEl) {
      statusEl.textContent = 'Сохранено.';
      statusEl.style.color = '#0a0';
    }
  });
});
