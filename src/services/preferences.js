const PREFERENCES_KEY = 'moscow-season-preferences-v3';
const LEGACY_FAVORITES_KEY = 'moscow-season-favorites-v2';
const THEME_KEY = 'moscow-season-dark';
const validIds = (value) =>
  Array.isArray(value) && value.every((id) => typeof id === 'string' && id.trim());

/** Versioned persistence; old values remain available for rollback and recovery. */
export class Preferences {
  #storage;
  #listeners = new Set();
  #favorites;
  #dark;
  #canWrite;
  constructor(storage, { resolveFavoriteId = (id) => id } = {}) {
    this.#storage = storage;
    const saved = this.#read(PREFERENCES_KEY, null, Symbol('unreadable'));
    const valid = saved?.version === 3 && validIds(saved.favorites);
    const legacy = this.#read(LEGACY_FAVORITES_KEY, []);
    const ids = valid ? saved.favorites : validIds(legacy) ? legacy : [];
    this.#favorites = new Set(ids.map(resolveFavoriteId));
    this.#dark = this.#read(THEME_KEY, false) === true;
    // A newer or malformed record is not silently overwritten during fallback.
    this.#canWrite = saved === null || valid;
    if (this.#canWrite && ids.length) this.#saveFavorites();
  }
  get favorites() {
    return new Set(this.#favorites);
  }
  get dark() {
    return this.#dark;
  }
  hasFavorite(id) {
    return this.#favorites.has(id);
  }
  toggleFavorite(id) {
    if (this.#favorites.has(id)) this.#favorites.delete(id);
    else this.#favorites.add(id);
    this.#saveFavorites();
    this.#notify('favorites');
  }
  toggleTheme() {
    this.#dark = !this.#dark;
    this.#write(THEME_KEY, this.#dark);
    this.#notify('theme');
  }
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  #notify(kind) {
    for (const listener of this.#listeners) listener(kind);
  }
  #saveFavorites() {
    if (this.#canWrite)
      this.#write(PREFERENCES_KEY, { version: 3, favorites: [...this.#favorites] });
  }
  #read(key, fallback, unreadable = fallback) {
    try {
      const raw = this.#storage?.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw) ?? fallback;
    } catch {
      return unreadable;
    }
  }
  #write(key, value) {
    try {
      this.#storage?.setItem(key, JSON.stringify(value));
    } catch {
      /* In-memory preferences still work. */
    }
  }
}
