import copy from '../../content/ru.json' with { type: 'json' };
import { isYearRoundGreenhouse } from '../domain/products.js';
import { escapeHtml as escape } from '../shared/html.js';
import { statusBadge } from './status-badge.js';
import { favoriteButton } from './favorite-button.js';

export function productTip(product, status) {
  if (status === 'a' && product.shortInfo) return product.shortInfo;
  if (status === 't' && isYearRoundGreenhouse(product)) return copy.today.greenhouseTip;
  return copy.today.tips[status];
}

/** Stateless HTML component. Events belong to the view, never individual cards. */
export function productCard(product, month, statuses, isFavorite) {
  const status = product.months[month];
  return `<article class="shop-card">
    <div class="shop-card-top">${statusBadge(statuses, status)}${favoriteButton(product, isFavorite)}</div>
    <h3><button data-product="${escape(product.id)}">${escape(product.name)}</button></h3>
    <p class="shop-origin">${escape(product.origin)}</p>
    <p class="shop-tip">${escape(productTip(product, status))}</p>
    <button class="why" data-product="${escape(product.id)}">${escape(copy.common.more)}</button>
  </article>`;
}
