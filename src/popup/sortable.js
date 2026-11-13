const ITEM = '[data-item]';
const HANDLE = '.handle';
const STEPS = { ArrowUp: -1, ArrowDown: 1 };

let drag = null;

export function sortable(list, onMove) {
  const indexOf = (item) => [...list.children].indexOf(item);
  const grabbedItem = ({ target }) => {
    const item = target.closest?.(HANDLE)?.closest(ITEM);
    return item?.parentElement === list ? item : null;
  };
  const childUnder = (target) => {
    let child = target;
    while (child && child.parentElement !== list) child = child.parentElement;
    return child;
  };

  list.addEventListener('dragstart', (event) => {
    const item = grabbedItem(event);
    if (!item) return;
    drag = { item, list, origin: indexOf(item) };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setDragImage(item, 16, 16);
    requestAnimationFrame(() => drag?.item.classList.add('dragging'));
  });

  list.addEventListener('dragover', (event) => {
    if (drag?.list !== list) return;
    event.preventDefault();
    const over = childUnder(event.target);
    if (!over || over === drag.item) return;
    const { top, height } = over.getBoundingClientRect();
    list.insertBefore(drag.item, event.clientY > top + height / 2 ? over.nextSibling : over);
  });

  list.addEventListener('dragend', () => {
    if (drag?.list !== list) return;
    const { item, origin } = drag;
    drag = null;
    item.classList.remove('dragging');
    const destination = indexOf(item);
    if (destination !== origin) onMove(origin, destination);
  });

  list.addEventListener('keydown', (event) => {
    const step = STEPS[event.key];
    const item = grabbedItem(event);
    if (!step || !item) return;
    event.preventDefault();
    const sibling = step < 0 ? item.previousElementSibling : item.nextElementSibling;
    if (!sibling) return;
    const from = indexOf(item);
    sibling[step < 0 ? 'before' : 'after'](item);
    event.target.focus();
    onMove(from, from + step);
  });
}

export function dropZone(element, accepts, onDrop) {
  const isWelcome = () => drag !== null && accepts(drag.item);

  element.addEventListener('dragover', (event) => {
    if (!isWelcome()) return;
    event.preventDefault();
    element.classList.add('drop-target');
  });

  element.addEventListener('dragleave', (event) => {
    if (!element.contains(event.relatedTarget)) element.classList.remove('drop-target');
  });

  element.addEventListener('drop', (event) => {
    if (!isWelcome()) return;
    event.preventDefault();
    const { item } = drag;
    drag = null;
    item.classList.remove('dragging');
    element.classList.remove('drop-target');
    onDrop(item);
  });
}
