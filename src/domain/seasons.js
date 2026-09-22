/** Preserve monthly assessments; do not reverse-engineer unverified harvest facts. */
export function resolveSeason(catalog, variantId, month) {
  if (!Number.isInteger(month) || month < 0 || month > 11) throw new Error('Invalid month');
  const variant = catalog.variant(variantId);
  if (!variant) throw new Error(`Unknown variant: ${variantId}`);
  const profile = catalog.season(variant.seasonProfileId);
  return {
    variantId,
    profileId: profile.id,
    representation: profile.representation,
    status: profile.months[month],
    months: profile.months,
    note: profile.note,
    confidence: profile.confidence,
    supply: profile.supply,
    basis: profile.basis,
    reviewed: profile.reviewed,
    evidenceIds: profile.evidenceIds,
    sourceIds: catalog.sourceIds(profile.evidenceIds),
  };
}
