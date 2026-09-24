import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape } from '../shared/html.js';
import { variantDetails } from './variant-details.js';
import { purchaseContext } from './purchase-context.js';
import { adviceSection } from './advice-section.js';
import { sourceList } from './source-list.js';
import { statusBadge } from './status-badge.js';
import { seasonLabel } from './season-label.js';
import { seasonSourceNotes } from './season-source-notes.js';

const scope = (variant) =>
  `<p class="fine">${escape(variant.origin)} · ${escape(variant.variety || variant.name)}</p>`;

export function homeAdvice(model, presentation) {
  return `${model.variants[0].needsContext.some((item) => item.topic === 'store') ? `<p class="notice" data-needs-readiness>${escape(copy.details.purchase.needsReadiness)}</p>` : ''}${model.variants
    .map((variant, index) => {
      const items = variant.advice.filter((item) =>
        ['store', 'prepare', 'freeze'].includes(item.topic),
      );
      if (!items.some((item) => !item.repeated)) return '';
      return `${index ? scope(variant) : ''}${adviceSection(
        items.filter((item) => !item.repeated),
        presentation.sources,
        ['store', 'prepare', 'freeze'],
      )}`;
    })
    .join('')}`;
}

/** Shop advice is independent of the home state; each seasonal variant keeps its graph. */
export function productDetails(model, presentation) {
  const selected = model.variants[0];
  return `<div class="dialog-head">
    <div><h2 id="dialog-title" tabindex="-1"${model.title.length > 18 ? ' data-long-title' : ''}>${escape(model.title)}</h2>${scope(selected)}</div>
  </div>
  <div class="purchase-season">${statusBadge(presentation.statuses, selected.season.status, false, seasonLabel(selected.season.months, model.month, presentation.statuses))}<span>${escape(copy.months[model.month])}</span></div>
  <section data-shop-advice aria-labelledby="shop-advice-title"><h2 id="shop-advice-title">${escape(copy.details.shopTitle)}</h2>
  ${model.variants
    .map((variant, index) =>
      variant.shopAdvice.some((item) => !item.repeated)
        ? `${index ? scope(variant) : ''}${adviceSection(
            variant.shopAdvice.filter((item) => !item.repeated),
            presentation.sources,
            ['choose', 'discard', 'ripen'],
          )}`
        : '',
    )
    .join('')}
  </section>
  <details class="home-guide" data-home-guide><summary>${escape(copy.details.homeTitle)}</summary>
    ${purchaseContext(model)}<div data-home-advice>${homeAdvice(model, presentation)}</div>
  </details>
  <details class="season-reference"><summary>${escape(copy.details.calendarTitle)}</summary><div data-variant-details>${productVariants(model, presentation)}</div></details>
  <details class="product-sources" data-product-sources><summary>${escape(copy.details.allSources)}</summary>${seasonSourceNotes(model.variants)}${sourceList(presentation.sources, model.sourceIds)}</details>`;
}

export function productVariants(model, presentation) {
  const [selected, ...others] = model.variants;
  return `${variantDetails(selected, model.month, presentation)}${others.length ? `<h2>${escape(copy.details.otherVariants)}</h2><p class="fine">${escape(copy.details.variantGuide)}</p>${others.map((row) => variantDetails(row, model.month, presentation)).join('')}` : ''}`;
}
