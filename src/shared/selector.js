const IDENTIFIER = /([#.])([^\s>+~,#.[\]()]+)/g;

function isValid(selector) {
  try {
    document.createDocumentFragment().querySelector(selector);
    return true;
  } catch {
    return false;
  }
}

const escapeIdentifiers = (selector) =>
  selector.replace(IDENTIFIER, (_match, prefix, name) => prefix + CSS.escape(name));

export function resolveSelector(selector) {
  const trimmed = selector.trim();
  if (!trimmed || trimmed === '*') return '';
  return [trimmed, escapeIdentifiers(trimmed)].find(isValid) ?? null;
}
