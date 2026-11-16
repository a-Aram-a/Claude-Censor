const IGNORABLE = '\\p{Default_Ignorable_Code_Point}';
const GAP = `${IGNORABLE}*`;
const SPACE = `${IGNORABLE}*\\s[\\s${IGNORABLE}]*`;
const IGNORABLES = new RegExp(IGNORABLE, 'gu');
const INSIGNIFICANT = new RegExp(`[\\s${IGNORABLE}]`, 'gu');
const SYNTAX = /[\\^$.*+?()[\]{}|/]/;
const LITERAL = /^\/(.+)\/([a-z]*)$/s;
const REFERENCE = /\$(\$|&|<([^>]*)>|\d{1,2})/g;
// ponytail: a pattern sees this much text around a change; longer matches are missed until the page rescans. Raise if it matters.
const PATTERN_REACH = 1024;

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

export function createRegex(text) {
  const [, source = text, flags = 'i'] = text.match(LITERAL) ?? [];
  const base = `g${flags.replace(/[gy]/g, '')}`;
  if (/[uv]/.test(base)) return new RegExp(source, base);
  try {
    return new RegExp(source, `${base}u`);
  } catch {
    return new RegExp(source, base);
  }
}

export const expand = (template, match) =>
  template.replace(REFERENCE, (reference, key, name) => {
    if (key === '$') return '$';
    if (key === '&') return match[0];
    if (name !== undefined) return match.groups ? (match.groups[name] ?? '') : reference;
    const group = key > 0 && key < match.length ? key : key[0];
    if (!(group > 0 && group < match.length)) return reference;
    return (match[group] ?? '') + key.slice(group.length);
  });

export function stripIgnorables(text) {
  const cuts = [];
  let removed = 0;
  const visible = text.replace(IGNORABLES, (found, offset) => {
    cuts.push({ at: offset - removed, removed: (removed += found.length) });
    return '';
  });
  const shift = (limit, inclusive) => {
    let low = 0;
    for (let high = cuts.length; low < high; ) {
      const middle = (low + high) >> 1;
      if (cuts[middle].at < limit || (inclusive && cuts[middle].at === limit)) low = middle + 1;
      else high = middle;
    }
    return low ? cuts[low - 1].removed : 0;
  };
  return {
    text: visible,
    toRaw: (start, end) => [start + shift(start, true), end + shift(end, false)],
  };
}

function compilePattern({ censored, safe }) {
  if (!censored) return null;
  try {
    return {
      pattern: createRegex(censored),
      reach: PATTERN_REACH,
      isolated: true,
      replacementFor: (match) => expand(safe, match),
    };
  } catch {
    return null;
  }
}

export function compileRule({ censored = '', safe = '', regex = false }) {
  if (regex) return compilePattern({ censored, safe });
  const pattern = createPattern(censored);
  return pattern && {
    pattern,
    reach: significantLength(censored),
    isolated: false,
    replacementFor: ([found]) => adaptCase(safe, found, censored),
  };
}
