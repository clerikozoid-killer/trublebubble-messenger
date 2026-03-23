const DEFAULT_URL = 'http://localhost:5173';

async function getMessengerUrl() {
  const { messengerUrl } = await chrome.storage.sync.get(['messengerUrl']);
  return typeof messengerUrl === 'string' && messengerUrl.trim()
    ? messengerUrl.trim()
    : DEFAULT_URL;
}

document.getElementById('open')?.addEventListener('click', async () => {
  const url = await getMessengerUrl();
  await chrome.tabs.create({ url });
  window.close();
});

document.getElementById('opts')?.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
