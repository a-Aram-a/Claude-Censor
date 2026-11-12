import { createPattern } from '../shared/matcher.js';
import { resolveSelector } from '../shared/selector.js';

const FIELDS = ['censored', 'safe', 'selector'];
const template = document.getElementById('fields-template');

export function mountFields(container) {
  container.append(template.content.cloneNode(true));
}

export function fillRule(form, rule) {
  for (const name of FIELDS) form.elements[name].value = rule[name] ?? '';
}

export const readRule = (form) =>
  Object.fromEntries(FIELDS.map((name) => [name, form.elements[name].value]));

export function validateRule(form) {
  const { censored, selector } = form.elements;
  censored.setCustomValidity(createPattern(censored.value) ? '' : 'Enter the text to censor.');
  selector.setCustomValidity(
    resolveSelector(selector.value) === null ? 'This is not a valid CSS selector.' : '',
  );
  return form.reportValidity();
}
