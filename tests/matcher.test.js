import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adaptCase, compileRule, createPattern, significantLength } from '../src/shared/matcher.js';

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
  assert.equal(censor('a bad  \n word!', 'bad word', 'x'), 'a x!');
  assert.equal(censor('badword', 'bad word', 'x'), 'badword');
  assert.equal(censor('bad word', '  bad   word ', 'x'), 'x');
});

test('sees through invisible characters', () => {
  assert.equal(censor('b​a­d﻿ w⁠ord', 'bad word', 'x'), 'x');
  assert.equal(censor('bad', 'b​ad', 'x'), 'x');
});

test('escapes regular expression syntax', () => {
  assert.equal(censor('cost: $5.00 (approx) [a-b]', '$5.00 (approx) [a-b]', 'n/a'), 'cost: n/a');
  assert.equal(censor('5x00', '5.00', 'n/a'), '5x00');
});

test('handles astral characters', () => {
  assert.equal(censor('so 😀​😀 much', '😀😀', ':)'), 'so :) much');
});

test('rejects text with nothing to match', () => {
  assert.equal(createPattern(' ​  '), null);
  assert.equal(compileRule({ censored: '' }), null);
});

test('compiles a rule', () => {
  const rule = compileRule({ selector: ' * ', censored: 'bad word', safe: 'x' });
  assert.equal(rule.selector, '');
  assert.equal(rule.reach, 7);
  assert.equal(rule.replacementFor('BAD WORD'), 'X');
  assert.equal(significantLength(' a​ b '), 2);
});
