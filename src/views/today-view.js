import { buildProductList } from '../application/product-list.js';
import { FilterState } from '../state/filters.js';
import copy from '../../content/ru.json' with { type: 'json' };
import { TODAY_GROUPS, CARDS_PER_GROUP } from '../config/calendar.js';
import { getElement, escapeHtml as escape, formatMessage } from '../shared/html.js';
import { originOptions } from '../components/origin-options.js';
import { productCard } from '../components/product-card.js';

/** Owns daily filters and expanded groups; uses the shared database and preferences. */
export class TodayView {
  constructor({ catalog, preferences, clock, openProduct, onSharedFiltersChange }) {
    Object.assign(this, { catalog, preferences, clock, openProduct, onSharedFiltersChange });
    this.state = new FilterState(clock().month);
    this.expandedGroups = new Set();
    this.events = new AbortController();
    this.search = getElement('today-search');
    this.clearSearch = getElement('today-clear-search');
    this.origin = getElement('today-origin');
    this.favoritesOnly = getElement('today-favorites');
    this.resetButton = getElement('today-reset');
    this.typeButtons = [...document.querySelectorAll('[data-panel="today"] [data-product-type]')];
    this.groups = getElement('today-groups');
    this.origin.innerHTML = originOptions(catalog.origins);
    const options = { signal: this.events.signal };
    this.search.addEventListener(
      'input',
      () => {
        this.updateShared({ query: this.search.value.trim() });
      },
      options,
    );
    this.origin.addEventListener(
      'change',
      () => {
        this.updateShared({ origin: this.origin.value });
      },
      options,
    );
    this.favoritesOnly.addEventListener(
      'change',
      () => this.updateShared({ favoritesOnly: this.favoritesOnly.checked }),
      options,
    );
    this.clearSearch.addEventListener(
      'click',
      () => {
        this.search.value = '';
        this.updateShared({ query: '' });
        this.search.focus();
      },
      options,
    );
    this.typeButtons.forEach((button) =>
      button.addEventListener(
        'click',
        () => this.updateShared({ productType: button.dataset.productType }),
        options,
      ),
    );
    this.resetButton.addEventListener('click', () => this.reset(), options);
    this.groups.addEventListener('click', (event) => this.handleClick(event), options);
    document.querySelectorAll('[data-today-filter]').forEach((button) =>
      button.addEventListener(
        'click',
        () => {
          this.state.update({ mode: button.dataset.todayFilter });
          this.render();
        },
        options,
      ),
    );
    this.render();
  }

  updateShared(patch) {
    this.state.update(patch);
    this.render();
    this.onSharedFiltersChange(this, patch);
  }

  applySharedFilters(patch) {
    this.state.update(patch);
    const filters = this.state.value;
    this.search.value = filters.query;
    this.origin.value = filters.origin;
    this.favoritesOnly.checked = filters.favoritesOnly;
    this.render();
  }

  render({ preserveOpen = false } = {}) {
    const opened = preserveOpen
      ? [...this.groups.querySelectorAll('.shop-group[open]')].map(
          (element) => element.dataset.group,
        )
      : [];
    const now = this.clock();
    const filters = this.state.update({ month: now.month });
    const { products } = buildProductList(
      this.catalog,
      filters,
      this.preferences.favorites,
      'peak',
    );
    getElement('today-date').textContent = formatMessage(copy.common.monthLocation, {
      month: now.label,
    });
    getElement('today-count').textContent = formatMessage(copy.today.count, {
      total: products.length,
    });
    document
      .querySelectorAll('[data-today-filter]')
      .forEach((button) =>
        button.setAttribute('aria-pressed', button.dataset.todayFilter === filters.mode),
      );
    this.typeButtons.forEach((button) =>
      button.setAttribute('aria-pressed', button.dataset.productType === filters.productType),
    );
    this.clearSearch.hidden = !this.search.value;
    this.resetButton.hidden = ![
      filters.query,
      filters.origin,
      filters.productType,
      filters.favoritesOnly,
      filters.mode !== 'all',
    ].some(Boolean);
    const primary = filters.productType
      ? products.filter((product) => product.productTypes[0] === filters.productType)
      : products;
    const additional = filters.productType
      ? products.filter((product) => product.productTypes[0] !== filters.productType)
      : [];
    const sections =
      TODAY_GROUPS.map((group) => this.renderGroup(group, primary, filters)).join('') +
      (additional.length
        ? this.renderGroup(
            {
              id: 'additional',
              codes: TODAY_GROUPS.flatMap((group) => group.codes),
              open: true,
              text: {
                title: formatMessage(copy.today.additionalTypes.title, {
                  type: copy.page.productTypes[filters.productType],
                }),
                description: copy.today.additionalTypes.description,
              },
            },
            additional,
            filters,
          )
        : '');
    this.groups.innerHTML = sections || this.renderEmpty(filters);
    for (const id of opened) {
      const group = this.groups.querySelector(`[data-group="${id}"]`);
      if (group) group.open = true;
    }
  }

  renderEmpty(filters) {
    const type = copy.page.productTypes[filters.productType];
    const message = filters.query
      ? formatMessage(type ? copy.common.emptyTypeQuery : copy.common.emptyQuery, {
          type,
          query: filters.query,
        })
      : filters.favoritesOnly
        ? copy.today.emptyFavorites
        : copy.today.empty;
    return `<div class="empty filter-empty"><p>${escape(message)}</p>
      ${filters.query ? `<button data-clear-query>${escape(copy.page.clearSearch)}</button>` : ''}
      <button data-reset-filters>${escape(copy.page.todayReset)}</button></div>`;
  }

  renderGroup(group, products, filters) {
    const matches = products.filter((product) =>
      group.codes.includes(product.months[filters.month]),
    );
    if (!matches.length) return '';
    const expanded =
      this.expandedGroups.has(group.id) ||
      Boolean(filters.query) ||
      Boolean(filters.productType && group.id !== 'additional');
    const visible = expanded ? matches : matches.slice(0, CARDS_PER_GROUP);
    const open =
      group.open ||
      filters.query ||
      filters.origin ||
      filters.favoritesOnly ||
      filters.mode !== 'all' ||
      expanded;
    const text = group.text || copy.today.groups[group.id];
    const cards = visible
      .map((product) =>
        productCard(
          product,
          filters.month,
          this.catalog.statuses,
          this.preferences.hasFavorite(product.id),
        ),
      )
      .join('');
    const more =
      !expanded && matches.length > CARDS_PER_GROUP
        ? `<button class="show-more" data-more="${group.id}">${escape(formatMessage(copy.today.showMore, { count: matches.length - CARDS_PER_GROUP }))}</button>`
        : '';
    return `<details class="shop-group" data-group="${group.id}" ${open ? 'open' : ''}>
      <summary>${escape(text.title)} <span class="group-count">${matches.length}</span></summary>
      <p class="group-desc">${escape(text.description)}</p>
      <div class="shop-cards">${cards}</div>${more}
    </details>`;
  }

  handleClick(event) {
    if (event.target.closest('[data-clear-query]')) {
      this.search.value = '';
      this.updateShared({ query: '' });
      this.search.focus();
      return;
    }
    if (event.target.closest('[data-reset-filters]')) {
      this.reset();
      return;
    }
    const product = event.target.closest('[data-product]');
    const favorite = event.target.closest('[data-favorite]');
    const more = event.target.closest('[data-more]');
    if (product) this.openProduct(product.dataset.product, this.clock().month);
    if (favorite) {
      this.preferences.toggleFavorite(favorite.dataset.favorite);
      this.groups.querySelector(`[data-favorite="${favorite.dataset.favorite}"]`)?.focus();
    }
    if (more) {
      this.expandedGroups.add(more.dataset.more);
      this.render();
    }
  }

  reset() {
    this.search.value = '';
    this.origin.value = '';
    this.state.reset();
    this.favoritesOnly.checked = false;
    this.expandedGroups.clear();
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
