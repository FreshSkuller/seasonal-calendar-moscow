// One-time audit for the v5 → v6 migration, deliberately outside the normal test suite.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createCatalog } from '../src/domain/catalog.js';
import { adviceForVariant } from '../src/domain/advice.js';
const { loadDatabase } = createRequire(import.meta.url)('./lib/load-data.cjs');
const catalog = createCatalog(loadDatabase());
// Reconstruct solely for migration verification; this is not a runtime legacy adapter.
function reconstruct(variant) {
  const { productId, originId, categoryId, seasonProfileId, adviceIds, adviceOverrides, ...rest } =
    catalog.rawVariant(variant.id);
  const { id, variantId, representation, evidenceIds, ...season } = catalog.season(seasonProfileId);
  const items = adviceForVariant(catalog, variant.id);
  const choose = items.find((a) => a.topic === 'choose'),
    ripen = items.find((a) => a.topic === 'ripen');
  return {
    ...rest,
    origin: variant.origin,
    category: variant.category,
    ...season,
    sources: catalog.sourceIds(evidenceIds),
    cardName: catalog.product(productId).name,
    ...(choose ? { selection: choose.summary } : {}),
    ...(ripen ? { ripening: ripen.summary } : {}),
    ...(items.length
      ? { qualitySources: catalog.sourceIds(items.flatMap((a) => a.evidenceIds)) }
      : {}),
  };
}
{
  const baseline = JSON.parse(
    readFileSync(new URL('../docs/migrations/catalog-v5-digests.json', import.meta.url)),
  );
  assert.equal(catalog.variants.length, baseline.length);
  for (const expected of baseline) {
    const row = reconstruct(catalog.variant(expected.id));
    const sorted = Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)));
    assert.equal(
      createHash('sha256').update(JSON.stringify(sorted)).digest('hex'),
      expected.digest,
      expected.id,
    );
  }
}
console.log('Verified: all 217 v5 records retain their text, calendars and source references.');
