import { resolveSeason } from '../domain/seasons.js';
import { resolveAdvice, adviceForVariant } from '../domain/advice.js';

/** Complete screen model, independent of DOM, storage and the current clock. */
export function buildProductDetails(
  catalog,
  variantId,
  month,
  purchaseContext = { environment: 'home', form: 'whole' },
) {
  const selected = catalog.variant(variantId);
  if (!selected) throw new Error(`Unknown variant: ${variantId}`);
  const variants = [
    selected,
    ...catalog.variantsFor(selected.productId).filter((row) => row.id !== variantId),
  ];
  const displayedAdvice = new Set();
  const displayedShopAdvice = new Set();
  return {
    productId: selected.productId,
    title: catalog.product(selected.productId).name,
    month,
    purchaseContext: { ...purchaseContext },
    sourceIds: [
      ...new Set(
        variants.flatMap((variant) => [
          ...resolveSeason(catalog, variant.id, month).sourceIds,
          ...adviceForVariant(catalog, variant.id).flatMap((item) =>
            catalog.sourceIds(item.evidenceIds),
          ),
        ]),
      ),
    ],
    hasReadiness: variants.some((variant) =>
      adviceForVariant(catalog, variant.id).some(
        (item) =>
          item.appliesTo.kind === 'conditional' &&
          ['firm', 'ready'].includes(item.appliesTo.readiness),
      ),
    ),
    variants: variants.map((variant) => {
      const shop = resolveAdvice(catalog, variant.id, { environment: 'home', form: 'whole' });
      const shopAdvice = [...shop.general, ...shop.matched]
        .filter((item) => ['choose', 'discard', 'ripen'].includes(item.topic))
        .map((item) => {
          const repeated = displayedShopAdvice.has(item.id);
          displayedShopAdvice.add(item.id);
          return { ...item, repeated, sourceIds: catalog.sourceIds(item.evidenceIds) };
        });
      const resolution = resolveAdvice(catalog, variant.id, purchaseContext);
      const items = [...resolution.general, ...resolution.matched].map((advice) => {
        const repeated = displayedAdvice.has(advice.id);
        displayedAdvice.add(advice.id);
        return { ...advice, repeated, sourceIds: catalog.sourceIds(advice.evidenceIds) };
      });
      return {
        ...variant,
        season: resolveSeason(catalog, variant.id, month),
        advice: items,
        shopAdvice,
        needsContext: resolution.needsContext,
      };
    }),
  };
}
