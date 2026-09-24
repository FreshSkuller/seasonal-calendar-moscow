/** Screens own values; controls display state and send explicit patches. */
export class FilterState {
  #initial;
  #value;
  constructor(month, values = {}) {
    if (!Number.isInteger(month) || month < 0 || month > 11) throw new Error('Invalid month');
    this.#initial = {
      month,
      query: '',
      origin: '',
      productType: '',
      status: '',
      mode: 'all',
      favoritesOnly: false,
      knownOnly: false,
      wholeYear: false,
      order: 'season',
    };
    this.#value = this.#initial;
    this.update(values);
  }
  get value() {
    return { ...this.#value };
  }
  update(patch) {
    const next = { ...this.#value };
    for (const key of Object.keys(this.#initial)) {
      if (patch[key] === undefined) continue;
      const value = patch[key];
      if (key === 'month') {
        if (Number.isInteger(value) && value >= 0 && value < 12) next.month = value;
      } else if (typeof value === typeof this.#initial[key]) next[key] = value;
    }
    if (!['all', 'good', 'off'].includes(next.mode)) next.mode = 'all';
    if (!['', 'vegetable', 'fruit', 'berry'].includes(next.productType)) next.productType = '';
    if (!['name', 'season', 'peak'].includes(next.order)) next.order = 'season';
    if (!['', 'p', 'g', 'b', 'h', 't', 'n', 'u', 'a'].includes(next.status)) next.status = '';
    this.#value = next;
    return this.value;
  }
  reset({ preserveMonth = true } = {}) {
    const month = preserveMonth ? this.#value.month : this.#initial.month;
    this.#value = { ...this.#initial, month };
    return this.value;
  }
}
