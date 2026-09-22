import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape } from '../shared/html.js';
import { detailDesign } from '../config/detail-design.js';

export function purchaseContext(model) {
  const compact = detailDesign(model.productId) === 'warm-reference';
  const labels = compact
    ? { ...copy.details.purchase, ...copy.details.compactPurchase }
    : copy.details.purchase;
  const options = (name, values, selected) =>
    values
      .map(
        (value) =>
          `<label class="purchase-option"><input type="radio" aria-label="${escape(copy.details.purchase[value])}" name="purchase-${name}" value="${value}" ${selected === value ? 'checked' : ''}><span>${escape(labels[value])}</span></label>`,
      )
      .join('');
  return `<section class="purchase-context${compact ? ' purchase-context-compact' : ''}" aria-labelledby="purchase-title">
    <h3 id="purchase-title">${escape(labels.title)}</h3>
    <fieldset><legend>${escape(labels.form)}</legend><div class="purchase-options">${options('form', ['whole', 'cut'], model.purchaseContext.form)}</div></fieldset>
    ${model.hasReadiness ? `<fieldset data-readiness ${model.purchaseContext.form === 'cut' ? 'hidden' : ''}><legend>${escape(labels.readiness)}</legend><div class="purchase-options">${options('readiness', ['unknown', 'firm', 'ready'], model.purchaseContext.readiness || 'unknown')}</div></fieldset>` : ''}
    <p class="fine">${escape(labels.hint)}</p>
    <p class="fine" role="status" data-purchase-status></p>
  </section>`;
}
