/** Describe only visible runs in the monthly calendar; unknown months stop inference. */
export function seasonDirection(months, month) {
  const at = (offset) => months[(month + offset + 12) % 12];
  const fresh = (code) => ['p', 'g'].includes(code);
  if (at(0) === 'b') {
    const edge = (step) => {
      for (let distance = 1; distance < 12; distance++) {
        const code = at(step * distance);
        if (code !== 'b') return code;
      }
      return 'u';
    };
    const before = edge(-1),
      after = edge(1);
    if (['u', 'a', 't'].includes(before) || ['u', 'a', 't'].includes(after)) return null;
    if (!fresh(before) && fresh(after)) return { kind: 'starting' };
    if (fresh(before) && !fresh(after)) return { kind: 'ending' };
  }
  if (at(0) === 'n') {
    const seek = (step) => {
      let boundary = null;
      for (let distance = 1; distance < 12; distance++) {
        const code = at(step * distance);
        if (code === 'b' && !boundary)
          boundary = { distance, month: (month + step * distance + 12) % 12 };
        if (fresh(code))
          return boundary || { distance, month: (month + step * distance + 12) % 12 };
        if (code === 'n') boundary = null;
        if (!['n', 'b'].includes(code)) break;
      }
      return null;
    };
    const next = seek(1),
      previous = seek(-1);
    if (next?.distance <= 2 && (!previous || next.distance < previous.distance))
      return { kind: 'soon', month: next.month };
    if (previous?.distance <= 2 && (!next || previous.distance < next.distance))
      return { kind: 'recent', month: previous.month };
    if (next && (!previous || next.distance !== previous.distance))
      return { kind: 'next', month: next.month };
  }
  return null;
}

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
