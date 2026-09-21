import copy from '../../content/ru.json' with { type: 'json' };
import { getElement, escapeHtml as escape, formatMessage } from '../shared/html.js';
import { filterProducts, sortProducts, visibleMonths } from '../domain/products.js';
import { originOptions } from '../components/origin-options.js';
import { calendarHeader, calendarRows } from '../components/calendar-table.js';

/** Owns only the monthly screen's controls and state. */
export class CalendarView {
  constructor({ database, preferences, clock, openProduct }) {
    this.database = database;
    this.preferences = preferences;
    this.openProduct = openProduct;
    this.month = clock().month;
    this.wholeYear = false;
    this.events = new AbortController();
    this.controls = Object.fromEntries(
      ['month', 'search', 'origin', 'category', 'status', 'favorites', 'known-only', 'sort'].map(
        (id) => [id, getElement(id)],
      ),
    );
    this.initializeControls();
    this.bindEvents();
    this.render();
  }

  initializeControls() {
    this.controls.origin.innerHTML = originOptions(this.database.rows);
    this.controls.month.innerHTML = copy.months
      .map((name, index) => `<option value="${index}">${escape(name)}</option>`)
      .join('');
    this.controls.month.value = this.month;
    const categories = [...new Set(this.database.rows.map((product) => product.category))].sort(
      (a, b) => a.localeCompare(b, 'ru'),
    );
    this.controls.category.innerHTML =
      `<option value="">${escape(copy.common.allProducts)}</option>` +
      categories.map((name) => `<option>${escape(name)}</option>`).join('');
    this.controls.status.innerHTML =
      `<option value="">${escape(copy.common.allStatuses)}</option>` +
      Object.entries(this.database.statuses)
        .map(
          ([code, [symbol, name]]) =>
            `<option value="${code}">${escape(symbol)} ${escape(name)}</option>`,
        )
        .join('');
  }

  bindEvents() {
    const options = { signal: this.events.signal };
    for (const [id, control] of Object.entries(this.controls))
      control.addEventListener(id === 'search' ? 'input' : 'change', () => this.render(), options);
    getElement('focus-view').addEventListener(
      'click',
      () => {
        this.wholeYear = false;
        this.render();
      },
      options,
    );
    getElement('year-view').addEventListener(
      'click',
      () => {
        this.wholeYear = true;
        this.render();
      },
      options,
    );
    getElement('reset').addEventListener('click', () => this.reset(), options);
    getElement('table-body').addEventListener(
      'click',
      (event) => this.handleTableClick(event),
      options,
    );
  }

  filters() {
    const controls = this.controls;
    return {
      month: this.month,
      query: controls.search.value,
      origin: controls.origin.value,
      category: controls.category.value,
      status: controls.status.value,
      favoritesOnly: controls.favorites.checked,
      knownOnly: controls['known-only'].checked,
    };
  }

  render() {
    this.month = Number(this.controls.month.value);
    const favorites = this.preferences.favorites;
    const filtered = filterProducts(this.database.rows, this.filters(), favorites);
    const products = sortProducts(filtered, this.month, this.controls.sort.value);
    const months = visibleMonths(this.month, this.wholeYear);
    getElement('table-head').innerHTML = calendarHeader(this.month, months);
    getElement('table-body').innerHTML = calendarRows(
      products,
      this.month,
      months,
      this.database.statuses,
      favorites,
    );
    getElement('month-title').textContent = formatMessage(copy.common.monthLocation, {
      month: copy.months[this.month],
    });
    getElement('result-count').textContent = formatMessage(copy.calendar.count, {
      total: products.length,
      good: products.filter((product) => ['p', 'g', 'a'].includes(product.months[this.month]))
        .length,
      unknown: products.filter((product) => product.months[this.month] === 'u').length,
    });
    getElement('focus-view').setAttribute('aria-pressed', !this.wholeYear);
    getElement('year-view').setAttribute('aria-pressed', this.wholeYear);
  }

  handleTableClick(event) {
    const product = event.target.closest('[data-product]');
    const favorite = event.target.closest('[data-favorite]');
    if (product)
      this.openProduct(
        product.dataset.product,
        product.dataset.month === undefined ? this.month : Number(product.dataset.month),
      );
    if (favorite) {
      this.preferences.toggleFavorite(favorite.dataset.favorite);
      getElement('table-body')
        .querySelector(`[data-favorite="${favorite.dataset.favorite}"]`)
        ?.focus();
    }
  }

  reset() {
    for (const id of ['search', 'origin', 'category', 'status']) this.controls[id].value = '';
    this.controls.favorites.checked = false;
    this.controls['known-only'].checked = false;
    this.controls.sort.value = 'season';
    this.render();
  }

  destroy() {
    this.events.abort();
  }
}
