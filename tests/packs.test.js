import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activeRules, normalizePacks } from '../src/shared/packs.js';

test('normalizes untrusted packs', () => {
  const packs = normalizePacks([
    null,
    { name: '  ', rules: [{ censored: ' a ', safe: 1 }, { censored: '' }, 'junk'] },
    { name: 'Off', enabled: false, rules: 'junk' },
  ]);
  assert.deepEqual(packs, [
    { name: 'Untitled pack', enabled: true, rules: [{ censored: 'a', safe: '', selector: '' }] },
    { name: 'Off', enabled: false, rules: [] },
  ]);
  assert.deepEqual(normalizePacks('junk'), []);
});

test('flattens enabled packs in order', () => {
  const rule = (censored) => ({ censored, safe: '', selector: '' });
  const packs = [
    { enabled: true, rules: [rule('a'), rule('b')] },
    { enabled: false, rules: [rule('c')] },
    { enabled: true, rules: [rule('d')] },
  ];
  assert.deepEqual(activeRules(packs).map((r) => r.censored), ['a', 'b', 'd']);
});
