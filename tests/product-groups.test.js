import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  groupedProducts,
  canonicalId,
  productVariants,
  productName,
} from '../src/domain/product-groups.js';
import { productDetails } from '../src/components/product-details.js';
import { Preferences } from '../src/services/preferences.js';
const { loadDatabase } = createRequire(import.meta.url)('../scripts/lib/load-data.cjs');
const db = loadDatabase();
test('Одна карточка на продукт, исходные варианты и их 12 месяцев сохранены', () => {
  for (let month = 0; month < 12; month++) {
    const cards = groupedProducts(db.rows, { month });
    assert.equal(cards.length, new Set(db.rows.map(productName)).size);
    assert.equal(new Set(cards.map((r) => r.id)).size, cards.length);
    for (const card of cards) {
      const variant = db.rows.find((r) => r.id === card.variantId);
      assert.deepEqual(card.months, variant.months);
      assert.equal(card.origin, variant.origin);
    }
  }
});
test('Страна и сорт фильтруют варианты до выбора единственной карточки', () => {
  const all = groupedProducts(db.rows, { month: 8, query: 'авокадо' });
  assert.equal(all.length, 1);
  const peru = groupedProducts(db.rows, { month: 8, query: 'авокадо', origin: 'country:Перу' });
  assert.equal(peru.length, 1);
  assert.equal(peru[0].origin, 'Перу');
  assert.equal(peru[0].id, all[0].id);
  const cultivar = groupedProducts(db.rows, { month: 0, query: 'Mahachanok' });
  assert.equal(cultivar.length, 1);
  assert.equal(cultivar[0].variantId, 'r216');
  assert.equal(cultivar[0].months[0], 'n');
});
test('Подробнее показывает каждый вариант с собственным годом, выбранный первым', () => {
  const product = db.rows.find((r) => r.id === 'r114');
  const variants = productVariants(product, db.rows);
  const html = productDetails(product, 8, db);
  assert.equal((html.match(/class="year-mini"/g) || []).length, variants.length);
  assert.equal((html.match(/class="variant-detail"/g) || []).length, variants.length);
  assert.ok(html.indexOf('Перу') < html.indexOf('Другие'));
  for (const row of variants) assert.ok(html.includes(row.origin));
});
test('Старое избранное любого происхождения переносится на общий продукт', () => {
  const memory = new Map([['moscow-season-favorites-v2', JSON.stringify(['r114', 'r115'])]]);
  const prefs = new Preferences({
    getItem: (k) => memory.get(k),
    setItem: (k, v) => memory.set(k, v),
  });
  prefs.migrateFavorites((id) =>
    canonicalId(
      db.rows.find((r) => r.id === id),
      db.rows,
    ),
  );
  assert.equal(prefs.favorites.size, 1);
  const found = groupedProducts(db.rows, { month: 0, mode: 'fav' }, prefs.favorites);
  assert.equal(found.length, 1);
  assert.equal(found[0].name, 'Авокадо');
});
test('Неподтверждённые иранские календари не скрыты под придуманным сезоном', () => {
  for (const id of ['r191', 'r205'])
    assert.ok(db.rows.find((r) => r.id === id).months.every((s) => s === 'u'));
});
