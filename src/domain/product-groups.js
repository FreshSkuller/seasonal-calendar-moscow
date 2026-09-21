import { filterProducts, sortProducts } from './products.js';

export function productName(product) {
  return product.cardName || product.name;
}

export function productVariants(product, products) {
  return products.filter((row) => productName(row) === productName(product));
}

export function canonicalId(product, products) {
  return productVariants(product, products)
    .map((row) => row.id)
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))[0];
}

/** Filter variants first: a country or variety search must keep its own calendar. */
export function groupedProducts(products, filters, favorites = new Set()) {
  const favoriteNames = new Set(products.filter((row) => favorites.has(row.id)).map(productName));
  const expandedFavorites = new Set(
    products.filter((row) => favoriteNames.has(productName(row))).map((row) => row.id),
  );
  const matches = filterProducts(products, filters, expandedFavorites);
  const groups = new Map();
  for (const row of sortProducts(matches, filters.month, 'season')) {
    const name = productName(row);
    if (!groups.has(name)) {
      groups.set(name, {
        ...row,
        id: canonicalId(row, products),
        variantId: row.id,
        name,
        variantName: row.name,
        variantCount: productVariants(row, products).length,
      });
    }
  }
  return [...groups.values()];
}
