import { groupedProducts } from '../domain/product-groups.js';
import { sortProducts } from '../domain/products.js';

export function buildProductList(
  catalog,
  filters,
  favorites,
  order = 'season',
  preferredVariants = {},
) {
  const products = sortProducts(
    groupedProducts(catalog, filters, favorites, preferredVariants),
    filters.month,
    order,
    filters.productType,
  );
  return {
    products,
    total: products.length,
    good: products.filter((item) => ['p', 'g', 'a'].includes(item.months[filters.month])).length,
    unknown: products.filter((item) => item.months[filters.month] === 'u').length,
  };
}
