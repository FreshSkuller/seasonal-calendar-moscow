const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { build, validateData, renderTemplate } = require('../scripts/build.cjs');
const { loadDatabase, root } = require('../scripts/lib/load-data.cjs');
const database = loadDatabase();

test('Все продукты имеют 12 месяцев, уникальные ID и существующие источники', () =>
  validateData(database));

test('Опубликованный HTML соответствует текущим исходникам и данным', async () => {
  const normalize = (text) => text.replace(/\r\n/g, '\n');
  assert.equal(
    normalize(fs.readFileSync(path.join(root, 'index.html'), 'utf8')),
    normalize(await build()),
    'Выполните npm run build',
  );
});

test('Самостоятельный HTML содержит всю базу без потери полей', async () => {
  const embedded = (await build()).match(
    /<script type="application\/json" id="database">([\s\S]*?)<\/script>/,
  );
  assert.ok(embedded);
  assert.deepEqual(JSON.parse(embedded[1]), database);
  assert.ok(!embedded[1].includes('<'));
});

test('Неизвестный месяц и отсутствующие источники блокируют сборку', () => {
  const invalid = structuredClone(database);
  invalid.seasons[0].months[0] = 'invalid';
  assert.throws(() => validateData(invalid), /Неизвестный статус/);
  invalid.seasons[0].months[0] = 'g';
  invalid.evidence[0].sourceIds.push('MISSING');
  assert.throws(() => validateData(invalid), /Источник не найден/);
});

test('Совет о качестве требует отдельного действующего источника', () => {
  const invalid = structuredClone(database);
  invalid.advice[0].evidenceIds = ['MISSING'];
  assert.throws(() => validateData(invalid));
  invalid.advice[0].evidenceIds = [];
  assert.throws(() => validateData(invalid), /Совету нужен источник/);
});

test('Надписи шаблона экранируются, опечатка ключа вызывает ошибку', () => {
  assert.equal(
    renderTemplate('<h1>{{page.title}}</h1>', { page: { title: '<script>&"' } }),
    '<h1>&lt;script&gt;&amp;&quot;</h1>',
  );
  assert.throws(() => renderTemplate('{{page.missing}}', { page: {} }), /Нет надписи/);
});
