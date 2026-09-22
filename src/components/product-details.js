import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape } from '../shared/html.js';
import { variantDetails } from './variant-details.js';
import { purchaseContext } from './purchase-context.js';

/** Rendering only: variant choice and advice resolution belong to the application. */
export function productDetails(model, presentation) {
  return `<div class="dialog-head">
    <div><h2 id="dialog-title">${escape(model.title)}</h2><p>${escape(copy.details.currentVariant)}</p></div>
    <button class="close" data-close-dialog aria-label="${escape(copy.details.close)}">×</button>
  </div>
  ${purchaseContext(model)}
  <div data-variant-details>${productVariants(model, presentation)}</div>`;
}

export function productVariants(model, presentation) {
  const [selected, ...others] = model.variants;
  return `
  ${selected.needsContext.some((item) => item.topic === 'store') ? `<p class="notice" data-needs-readiness>${escape(copy.details.purchase.needsReadiness)}</p>` : ''}
  ${variantDetails(selected, model.month, presentation)}
  ${others.length ? `<h2>${escape(copy.details.otherVariants)}</h2><p class="fine">${escape(copy.details.variantGuide)}</p>${others.map((row) => variantDetails(row, model.month, presentation)).join('')}` : ''}`;
}
