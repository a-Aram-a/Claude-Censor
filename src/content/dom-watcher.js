import { SHADOW_ATTACHED } from './shadow-event.js';

const OBSERVED = { subtree: true, childList: true, characterData: true };

const shadowRootOf = (node) =>
  node instanceof HTMLElement ? chrome.dom.openOrClosedShadowRoot(node) : null;

export class DomWatcher {
  #onDirty;
  #observer = new MutationObserver((records) => this.#handle(records));
  #listeners = new AbortController();
  #roots = new WeakSet();

  constructor(onDirty) {
    this.#onDirty = onDirty;
  }

  start() {
    this.#handle([], (dirty) => this.#adopt(document, dirty));
    document.addEventListener(
      'DOMContentLoaded',
      () => this.#handle(this.#observer.takeRecords(), (dirty) => this.#discover(document, dirty)),
      { signal: this.#listeners.signal },
    );
  }

  stop() {
    this.#observer.disconnect();
    this.#listeners.abort();
  }

  #handle(records, visit) {
    const dirty = new Set();
    for (const record of records) this.#inspect(record, dirty);
    visit?.(dirty);
    if (dirty.size) this.#onDirty(dirty);
    this.#observer.takeRecords();
  }

  #inspect({ type, target, addedNodes, removedNodes, previousSibling, nextSibling }, dirty) {
    if (type === 'characterData') {
      dirty.add(target);
      return;
    }
    this.#adoptShadowOf(target, dirty);
    for (const node of addedNodes) {
      dirty.add(node);
      this.#discover(node, dirty);
    }
    if (removedNodes.length) dirty.add(nextSibling ?? previousSibling ?? target);
  }

  #discover(node, dirty) {
    if (node.nodeType === Node.TEXT_NODE) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
    for (let current = node; current; current = walker.nextNode()) {
      this.#adoptShadowOf(current, dirty);
    }
  }

  #adoptShadowOf(host, dirty) {
    const root = shadowRootOf(host);
    if (root) this.#adopt(root, dirty);
  }

  #adopt(root, dirty) {
    if (this.#roots.has(root)) return;
    this.#roots.add(root);
    this.#observer.observe(root, OBSERVED);
    root.addEventListener(SHADOW_ATTACHED, this.#onShadowAttached, {
      capture: true,
      signal: this.#listeners.signal,
    });
    dirty.add(root);
    this.#discover(root, dirty);
  }

  #onShadowAttached = ({ target }) => {
    this.#handle(this.#observer.takeRecords(), (dirty) => this.#adoptShadowOf(target, dirty));
  };
}
