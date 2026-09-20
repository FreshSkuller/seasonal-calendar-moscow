const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function validateData(db) {
  const codes = new Set(['p', 'g', 'b', 'h', 't', 'n', 'u', 'a']);
  const ids = new Set();
  assert.ok(Array.isArray(db.rows) && db.rows.length > 0, 'Нужны строки календаря');
  assert.deepEqual(new Set(Object.keys(db.statuses)), codes, 'Некорректный набор статусов');
  for (const [id, source] of Object.entries(db.sources)) {
    assert.equal(source.id, id, 'ID источника должен совпадать с ключом');
    assert.ok(['https:', 'http:'].includes(new URL(source.url).protocol), 'Некорректная ссылка: '+id);
    assert.ok(source.title, 'Нужно название источника: '+id);
  }
  for (const row of db.rows) {
    assert.ok(row.id && !ids.has(row.id), 'Повторяющийся или пустой ID: '+row.id);
    ids.add(row.id);
    assert.ok(row.name && row.origin && row.category, 'Нет названия, происхождения или категории: '+row.id);
    assert.equal(row.months.length, 12, 'Нужно 12 месяцев: '+row.id);
    assert.ok(row.months.every(code => codes.has(code)), 'Неизвестный статус: '+row.id);
    assert.ok(Array.isArray(row.sources), 'Нужен список источников: '+row.id);
    for (const id of row.sources) assert.ok(db.sources[id], 'Источник не найден: '+id);
    for (const field of ['aliases', 'qualitySources']) {
      if (row[field] !== undefined) assert.ok(Array.isArray(row[field]) && row[field].every(x => typeof x === 'string' && x.trim()), 'Некорректное поле '+field+': '+row.id);
    }
    for (const id of row.qualitySources || []) assert.ok(db.sources[id], 'Источник спелости не найден: '+id);
    for (const field of ['variety', 'selection', 'ripening']) if (row[field] !== undefined) assert.equal(typeof row[field], 'string', 'Некорректное поле '+field);
    if (row.selection || row.ripening) assert.ok(row.qualitySources?.length, 'Советам о качестве нужен источник: '+row.id);
    if (row.months.some(code => code !== 'u')) assert.ok(row.sources.length > 0, 'Сезону нужен источник: '+row.id);
  }
}

function build() {
  const db = JSON.parse(read('data/calendar.json'));
  validateData(db);
  const calendar = read('src/calendar.js');
  const today = read('src/today.js');
  new vm.Script(calendar+'\n'+today, {filename:'calendar-and-today.js'});
  for (const code of [calendar, today]) assert.ok(!/<\/script/i.test(code), 'Не вставляйте закрывающий тег script в код');
  const replacements = {
    DATABASE: JSON.stringify(db).replace(/</g, '\\u003c'),
    STYLES: read('src/styles.css'),
    CALENDAR_JS: calendar,
    TODAY_JS: today
  };
  let html = read('src/template.html');
  for (const key of Object.keys(replacements)) {
    assert.equal(html.split('@@'+key+'@@').length, 2, 'Маркер должен встречаться один раз: '+key);
  }
  return html.replace(/@@(DATABASE|STYLES|CALENDAR_JS|TODAY_JS)@@/g, (_, key) => replacements[key]);
}

if (require.main === module) {
  fs.writeFileSync(path.join(root, 'index.html'), build());
  console.log('Готово: index.html');
}
module.exports = {build, validateData};
