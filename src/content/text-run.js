export class TextRun {
  #nodes;
  #offsets = [];

  constructor(nodes) {
    this.#nodes = nodes;
    let text = '';
    for (const node of nodes) {
      this.#offsets.push(text.length);
      text += node.data;
    }
    this.text = text;
  }

  nodesBetween(start, end) {
    return this.#nodes.slice(this.#indexAt(start), this.#indexAt(end - 1) + 1);
  }

  replace(start, end, replacement) {
    const first = this.#indexAt(start);
    for (let i = this.#indexAt(end - 1); i >= first; i--) {
      const base = this.#offsets[i];
      const length = (this.#offsets[i + 1] ?? this.text.length) - base;
      const from = Math.max(start - base, 0);
      const to = Math.min(end - base, length);
      this.#nodes[i].replaceData(from, to - from, i === first ? replacement : '');
    }
  }

  #indexAt(offset) {
    let low = 0;
    let high = this.#offsets.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (this.#offsets[middle] <= offset) low = middle;
      else high = middle - 1;
    }
    return low;
  }
}
