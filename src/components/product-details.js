import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape } from '../shared/html.js';
import { statusBadge } from './status-badge.js';
import { sourceList } from './source-list.js';
import { productName, productVariants } from '../domain/product-groups.js';

export function qualityDetails(product, sources) {
  const sections = [
    product.variety &&
      `<p class="fine"><b>${escape(copy.details.variety)}</b> ${escape(product.variety)}</p>`,
    product.selection &&
      `<h3>${escape(copy.details.selection)}</h3><p>${escape(product.selection)}</p>`,
    product.ripening &&
      `<h3>${escape(copy.details.ripening)}</h3><p>${escape(product.ripening)}</p>`,
    product.qualitySources?.length &&
      `<details><summary>${escape(copy.details.qualitySources)}</summary>${sourceList(sources, product.qualitySources)}</details>`,
  ];
  return sections.filter(Boolean).join('');
}

function variantDetails(product, month, database, shownQuality) {
  const status = product.months[month];
  const qualityKey = JSON.stringify([product.selection, product.ripening, product.qualitySources]);
  const repeatedQuality =
    Boolean(product.selection || product.ripening) && shownQuality.has(qualityKey);
  shownQuality.add(qualityKey);
  const year = product.months
    .map(
      (code, index) =>
        `<div title="${escape(`${copy.months[index]}: ${database.statuses[code][1]}`)}" aria-label="${escape(`${copy.months[index]}: ${database.statuses[code][1]}`)}">${escape(copy.monthsShort[index])}${statusBadge(database.statuses, code, true)}</div>`,
    )
    .join('');
  return `<section class="variant-detail"><h3>${escape(product.origin)} · ${escape(product.name)}</h3>
  <div class="detail-note">${statusBadge(database.statuses, status)} <strong>· ${escape(copy.months[month])}</strong><p>${escape(database.statuses[status][2])}</p></div>
  <p>${escape(product.note)}</p>
  ${repeatedQuality ? `${product.variety ? `<p class="fine">${escape(product.variety)}</p>` : ''}<p class="fine">${escape(copy.details.sameQuality)}</p>` : qualityDetails(product, database.sources)}
  <div class="year-mini">${year}</div>
  <p><b>${escape(copy.details.confidence)}</b> ${escape(product.confidence)}.</p>
  <p><b>${escape(copy.details.supply)}</b> ${escape(product.supply)}</p>
  <p class="fine">${escape(product.basis)}</p>
  <details><summary>${escape(copy.details.sources)}</summary>
  ${product.sources.length ? sourceList(database.sources, product.sources) : `<p class="notice">${escape(copy.details.noSources)}</p>`}</details></section>`;
}

export function productDetails(product, month, database) {
  const shownQuality = new Set();
  const others = productVariants(product, database.rows).filter((row) => row.id !== product.id);
  return `<div class="dialog-head">
    <div><h2 id="dialog-title">${escape(productName(product))}</h2><p>${escape(copy.details.currentVariant)}</p></div>
    <button class="close" data-close-dialog aria-label="${escape(copy.details.close)}">×</button>
  </div>
  ${variantDetails(product, month, database, shownQuality)}
  ${others.length ? `<h2>${escape(copy.details.otherVariants)}</h2><p class="fine">${escape(copy.details.variantGuide)}</p>${others.map((row) => variantDetails(row, month, database, shownQuality)).join('')}` : ''}`;
}
