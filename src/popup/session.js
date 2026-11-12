const DEFAULTS = { openPack: 0, draft: {} };

export const loadSession = () => chrome.storage.session.get(DEFAULTS);

export const saveSession = (patch) => chrome.storage.session.set(patch);
