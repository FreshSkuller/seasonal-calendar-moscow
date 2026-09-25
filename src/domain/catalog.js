/** Build immutable domain records and private indexes once per catalog load. */
export function createCatalog(database) {
  const data = structuredClone(database);
  const index = (items) => new Map(items.map((item) => [item.id, item]));
  const products = index(data.products);
  const rawVariants = index(data.variants);
  const seasons = index(data.seasons);
  const advice = index(data.advice);
  const evidence = index(data.evidence);
  const origins = index(data.origins);
  const categories = index(data.categories);
  const sourceIds = (evidenceIds) => [
    ...new Set(evidenceIds.flatMap((id) => evidence.get(id).sourceIds)),
  ];
  const variants = data.variants
    .map((variant) => ({
      ...variant,
      productName: products.get(variant.productId).name,
      productTypes: products.get(variant.productId).productTypes,
      searchAliases: products.get(variant.productId).searchAliases || EMPTY,
      origin: origins.get(variant.originId).label,
      navigationGroup: origins.get(variant.originId).navigationGroup,
      category: categories.get(variant.categoryId).label,
      months: seasons.get(variant.seasonProfileId).months,
    }))
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  const variantsById = index(variants);
  const variantsByProduct = new Map(data.products.map((product) => [product.id, []]));
  for (const variant of variants) variantsByProduct.get(variant.productId).push(variant);
  freezeDeep(data);
  const catalog = {
    ...data,
    variants,
    product: (id) => products.get(id),
    variant: (id) => variantsById.get(id),
    rawVariant: (id) => rawVariants.get(id),
    season: (id) => seasons.get(id),
    adviceItem: (id) => advice.get(id),
    evidenceItem: (id) => evidence.get(id),
    variantsFor: (id) => variantsByProduct.get(id) || EMPTY,
    sourceIds,
    favoriteProductId: (id) => (products.has(id) ? id : data.legacyFavorites[id] || id),
  };
  freezeDeep(catalog);
  for (const group of variantsByProduct.values()) Object.freeze(group);
  return catalog;
}
const EMPTY = Object.freeze([]);
function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) freezeDeep(child);
  Object.freeze(value);
}
