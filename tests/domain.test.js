import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  filterProducts,
  sortProducts,
  visibleMonths,
  productSearchText,
} from '../src/domain/products.js';
import { matchesOrigin } from '../src/domain/geography.js';
import { Preferences } from '../src/services/preferences.js';
import { moscowDate } from '../src/services/clock.js';
import { adviceSection } from '../src/components/advice-section.js';
import { createCatalog } from '../src/domain/catalog.js';
import { groupedProducts } from '../src/domain/product-groups.js';
import { productCard } from '../src/components/product-card.js';
import { originSummary } from '../src/components/origin-summary.js';
import { buildProductList } from '../src/application/product-list.js';
const require = createRequire(import.meta.url);
const { loadDatabase } = require('../scripts/lib/load-data.cjs');
const database = createCatalog(loadDatabase());

test('Каждое происхождение относится к группе, Россия — общий фильтр', () => {
  for (const product of database.variants) {
    assert.ok(product.navigationGroup);
    assert.ok(matchesOrigin(product, `country:${product.origin}`));
    assert.equal(matchesOrigin(product, 'region:Россия'), product.origin.startsWith('Россия'));
  }
  assert.equal(matchesOrigin({ origin: 'Unknown' }, 'region:Россия'), false);
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
    productSearchText(database.variants.find((row) => row.name.includes('Ананас'))).includes('md2'),
  );
});

test('Сезонные фильтры не превращают неизвестные месяцы и хранение в сезон', () => {
  for (let month = 0; month < 12; month++) {
    const good = filterProducts(database.variants, { month, mode: 'good' });
    assert.ok(
      good.every(
        (product) =>
          ['p', 'g', 'a'].includes(product.months[month]) ||
          product.months.every((status) => status === 't'),
      ),
    );
    const off = filterProducts(database.variants, { month, mode: 'off' });
    assert.deepEqual(
      off.map((row) => row.id),
      database.variants.filter((row) => row.months[month] === 'n').map((row) => row.id),
    );
    assert.ok(
      filterProducts(database.variants, { month, knownOnly: true }).every(
        (row) => row.months[month] !== 'u',
      ),
    );
  }
});

test('Избранное, отдел, страна и статус работают вместе; сортировка не меняет базу', () => {
  const product = database.variants[0];
  const favorites = new Set([product.id]);
  assert.deepEqual(
    filterProducts(
      database.variants,
      {
        month: 0,
        favoritesOnly: true,
        productType: product.productTypes[0],
        origin: `country:${product.origin}`,
        status: product.months[0],
      },
      favorites,
    ).map((row) => row.id),
    [product.id],
  );
  const ids = database.variants.map((row) => row.id);
  sortProducts(database.variants, 0, 'season');
  assert.deepEqual(
    database.variants.map((row) => row.id),
    ids,
  );
  assert.deepEqual(visibleMonths(0, false), [11, 0, 1]);
  assert.deepEqual(visibleMonths(11, false), [10, 11, 0]);
  assert.equal(visibleMonths(11, true).length, 12);
});

test('Все типы продукта сохраняются при любом происхождении и работают в фильтре', () => {
  const groups = new Set(['vegetable', 'fruit', 'berry']);
  assert.equal(database.products.length, 91);
  for (const product of database.products) {
    assert.ok(
      product.productTypes.every((type) => groups.has(type)),
      product.name,
    );
    assert.ok(
      database
        .variantsFor(product.id)
        .every((variant) => variant.productTypes === product.productTypes),
      product.name,
    );
  }
  for (const [name, expected] of [
    ['Клубника', ['berry']],
    ['Голубика', ['berry']],
    ['Авокадо', ['vegetable', 'berry']],
    ['Томаты', ['vegetable', 'berry']],
    ['Черешня', ['berry']],
    ['Вишня', ['berry']],
  ]) {
    const product = database.products.find((item) => item.name === name);
    assert.ok(product);
    assert.deepEqual(product.productTypes, expected);
    for (const type of expected)
      assert.deepEqual(
        groupedProducts(database, { month: 8, productType: type, query: name }).map(
          (item) => item.id,
        ),
        [product.id],
      );
  }
  assert.equal(
    groupedProducts(database, { month: 8, productType: 'fruit', query: 'томаты' }).length,
    0,
  );
  for (const [type, count] of [
    ['vegetable', 41],
    ['fruit', 30],
    ['berry', 37],
  ])
    assert.equal(groupedProducts(database, { month: 8, productType: type }).length, count);
  for (const name of ['Авокадо', 'Вишня', 'Черешня'])
    assert.equal(
      groupedProducts(database, { month: 8, productType: 'fruit', query: name }).length,
      0,
    );
});

test('Основной тип идёт раньше дополнительного при любой сортировке', () => {
  for (const type of ['vegetable', 'fruit', 'berry']) {
    for (const order of ['name', 'season']) {
      const products = buildProductList(
        database,
        { month: 8, productType: type },
        new Set(),
        order,
      ).products;
      const firstAdditional = products.findIndex((product) => product.productTypes[0] !== type);
      if (firstAdditional < 0) continue;
      assert.ok(
        products.slice(0, firstAdditional).every((product) => product.productTypes[0] === type),
      );
      assert.ok(
        products.slice(firstAdditional).every((product) => product.productTypes[0] !== type),
      );
    }
  }
  assert.equal(
    originSummary(
      groupedProducts(database, { month: 8, query: 'авокадо', origin: 'country:Перу' })[0],
    ),
    'Перу · ещё 3 происхождения',
  );
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
  data.delete('moscow-season-preferences-v3');
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
    ...database.variants[0],
    name: '<img src=x onerror=alert(1)>',
    variety: '<script>',
    selection: '<img>',
    ripening: 'a&b',
  };
  const quality = adviceSection(
    [{ id: 'test', topic: 'choose', summary: '<img> a&b', steps: ['<script>'], sourceIds: [] }],
    database.sources,
  );
  const card = productCard(product, 0, database.statuses, false);
  assert.ok(!quality.includes('<script>') && !quality.includes('<img>'));
  assert.ok(quality.includes('a&amp;b'));
  assert.ok(!card.includes('<img'));
});
