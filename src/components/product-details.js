import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape } from '../shared/html.js';
import { statusBadge } from './status-badge.js';
import { sourceList } from './source-list.js';

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

export function productDetails(product, month, database) {
  const status = product.months[month];
  const year = product.months
    .map(
      (code, index) =>
        `<div>${escape(copy.monthsShort[index])}${statusBadge(database.statuses, code, true)}</div>`,
    )
    .join('');
  return `<div class="dialog-head">
    <div><p class="fine">${escape(product.category)}</p><h2 id="dialog-title">${escape(product.name)}</h2><p>${escape(product.origin)}</p></div>
    <button class="close" data-close-dialog aria-label="${escape(copy.details.close)}">×</button>
  </div>
  <div class="detail-note">${statusBadge(database.statuses, status)} <strong>· ${escape(copy.months[month])}</strong><p>${escape(database.statuses[status][2])}</p></div>
  <p>${escape(product.note)}</p>
  ${qualityDetails(product, database.sources)}
  <div class="year-mini">${year}</div>
  <p><b>${escape(copy.details.confidence)}</b> ${escape(product.confidence)}.</p>
  <p><b>${escape(copy.details.supply)}</b> ${escape(product.supply)}</p>
  <p class="fine">${escape(product.basis)}</p>
  <h3>${escape(copy.details.sources)}</h3>
  ${product.sources.length ? sourceList(database.sources, product.sources) : `<p class="notice">${escape(copy.details.noSources)}</p>`}`;
}
