import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createCatalog } from '../src/domain/catalog.js';
import { resolveAdvice } from '../src/domain/advice.js';
import { buildProductDetails } from '../src/application/product-details.js';
import { productDetails, homeAdvice } from '../src/components/product-details.js';
const { loadDatabase } = createRequire(import.meta.url)('../scripts/lib/load-data.cjs');
const catalog = createCatalog(loadDatabase());

test('У каждого варианта есть выбор, домашнее хранение и признаки порчи', () => {
  for (const variant of catalog.variants) {
    for (const form of ['whole', 'cut']) {
      for (const readiness of [undefined, 'firm', 'ready']) {
        const result = resolveAdvice(catalog, variant.id, { form, readiness, environment: 'home' });
        const visible = [...result.general, ...result.matched];
        for (const topic of ['choose', 'discard'])
          assert.ok(
            visible.some((a) => a.topic === topic),
            `${variant.id}: ${topic}`,
          );
        assert.ok(
          [...visible, ...result.needsContext].some((a) => a.topic === 'store'),
          `${variant.id}: store`,
        );
        if (form === 'cut') {
          assert.ok(
            !visible.some((a) => a.topic === 'ripen'),
            `${variant.id}: cut fruit must not ripen`,
          );
          assert.ok(!visible.some((a) => a.appliesTo.form === 'whole'));
          assert.ok(visible.some((a) => a.topic === 'store' && a.appliesTo.form === 'cut'));
        }
      }
    }
  }
});

test('Авокадо: неизвестная спелость не угадывается, советы меняются независимо от сезона', () => {
  const unknown = buildProductDetails(catalog, 'r114', 0);
  assert.ok(unknown.hasReadiness);
  assert.match(productDetails(unknown, catalog), /data-needs-readiness/);
  const contexts = ['firm', 'ready'].map((readiness) => ({
    form: 'whole',
    readiness,
    environment: 'home',
  }));
  for (let month = 0; month < 12; month++) {
    const [firm, ready] = contexts.map((context) =>
      buildProductDetails(catalog, 'r114', month, context),
    );
    const storage = (model) => model.variants[0].advice.filter((a) => a.topic === 'store');
    assert.match(storage(firm)[0].summary, /комнатной температуре/);
    assert.match(storage(ready)[0].summary, /холодильник/);
    assert.deepEqual(firm.variants[0].season, ready.variants[0].season);
  }
});

test('Спелость предлагается только применимым продуктам, повторные советы показаны один раз', () => {
  for (const id of ['product-1', 'product-37', 'product-109']) {
    const model = buildProductDetails(catalog, catalog.variantsFor(id)[0].id, 8);
    assert.equal(model.hasReadiness, false);
    assert.ok(!productDetails(model, catalog).includes('name="purchase-readiness"'));
  }
  const model = buildProductDetails(catalog, 'r114', 8, { form: 'cut', environment: 'home' });
  const html = productDetails(model, catalog);
  assert.equal((html.match(/data-advice="home-cut-product-114"/g) || []).length, 1);
  assert.ok(!homeAdvice(model, catalog).includes('data-advice-topic="ripen"'));
  assert.ok(html.includes('data-shop-advice'));
});
