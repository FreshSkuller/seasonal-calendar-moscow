import { filterProducts, sortProducts } from './products.js';

export function selectRepresentative(variants, month, preferredVariantId) {
  const preferred = variants.find((variant) => variant.id === preferredVariantId);
  if (preferred) return { variant: preferred, reason: 'preferred' };
  const variant = sortProducts(variants, month, 'season')[0];
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
      selectionReason: reason,
    };
  });
}
