import { normalizePacks } from './packs.js';
import { SCHEMA_VERSION, upgrade } from './schema.js';

const STORED = { enabled: true, version: 1, packs: null, rules: [] };

export async function loadSettings() {
  const { enabled, version, packs, rules } = await chrome.storage.local.get(STORED);
  const data = upgrade({ version, packs: packs ?? [{ name: 'My rules', rules }] });
  return { enabled, packs: normalizePacks(data.packs) };
}

export const saveSettings = (patch) =>
  chrome.storage.local.set({ ...patch, version: SCHEMA_VERSION });

export function onSettingsChanged(listener) {
  chrome.storage.onChanged.addListener(async (_changes, area) => {
    if (area === 'local') listener(await loadSettings());
  });
}
