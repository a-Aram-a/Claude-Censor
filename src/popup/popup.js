import { createPattern } from '../shared/matcher.js';
import { isValidSelector } from '../shared/selector.js';
import { loadSettings, saveSettings } from '../shared/settings.js';

const enabledToggle = document.getElementById('enabled');
const ruleList = document.getElementById('rules');
const ruleTemplate = document.getElementById('rule-template');
const newRuleForm = document.getElementById('new-rule');

let rules = [];

function validate(form) {
  const { censored, safe, selector } = form.elements;
  const pattern = createPattern(censored.value);
  censored.setCustomValidity(pattern ? '' : 'Enter the text to censor.');
  safe.setCustomValidity(
    pattern?.test(safe.value) ? 'Safe text must not contain the censored text.' : '',
  );
  selector.setCustomValidity(
    isValidSelector(selector.value.trim() || '*') ? '' : 'This is not a valid CSS selector.',
  );
  return form.reportValidity();
}

const readRule = ({ elements: { censored, safe, selector } }) => ({
  censored: censored.value.trim(),
  safe: safe.value,
  selector: selector.value.trim(),
});

const saveRules = () => saveSettings({ rules });

function createRuleItem(rule) {
  const item = ruleTemplate.content.firstElementChild.cloneNode(true);
  const form = item.querySelector('form');
  for (const [name, value] of Object.entries(rule)) form.elements[name].value = value;

  const position = () => [...ruleList.children].indexOf(item);

  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('change', () => {
    if (!validate(form)) return;
    rules[position()] = readRule(form);
    saveRules();
  });
  form.querySelector('button').addEventListener('click', () => {
    rules.splice(position(), 1);
    item.remove();
    saveRules();
  });
  return item;
}

newRuleForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!validate(newRuleForm)) return;
  const rule = readRule(newRuleForm);
  rules.push(rule);
  saveRules();
  ruleList.append(createRuleItem(rule));
  ruleList.lastElementChild.scrollIntoView({ block: 'nearest' });
  newRuleForm.reset();
  newRuleForm.elements.censored.focus();
});

document.addEventListener('input', ({ target }) => target.setCustomValidity(''));

enabledToggle.addEventListener('change', () => saveSettings({ enabled: enabledToggle.checked }));

const settings = await loadSettings();
rules = settings.rules;
enabledToggle.checked = settings.enabled;
ruleList.replaceChildren(...rules.map(createRuleItem));
