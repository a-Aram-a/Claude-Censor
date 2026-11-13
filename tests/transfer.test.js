import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePacks, serializePacks } from '../src/shared/transfer.js';

const packs = [
  { name: 'Work', enabled: false, rules: [{ censored: 'a', safe: 'a [x]', selector: '#:r1:' }] },
];
const file = (fields) => JSON.stringify({ format: 'claude-censor', packs, ...fields });

test('round-trips packs', () => {
  assert.deepEqual(parsePacks(serializePacks(packs, '1.0.0')), packs);
});

test('stamps the schema and extension versions', () => {
  const { version, extension } = JSON.parse(serializePacks(packs, '1.2.3'));
  assert.equal(version, '1.0');
  assert.equal(extension, '1.2.3');
});

test('reads older and additive versions', () => {
  assert.deepEqual(parsePacks(file({})), packs);
  assert.deepEqual(parsePacks(file({ version: 1 })), packs);
  assert.deepEqual(parsePacks(file({ version: '1.7', extra: true })), packs);
});

test('rejects files from a newer major version', () => {
  assert.throws(() => parsePacks(file({ version: '2.0' })), /newer Claude Censor/);
});

test('rejects foreign files', () => {
  assert.throws(() => parsePacks('nope'), /not valid JSON/);
  assert.throws(() => parsePacks('null'), /no Claude Censor packs/);
  assert.throws(() => parsePacks('{"packs":[{"name":"x"}]}'), /no Claude Censor packs/);
  assert.throws(() => parsePacks('{"format":"claude-censor","packs":[]}'), /no Claude Censor packs/);
});
