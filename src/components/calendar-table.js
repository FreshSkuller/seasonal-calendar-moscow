import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape, formatMessage } from '../shared/html.js';
import { statusBadge } from './status-badge.js';
import { seasonLabel } from './season-label.js';
import { favoriteButton } from './favorite-button.js';

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

export function calendarRows(products, month, months, statuses, favorites) {
  if (!products.length)
    return `<tr><td class="empty" colspan="${4 + months.length}">${escape(copy.calendar.empty)}</td></tr>`;
  return products
    .map(
      (product) => `<tr>
    <td class="product">
      <button class="name" data-product="${escape(product.variantId || product.id)}">${escape(product.name)}</button>
      <small class="row-category">${escape(product.category)}</small>
      ${product.variantCount > 1 ? `<small class="variant-caption">${escape(product.variety || product.variantName)} · вариантов: ${product.variantCount}</small>` : ''}
      <small class="mobile-origin">${escape(product.origin)}</small>
    </td>
    <td class="origin">${escape(product.origin)}</td>
    <td class="decision"><button class="cellbtn" data-product="${escape(product.variantId || product.id)}" data-month="${month}" aria-label="${escape(`${product.name}: ${seasonLabel(product.months, month, statuses)}, ${copy.calendar.explanation}`)}">${statusBadge(statuses, product.months[month], false, seasonLabel(product.months, month, statuses))}</button></td>
    ${months.map((index) => monthCell(product, index, month, statuses)).join('')}
    <td>${favoriteButton(product, favorites.has(product.id))}</td>
  </tr>`,
    )
    .join('');
}
