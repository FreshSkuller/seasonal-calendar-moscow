export const ADVICE_TOPICS = ['choose', 'ripen', 'store', 'prepare', 'freeze', 'discard'];

/** Explicit substitutions only. A draft never hides a published recommendation. */
export function adviceForVariant(catalog, variantId) {
  const variant = catalog.variant(variantId);
  if (!variant) throw new Error(`Unknown variant: ${variantId}`);
  const product = catalog.product(variant.productId);
  const ids = new Set([...product.adviceIds, ...variant.adviceIds]);
  for (const override of variant.adviceOverrides) {
    if (catalog.adviceItem(override.withAdviceId).editorialStatus !== 'published') continue;
    ids.delete(override.replacesAdviceId);
    ids.add(override.withAdviceId);
  }
  return [...ids]
    .map((id) => catalog.adviceItem(id))
    .filter((item) => item.editorialStatus === 'published');
}

/** General prose remains general; unknown readiness is never guessed from a calendar. */
export function resolveAdvice(catalog, variantId, context = { environment: 'home' }) {
  const result = { general: [], matched: [], needsContext: [] };
  for (const advice of adviceForVariant(catalog, variantId)) {
    if (advice.appliesTo.kind === 'general') {
      result.general.push(advice);
      continue;
    }
    let missing = false;
    let incompatible = false;
    for (const key of ['form', 'readiness', 'environment']) {
      const expected = advice.appliesTo[key];
      if (!expected || expected === 'any') continue;
      if (!context[key]) missing = true;
      else if (context[key] !== expected) incompatible = true;
    }
    if (incompatible) continue;
    result[missing ? 'needsContext' : 'matched'].push(advice);
  }
  return result;
}
