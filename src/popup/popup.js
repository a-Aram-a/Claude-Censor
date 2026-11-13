import { createPack } from '../shared/packs.js';
import { loadSettings, saveSettings } from '../shared/settings.js';
import { parsePacks, serializePacks } from '../shared/transfer.js';
import { downloadJson } from './download.js';
import { fillRule, mountFields, readRule, validateRule } from './rule-form.js';
import { loadSession, saveSession } from './session.js';
import { sortable } from './sortable.js';

const enabledToggle = document.getElementById('enabled');
const packList = document.getElementById('packs');
const packTemplate = document.getElementById('pack-template');
const ruleTemplate = document.getElementById('rule-template');
const importButton = document.getElementById('import');
const fileInput = document.getElementById('file');
const status = document.getElementById('status');
const isPopup = new URLSearchParams(location.search).has('popup');

const [{ enabled, packs }, session] = await Promise.all([loadSettings(), loadSession()]);
let { draft } = session;

const clone = (template) => template.content.firstElementChild.cloneNode(true);
const move = (array, from, to) => array.splice(to, 0, ...array.splice(from, 1));
const savePacks = () => saveSettings({ packs });
const exportPacks = (name, exported) =>
  downloadJson(name, serializePacks(exported, chrome.runtime.getManifest().version));
const rememberOpenPack = () =>
  saveSession({ openPack: [...packList.children].findIndex((item) => item.firstElementChild.open) });

function setDraft(rule) {
  draft = rule;
  saveSession({ draft });
}

function createRuleItem(pack, rule, onRemoved) {
  const item = clone(ruleTemplate);
  const form = item.querySelector('form');
  mountFields(form);
  fillRule(form, rule);

  form.addEventListener('change', () => {
    if (!validateRule(form)) return;
    Object.assign(rule, readRule(form));
    savePacks();
  });
  item.querySelector('[data-action="delete"]').addEventListener('click', () => {
    pack.rules.splice(pack.rules.indexOf(rule), 1);
    item.remove();
    savePacks();
    onRemoved();
  });
  return item;
}

function createPackItem(pack) {
  const item = clone(packTemplate);
  const details = item.querySelector('details');
  const name = item.querySelector('.name');
  const count = item.querySelector('.count');
  const toggle = item.querySelector('.switch');
  const rename = item.querySelector('.rename');
  const ruleList = item.querySelector('.rules');
  const newRule = item.querySelector('.new-rule');

  const refresh = () => {
    name.textContent = pack.name;
    count.textContent = pack.rules.length === 1 ? '1 rule' : `${pack.rules.length} rules`;
    item.classList.toggle('off', !pack.enabled);
  };
  const addRuleItem = (rule) => ruleList.append(createRuleItem(pack, rule, refresh));

  toggle.checked = pack.enabled;
  toggle.addEventListener('change', () => {
    pack.enabled = toggle.checked;
    refresh();
    savePacks();
  });

  rename.value = pack.name;
  rename.addEventListener('change', () => {
    pack.name = rename.value.trim() || 'Untitled pack';
    rename.value = pack.name;
    refresh();
    savePacks();
  });

  item.querySelector('[data-action="export"]').addEventListener('click', () => {
    exportPacks(pack.name, [pack]);
  });
  item.querySelector('[data-action="delete"]').addEventListener('click', () => {
    const warning = `Delete “${pack.name}” and its ${count.textContent}?`;
    if (pack.rules.length && !confirm(warning)) return;
    packs.splice(packs.indexOf(pack), 1);
    item.remove();
    savePacks();
    rememberOpenPack();
  });

  pack.rules.forEach(addRuleItem);
  sortable(ruleList, (from, to) => {
    move(pack.rules, from, to);
    savePacks();
  });

  mountFields(newRule.querySelector('.fields'));
  newRule.addEventListener('input', () => setDraft(readRule(newRule)));
  newRule.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateRule(newRule)) return;
    const rule = readRule(newRule);
    pack.rules.push(rule);
    addRuleItem(rule);
    refresh();
    savePacks();
    setDraft({});
    newRule.reset();
    newRule.elements.censored.focus();
  });

  details.addEventListener('toggle', () => {
    if (details.open) fillRule(newRule, draft);
    rememberOpenPack();
  });

  refresh();
  return item;
}

function addPack(pack) {
  packs.push(pack);
  const item = createPackItem(pack);
  packList.append(item);
  return item;
}

document.body.classList.toggle('popup', isPopup);
document.addEventListener('input', ({ target }) => target.setCustomValidity(''));

enabledToggle.checked = enabled;
enabledToggle.addEventListener('change', () => saveSettings({ enabled: enabledToggle.checked }));

document.getElementById('expand').addEventListener('click', () => {
  chrome.tabs.create({ url: location.pathname });
});

document.getElementById('add-pack').addEventListener('click', () => {
  const item = addPack(createPack());
  savePacks();
  item.firstElementChild.open = true;
  item.querySelector('.rename').select();
});

document.getElementById('export').addEventListener('click', () => {
  exportPacks('all packs', packs);
});

importButton.addEventListener('click', () => {
  if (isPopup) chrome.tabs.create({ url: `${location.pathname}#import` });
  else fileInput.click();
});

fileInput.addEventListener('change', async () => {
  const [file] = fileInput.files;
  fileInput.value = '';
  if (!file) return;
  try {
    const imported = parsePacks(await file.text());
    imported.forEach(addPack);
    savePacks();
    status.textContent = imported.length === 1 ? 'Imported 1 pack.' : `Imported ${imported.length} packs.`;
  } catch (error) {
    status.textContent = error.message;
  }
});

if (location.hash === '#import') {
  status.textContent = 'Choose a file to import.';
  importButton.focus();
}

packList.append(...packs.map(createPackItem));
sortable(packList, (from, to) => {
  move(packs, from, to);
  savePacks();
  rememberOpenPack();
});

const openItem = packList.children[session.openPack];
if (openItem) openItem.firstElementChild.open = true;
