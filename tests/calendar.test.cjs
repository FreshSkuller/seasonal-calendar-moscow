const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {build, validateData} = require('../scripts/build.cjs');
const root = path.resolve(__dirname, '..');
const db = JSON.parse(fs.readFileSync(path.join(root, 'data/calendar.json'), 'utf8'));

test('Данные: 12 месяцев, уникальные ID, действующие ссылки на источники', () => validateData(db));
test('Опубликованный HTML соответствует исходникам', () => {
  const normalize = text => text.replace(/\r\n/g, '\n');
  assert.equal(normalize(fs.readFileSync(path.join(root, 'index.html'), 'utf8')), normalize(build()), 'Выполните npm run build и включите index.html в коммит');
});
test('Сборка безопасно встраивает текст базы в HTML', () => {
  const html = build();
  const embedded = html.match(/<script type="application\/json" id="database">([\s\S]*?)<\/script>/);
  assert.ok(embedded);
  assert.deepEqual(JSON.parse(embedded[1]), db);
  assert.ok(!embedded[1].includes('<'));
});
test('Географические фильтры охватывают все происхождения и объединяют Россию', () => {
  const code = fs.readFileSync(path.join(root, 'src/calendar.js'), 'utf8');
  const start = code.indexOf('const REGION_COUNTRIES=');
  const end = code.indexOf('function originOptions()', start);
  assert.ok(start >= 0 && end > start);
  const context = vm.createContext({});
  vm.runInContext(code.slice(start, end), context);
  for (const row of db.rows) {
    assert.ok(context.regionOf(row.origin));
    assert.equal(context.matchesOrigin(row.origin, 'country:'+row.origin), true);
    assert.equal(context.matchesOrigin(row.origin, 'region:Россия'), row.origin.startsWith('Россия'));
  }
});
test('Ошибочный месяц и ссылка на отсутствующий источник блокируют сборку', () => {
  const wrongStatus = structuredClone(db);
  wrongStatus.rows[0].months[0] = 'invalid';
  assert.throws(() => validateData(wrongStatus), /Неизвестный статус/);
  const missingSource = structuredClone(db);
  missingSource.rows[0].sources.push('NOT_A_SOURCE');
  assert.throws(() => validateData(missingSource), /Источник не найден/);
});

test('Советы о спелости не могут ссылаться на отсутствующий источник', () => {
  const invalid = structuredClone(db);
  invalid.rows[0].qualitySources = ['MISSING'];
  assert.throws(() => validateData(invalid), /Источник спелости не найден/);
  invalid.rows[0].qualitySources = [];
  invalid.rows[0].selection = 'Совет без основания';
  assert.throws(() => validateData(invalid), /Советам о качестве нужен источник/);
});
test('Поиск находит привычное название и сорт, карточка экранирует текст', () => {
  const code = fs.readFileSync(path.join(root, 'src/calendar.js'), 'utf8');
  const context = vm.createContext({sourceList: () => 'sources'});
  vm.runInContext(code.slice(code.indexOf('const esc='), code.indexOf('const REGION_COUNTRIES=')), context);
  const pineapple = db.rows.find(r => r.name.includes('Ананас'));
  assert.ok(context.searchText(pineapple).includes('медовый'));
  assert.ok(context.searchText(pineapple).includes('md2'));
  const html = context.qualityDetails({variety:'<script>',selection:'<img onerror=x>',ripening:'a&b'});
  assert.ok(!html.includes('<script>') && !html.includes('<img'));
  assert.ok(html.includes('&lt;img') && html.includes('a&amp;b'));
});
