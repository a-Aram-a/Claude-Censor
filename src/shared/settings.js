import { normalizePacks } from './packs.js';

const STORED = { enabled: true, packs: null, rules: [] };

export async function loadSettings() {
  const { enabled, packs, rules } = await chrome.storage.local.get(STORED);
  return { enabled, packs: normalizePacks(packs ?? [{ name: 'My rules', rules }]) };
}

export const saveSettings = (patch) => chrome.storage.local.set(patch);

export function onSettingsChanged(listener) {
  chrome.storage.onChanged.addListener(async (_changes, area) => {
    if (area === 'local') listener(await loadSettings());
  });
}
