const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const readCollection = (directory) =>
  fs
    .readdirSync(path.join(root, directory))
    .filter((file) => file.endsWith('.json'))
    .sort()
    .flatMap((file) => readJson(`${directory}/${file}`));
/** Only persisted entities are embedded. Runtime indexes are built by createCatalog. */
function loadDatabase() {
  return {
    ...readJson('data/metadata.json'),
    statuses: readJson('data/statuses.json'),
    sources: readJson('data/sources.json'),
    products: readCollection('data/products'),
    variants: readCollection('data/variants'),
    seasons: readCollection('data/seasons'),
    advice: readCollection('data/advice'),
    evidence: readCollection('data/evidence'),
    origins: readJson('data/taxonomy/origins.json'),
    categories: readJson('data/taxonomy/categories.json'),
    legacyFavorites: readJson('data/migrations/legacy-favorites.json'),
  };
}
module.exports = { loadDatabase, readJson, root };
