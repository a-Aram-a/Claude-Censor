import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adaptCase, compileRule, createPattern, createRegex, expand, significantLength, stripIgnorables } from '../src/shared/matcher.js';

const censor = (text, censored, safe) =>
  text.replace(createPattern(censored), (found) => adaptCase(safe, found, censored));

test('matches regardless of case', () => {
  assert.equal(censor('Bad BAD bad bAd', 'bad', 'good'), 'Good GOOD good good');
});

test('keeps the safe text verbatim on an exact match', () => {
  assert.equal(censor('john John JOHN', 'john', 'Mr. X'), 'Mr. X Mr. X MR. X');
  assert.equal(censor('iPhone iphone', 'iPhone', 'Device'), 'Device device');
});

test('capitalizes a single uppercase letter instead of shouting', () => {
  assert.equal(censor('I am', 'i', 'you'), 'You am');
});

test('treats any whitespace run as a single space', () => {
  assert.equal(censor('a bad\u00A0\u2003\n word!', 'bad word', 'x'), 'a x!');
  assert.equal(censor('badword', 'bad word', 'x'), 'badword');
  assert.equal(censor('bad word', '  bad \u00A0 word ', 'x'), 'x');
});

test('sees through invisible characters', () => {
  assert.equal(censor('b\u200Ba\u00ADd\uFEFF w\u2060ord', 'bad word', 'x'), 'x');
  assert.equal(censor('bad', 'b\u200Bad', 'x'), 'x');
});

test('escapes regular expression syntax', () => {
  assert.equal(censor('cost: $5.00 (approx) [a-b]', '$5.00 (approx) [a-b]', 'n/a'), 'cost: n/a');
  assert.equal(censor('5x00', '5.00', 'n/a'), '5x00');
});

test('handles astral characters', () => {
  assert.equal(censor('so 😀\u200B😀 much', '😀😀', ':)'), 'so :) much');
});

test('rejects text with nothing to match', () => {
  assert.equal(createPattern(' \u200B\u00A0 '), null);
  assert.equal(compileRule({ censored: '' }), null);
});

test('compiles a rule', () => {
  const rule = compileRule({ censored: 'bad word', safe: 'x' });
  assert.equal(rule.reach, 7);
  assert.equal(rule.replacementFor(['BAD WORD']), 'X');
  assert.equal(significantLength(' a\u200B b '), 2);
});

test('reads a pattern as case-insensitive unless written as a literal', () => {
  assert.equal(createRegex('a.b').flags, 'giu');
  assert.equal(createRegex('/a.b/').flags, 'gu');
  assert.equal(createRegex('/a.b/gsy').flags, 'gsu');
  assert.equal(createRegex('/[a&&b]/v').flags, 'gv');
  assert.equal(createRegex('a\\-b').flags, 'gi');
  assert.throws(() => createRegex('('), SyntaxError);
  assert.throws(() => createRegex('/a/q'), SyntaxError);
  assert.equal(compileRule({ censored: '(', regex: true }), null);
  assert.equal(compileRule({ censored: '', regex: true }), null);
});

test('expands references in the safe text of a pattern', () => {
  const match = /(?<area>\d)(\d+)(x)?/.exec('12345');
  assert.equal(expand('$1-$2-$3-$4-$10-$0-$$1-$&-$<area>-$<none>-$', match), '1-2345--$4-10-$0-$1-12345-1--$');
  assert.equal(expand('$<area>', /\d/.exec('1')), '$<area>');
  assert.equal(compileRule({ censored: 'A', safe: '$&$&' }).replacementFor(['a']), '$&$&');
});

test('maps matches in visible text back to the raw text', () => {
  const { text, toRaw } = stripIgnorables('​a​­b😀​c');
  assert.equal(text, 'ab😀c');
  assert.deepEqual(toRaw(0, 2), [1, 5]);
  assert.deepEqual(toRaw(1, 4), [4, 7]);
  assert.deepEqual(toRaw(4, 5), [8, 9]);
  assert.deepEqual(stripIgnorables('plain').toRaw(1, 3), [1, 3]);
});
