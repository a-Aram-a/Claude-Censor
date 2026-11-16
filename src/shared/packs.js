const text = (value) => (typeof value === 'string' ? value : '');

function normalizeRule(rule) {
  const regex = rule?.regex === true;
  const censored = text(rule?.censored);
  return {
    censored: regex ? censored : censored.trim(),
    safe: text(rule?.safe),
    selector: text(rule?.selector).trim(),
    regex,
  };
}

export const createPack = (name = 'New pack') => ({ name, enabled: true, rules: [] });

export const clonePack = (pack) => ({
  name: `${pack.name} copy`,
  enabled: false,
  rules: pack.rules.map((rule) => ({ ...rule })),
});

export function normalizePacks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((pack) => pack && typeof pack === 'object')
    .map((pack) => ({
      name: text(pack.name).trim() || 'Untitled pack',
      enabled: pack.enabled !== false,
      rules: (Array.isArray(pack.rules) ? pack.rules : [])
        .map(normalizeRule)
        .filter((rule) => rule.censored),
    }));
}

export const activeRules = (packs) =>
  packs.filter((pack) => pack.enabled).flatMap((pack) => pack.rules);
