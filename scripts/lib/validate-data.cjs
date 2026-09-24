const assert = require('node:assert/strict');
const CODES = new Set(['p', 'g', 'b', 'h', 't', 'n', 'u', 'a']);
const TOPICS = new Set(['choose', 'ripen', 'store', 'prepare', 'freeze', 'discard']);
const text = (value, label) => assert.ok(typeof value === 'string' && value.trim(), label);
function ids(values, label) {
  assert.ok(Array.isArray(values), label);
  assert.equal(new Set(values).size, values.length, 'Повтор ID: ' + label);
  for (const id of values) text(id, label);
}
function index(items, label) {
  assert.ok(Array.isArray(items) && items.length > 0, 'Нет коллекции: ' + label);
  const result = new Map();
  for (const item of items) {
    text(item.id, 'Нет ID: ' + label);
    assert.match(item.id, /^[a-z][a-z0-9-]*$/, 'Некорректный ID: ' + item.id);
    assert.ok(!result.has(item.id), 'Повтор ID: ' + item.id);
    result.set(item.id, item);
  }
  return result;
}
function references(values, target, label) {
  ids(values, label);
  for (const id of values) assert.ok(target.has(id), label + ': ' + id);
}
function knowledge(field, label, check) {
  assert.ok(
    field && ['known', 'unknown', 'not-applicable'].includes(field.status),
    'Некорректное знание: ' + label,
  );
  if (field.status === 'known') check(field.value);
  else {
    text(field.reason, 'Нужна причина: ' + label);
    assert.equal(field.value, undefined, 'Неизвестному нельзя назначать значение: ' + label);
  }
}
function range(value, label) {
  assert.ok(
    value && Number.isFinite(value.min) && Number.isFinite(value.max) && value.min <= value.max,
    'Некорректный диапазон: ' + label,
  );
}
function validateData(db) {
  assert.equal(db.schemaVersion, 1, 'Неподдерживаемая версия схемы');
  assert.deepEqual(new Set(Object.keys(db.statuses)), CODES, 'Некорректный набор статусов');
  const products = index(db.products, 'products'),
    variants = index(db.variants, 'variants'),
    seasons = index(db.seasons, 'seasons'),
    advice = index(db.advice, 'advice'),
    evidence = index(db.evidence, 'evidence'),
    origins = index(db.origins, 'origins'),
    categories = index(db.categories, 'categories');
  const sources = new Map(Object.entries(db.sources));
  for (const [id, source] of sources) {
    assert.equal(source.id, id);
    text(source.title, 'Название источника');
    assert.ok(
      ['https:', 'http:'].includes(new URL(source.url).protocol),
      'Некорректная ссылка: ' + id,
    );
  }
  for (const entity of [...origins.values(), ...categories.values()])
    text(entity.label, 'Название справочника');
  for (const origin of origins.values()) text(origin.navigationGroup, 'Группа происхождения');
  for (const ev of evidence.values()) {
    text(ev.statement, 'Нет утверждения: ' + ev.id);
    text(ev.limits, 'Нет пределов: ' + ev.id);
    references(ev.sourceIds, sources, 'Источник не найден');
    references(ev.scope.variantIds, variants, 'Вариант доказательства не найден');
    assert.ok(
      ['direct', 'editorial', 'legacy-editorial'].includes(ev.derivation),
      'Неизвестное происхождение вывода',
    );
    assert.ok(
      ev.reviewedAt === null || /^\d{4}-\d{2}-\d{2}$/.test(ev.reviewedAt),
      'Дата проверки доказательства',
    );
    if (ev.supports !== undefined) {
      ids(ev.supports, 'Назначение доказательства');
      assert.ok(
        ev.supports.every((kind) => ['food-safety', 'quality', 'seasonality'].includes(kind)),
        'Неизвестное назначение доказательства',
      );
    }
  }
  for (const item of advice.values())
    references(item.evidenceIds, evidence, 'Доказательство совета не найдено');
  const linkedAdvice = (refs, productId) => {
    references(refs, advice, 'Совет не найден');
    for (const id of refs)
      assert.equal(advice.get(id).productId, productId, 'Совет другого продукта: ' + id);
  };
  for (const product of products.values()) {
    text(product.name, 'Название продукта');
    assert.ok(
      Array.isArray(product.productTypes) &&
        product.productTypes.length > 0 &&
        product.productTypes.length <= 3 &&
        product.productTypes.every((type) => ['vegetable', 'fruit', 'berry'].includes(type)) &&
        new Set(product.productTypes).size === product.productTypes.length,
      'Некорректные отделы продукта: ' + product.id,
    );
    linkedAdvice(product.adviceIds, product.id);
    assert.ok(
      [...variants.values()].some((v) => v.productId === product.id),
      'Продукт без вариантов: ' + product.id,
    );
  }
  for (const variant of variants.values()) {
    assert.ok(products.has(variant.productId), 'Продукт не найден: ' + variant.id);
    assert.ok(
      origins.has(variant.originId) && categories.has(variant.categoryId),
      'Справочник не найден: ' + variant.id,
    );
    text(variant.name, 'Название варианта');
    for (const key of ['variety', 'shortInfo'])
      if (variant[key] !== undefined) text(variant[key], 'Некорректное поле: ' + key);
    assert.ok(seasons.has(variant.seasonProfileId), 'Календарь не найден');
    assert.equal(
      seasons.get(variant.seasonProfileId).variantId,
      variant.id,
      'Календарь другого варианта',
    );
    for (const field of ['months', 'cardName', 'selection', 'ripening', 'qualitySources'])
      assert.equal(variant[field], undefined, 'Дублирование данных в варианте: ' + field);
    if (variant.aliases) ids(variant.aliases, 'Псевдонимы');
    linkedAdvice(variant.adviceIds, variant.productId);
    const base = new Set([...products.get(variant.productId).adviceIds, ...variant.adviceIds]);
    assert.equal(
      base.size,
      products.get(variant.productId).adviceIds.length + variant.adviceIds.length,
      'Повтор общего совета',
    );
    assert.ok(Array.isArray(variant.adviceOverrides), 'Нужен список замен');
    const replaced = new Set(),
      replacements = new Set();
    for (const override of variant.adviceOverrides) {
      assert.ok(base.has(override.replacesAdviceId), 'Заменяемый совет не найден');
      assert.ok(!replaced.has(override.replacesAdviceId), 'Конфликт замен советов');
      assert.ok(
        !base.has(override.withAdviceId) && !replacements.has(override.withAdviceId),
        'Повтор замены совета',
      );
      linkedAdvice([override.withAdviceId], variant.productId);
      assert.equal(
        advice.get(override.replacesAdviceId).topic,
        advice.get(override.withAdviceId).topic,
        'Замена раздела совета',
      );
      text(override.reason, 'Причина замены');
      replaced.add(override.replacesAdviceId);
      replacements.add(override.withAdviceId);
    }
    for (const id of new Set([...base, ...replacements])) {
      for (const evId of advice.get(id).evidenceIds)
        assert.ok(
          evidence.get(evId).scope.variantIds.includes(variant.id),
          'Совет вне подтверждённой области: ' + id + ' / ' + variant.id,
        );
    }
  }
  for (const season of seasons.values()) {
    assert.ok(variants.has(season.variantId), 'Вариант календаря не найден');
    assert.equal(
      variants.get(season.variantId).seasonProfileId,
      season.id,
      'Неподключённый календарь',
    );
    assert.equal(
      season.representation,
      'legacy-monthly',
      'Неподдерживаемое представление календаря',
    );
    assert.equal(season.months.length, 12, 'Нужно 12 месяцев');
    assert.ok(
      season.months.every((code) => CODES.has(code)),
      'Неизвестный статус',
    );
    for (const key of ['note', 'confidence', 'supply', 'basis'])
      text(season[key], 'Нет пояснения календаря: ' + key);
    references(season.evidenceIds, evidence, 'Доказательство календаря не найдено');
    assert.ok(season.evidenceIds.length, 'Сезону нужно основание');
    for (const id of season.evidenceIds) {
      const ev = evidence.get(id);
      assert.ok(ev.scope.variantIds.includes(season.variantId), 'Доказательство другого варианта');
      if (season.months.some((s) => s !== 'u'))
        assert.ok(ev.sourceIds.length, 'Сезону нужен источник');
    }
  }
  for (const item of advice.values()) {
    assert.ok(products.has(item.productId), 'Продукт совета не найден');
    assert.ok(TOPICS.has(item.topic), 'Раздел совета неизвестен');
    text(item.summary, 'Нет текста совета');
    if (item.emphasis !== undefined)
      assert.ok(['primary', 'secondary'].includes(item.emphasis), 'Неизвестный акцент совета');
    assert.ok(
      Array.isArray(item.steps) && item.steps.every((s) => typeof s === 'string' && s.trim()),
      'Некорректные шаги',
    );
    assert.ok(
      ['draft', 'published', 'retired'].includes(item.editorialStatus),
      'Статус публикации совета',
    );
    assert.ok(
      item.appliesTo && ['general', 'conditional'].includes(item.appliesTo.kind),
      'Нужна применимость совета',
    );
    assert.ok(
      item.reviewedAt === null || /^\d{4}-\d{2}-\d{2}$/.test(item.reviewedAt),
      'Дата проверки совета',
    );
    if (item.appliesTo.kind === 'general') {
      assert.deepEqual(
        Object.keys(item.appliesTo),
        ['kind'],
        'Условия нужно задавать как conditional',
      );
    }
    if (item.appliesTo.kind === 'conditional') {
      assert.ok(
        ['whole', 'cut', 'prepared', 'any'].includes(item.appliesTo.form),
        'Форма продукта',
      );
      assert.ok(['firm', 'ready', 'any'].includes(item.appliesTo.readiness), 'Состояние продукта');
      assert.ok(['home', 'commercial'].includes(item.appliesTo.environment), 'Среда хранения');
    }
    references(item.evidenceIds, evidence, 'Доказательство совета не найдено');
    if (item.editorialStatus === 'published') {
      assert.ok(item.evidenceIds.length, 'Совету нужен источник');
      for (const id of item.evidenceIds)
        assert.ok(evidence.get(id).sourceIds.length, 'Совету нужен источник');
    }
    if (item.storageGuide) {
      assert.equal(item.topic, 'store', 'Памятка только для хранения');
      assert.equal(item.appliesTo.kind, 'conditional', 'Памятке нужны условия');
      assert.equal(item.appliesTo.environment, 'home', 'Памятка для дома');
      const fields = ['location', 'packaging', 'moisture', 'light', 'neighbors', 'keeping'];
      assert.deepEqual(
        Object.keys(item.storageGuide).sort(),
        fields.sort(),
        'Неполная памятка хранения',
      );
      const supportedSources = new Set(
        item.evidenceIds.flatMap((id) => evidence.get(id).sourceIds),
      );
      for (const field of Object.values(item.storageGuide)) {
        text(field.text, 'Нет текста условия хранения');
        assert.ok(
          ['supported', 'general', 'unknown'].includes(field.basis),
          'Основание условия хранения',
        );
        references(field.sourceIds, sources, 'Источник памятки не найден');
        assert.ok(field.sourceIds.length, 'Условию нужен источник');
        assert.ok(
          field.sourceIds.every((id) => supportedSources.has(id)),
          'Источник вне доказательства совета',
        );
      }
    }
    if (item.storage) {
      assert.equal(item.appliesTo.kind, 'conditional', 'Условия хранения должны быть явными');
      knowledge(item.storage.place, 'место', (value) =>
        assert.ok(['room', 'refrigerator', 'freezer'].includes(value), 'Место хранения'),
      );
      knowledge(item.storage.temperatureC, 'температура', (value) => range(value, 'температура'));
      knowledge(item.storage.duration, 'срок', (value) => {
        range(value, 'срок');
        assert.ok(value.min >= 0, 'Отрицательный срок');
        assert.ok(['hour', 'day'].includes(value.unit), 'Единица срока');
        assert.ok(
          ['purchase', 'cutting', 'ripeness', 'harvest'].includes(value.startsAt),
          'Отсчёт срока',
        );
        assert.ok(['quality-estimate', 'safety-limit'].includes(value.meaning), 'Смысл срока');
        assert.ok(
          Array.isArray(value.conditions) && value.conditions.length > 0,
          'Условия срока обязательны',
        );
        for (const condition of value.conditions) text(condition, 'Пустое условие срока');
        if (value.meaning === 'safety-limit')
          assert.ok(
            item.evidenceIds.some((id) => evidence.get(id).supports?.includes('food-safety')),
            'Срок безопасности требует соответствующего основания',
          );
      });
    }
  }
  assert.ok(db.legacyFavorites && typeof db.legacyFavorites === 'object', 'Нужна таблица миграции');
  for (const [oldId, productId] of Object.entries(db.legacyFavorites)) {
    text(oldId, 'Старый ID');
    assert.ok(products.has(productId), 'Миграция ведёт в неизвестный продукт');
    if (variants.has(oldId))
      assert.equal(variants.get(oldId).productId, productId, 'Миграция меняет продукт');
  }
}
module.exports = { validateData };
