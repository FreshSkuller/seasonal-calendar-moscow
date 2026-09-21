const assert = require('node:assert/strict');
function validateData(db) {
  const codes = new Set(['p', 'g', 'b', 'h', 't', 'n', 'u', 'a']);
  const ids = new Set();
  assert.ok(Array.isArray(db.rows) && db.rows.length > 0, 'Нужны строки календаря');
  assert.deepEqual(new Set(Object.keys(db.statuses)), codes, 'Некорректный набор статусов');
  for (const [id, source] of Object.entries(db.sources)) {
    assert.equal(source.id, id, 'ID источника должен совпадать с ключом');
    assert.ok(
      ['https:', 'http:'].includes(new URL(source.url).protocol),
      'Некорректная ссылка: ' + id,
    );
    assert.ok(source.title, 'Нужно название источника: ' + id);
  }
  for (const row of db.rows) {
    assert.ok(row.id && !ids.has(row.id), 'Повторяющийся или пустой ID: ' + row.id);
    ids.add(row.id);
    assert.ok(
      row.name && row.origin && row.category,
      'Нет названия, происхождения или категории: ' + row.id,
    );
    assert.equal(row.months.length, 12, 'Нужно 12 месяцев: ' + row.id);
    assert.ok(
      row.months.every((code) => codes.has(code)),
      'Неизвестный статус: ' + row.id,
    );
    assert.ok(Array.isArray(row.sources), 'Нужен список источников: ' + row.id);
    for (const id of row.sources) assert.ok(db.sources[id], 'Источник не найден: ' + id);
    for (const field of ['aliases', 'qualitySources']) {
      if (row[field] !== undefined)
        assert.ok(
          Array.isArray(row[field]) && row[field].every((x) => typeof x === 'string' && x.trim()),
          'Некорректное поле ' + field + ': ' + row.id,
        );
    }
    for (const id of row.qualitySources || [])
      assert.ok(db.sources[id], 'Источник спелости не найден: ' + id);
    for (const field of ['variety', 'selection', 'ripening'])
      if (row[field] !== undefined)
        assert.equal(typeof row[field], 'string', 'Некорректное поле ' + field);
    if (row.selection || row.ripening)
      assert.ok(row.qualitySources?.length, 'Советам о качестве нужен источник: ' + row.id);
    if (row.months.some((code) => code !== 'u'))
      assert.ok(row.sources.length > 0, 'Сезону нужен источник: ' + row.id);
  }
}

module.exports = { validateData };
