import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createCatalog } from '../src/domain/catalog.js';
import { resolveAdvice } from '../src/domain/advice.js';
import { storageGuide } from '../src/components/storage-guide.js';
const require = createRequire(import.meta.url);
const { loadDatabase } = require('../scripts/lib/load-data.cjs');
const { validateData } = require('../scripts/lib/validate-data.cjs');
const db = loadDatabase();
const catalog = createCatalog(db);

test('Все варианты имеют полную памятку для целого и нарезанного продукта', () => {
  for (const variant of catalog.variants) {
    for (const form of ['whole', 'cut']) {
      for (const readiness of ['firm', 'ready']) {
        const result = resolveAdvice(catalog, variant.id, { form, readiness, environment: 'home' });
        const items = [...result.general, ...result.matched].filter((a) => a.topic === 'store');
        assert.ok(
          items.some((a) => a.storageGuide),
          `${variant.id}: ${form}/${readiness}`,
        );
        for (const item of items.filter((a) => a.storageGuide)) {
          assert.equal(Object.keys(item.storageGuide).length, 6);
          if (form === 'cut') {
            assert.match(item.storageGuide.packaging.text, /крышкой|закрытый/);
            assert.match(item.storageGuide.location.text, /4 °C/);
          }
        }
      }
    }
  }
});

test('Неполные памятки и источники вне доказательств не проходят валидацию', () => {
  const mutate = (fn) => {
    const copy = structuredClone(db);
    fn(copy.advice.find((a) => a.storageGuide));
    assert.throws(() => validateData(copy));
  };
  mutate((a) => delete a.storageGuide.neighbors);
  mutate((a) => (a.storageGuide.location.basis = 'certain'));
  mutate((a) => (a.storageGuide.location.sourceIds = []));
  mutate((a) => (a.storageGuide.location.sourceIds = ['missing-source']));
  mutate(
    (a) =>
      (a.storageGuide.location.sourceIds = [
        Object.keys(db.sources).find(
          (id) =>
            !a.evidenceIds
              .flatMap((e) => db.evidence.find((x) => x.id === e).sourceIds)
              .includes(id),
        ),
      ]),
  );
});

test('Причины соседства различаются, редким ягодам не приписаны точные сроки', () => {
  const guide = (id) =>
    db.advice.find(
      (a) => a.productId === `product-${id}` && a.appliesTo.form === 'whole' && a.storageGuide,
    ).storageGuide;
  assert.match(guide(3).neighbors.text, /горечь/);
  assert.match(guide(1).neighbors.text, /запах/);
  assert.match(guide(125).neighbors.text, /не дозревает/);
  assert.equal(guide(54).neighbors.basis, 'unknown');
  assert.match(guide(54).keeping.text, /не подтверждён/);
  assert.match(guide(134).keeping.text, /томатильо/);
  assert.match(guide(170).keeping.text, /отложить дозревание/);
});

test('Памятка экранирует текст и показывает границы знаний', () => {
  const guide = structuredClone(
    db.advice.find(
      (a) => a.productId === 'product-54' && a.appliesTo.form === 'whole' && a.storageGuide,
    ).storageGuide,
  );
  guide.location.text = '<img src=x onerror=alert(1)>';
  const html = storageGuide(guide, db.sources);
  assert.ok(!html.includes('<img'));
  assert.match(html, /&lt;img/);
  assert.match(html, /специальные ограничения по соседству не подтверждены/);
  assert.ok(!html.includes('storage-basis'));
  assert.match(html, /storage-guide-more/);
});

test('Подготовка дикорастущих плодов сохраняется при переключении на нарезку', () => {
  const precautions = new Map([
    [36, /[Лл]истья.*выбросьте|[Уу]далите листья/],
    [54, /термически обработайте/],
    [55, /термически обработайте/],
    [56, /волоск/],
    [58, /[Кк]осточки не/],
  ]);
  for (const [id, precaution] of precautions) {
    const variant = catalog.variantsFor(`product-${id}`)[0];
    for (const form of ['whole', 'cut']) {
      const result = resolveAdvice(catalog, variant.id, { form, environment: 'home' });
      const rendered = [...result.general, ...result.matched]
        .filter((a) => a.storageGuide)
        .map((a) => storageGuide(a.storageGuide))
        .join('');
      assert.match(rendered, precaution, `${variant.id}: ${form}`);
    }
  }
});
