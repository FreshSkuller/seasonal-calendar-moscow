import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  filterProducts,
  sortProducts,
  visibleMonths,
  productSearchText,
} from '../src/domain/products.js';
import { regionOf, matchesOrigin } from '../src/domain/geography.js';
import { Preferences } from '../src/services/preferences.js';
import { moscowDate } from '../src/services/clock.js';
import { qualityDetails } from '../src/components/product-details.js';
import { productCard } from '../src/components/product-card.js';
const require = createRequire(import.meta.url);
const { loadDatabase } = require('../scripts/lib/load-data.cjs');
const database = loadDatabase();

test('Каждое происхождение относится к группе, Россия — общий фильтр', () => {
  for (const product of database.rows) {
    assert.ok(regionOf(product.origin));
    assert.ok(matchesOrigin(product.origin, `country:${product.origin}`));
    assert.equal(
      matchesOrigin(product.origin, 'region:Россия'),
      product.origin.startsWith('Россия'),
    );
  }
  assert.throws(() => regionOf('Unknown country'), /Unknown origin/);
});

test('Поиск учитывает регистр, ё, привычные названия и сортовые обозначения', () => {
  const products = [
    {
      id: 'sample',
      name: 'Жёлтый ананас',
      origin: 'Гана',
      variety: 'MD2',
      aliases: ['медовый'],
      months: Array(12).fill('a'),
    },
  ];
  for (const query of ['ЖЕЛТЫЙ', 'медовый', 'md2', 'Гана'])
    assert.equal(filterProducts(products, { month: 0, query }).length, 1);
  assert.equal(filterProducts(products, { month: 0, query: 'яблоко' }).length, 0);
  assert.ok(
    productSearchText(database.rows.find((row) => row.name.includes('Ананас'))).includes('md2'),
  );
});

test('Сезонные фильтры не превращают неизвестные месяцы и хранение в сезон', () => {
  for (let month = 0; month < 12; month++) {
    const good = filterProducts(database.rows, { month, mode: 'good' });
    assert.ok(
      good.every(
        (product) =>
          ['p', 'g', 'a'].includes(product.months[month]) ||
          product.months.every((status) => status === 't'),
      ),
    );
    const off = filterProducts(database.rows, { month, mode: 'off' });
    assert.deepEqual(
      off.map((row) => row.id),
      database.rows.filter((row) => row.months[month] === 'n').map((row) => row.id),
    );
    assert.ok(
      filterProducts(database.rows, { month, knownOnly: true }).every(
        (row) => row.months[month] !== 'u',
      ),
    );
  }
});

test('Избранное, категория, страна и статус работают вместе; сортировка не меняет базу', () => {
  const product = database.rows[0];
  const favorites = new Set([product.id]);
  assert.deepEqual(
    filterProducts(
      database.rows,
      {
        month: 0,
        favoritesOnly: true,
        category: product.category,
        origin: `country:${product.origin}`,
        status: product.months[0],
      },
      favorites,
    ).map((row) => row.id),
    [product.id],
  );
  const ids = database.rows.map((row) => row.id);
  sortProducts(database.rows, 0, 'season');
  assert.deepEqual(
    database.rows.map((row) => row.id),
    ids,
  );
  assert.deepEqual(visibleMonths(0, false), [11, 0, 1]);
  assert.deepEqual(visibleMonths(11, false), [10, 11, 0]);
  assert.equal(visibleMonths(11, true).length, 12);
});

test('Московская дата корректна при смене месяца и года в UTC', () => {
  assert.equal(moscowDate(new Date('2026-12-31T20:59:00Z')).month, 11);
  assert.equal(moscowDate(new Date('2026-12-31T21:00:00Z')).month, 0);
  assert.equal(moscowDate(new Date('2026-08-31T21:00:00Z')).month, 8);
});

test('Старые ключи избранного и темы сохраняются, повреждённое хранилище переносится безопасно', () => {
  const data = new Map([
    ['moscow-season-favorites-v2', '["r1"]'],
    ['moscow-season-dark', 'true'],
  ]);
  const storage = {
    getItem: (key) => data.get(key),
    setItem: (key, value) => data.set(key, value),
  };
  const preferences = new Preferences(storage);
  assert.ok(preferences.hasFavorite('r1'));
  assert.ok(preferences.dark);
  const changes = [];
  const unsubscribe = preferences.subscribe((kind) => changes.push(kind));
  preferences.toggleFavorite('r2');
  preferences.toggleTheme();
  unsubscribe();
  assert.deepEqual(changes, ['favorites', 'theme']);
  assert.ok(new Preferences(storage).hasFavorite('r2'));
  preferences.favorites.clear();
  assert.ok(preferences.hasFavorite('r2'));
  data.set('moscow-season-favorites-v2', '{}');
  assert.equal(new Preferences(storage).favorites.size, 0);
  const denied = new Preferences({
    getItem() {
      throw Error('denied');
    },
    setItem() {
      throw Error('denied');
    },
  });
  denied.toggleFavorite('r1');
  assert.ok(denied.hasFavorite('r1'));
});

test('Карточки и советы экранируют данные, не исполняя HTML из названий', () => {
  const product = {
    ...database.rows[0],
    name: '<img src=x onerror=alert(1)>',
    variety: '<script>',
    selection: '<img>',
    ripening: 'a&b',
  };
  const quality = qualityDetails(product, database.sources);
  const card = productCard(product, 0, database.statuses, false);
  assert.ok(!quality.includes('<script>') && !quality.includes('<img>'));
  assert.ok(quality.includes('a&amp;b'));
  assert.ok(!card.includes('<img'));
});
