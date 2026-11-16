import { compileRule, stripIgnorables } from '../shared/matcher.js';
import { resolveSelector } from '../shared/selector.js';
import { TextRun } from './text-run.js';
import { collectWindow } from './text-window.js';

function scopeOf(node, selector) {
  if (node.parentElement?.isContentEditable) return null;
  if (!selector) return node.getRootNode();
  for (let current = node; current; current = current.getRootNode().host) {
    const element = current.nodeType === Node.ELEMENT_NODE ? current : current.parentElement;
    const scope = element?.closest(selector);
    if (scope) return scope;
  }
  return null;
}

const wholeSubject = (nodes) => {
  const run = new TextRun(nodes);
  return { text: run.text, segments: (start, end) => run.segments(start, end) };
};

function isolatedSubjects({ nodes, openStart, openEnd }, selector) {
  const groups = [];
  let previous = null;
  nodes.forEach((node) => {
    const scope = scopeOf(node, selector);
    if (scope && scope === previous) groups.at(-1).push(node);
    else if (scope) groups.push([node]);
    previous = scope;
  });
  return groups.map((group) => {
    const run = new TextRun(group);
    const { text, toRaw } = stripIgnorables(run.text);
    return {
      text,
      segments: (start, end) => run.segments(...toRaw(start, end)),
      openStart: openStart && group[0] === nodes[0],
      openEnd: openEnd && group.at(-1) === nodes.at(-1),
    };
  });
}

const isCutOff = ({ text, openStart, openEnd }, { 0: found, index }) =>
  (openStart && index === 0) || (openEnd && index + found.length === text.length);

export class Censor {
  #rules;
  #reach;
  #ledger;

  constructor(rules, ledger) {
    this.#rules = rules.flatMap((rule) => {
      const compiled = compileRule(rule);
      const selector = resolveSelector(rule.selector ?? '');
      return compiled && selector !== null ? [{ ...compiled, selector }] : [];
    });
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
      const window = collectWindow(origin, this.#reach);
      const { core } = window;
      if (core.length && core.every((node) => censored.has(node))) continue;
      core.forEach((node) => censored.add(node));
      this.#apply(window);
    }
  }

  #apply(window) {
    const { nodes } = window;
    nodes.forEach((node) => this.#ledger.refresh(node));
    let whole = null;

    this.#rules.forEach((rule, rank) => {
      for (;;) {
        const subjects = rule.isolated
          ? isolatedSubjects(window, rule.selector)
          : [(whole ??= wholeSubject(nodes))];
        const matches = subjects.flatMap((subject) => this.#matches(subject, rule, rank));
        if (!matches.length) break;
        for (const { segments, replacement } of matches.reverse()) {
          segments.forEach(({ node, start, end }, index) =>
            this.#ledger.replace(node, start, end, index ? '' : replacement, rank),
          );
        }
        whole = null;
      }
    });
  }

  #matches(subject, rule, rank) {
    return [...subject.text.matchAll(rule.pattern)]
      .filter((match) => match[0] && !isCutOff(subject, match))
      .map((match) => ({
        segments: subject.segments(match.index, match.index + match[0].length),
        replacement: rule.replacementFor(match),
      }))
      .filter(({ segments }) =>
        segments.every(
          ({ node, start, end }) =>
            scopeOf(node, rule.selector) && !this.#ledger.isSealed(node, start, end, rank),
        ),
      );
  }
}
