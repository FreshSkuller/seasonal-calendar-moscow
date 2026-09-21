const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

/** One assembled database for validation, tests and the standalone published page. */
function loadDatabase() {
  const directory = path.join(root, 'data/products');
  const rows = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .flatMap((file) => readJson(`data/products/${file}`));
  rows.sort((left, right) => left.id.localeCompare(right.id, 'en', { numeric: true }));
  return {
    ...readJson('data/metadata.json'),
    statuses: readJson('data/statuses.json'),
    sources: readJson('data/sources.json'),
    rows,
  };
}

module.exports = { loadDatabase, readJson, root };
