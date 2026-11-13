import { normalizePacks } from './packs.js';
import { SCHEMA_VERSION, upgrade } from './schema.js';

const FORMAT = 'claude-censor';

export const serializePacks = (packs, extension) =>
  JSON.stringify({ format: FORMAT, version: SCHEMA_VERSION, extension, packs }, null, 2);

export function parsePacks(json) {
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  const packs = data?.format === FORMAT ? normalizePacks(upgrade(data).packs) : [];
  if (!packs.length) throw new Error('This file has no Claude Censor packs.');
  return packs;
}
