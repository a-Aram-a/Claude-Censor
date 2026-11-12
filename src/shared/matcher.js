const IGNORABLE = '\\p{Default_Ignorable_Code_Point}';
const GAP = `${IGNORABLE}*`;
const SPACE = `${IGNORABLE}*\\s[\\s${IGNORABLE}]*`;
const IGNORABLES = new RegExp(IGNORABLE, 'gu');
const INSIGNIFICANT = new RegExp(`[\\s${IGNORABLE}]`, 'gu');
const SYNTAX = /[\\^$.*+?()[\]{}|/]/;

const words = (text) => text.replace(IGNORABLES, '').split(/\s+/).filter(Boolean);
const normalize = (text) => words(text).join(' ');
const escape = (char) => char.replace(SYNTAX, '\\$&');
const capitalize = (text) => text.replace(/^./u, (first) => first.toUpperCase());

export const significantLength = (text) => text.replace(INSIGNIFICANT, '').length;

export function createPattern(censored) {
  const source = words(censored)
    .map((word) => [...word].map(escape).join(GAP))
    .join(SPACE);
  return source ? new RegExp(source, 'giu') : null;
}

export function adaptCase(safe, found, censored) {
  const sample = normalize(found);
  if (sample === normalize(censored)) return safe;

  const lower = sample.toLowerCase();
  const upper = sample.toUpperCase();
  if (lower === upper) return safe;
  if (sample === lower) return safe.toLowerCase();
  if (sample === upper && sample.length > 1) return safe.toUpperCase();

  const [first] = sample;
  return first === first.toLowerCase() ? safe : capitalize(safe);
}

export function compileRule({ censored = '', safe = '' }) {
  const pattern = createPattern(censored);
  return pattern && {
    pattern,
    reach: significantLength(censored),
    replacementFor: (found) => adaptCase(safe, found, censored),
  };
}
