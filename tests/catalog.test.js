import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createCatalog } from '../src/domain/catalog.js';
import { resolveAdvice, adviceForVariant } from '../src/domain/advice.js';
import { resolveSeason } from '../src/domain/seasons.js';
import { buildProductDetails } from '../src/application/product-details.js';
import { groupedProducts, selectRepresentative } from '../src/domain/product-groups.js';
import { FilterState } from '../src/state/filters.js';
import { Preferences } from '../src/services/preferences.js';
const require = createRequire(import.meta.url);
const { loadDatabase } = require('../scripts/lib/load-data.cjs');
const { validateData } = require('../scripts/lib/validate-data.cjs');
const database = loadDatabase();
const catalog = createCatalog(database);

test('Переименование и порядок вариантов не меняют ID продукта и избранное', () => {
  const changed = structuredClone(database);
  const variant = changed.variants.find((v) => v.id === 'r114');
  const id = variant.productId;
  changed.products.find((p) => p.id === id).name = 'Новое название';
  changed.variants.reverse();
  const next = createCatalog(changed);
  assert.equal(next.favoriteProductId('r114'), id);
  const cards = groupedProducts(next, { month: 8, mode: 'fav' }, new Set([id]));
  assert.equal(cards.length, 1);
  assert.equal(cards[0].name, 'Новое название');
  assert.equal(cards[0].id, id);
  assert.throws(() => {
    next.product(id).name = 'Mutation';
  }, TypeError);
});

test('Выбор закреплённого варианта не зависит от месяца, конфликт фильтра явный', () => {
  const variants = catalog.variantsFor(catalog.variant('r114').productId);
  for (let month = 0; month < 12; month++)
    assert.equal(selectRepresentative(variants, month, 'r114').variant.id, 'r114');
  assert.equal(
    selectRepresentative(
      variants.filter((v) => v.id !== 'r114'),
      8,
      'r114',
    ).reason,
    'preferred-filtered-out',
  );
  assert.equal(selectRepresentative([], 8, 'r114').reason, 'no-match');
  const a = selectRepresentative(variants, 8).variant.id,
    b = selectRepresentative([...variants].reverse(), 8).variant.id;
  assert.equal(a, b);
});

function withConditionalAdvice() {
  const db = structuredClone(database),
    variant = db.variants.find(
      (v) => v.adviceIds.length || db.products.find((p) => p.id === v.productId).adviceIds.length,
    );
  const product = db.products.find((p) => p.id === variant.productId);
  const original = db.advice.find((a) => a.id === (variant.adviceIds[0] || product.adviceIds[0]));
  const advice = {
    ...structuredClone(original),
    id: 'test-cut',
    topic: original.topic,
    summary: 'Условный совет для теста',
    appliesTo: { kind: 'conditional', form: 'cut', readiness: 'ready', environment: 'home' },
  };
  db.advice.push(advice);
  variant.adviceOverrides = [
    { replacesAdviceId: original.id, withAdviceId: advice.id, reason: 'Сортовое исключение' },
  ];
  return { db, variant, original, advice };
}
test('Советы для разрезанного зрелого плода не применяются к целому и неизвестному', () => {
  const { db, variant, advice, original } = withConditionalAdvice();
  validateData(db);
  const c = createCatalog(db);
  const unknown = resolveAdvice(c, variant.id, { environment: 'home' });
  assert.ok(unknown.needsContext.some((a) => a.id === advice.id));
  assert.ok(
    ![...unknown.general, ...unknown.matched].some((a) => [advice.id, original.id].includes(a.id)),
  );
  const whole = resolveAdvice(c, variant.id, {
    form: 'whole',
    readiness: 'ready',
    environment: 'home',
  });
  assert.ok(!whole.matched.some((a) => a.id === advice.id));
  const cut = resolveAdvice(c, variant.id, {
    form: 'cut',
    readiness: 'ready',
    environment: 'home',
  });
  assert.ok(cut.matched.some((a) => a.id === advice.id));
});
test('Промышленный совет и черновик не подменяют домашние опубликованные сведения', () => {
  const { db, variant, advice, original } = withConditionalAdvice();
  advice.appliesTo.environment = 'commercial';
  assert.ok(
    !resolveAdvice(createCatalog(db), variant.id, {
      form: 'cut',
      readiness: 'ready',
      environment: 'home',
    }).matched.some((item) => item.id === advice.id),
  );
  advice.editorialStatus = 'draft';
  const result = adviceForVariant(createCatalog(db), variant.id);
  assert.ok(result.some((a) => a.id === original.id));
  assert.ok(!result.some((a) => a.id === advice.id));
});
test('Невалидные связи, конфликт замен и небезопасная трактовка срока блокируют сборку', () => {
  for (const mutate of [
    (db) => {
      db.variants[0].productId = 'missing';
    },
    (db) => {
      db.products.push({ ...db.products[0] });
    },
    (db) => {
      db.advice[0].evidenceIds = [];
    },
    (db) => {
      db.evidence[0].sourceIds = ['MISSING'];
    },
    (db) => {
      db.seasons[0].months[0] = 'invalid';
    },
    (db) => {
      db.legacyFavorites.r114 = 'MISSING';
    },
  ]) {
    const db = structuredClone(database);
    mutate(db);
    assert.throws(() => validateData(db));
  }
  const { db, variant, advice } = withConditionalAdvice();
  variant.adviceOverrides.push({ ...variant.adviceOverrides[0] });
  assert.throws(() => validateData(db), /Конфликт/);
  variant.adviceOverrides.pop();
  advice.storage = {
    place: { status: 'known', value: 'refrigerator' },
    temperatureC: { status: 'unknown', reason: 'Не установлен режим' },
    duration: {
      status: 'known',
      value: {
        min: 1,
        max: 2,
        unit: 'day',
        startsAt: 'cutting',
        meaning: 'safety-limit',
        conditions: ['Тестовый пример'],
      },
    },
  };
  assert.throws(() => validateData(db), /безопасности/);
  advice.storage.duration.value.meaning = 'quality-estimate';
  validateData(db);
  advice.storage.duration.value.max = 0;
  assert.throws(() => validateData(db), /диапазон/);
});
test('В одном продукте повторные советы определяются ID, отдельные календари сохраняются', () => {
  const model = buildProductDetails(catalog, 'r114', 8);
  const seen = new Set();
  for (const variant of model.variants) {
    for (const advice of variant.advice) {
      assert.equal(advice.repeated, seen.has(advice.id));
      seen.add(advice.id);
    }
    assert.deepEqual(variant.season.months, catalog.variant(variant.id).months);
  }
  assert.throws(() => resolveSeason(catalog, 'r114', 12), /month/);
});
test('Состояние фильтров независимо от DOM и не принимает неизвестные поля', () => {
  const state = new FilterState(8);
  state.update({ query: 'манго', month: 0, wholeYear: true, unknown: 'bad' });
  state.update({ month: 99, mode: 'bad' });
  assert.equal(state.value.month, 0);
  assert.equal(state.value.mode, 'all');
  assert.equal(state.value.unknown, undefined);
  const copy = state.value;
  copy.month = 3;
  assert.equal(state.value.month, 0);
  state.reset();
  assert.equal(state.value.query, '');
  assert.equal(state.value.month, 0);
  assert.equal(state.value.wholeYear, false);
});
test('Миграция избранного идемпотентна и сохраняет неизвестные ID и старые данные', () => {
  const memory = new Map([
    ['moscow-season-favorites-v2', JSON.stringify(['r114', 'r115', 'old-retired'])],
  ]);
  const storage = { getItem: (k) => memory.get(k), setItem: (k, v) => memory.set(k, v) };
  const options = { resolveFavoriteId: catalog.favoriteProductId };
  const first = new Preferences(storage, options),
    second = new Preferences(storage, options);
  assert.equal(first.favorites.size, 2);
  assert.deepEqual(first.favorites, second.favorites);
  assert.ok(second.hasFavorite('old-retired'));
  assert.deepEqual(JSON.parse(memory.get('moscow-season-favorites-v2')), [
    'r114',
    'r115',
    'old-retired',
  ]);
  const future = JSON.stringify({ version: 99, favorites: ['future'] });
  memory.set('moscow-season-preferences-v3', future);
  const unsupported = new Preferences(storage, options);
  unsupported.toggleFavorite('x');
  assert.equal(memory.get('moscow-season-preferences-v3'), future);
});

test('Условия хранения отображаются со смыслом срока и его началом, неизвестность не становится нулём', async () => {
  const { storageInstructions } = await import('../src/components/storage-instructions.js');
  const html = storageInstructions({
    place: { status: 'known', value: 'refrigerator' },
    temperatureC: { status: 'unknown', reason: 'Нет подтверждения' },
    duration: {
      status: 'known',
      value: {
        min: 1,
        max: 2,
        unit: 'day',
        startsAt: 'cutting',
        meaning: 'quality-estimate',
        conditions: ['Только тестовый пример <script>'],
      },
    },
  });
  assert.ok(html.includes('после разрезания'));
  assert.ok(html.includes('не гарантия безопасности'));
  assert.ok(html.includes('Нет подтверждения'));
  assert.ok(!html.includes('<script>'));
});
test('Неизвестные повреждённые настройки не перезаписываются при восстановлении избранного', () => {
  const memory = new Map([
    ['moscow-season-preferences-v3', '{invalid'],
    ['moscow-season-favorites-v2', '["r114"]'],
  ]);
  const prefs = new Preferences(
    { getItem: (k) => memory.get(k), setItem: (k, v) => memory.set(k, v) },
    { resolveFavoriteId: catalog.favoriteProductId },
  );
  prefs.toggleFavorite('another');
  assert.equal(memory.get('moscow-season-preferences-v3'), '{invalid');
});

test('Добавление и переименование происхождения не требует списка стран в коде', async () => {
  const { originOptions } = await import('../src/components/origin-options.js');
  const db = structuredClone(database);
  const variant = db.variants.find((v) => v.id === 'r114');
  db.origins.push({
    id: 'new-origin',
    label: 'Новое происхождение',
    navigationGroup: 'Новая группа',
  });
  variant.originId = 'new-origin';
  validateData(db);
  const c = createCatalog(db);
  const cards = groupedProducts(c, { month: 8, origin: 'origin:new-origin' });
  assert.equal(cards.length, 1);
  assert.equal(cards[0].variantId, 'r114');
  assert.ok(originOptions(c.origins).includes('Новое происхождение'));
  assert.throws(() => {
    c.rawVariant('r114').originId = 'changed';
  }, TypeError);
});
