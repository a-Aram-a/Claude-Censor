import { SHADOW_ATTACHED } from './shadow-event.js';

const { attachShadow } = Element.prototype;

Element.prototype.attachShadow = function (...args) {
  const root = attachShadow.apply(this, args);
  this.dispatchEvent(new Event(SHADOW_ATTACHED));
  return root;
};
