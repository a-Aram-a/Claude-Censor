export const SCHEMA_VERSION = '1.0';

const major = (version) => Number.parseInt(version, 10);
const CURRENT = major(SCHEMA_VERSION);
const UPGRADES = {};

export function upgrade(data) {
  let from = major(data.version ?? 1);
  if (from > CURRENT) {
    throw new Error('This data was made by a newer Claude Censor. Update the extension to use it.');
  }
  for (; from < CURRENT; from += 1) data = UPGRADES[from](data);
  return data;
}
