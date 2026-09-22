export function normalizeSearch(value) {
  return value.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

const latin = "`qwertyuiop[]asdfghjkl;'zxcvbnm,.";
const russian = 'ёйцукенгшщзхъфывапролджэячсмитьбю';
export function correctLayout(value) {
  return [...value]
    .map((char) => (latin.includes(char) ? russian[latin.indexOf(char)] : char))
    .join('');
}

/** Optimal string alignment: insert, remove, replace, or swap adjacent letters. */
export function editDistance(left, right) {
  const rows = Array.from({ length: left.length + 1 }, (_, i) => [i]);
  rows[0] = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i++)
    for (let j = 1; j <= right.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1])
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  return rows[left.length][right.length];
}

const words = (value) => value.match(/[\p{L}\p{N}]+/gu) || [];
function score(text, query, fuzzy) {
  if (text.includes(query)) return 0;
  const terms = words(query),
    tokens = words(text);
  if (!terms.length || terms.some((term) => term.length > 64)) return Infinity;
  let total = 0;
  for (const term of terms) {
    if (tokens.some((token) => token.includes(term))) continue;
    const limit = fuzzy && !/\d/.test(term) ? (term.length >= 7 ? 2 : term.length >= 4 ? 1 : 0) : 0;
    if (!limit) return Infinity;
    const distance = Math.min(
      ...tokens
        .filter((token) => Math.abs(token.length - term.length) <= limit && token.length <= 64)
        .map((token) => editDistance(term, token)),
    );
    if (distance > limit) return Infinity;
    total += distance;
  }
  return total;
}

/** Prefer literal matches, then layout, then the closest typo matches. Never rewrites input. */
export function searchProducts(products, query, textFor) {
  const normalized = normalizeSearch(query);
  if (!normalized) return products;
  if (normalized.length > 160) return [];
  const candidates = [...new Set([normalized, normalizeSearch(correctLayout(normalized))])];
  const entries = products.map((product) => ({ product, text: textFor(product) }));
  for (const candidate of candidates) {
    const exact = entries.filter((entry) => score(entry.text, candidate, false) === 0);
    if (exact.length) return exact.map((entry) => entry.product);
  }
  const ranked = entries.map((entry) => ({
    ...entry,
    score: Math.min(...candidates.map((candidate) => score(entry.text, candidate, true))),
  }));
  const best = Math.min(...ranked.map((entry) => entry.score));
  return Number.isFinite(best)
    ? ranked.filter((entry) => entry.score === best).map((entry) => entry.product)
    : [];
}
