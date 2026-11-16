import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activeRules, clonePack, normalizePacks } from '../src/shared/packs.js';

test('normalizes untrusted packs', () => {
  const packs = normalizePacks([
    null,
    { name: '  ', rules: [{ censored: ' a ', safe: 1 }, { censored: ' a ', regex: true }, { censored: '' }, 'junk'] },
    { name: 'Off', enabled: false, rules: 'junk' },
  ]);
  assert.deepEqual(packs, [
    { name: 'Untitled pack', enabled: true, rules: [
        { censored: 'a', safe: '', selector: '', regex: false },
        { censored: ' a ', safe: '', selector: '', regex: true },
      ],
    },
    { name: 'Off', enabled: false, rules: [] },
  ]);
  assert.deepEqual(normalizePacks('junk'), []);
});

test('clones a pack switched off and independent of the original', () => {
  const pack = { name: 'Work', enabled: true, rules: [{ censored: 'a', safe: 'b', selector: '' }] };
  const copy = clonePack(pack);
  copy.rules[0].safe = 'c';
  assert.deepEqual(copy, { name: 'Work copy', enabled: false, rules: [{ censored: 'a', safe: 'c', selector: '' }] });
  assert.equal(pack.rules[0].safe, 'b');
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
