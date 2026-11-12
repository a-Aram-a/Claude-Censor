import { normalizePacks } from './packs.js';

const FORMAT = 'claude-censor';

export const serializePacks = (packs) =>
  JSON.stringify({ format: FORMAT, version: 1, packs }, null, 2);

export function parsePacks(json) {
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  const packs = data?.format === FORMAT ? normalizePacks(data.packs) : [];
  if (!packs.length) throw new Error('This file has no Claude Censor packs.');
  return packs;
}
