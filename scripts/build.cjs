const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const prettier = require('prettier');
const { loadDatabase, readJson, root } = require('./lib/load-data.cjs');
const { validateData } = require('./lib/validate-data.cjs');

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );

function renderTemplate(template, copy) {
  const withPartials = template.replace(/@@PARTIAL:([a-z-]+)@@/g, (_, name) =>
    read(`src/templates/partials/${name}.html`),
  );
  return withPartials.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
    const value = key.split('.').reduce((parent, part) => parent?.[part], copy);
    assert.equal(typeof value, 'string', `Нет надписи в content/ru.json: ${key}`);
    return escapeHtml(value);
  });
}

async function build() {
  const database = loadDatabase();
  validateData(database);
  const javascript = esbuild.buildSync({
    absWorkingDir: root,
    entryPoints: ['src/app.js'],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    charset: 'utf8',
    minify: false,
    legalComments: 'none',
  }).outputFiles[0].text;
  const styleFiles = readJson('src/styles/manifest.json');
  for (const file of styleFiles) assert.match(file, /^[a-z-]+\.css$/, 'Недопустимое имя CSS');
  const styles = styleFiles
    .map((file) => `/* ${file} */\n${read(`src/styles/${file}`)}`)
    .join('\n');
  let html = renderTemplate(read('src/templates/page.html'), readJson('content/ru.json'));
  const replacements = {
    DATABASE: JSON.stringify(database).replace(/</g, '\\u003c'),
    STYLES: styles,
    APP_JS: javascript.replace(/<\/script/gi, '<\\/script'),
  };
  for (const [key, value] of Object.entries(replacements)) {
    assert.equal(html.split(`@@${key}@@`).length, 2, `Маркер должен встречаться один раз: ${key}`);
    html = html.replace(`@@${key}@@`, () => value);
  }
  assert.ok(!/@@[A-Z_]+@@/.test(html), 'Необработанный маркер сборки');
  const options = await prettier.resolveConfig(path.join(root, 'index.html'));
  return prettier.format(html, { ...options, parser: 'html', embeddedLanguageFormatting: 'off' });
}

if (require.main === module) {
  build()
    .then((html) => {
      fs.writeFileSync(path.join(root, 'index.html'), html);
      console.log('Готово: index.html');
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
module.exports = { build, renderTemplate, validateData };
