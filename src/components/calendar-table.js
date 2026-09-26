import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape, formatMessage } from '../shared/html.js';
import { statusBadge } from './status-badge.js';
import { seasonLabel } from './season-label.js';
import { favoriteButton } from './favorite-button.js';
import { sortVariantsBySeasonProximity } from '../domain/product-groups.js';

export function calendarHeader(month, months, compact = false) {
  return `<tr>
    <th scope="col">${escape(copy.calendar.product)}</th>
    <th scope="col">${escape(copy.calendar.origin)}</th>
    <th scope="col">${escape(formatMessage(copy.calendar.monthGuide, { month: copy.months[month] }))}</th>
    ${months.map((index) => `<th scope="col" class="month ${index === month ? 'selected' : ''}">${escape(copy.monthsShort[index])}</th>`).join('')}
    ${compact ? '' : `<th scope="col"><span title="${escape(copy.common.favorites)}">♡</span></th>`}
  </tr>`;
}

function monthCell(product, index, selectedMonth, statuses, name = product.name) {
  const status = product.months[index];
  const description = `${copy.months[index]}: ${seasonLabel(product.months, index, statuses)}`;
  return `<td class="month ${index === selectedMonth ? 'selected' : ''}">
    <button class="cellbtn" data-product="${escape(product.variantId || product.id)}" data-month="${index}" title="${escape(description)}" aria-label="${escape(`${name}, ${description}`)}">${statusBadge(statuses, status, true)}</button>
  </td>`;
}

function decisionCell(product, month, statuses, name = product.name) {
  return `<td class="decision"><button class="cellbtn" data-product="${escape(product.variantId || product.id)}" data-month="${month}" aria-label="${escape(`${name}: ${seasonLabel(product.months, month, statuses)}, ${copy.calendar.explanation}`)}">${statusBadge(statuses, product.months[month], false, seasonLabel(product.months, month, statuses))}</button></td>`;
}

export function calendarRows(
  products,
  month,
  months,
  statuses,
  favorites,
  filters,
  catalog,
  expandedProducts = new Set(),
  compact = false,
) {
  if (!products.length) {
    const type = copy.page.productTypes[filters.productType];
    const message = filters.query
      ? formatMessage(type ? copy.common.emptyTypeQuery : copy.common.emptyQuery, {
          type,
          query: filters.query,
        })
      : copy.calendar.empty;
    return `<tr><td class="empty filter-empty" colspan="${(compact ? 3 : 4) + months.length}"><p>${escape(message)}</p>
      ${filters.query ? `<button data-clear-query>${escape(copy.page.clearSearch)}</button>` : ''}
      <button data-reset-filters>${escape(copy.page.calendarReset)}</button></td></tr>`;
  }
  return products
    .map((product) => {
      const favorite = favoriteButton(product, favorites.has(product.id));
      const others = sortVariantsBySeasonProximity(
        catalog.variantsFor(product.id).filter((variant) => variant.id !== product.variantId),
        month,
      );
      const expanded = expandedProducts.has(product.id);
      const selectedName = [
        product.name,
        product.origin,
        ...(product.variantName !== product.name ? [product.variantName] : []),
      ].join(', ');
      const variantToggleLabel = expanded
        ? copy.calendar.hideVariants
        : formatMessage(copy.calendar.showVariants, { count: others.length });
      const variantToggle = others.length
        ? `<button class="variant-toggle" data-toggle-variants="${escape(product.id)}" aria-label="${escape(`${product.name}: ${variantToggleLabel}`)}" aria-expanded="${expanded}"${expanded ? ` aria-controls="${others.map((variant) => `variant-${escape(variant.id)}`).join(' ')}"` : ''}>${escape(variantToggleLabel)}</button>`
        : '';
      return `<tr class="product-row" data-product-row="${escape(product.id)}">
    <td class="product">
      <div class="calendar-product-heading"><button class="name" data-product="${escape(product.variantId || product.id)}">${escape(product.name)}</button>${compact ? favorite : variantToggle}</div>
      <small class="row-category">${escape(product.productTypes.map((type) => copy.page.productTypes[type]).join(' · '))}</small>
      <small class="mobile-origin">${escape([product.origin, ...(product.variantName !== product.name ? [product.variantName] : [])].join(' · '))}</small>
      ${compact ? variantToggle : ''}
    </td>
    <td class="origin">${escape(product.origin)}${product.variantName !== product.name ? `<small>${escape(product.variantName)}</small>` : ''}</td>
    ${decisionCell(product, month, statuses, selectedName)}
    ${months.map((index) => monthCell(product, index, month, statuses, selectedName)).join('')}
    ${compact ? '' : `<td>${favorite}</td>`}
  </tr>${(expanded ? others : [])
    .map(
      (variant) => `<tr class="variant-row" id="variant-${escape(variant.id)}">
    <td class="product"><button class="variant-name" data-product="${escape(variant.id)}">${escape(variant.name)}</button><small class="mobile-origin">${escape(variant.origin)}</small></td>
    <td class="origin">${escape(variant.origin)}${variant.variety ? `<small>${escape(variant.variety)}</small>` : ''}</td>
    ${decisionCell(variant, month, statuses, `${variant.name}, ${variant.origin}`)}
    ${months.map((index) => monthCell(variant, index, month, statuses, `${variant.name}, ${variant.origin}`)).join('')}
    ${compact ? '' : '<td></td>'}
  </tr>`,
    )
    .join('')}`;
    })
    .join('');
}
