import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape, formatMessage } from '../shared/html.js';
import { statusBadge } from './status-badge.js';
import { seasonLabel } from './season-label.js';
import { favoriteButton } from './favorite-button.js';
import { originSummary } from './origin-summary.js';

export function calendarHeader(month, months) {
  return `<tr>
    <th scope="col">${escape(copy.calendar.product)}</th>
    <th scope="col">${escape(copy.calendar.origin)}</th>
    <th scope="col">${escape(formatMessage(copy.calendar.monthGuide, { month: copy.months[month] }))}</th>
    ${months.map((index) => `<th scope="col" class="month ${index === month ? 'selected' : ''}">${escape(copy.monthsShort[index])}</th>`).join('')}
    <th scope="col"><span title="${escape(copy.common.favorites)}">♡</span></th>
  </tr>`;
}

function monthCell(product, index, selectedMonth, statuses) {
  const status = product.months[index];
  const description = `${copy.months[index]}: ${seasonLabel(product.months, index, statuses)}`;
  return `<td class="month ${index === selectedMonth ? 'selected' : ''}">
    <button class="cellbtn" data-product="${escape(product.variantId || product.id)}" data-month="${index}" title="${escape(description)}" aria-label="${escape(`${product.name}, ${description}`)}">${statusBadge(statuses, status, true)}</button>
  </td>`;
}

export function calendarRows(products, month, months, statuses, favorites, filters) {
  if (!products.length) {
    const type = copy.page.productTypes[filters.productType];
    const message = filters.query
      ? formatMessage(type ? copy.common.emptyTypeQuery : copy.common.emptyQuery, {
          type,
          query: filters.query,
        })
      : copy.calendar.empty;
    return `<tr><td class="empty filter-empty" colspan="${4 + months.length}"><p>${escape(message)}</p>
      ${filters.query ? `<button data-clear-query>${escape(copy.page.clearSearch)}</button>` : ''}
      <button data-reset-filters>${escape(copy.page.calendarReset)}</button></td></tr>`;
  }
  return products
    .map(
      (product) => `<tr>
    <td class="product">
      <button class="name" data-product="${escape(product.variantId || product.id)}">${escape(product.name)}</button>
      <small class="row-category">${escape(product.productTypes.map((type) => copy.page.productTypes[type]).join(' · '))}</small>
      <small class="mobile-origin">${escape(originSummary(product))}</small>
    </td>
    <td class="origin">${escape(originSummary(product))}</td>
    <td class="decision"><button class="cellbtn" data-product="${escape(product.variantId || product.id)}" data-month="${month}" aria-label="${escape(`${product.name}: ${seasonLabel(product.months, month, statuses)}, ${copy.calendar.explanation}`)}">${statusBadge(statuses, product.months[month], false, seasonLabel(product.months, month, statuses))}</button></td>
    ${months.map((index) => monthCell(product, index, month, statuses)).join('')}
    <td>${favoriteButton(product, favorites.has(product.id))}</td>
  </tr>`,
    )
    .join('');
}
