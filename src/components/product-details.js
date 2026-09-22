import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape } from '../shared/html.js';
import { variantDetails } from './variant-details.js';

/** Rendering only: variant choice and advice resolution belong to the application. */
export function productDetails(model, presentation) {
  const [selected, ...others] = model.variants;
  return `<div class="dialog-head">
    <div><h2 id="dialog-title">${escape(model.title)}</h2><p>${escape(copy.details.currentVariant)}</p></div>
    <button class="close" data-close-dialog aria-label="${escape(copy.details.close)}">×</button>
  </div>
  ${variantDetails(selected, model.month, presentation)}
  ${others.length ? `<h2>${escape(copy.details.otherVariants)}</h2><p class="fine">${escape(copy.details.variantGuide)}</p>${others.map((row) => variantDetails(row, model.month, presentation)).join('')}` : ''}`;
}
