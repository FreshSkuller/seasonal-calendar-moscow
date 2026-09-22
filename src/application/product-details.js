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
  return {
    productId: selected.productId,
    title: catalog.product(selected.productId).name,
    month,
    purchaseContext: { ...purchaseContext },
    hasReadiness: variants.some((variant) =>
      adviceForVariant(catalog, variant.id).some(
        (item) =>
          item.appliesTo.kind === 'conditional' &&
          ['firm', 'ready'].includes(item.appliesTo.readiness),
      ),
    ),
    variants: variants.map((variant) => {
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
        needsContext: resolution.needsContext,
      };
    }),
  };
}
