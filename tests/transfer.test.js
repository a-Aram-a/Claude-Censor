import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePacks, serializePacks } from '../src/shared/transfer.js';

const packs = [
  { name: 'Work', enabled: false, rules: [{ censored: 'a', safe: 'a [x]', selector: '#:r1:' }] },
];

test('round-trips packs', () => {
  assert.deepEqual(parsePacks(serializePacks(packs)), packs);
});

test('rejects foreign files', () => {
  assert.throws(() => parsePacks('nope'), /not valid JSON/);
  assert.throws(() => parsePacks('null'), /no Claude Censor packs/);
  assert.throws(() => parsePacks('{"packs":[{"name":"x"}]}'), /no Claude Censor packs/);
  assert.throws(() => parsePacks('{"format":"claude-censor","packs":[]}'), /no Claude Censor packs/);
});
