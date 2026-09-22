import copy from '../../content/ru.json' with { type: 'json' };
import { getElement, escapeHtml as escape, formatMessage } from '../shared/html.js';
import { visibleMonths } from '../domain/products.js';
import { buildProductList } from '../application/product-list.js';
import { FilterState } from '../state/filters.js';
import { originOptions } from '../components/origin-options.js';
import { calendarHeader, calendarRows } from '../components/calendar-table.js';

const CONTROL_FIELDS = {
  month: 'month',
  search: 'query',
  origin: 'origin',
  category: 'category',
  status: 'status',
  favorites: 'favoritesOnly',
  'known-only': 'knownOnly',
  sort: 'order',
};

export class CalendarView {
  constructor({ catalog, preferences, clock, openProduct }) {
    Object.assign(this, { catalog, preferences, openProduct });
    this.state = new FilterState(clock().month);
    this.events = new AbortController();
    this.controls = Object.fromEntries(
      Object.keys(CONTROL_FIELDS).map((id) => [id, getElement(id)]),
    );
    this.initializeControls();
    this.syncControls();
    this.bindEvents();
    this.render();
  }
  initializeControls() {
    this.controls.origin.innerHTML = originOptions(this.catalog.origins);
    this.controls.month.innerHTML = copy.months
      .map((name, index) => `<option value="${index}">${escape(name)}</option>`)
      .join('');
    const categories = [...this.catalog.categories].sort((a, b) =>
      a.label.localeCompare(b.label, 'ru'),
    );
    this.controls.category.innerHTML =
      `<option value="">${escape(copy.common.allProducts)}</option>` +
      categories
        .map((item) => `<option value="${escape(item.id)}">${escape(item.label)}</option>`)
        .join('');
    this.controls.status.innerHTML =
      `<option value="">${escape(copy.common.allStatuses)}</option>` +
      Object.entries(this.catalog.statuses)
        .map(
          ([code, [symbol, name]]) =>
            `<option value="${code}">${escape(symbol)} ${escape(name)}</option>`,
        )
        .join('');
  }
  bindEvents() {
    const options = { signal: this.events.signal };
    for (const [id, control] of Object.entries(this.controls)) {
      control.addEventListener(
        id === 'search' ? 'input' : 'change',
        () => {
          const value =
            control.type === 'checkbox'
              ? control.checked
              : id === 'month'
                ? Number(control.value)
                : control.value;
          this.state.update({ [CONTROL_FIELDS[id]]: value });
          this.render();
        },
        options,
      );
    }
    for (const [id, wholeYear] of [
      ['focus-view', false],
      ['year-view', true],
    ])
      getElement(id).addEventListener(
        'click',
        () => {
          this.state.update({ wholeYear });
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
  syncControls() {
    const state = this.state.value;
    for (const [id, control] of Object.entries(this.controls)) {
      if (control.type === 'checkbox') control.checked = state[CONTROL_FIELDS[id]];
      else control.value = state[CONTROL_FIELDS[id]];
    }
  }
  render() {
    const filters = this.state.value;
    const { month, wholeYear, order } = filters;
    const favorites = this.preferences.favorites;
    const model = buildProductList(this.catalog, filters, favorites, order);
    const months = visibleMonths(month, wholeYear);
    getElement('table-head').innerHTML = calendarHeader(month, months);
    getElement('table-body').innerHTML = calendarRows(
      model.products,
      month,
      months,
      this.catalog.statuses,
      favorites,
    );
    getElement('month-title').textContent = formatMessage(copy.common.monthLocation, {
      month: copy.months[month],
    });
    getElement('result-count').textContent = formatMessage(copy.calendar.count, model);
    getElement('focus-view').setAttribute('aria-pressed', !wholeYear);
    getElement('year-view').setAttribute('aria-pressed', wholeYear);
  }
  handleTableClick(event) {
    const product = event.target.closest('[data-product]');
    const favorite = event.target.closest('[data-favorite]');
    if (product)
      this.openProduct(
        product.dataset.product,
        product.dataset.month === undefined
          ? this.state.value.month
          : Number(product.dataset.month),
      );
    if (favorite) {
      this.preferences.toggleFavorite(favorite.dataset.favorite);
      getElement('table-body')
        .querySelector(`[data-favorite="${favorite.dataset.favorite}"]`)
        ?.focus();
    }
  }
  reset() {
    this.state.reset();
    this.syncControls();
    this.render();
  }
  destroy() {
    this.events.abort();
  }
}
