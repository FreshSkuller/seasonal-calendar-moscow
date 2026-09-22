import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createCatalog } from '../src/domain/catalog.js';
import { groupedProducts } from '../src/domain/product-groups.js';
import { editDistance, correctLayout } from '../src/domain/search.js';
import { seasonDirection } from '../src/domain/seasons.js';
import { buildProductDetails } from '../src/application/product-details.js';
import { productDetails, homeAdvice } from '../src/components/product-details.js';
const catalog = createCatalog(
  createRequire(import.meta.url)('../scripts/lib/load-data.cjs').loadDatabase(),
);
const search = (query) => groupedProducts(catalog, { month: 8, query });

test('Опечатки, перестановка букв и неверная раскладка находят нужный продукт', () => {
  for (const query of ['авдкадо', 'fdfrflj', 'fdjrflj', 'авокдао', 'авокдо', 'авокадоо']) {
    assert.deepEqual(
      search(query).map((p) => p.name),
      ['Авокадо'],
      query,
    );
  }
  assert.equal(editDistance('манго', 'магно'), 1);
  assert.equal(correctLayout('fdjrflj'), 'авокадо');
  assert.equal(search('MD2')[0].name, 'Ананас');
  assert.equal(search('MD2').length, 1);
  assert.equal(search('авдкадо Перу')[0].origin, 'Перу');
  assert.equal(search('фывапфывап').length, 0);
  assert.equal(search('x'.repeat(1000)).length, 0);
  assert.equal(
    search('ма').some((p) => p.name === 'Манго'),
    true,
  );
});

test('Направление сезона учитывает границу года, длинные переходы и пробелы', () => {
  const months = ['g', 'b', 'n', 'n', 'n', 'n', 'n', 'n', 'n', 'n', 'b', 'g'];
  assert.equal(seasonDirection(months, 10).kind, 'starting');
  assert.equal(seasonDirection(months, 1).kind, 'ending');
  assert.equal(seasonDirection(months, 9).kind, 'soon');
  assert.equal(seasonDirection(months, 2).kind, 'recent');
  assert.equal(
    seasonDirection(['b', 'g', 'n', 'n', 'n', 'n', 'n', 'n', 'n', 'n', 'n', 'n'], 0).kind,
    'starting',
  );
  assert.equal(
    seasonDirection(['b', 'u', 'n', 'n', 'n', 'n', 'n', 'n', 'n', 'n', 'n', 'n'], 0),
    null,
  );
  assert.equal(seasonDirection(Array(12).fill('b'), 0), null);
  assert.equal(seasonDirection(Array(12).fill('n'), 0), null);
  assert.equal(
    seasonDirection(['b', 'g', 'n', 'n', 'n', 'n', 'n', 'n', 'n', 'n', 'n', 'g'], 0),
    null,
  );
  assert.equal(
    seasonDirection(['n', 'b', 'b', 'g', 'n', 'n', 'n', 'n', 'n', 'n', 'n', 'n'], 0).kind,
    'soon',
  );
  assert.equal(
    seasonDirection(['n', 'u', 'g', 'n', 'n', 'n', 'n', 'n', 'n', 'n', 'n', 'u'], 0),
    null,
  );
  const two = ['n', 'b', 'g', 'b', 'n', 'n', 'n', 'b', 'g', 'b', 'n', 'n'];
  assert.equal(seasonDirection(two, 1).kind, 'starting');
  assert.equal(seasonDirection(two, 3).kind, 'ending');
  assert.equal(seasonDirection(two, 7).kind, 'starting');
});

test('Магазин не меняется от домашнего состояния; источники собраны в самом конце', () => {
  const whole = buildProductDetails(catalog, 'r114', 8);
  const cut = buildProductDetails(catalog, 'r114', 8, { form: 'cut', environment: 'home' });
  assert.deepEqual(
    whole.variants.map((v) => v.shopAdvice),
    cut.variants.map((v) => v.shopAdvice),
  );
  const html = productDetails(cut, catalog);
  assert.ok(html.indexOf('data-shop-advice') < html.indexOf('data-home-guide'));
  assert.ok(html.indexOf('data-home-guide') < html.indexOf('data-variant-details'));
  assert.ok(html.indexOf('data-variant-details') < html.indexOf('data-product-sources'));
  assert.equal((html.match(/class="source-list"/g) || []).length, 1);
  assert.ok(!homeAdvice(cut, catalog).includes('href='));
  assert.ok(!homeAdvice(cut, catalog).includes('data-advice-topic="ripen"'));
  for (const variant of cut.variants)
    for (const item of variant.advice)
      for (const source of item.sourceIds) assert.ok(cut.sourceIds.includes(source));
});
