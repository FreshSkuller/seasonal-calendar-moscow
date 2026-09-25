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

const romanPairs = {
  shch: 'щ',
  sch: 'щ',
  shh: 'щ',
  yo: 'е',
  jo: 'е',
  zh: 'ж',
  kh: 'х',
  ts: 'ц',
  ch: 'ч',
  sh: 'ш',
  yu: 'ю',
  ju: 'ю',
  ya: 'я',
  ja: 'я',
  a: 'а',
  b: 'б',
  c: 'ц',
  d: 'д',
  e: 'е',
  f: 'ф',
  g: 'г',
  h: 'х',
  i: 'и',
  j: 'й',
  k: 'к',
  l: 'л',
  m: 'м',
  n: 'н',
  o: 'о',
  p: 'п',
  q: 'к',
  r: 'р',
  s: 'с',
  t: 'т',
  u: 'у',
  v: 'в',
  w: 'в',
  x: 'х',
  y: 'ы',
  z: 'з',
};

function transliterate(value) {
  return value.replace(
    /shch|sch|shh|yo|jo|zh|kh|ts|ch|sh|yu|ju|ya|ja|[a-z]/g,
    (part) => romanPairs[part],
  );
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
// Keep this deliberately small: search only needs common noun and adjective endings,
// while irregular base forms belong in the catalog's searchAliases.
const russianEndings = [
  'иями',
  'ьями',
  'ями',
  'ами',
  'ого',
  'его',
  'ому',
  'ему',
  'ыми',
  'ими',
  'еем',
  'иях',
  'еях',
  'ьям',
  'ьах',
  'ах',
  'ях',
  'ам',
  'ям',
  'ов',
  'ев',
  'ей',
  'ой',
  'ый',
  'ий',
  'ая',
  'яя',
  'ое',
  'ее',
  'ые',
  'ие',
  'ую',
  'юю',
  'ом',
  'ем',
  'ым',
  'им',
  'ью',
  'ея',
  'еи',
  'ею',
  'а',
  'я',
  'ы',
  'и',
  'у',
  'ю',
  'е',
  'о',
  'ь',
];

function russianStem(token) {
  if (!/^[а-я]+$/.test(token)) return token;
  const ending = russianEndings.find(
    (suffix) => token.endsWith(suffix) && token.length - suffix.length >= 3,
  );
  return ending ? token.slice(0, -ending.length) : token;
}

function score(text, query, mode) {
  if (text.includes(query)) return 0;
  const terms = words(query),
    tokens = words(text);
  if (!terms.length || terms.some((term) => term.length > 64)) return Infinity;
  let total = 0;
  for (const term of terms) {
    if (tokens.some((token) => token.includes(term))) continue;
    const form = russianStem(term);
    if (mode !== 'literal' && tokens.some((token) => russianStem(token) === form)) continue;
    const limit =
      mode === 'fuzzy' && !/\d/.test(term) ? (form.length >= 7 ? 2 : form.length >= 4 ? 1 : 0) : 0;
    if (!limit) return Infinity;
    const distance = Math.min(
      ...tokens
        .filter((token) => token.length <= 64)
        .map((token) => russianStem(token))
        .filter((token) => Math.abs(token.length - form.length) <= limit)
        .map((token) => editDistance(form, token)),
    );
    if (distance > limit) return Infinity;
    total += distance;
  }
  return total;
}

/** Prefer literal matches, then word forms, then the closest typo matches. Never rewrites input. */
export function searchProducts(products, query, textFor) {
  const normalized = normalizeSearch(query);
  if (!normalized) return products;
  if (normalized.length > 160) return [];
  const candidates = [
    ...new Set([
      normalized,
      normalizeSearch(correctLayout(normalized)),
      normalizeSearch(transliterate(normalized)),
    ]),
  ];
  const entries = products.map((product) => ({ product, text: textFor(product) }));
  for (const mode of ['literal', 'form']) {
    for (const candidate of candidates) {
      const matches = entries.filter((entry) => score(entry.text, candidate, mode) === 0);
      if (matches.length) return matches.map((entry) => entry.product);
    }
  }
  const ranked = entries.map((entry) => ({
    ...entry,
    score: Math.min(...candidates.map((candidate) => score(entry.text, candidate, 'fuzzy'))),
  }));
  const best = Math.min(...ranked.map((entry) => entry.score));
  return Number.isFinite(best)
    ? ranked.filter((entry) => entry.score === best).map((entry) => entry.product)
    : [];
}
