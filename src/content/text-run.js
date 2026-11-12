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

  segments(start, end) {
    const segments = [];
    for (let i = this.#indexAt(start); i < this.#nodes.length && this.#offsets[i] < end; i++) {
      const node = this.#nodes[i];
      const base = this.#offsets[i];
      const from = Math.max(start - base, 0);
      const to = Math.min(end - base, node.length);
      if (from < to) segments.push({ node, start: from, end: to });
    }
    return segments;
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
