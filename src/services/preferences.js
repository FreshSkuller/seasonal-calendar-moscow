const FAVORITES_KEY = 'moscow-season-favorites-v2';
const THEME_KEY = 'moscow-season-dark';

/** Owns preferences and notifications; existing browser storage keys remain compatible. */
export class Preferences {
  #storage;
  #listeners = new Set();
  #favorites;
  #dark;

  constructor(storage) {
    this.#storage = storage;
    const saved = this.#read(FAVORITES_KEY, []);
    this.#favorites = new Set(
      Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : [],
    );
    this.#dark = this.#read(THEME_KEY, false) === true;
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

  migrateFavorites(resolveId) {
    this.#favorites = new Set([...this.#favorites].map(resolveId));
    this.#write(FAVORITES_KEY, [...this.#favorites]);
  }

  toggleFavorite(id) {
    if (this.#favorites.has(id)) this.#favorites.delete(id);
    else this.#favorites.add(id);
    this.#write(FAVORITES_KEY, [...this.#favorites]);
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
  #read(key, fallback) {
    try {
      return JSON.parse(this.#storage?.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }
  #write(key, value) {
    try {
      this.#storage?.setItem(key, JSON.stringify(value));
    } catch {
      /* Storage may be unavailable. Preferences still work for this visit. */
    }
  }
}
