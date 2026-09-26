import { filterProducts } from './products.js';
import { STATUS_RANK } from '../config/calendar.js';

function monthsUntilFreshSeason(variant, month) {
  for (let distance = 0; distance < 12; distance++) {
    if (['p', 'g'].includes(variant.months[(month + distance) % 12])) return distance;
  }
  return 12;
}

/** Keep current seasonal options first; among equal statuses, show the next season sooner. */
export function sortVariantsBySeasonProximity(variants, month) {
  return [...variants].sort(
    (left, right) =>
      STATUS_RANK[left.months[month]] - STATUS_RANK[right.months[month]] ||
      monthsUntilFreshSeason(left, month) - monthsUntilFreshSeason(right, month) ||
      left.origin.localeCompare(right.origin, 'ru') ||
      left.name.localeCompare(right.name, 'ru') ||
      left.id.localeCompare(right.id, 'en', { numeric: true }),
  );
}

export function selectRepresentative(variants, month, preferredVariantId) {
  const preferred = variants.find((variant) => variant.id === preferredVariantId);
  if (preferred) return { variant: preferred, reason: 'preferred' };
  const variant = sortVariantsBySeasonProximity(variants, month)[0];
  return {
    variant,
    reason: variant ? (preferredVariantId ? 'preferred-filtered-out' : 'season') : 'no-match',
  };
}

/** One actual variant per permanent product ID, never a synthetic monthly calendar. */
export function groupedProducts(catalog, filters, favorites = new Set(), preferredVariants = {}) {
  const expandedFavorites = new Set(
    catalog.variants.filter((row) => favorites.has(row.productId)).map((row) => row.id),
  );
  const groups = new Map();
  for (const row of filterProducts(catalog.variants, filters, expandedFavorites)) {
    if (!groups.has(row.productId)) groups.set(row.productId, []);
    groups.get(row.productId).push(row);
  }
  return [...groups].map(([productId, variants]) => {
    const { variant, reason } = selectRepresentative(
      variants,
      filters.month,
      preferredVariants[productId],
    );
    return {
      ...variant,
      id: productId,
      variantId: variant.id,
      name: catalog.product(productId).name,
      variantName: variant.name,
      variantCount: catalog.variantsFor(productId).length,
      otherOriginCount:
        new Set(catalog.variantsFor(productId).map((item) => item.originId)).size - 1,
      selectionReason: reason,
    };
  });
}
