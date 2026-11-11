import { compileRule } from '../shared/matcher.js';
import { isValidSelector } from '../shared/selector.js';
import { TextRun } from './text-run.js';
import { collectWindow } from './text-window.js';

const MAX_PASSES = 4;

function isWithin(node, selector) {
  for (let current = node; current; current = current.getRootNode().host) {
    const element = current.nodeType === Node.ELEMENT_NODE ? current : current.parentElement;
    if (element?.closest(selector)) return true;
  }
  return false;
}

const isAllowed = (node, { selector }) =>
  !node.parentElement?.isContentEditable && (!selector || isWithin(node, selector));

export class Censor {
  #rules;
  #reach;

  constructor(rules) {
    this.#rules = rules
      .map(compileRule)
      .filter((rule) => rule && (!rule.selector || isValidSelector(rule.selector)));
    this.#reach = Math.max(0, ...this.#rules.map((rule) => rule.reach));
  }

  get isIdle() {
    return this.#rules.length === 0;
  }

  censor(origins) {
    const censored = new Set();
    for (const origin of origins) {
      if (!origin.isConnected) continue;
      const { core, nodes } = collectWindow(origin, this.#reach);
      if (core.length && core.every((node) => censored.has(node))) continue;
      core.forEach((node) => censored.add(node));
      this.#apply(nodes);
    }
  }

  #apply(nodes) {
    let run = new TextRun(nodes);
    for (const rule of this.#rules) {
      for (let pass = 0; pass < MAX_PASSES; pass++) {
        const matches = [...run.text.matchAll(rule.pattern)].filter(({ 0: found, index }) =>
          run.nodesBetween(index, index + found.length).every((node) => isAllowed(node, rule)),
        );
        if (!matches.length) break;
        for (const { 0: found, index } of matches.reverse()) {
          run.replace(index, index + found.length, rule.replacementFor(found));
        }
        run = new TextRun(nodes);
      }
    }
  }
}
