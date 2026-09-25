import { matchesOrigin } from './geography.js';
import { STATUS_RANK } from '../config/calendar.js';
import { normalizeSearch, searchProducts } from './search.js';
export { normalizeSearch } from './search.js';

export function productSearchText(product) {
  return normalizeSearch(
    [
      product.name,
      product.productName || '',
      product.origin,
      product.variety || '',
      ...(product.searchAliases || []),
      ...(product.aliases || []),
    ].join(' '),
  );
}

export function isYearRoundGreenhouse(product) {
  return product.months.every((status) => status === 't');
}

/** Both screens use the same search and geography rules. Never mutates the database. */
export function filterProducts(products, filters, favoriteIds = new Set()) {
  return searchProducts(products, filters.query || '', productSearchText).filter((product) => {
    const status = product.months[filters.month];
    if (!matchesOrigin(product, filters.origin || '')) return false;
    if (filters.productType && !product.productTypes.includes(filters.productType)) return false;
    if (filters.status && status !== filters.status) return false;
    if (filters.favoritesOnly && !favoriteIds.has(product.id)) return false;
    if (filters.knownOnly && status === 'u') return false;
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

export function sortProducts(products, month, order = 'name', selectedType = '') {
  const typeRank = (product) => (selectedType && product.productTypes[0] !== selectedType ? 1 : 0);
  const rank = (product) =>
    order === 'season'
      ? STATUS_RANK[product.months[month]]
      : order === 'peak' && product.months[month] === 'p'
        ? -1
        : 0;
  return [...products].sort(
    (left, right) =>
      typeRank(left) - typeRank(right) ||
      rank(left) - rank(right) ||
      left.name.localeCompare(right.name, 'ru') ||
      left.origin.localeCompare(right.origin, 'ru') ||
      left.id.localeCompare(right.id, 'en', { numeric: true }),
  );
}

export function visibleMonths(month, wholeYear) {
  return wholeYear
    ? Array.from({ length: 12 }, (_, index) => index)
    : [(month + 11) % 12, month, (month + 1) % 12];
}
