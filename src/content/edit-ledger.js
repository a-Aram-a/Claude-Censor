export class EditLedger {
  #records = new WeakMap();
  #epoch = 0;

  invalidate() {
    this.#epoch++;
  }

  refresh(node) {
    const record = this.#records.get(node);
    if (!record || this.#isCurrent(record, node)) return;
    this.#records.delete(node);
    if (record.text === node.data) node.data = record.original;
  }

  isSealed(node, start, end, rank) {
    const record = this.#current(node);
    return Boolean(
      record?.spans.some((span) => span.rank >= rank && span.start < end && start < span.end),
    );
  }

  replace(node, start, end, text, rank) {
    const record = this.#current(node) ?? { epoch: this.#epoch, original: node.data, spans: [] };
    const shift = text.length - (end - start);
    record.spans = [
      ...record.spans.flatMap((span) => [
        { ...span, end: Math.min(span.end, start) },
        { ...span, start: Math.max(span.start, end) + shift, end: span.end + shift },
      ]),
      { rank, start, end: start + text.length },
    ].filter((span) => span.start < span.end);

    node.replaceData(start, end - start, text);
    record.text = node.data;
    this.#records.set(node, record);
  }

  #current(node) {
    const record = this.#records.get(node);
    return record && this.#isCurrent(record, node) ? record : null;
  }

  #isCurrent(record, node) {
    return record.epoch === this.#epoch && record.text === node.data;
  }
}
