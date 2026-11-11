const DEFAULTS = { enabled: true, rules: [] };

export const loadSettings = () => chrome.storage.local.get(DEFAULTS);

export const saveSettings = (patch) => chrome.storage.local.set(patch);

export function onSettingsChanged(listener) {
  chrome.storage.onChanged.addListener(async (_changes, area) => {
    if (area === 'local') listener(await loadSettings());
  });
}
