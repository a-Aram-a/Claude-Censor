import { createPattern, createRegex } from '../shared/matcher.js';
import { resolveSelector } from '../shared/selector.js';

const FIELDS = ['censored', 'safe', 'selector'];
const template = document.getElementById('fields-template');

export function mountFields(container) {
  container.append(template.content.cloneNode(true));
}

export function fillRule(form, rule) {
  for (const name of FIELDS) form.elements[name].value = rule[name] ?? '';
  form.elements.regex.checked = rule.regex === true;
}

export const readRule = (form) => ({
  ...Object.fromEntries(FIELDS.map((name) => [name, form.elements[name].value])),
  regex: form.elements.regex.checked,
});

function censoredError({ censored, regex }) {
  if (!regex) return createPattern(censored) ? '' : 'Enter the text to censor.';
  if (!censored) return 'Enter the pattern to censor.';
  try {
    createRegex(censored);
    return '';
  } catch (error) {
    return error.message.replace(/^.*\/[a-z]*: /s, 'Invalid pattern: ');
  }
}

export function validateRule(form) {
  const { censored, selector } = form.elements;
  censored.setCustomValidity(censoredError(readRule(form)));
  selector.setCustomValidity(
    resolveSelector(selector.value) === null ? 'This is not a valid CSS selector.' : '',
  );
  return form.reportValidity();
}
