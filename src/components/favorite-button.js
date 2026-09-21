import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape, formatMessage } from '../shared/html.js';

export function favoriteButton(product, selected) {
  const message = selected ? copy.common.removeFavorite : copy.common.addFavorite;
  const label = formatMessage(message, { product: `${product.name}, ${product.origin}` });
  return `<button class="fav" data-favorite="${escape(product.id)}" aria-pressed="${selected}" aria-label="${escape(label)}">${selected ? '♥' : '♡'}</button>`;
}
