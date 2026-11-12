import { compileRule } from '../shared/matcher.js';
import { isValidSelector } from '../shared/selector.js';
import { TextRun } from './text-run.js';
import { collectWindow } from './text-window.js';

function isWithin(node, selector) {
  for (let current = node; current; current = current.getRootNode().host) {
    const element = current.nodeType === Node.ELEMENT_NODE ? current : current.parentElement;
    if (element?.closest(selector)) return true;
  }
  return false;
}

const isInScope = (node, { selector }) =>
  !node.parentElement?.isContentEditable && (!selector || isWithin(node, selector));

export class Censor {
  #rules;
  #reach;
  #ledger;

  constructor(rules, ledger) {
    this.#rules = rules
      .map(compileRule)
      .filter((rule) => rule && (!rule.selector || isValidSelector(rule.selector)));
    this.#reach = Math.max(0, ...this.#rules.map((rule) => rule.reach));
    this.#ledger = ledger;
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
    nodes.forEach((node) => this.#ledger.refresh(node));
    let run = new TextRun(nodes);

    this.#rules.forEach((rule, rank) => {
      for (;;) {
        const matches = this.#matches(run, rule, rank);
        if (!matches.length) break;
        for (const { segments, replacement } of matches.reverse()) {
          segments.forEach(({ node, start, end }, index) =>
            this.#ledger.replace(node, start, end, index ? '' : replacement, rank),
          );
        }
        run = new TextRun(nodes);
      }
    });
  }

  #matches(run, rule, rank) {
    return [...run.text.matchAll(rule.pattern)]
      .map(({ 0: found, index }) => ({
        segments: run.segments(index, index + found.length),
        replacement: rule.replacementFor(found),
      }))
      .filter(({ segments }) =>
        segments.every(
          ({ node, start, end }) =>
            isInScope(node, rule) && !this.#ledger.isSealed(node, start, end, rank),
        ),
      );
  }
}
