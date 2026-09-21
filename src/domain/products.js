import { matchesOrigin } from './geography.js';
import { STATUS_RANK } from '../config/calendar.js';

export function normalizeSearch(value) {
  return value.toLocaleLowerCase('ru').replace(/ё/g, 'е');
}

export function productSearchText(product) {
  return normalizeSearch(
    [
      product.name,
      product.cardName || '',
      product.origin,
      product.variety || '',
      ...(product.aliases || []),
    ].join(' '),
  );
}

export function isYearRoundGreenhouse(product) {
  return product.months.every((status) => status === 't');
}

/** Both screens use the same search and geography rules. Never mutates the database. */
export function filterProducts(products, filters, favoriteIds = new Set()) {
  const query = normalizeSearch((filters.query || '').trim());
  return products.filter((product) => {
    const status = product.months[filters.month];
    if (query && !productSearchText(product).includes(query)) return false;
    if (!matchesOrigin(product.origin, filters.origin || '')) return false;
    if (filters.category && product.category !== filters.category) return false;
    if (filters.status && status !== filters.status) return false;
    if (filters.favoritesOnly && !favoriteIds.has(product.id)) return false;
    if (filters.knownOnly && status === 'u') return false;
    if (filters.mode === 'fav' && !favoriteIds.has(product.id)) return false;
    if (filters.mode === 'off' && status !== 'n') return false;
    if (
      filters.mode === 'good' &&
      !['p', 'g', 'a'].includes(status) &&
      !isYearRoundGreenhouse(product)
    )
      return false;
    return true;
  });
}

export function sortProducts(products, month, order = 'name') {
  const rank = (product) =>
    order === 'season'
      ? STATUS_RANK[product.months[month]]
      : order === 'peak' && product.months[month] === 'p'
        ? -1
        : 0;
  return [...products].sort(
    (left, right) =>
      rank(left) - rank(right) ||
      left.name.localeCompare(right.name, 'ru') ||
      left.origin.localeCompare(right.origin, 'ru'),
  );
}

export function visibleMonths(month, wholeYear) {
  return wholeYear
    ? Array.from({ length: 12 }, (_, index) => index)
    : [(month + 11) % 12, month, (month + 1) % 12];
}
