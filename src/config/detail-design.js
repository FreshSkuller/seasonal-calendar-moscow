/** Explicit product-scoped visual trial; expand only after the design is approved. */
const warmReferenceProducts = new Set(['product-114']);

export function detailDesign(productId) {
  return warmReferenceProducts.has(productId) ? 'warm-reference' : 'default';
}
