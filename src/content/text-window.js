import { significantLength } from '../shared/matcher.js';

const SKIPPED_PARENTS = new Set(['script', 'style', 'noscript', 'textarea']);
// ponytail: context walk is capped; text split by more empty nodes than this slips through. Raise if it matters.
const MAX_CONTEXT_NODES = 512;

const isCensorable = (text) => !SKIPPED_PARENTS.has(text.parentNode?.localName);
const filter = (text) => (isCensorable(text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT);

function collectContext(walker, origin, reach) {
  const before = [];
  walker.currentNode = origin;
  for (let need = reach; need > 0 && before.length < MAX_CONTEXT_NODES && walker.previousNode(); ) {
    before.push(walker.currentNode);
    need -= significantLength(walker.currentNode.data);
  }
  return { before: before.reverse(), openStart: Boolean(walker.previousNode()) };
}

export function collectWindow(origin, reach) {
  const walker = document.createTreeWalker(origin.getRootNode(), NodeFilter.SHOW_TEXT, filter);
  const { before, openStart } = collectContext(walker, origin, reach);
  const core = origin.nodeType === Node.TEXT_NODE && isCensorable(origin) ? [origin] : [];
  const after = [];
  let openEnd = false;

  walker.currentNode = origin;
  for (let need = reach; walker.nextNode(); ) {
    const node = walker.currentNode;
    if (!after.length && origin.contains(node)) {
      core.push(node);
      continue;
    }
    if (need <= 0 || after.length >= MAX_CONTEXT_NODES) {
      openEnd = true;
      break;
    }
    after.push(node);
    need -= significantLength(node.data);
  }

  return { core, nodes: [...before, ...core, ...after], openStart, openEnd };
}
