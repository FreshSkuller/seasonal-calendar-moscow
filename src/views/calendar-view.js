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
    this.expandedProducts = new Set();
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
        this.render();
      },
      options,
    );
    window.addEventListener('resize', () => this.updateScrollHint(), options);
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
          if (id === 'month') this.revealSelectedMonth();
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
          const changed = this.state.value.wholeYear !== wholeYear;
          this.state.update({ wholeYear });
          this.render();
          if (changed && wholeYear) this.revealSelectedMonth();
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
    const compact = !this.wideLayout.matches;
    getElement('table-head').innerHTML = calendarHeader(month, months, compact);
    getElement('table-body').innerHTML = calendarRows(
      model.products,
      month,
      months,
      this.catalog.statuses,
      favorites,
      filters,
      this.catalog,
      this.expandedProducts,
      compact,
    );
    this.updateScrollHint();
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
  updateScrollHint() {
    const wrap = document.querySelector('#panel-calendar .table-wrap');
    document.querySelector('#panel-calendar .table-scroll-hint').hidden =
      wrap.scrollWidth - wrap.clientWidth <= 12;
  }
  revealSelectedMonth() {
    if (!this.state.value.wholeYear) return;
    const wrap = document.querySelector('#panel-calendar .table-wrap');
    const selected = getElement('table-head').querySelector('th.month.selected');
    if (!selected) return;
    const wrapRect = wrap.getBoundingClientRect();
    const selectedRect = selected.getBoundingClientRect();
    const stickyEdge = getElement('table-head')
      .querySelector('th:first-child')
      .getBoundingClientRect().right;
    const visibleStart = Math.max(wrapRect.left, stickyEdge) + 8;
    const visibleEnd = wrapRect.right - 8;
    if (selectedRect.left >= visibleStart && selectedRect.right <= visibleEnd) return;
    const center = (visibleStart + visibleEnd - selectedRect.width) / 2;
    const target = Math.max(
      0,
      Math.min(wrap.scrollWidth - wrap.clientWidth, wrap.scrollLeft + selectedRect.left - center),
    );
    wrap.scrollTo({
      left: target,
      top: wrap.scrollTop,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
  animateVariantChange(productId, previousTops, expanded) {
    if (!previousTops || !Element.prototype.animate) return;
    const body = getElement('table-body');
    const motion = getComputedStyle(document.documentElement);
    const timing = {
      duration: parseFloat(motion.getPropertyValue('--motion-standard')) || 190,
      easing: motion.getPropertyValue('--motion-ease').trim() || 'ease-out',
    };
    for (const row of body.querySelectorAll('[data-product-row]')) {
      const previousTop = previousTops.get(row.dataset.productRow);
      if (previousTop === undefined) continue;
      const offset = previousTop - row.getBoundingClientRect().top;
      if (Math.abs(offset) < 1) continue;
      row.animate([{ transform: `translateY(${offset}px)` }, { transform: 'none' }], timing);
    }
    if (!expanded) return;
    const button = [...body.querySelectorAll('[data-toggle-variants]')].find(
      (item) => item.dataset.toggleVariants === productId,
    );
    let row = button?.closest('tr').nextElementSibling;
    while (row?.classList.contains('variant-row')) {
      row.classList.add('variant-row-enter');
      row = row.nextElementSibling;
    }
  }
  handleTableClick(event) {
    const toggle = event.target.closest('[data-toggle-variants]');
    if (toggle) {
      const productId = toggle.dataset.toggleVariants;
      const body = getElement('table-body');
      const previousTops = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? null
        : new Map(
            [...body.querySelectorAll('[data-product-row]')].map((row) => [
              row.dataset.productRow,
              row.getBoundingClientRect().top,
            ]),
          );
      const expanded = !this.expandedProducts.has(productId);
      if (expanded) this.expandedProducts.add(productId);
      else this.expandedProducts.delete(productId);
      const scrollBox = body.closest('.table-wrap');
      const { scrollTop, scrollLeft } = scrollBox;
      this.render();
      scrollBox.scrollTop = scrollTop;
      scrollBox.scrollLeft = scrollLeft;
      [...getElement('table-body').querySelectorAll('[data-toggle-variants]')]
        .find((button) => button.dataset.toggleVariants === productId)
        ?.focus({ preventScroll: true });
      this.animateVariantChange(productId, previousTops, expanded);
      return;
    }
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
        { showSeason: true },
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
