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
  status: 'status',
  favorites: 'favoritesOnly',
  'known-only': 'knownOnly',
  sort: 'order',
};

export class CalendarView {
  constructor({ catalog, preferences, clock, openProduct, onSharedFiltersChange }) {
    Object.assign(this, { catalog, preferences, openProduct, onSharedFiltersChange });
    this.initialMonth = clock().month;
    this.state = new FilterState(this.initialMonth);
    this.events = new AbortController();
    this.controls = Object.fromEntries(
      Object.keys(CONTROL_FIELDS).map((id) => [id, getElement(id)]),
    );
    this.typeButtons = [
      ...document.querySelectorAll('[data-panel="calendar"] [data-product-type]'),
    ];
    this.clearSearch = getElement('calendar-clear-search');
    this.resetButton = getElement('reset');
    this.moreFilters = getElement('calendar-more');
    this.wideLayout = window.matchMedia('(min-width: 851px)');
    this.moreFilters.open = this.wideLayout.matches;
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
    this.wideLayout.addEventListener(
      'change',
      (event) => {
        this.moreFilters.open = event.matches;
      },
      options,
    );
    for (const [id, control] of Object.entries(this.controls)) {
      control.addEventListener(
        id === 'search' ? 'input' : 'change',
        () => {
          const value =
            control.type === 'checkbox'
              ? control.checked
              : id === 'month'
                ? Number(control.value)
                : id === 'search'
                  ? control.value.trim()
                  : control.value;
          this.state.update({ [CONTROL_FIELDS[id]]: value });
          this.render();
          if (['search', 'origin', 'favorites'].includes(id))
            this.onSharedFiltersChange(this, { [CONTROL_FIELDS[id]]: value });
        },
        options,
      );
    }
    this.typeButtons.forEach((button) =>
      button.addEventListener(
        'click',
        () => {
          const productType = button.dataset.productType;
          this.state.update({ productType });
          this.render();
          this.onSharedFiltersChange(this, { productType });
        },
        options,
      ),
    );
    this.clearSearch.addEventListener(
      'click',
      () => {
        this.controls.search.value = '';
        this.state.update({ query: '' });
        this.render();
        this.onSharedFiltersChange(this, { query: '' });
        this.controls.search.focus();
      },
      options,
    );
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
    this.resetButton.addEventListener('click', () => this.reset(), options);
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
  applySharedFilters(patch) {
    this.state.update(patch);
    this.syncControls();
    this.render();
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
      filters,
    );
    getElement('month-title').textContent = formatMessage(copy.common.monthLocation, {
      month: copy.months[month],
    });
    getElement('result-count').textContent = formatMessage(copy.calendar.count, model);
    const activeCount = [
      filters.status,
      filters.favoritesOnly,
      filters.knownOnly,
      filters.order !== 'season',
    ].filter(Boolean).length;
    const count = getElement('calendar-filter-count');
    count.textContent = activeCount;
    count.hidden = activeCount === 0;
    this.typeButtons.forEach((button) =>
      button.setAttribute('aria-pressed', button.dataset.productType === filters.productType),
    );
    this.clearSearch.hidden = !this.controls.search.value;
    this.resetButton.hidden = ![
      filters.query,
      filters.origin,
      filters.productType,
      activeCount,
    ].some(Boolean);
    getElement('focus-view').setAttribute('aria-pressed', !wholeYear);
    getElement('year-view').setAttribute('aria-pressed', wholeYear);
  }
  handleTableClick(event) {
    if (event.target.closest('[data-clear-query]')) {
      this.controls.search.value = '';
      this.state.update({ query: '' });
      this.render();
      this.onSharedFiltersChange(this, { query: '' });
      this.controls.search.focus();
      return;
    }
    if (event.target.closest('[data-reset-filters]')) {
      this.reset();
      return;
    }
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
    this.onSharedFiltersChange(this, {
      query: '',
      origin: '',
      productType: '',
      favoritesOnly: false,
    });
  }
  destroy() {
    this.events.abort();
  }
}
