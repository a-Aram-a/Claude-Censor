const ITEM = '[data-item]';
const HANDLE = '.handle';
const STEPS = { ArrowUp: -1, ArrowDown: 1 };

export function sortable(list, onMove) {
  let dragged = null;
  let origin = -1;

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
    dragged = grabbedItem(event);
    if (!dragged) return;
    origin = indexOf(dragged);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setDragImage(dragged, 16, 16);
    requestAnimationFrame(() => dragged?.classList.add('dragging'));
  });

  list.addEventListener('dragover', (event) => {
    if (!dragged) return;
    event.preventDefault();
    const over = childUnder(event.target);
    if (!over || over === dragged) return;
    const { top, height } = over.getBoundingClientRect();
    list.insertBefore(dragged, event.clientY > top + height / 2 ? over.nextSibling : over);
  });

  list.addEventListener('dragend', () => {
    if (!dragged) return;
    dragged.classList.remove('dragging');
    const destination = indexOf(dragged);
    dragged = null;
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
