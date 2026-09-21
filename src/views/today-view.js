import copy from '../../content/ru.json' with { type: 'json' };
import { TODAY_GROUPS, CARDS_PER_GROUP } from '../config/calendar.js';
import { getElement, escapeHtml as escape, formatMessage } from '../shared/html.js';
import { filterProducts, sortProducts } from '../domain/products.js';
import { originOptions } from '../components/origin-options.js';
import { productCard } from '../components/product-card.js';

/** Owns daily filters and expanded groups; uses the shared database and preferences. */
export class TodayView {
  constructor({ database, preferences, clock, openProduct }) {
    Object.assign(this, { database, preferences, clock, openProduct });
    this.mode = 'all';
    this.expandedGroups = new Set();
    this.events = new AbortController();
    this.search = getElement('today-search');
    this.origin = getElement('today-origin');
    this.groups = getElement('today-groups');
    this.origin.innerHTML = originOptions(database.rows);
    const options = { signal: this.events.signal };
    this.search.addEventListener('input', () => this.render(), options);
    this.origin.addEventListener('change', () => this.render(), options);
    getElement('today-reset').addEventListener('click', () => this.reset(), options);
    this.groups.addEventListener('click', (event) => this.handleClick(event), options);
    document.querySelectorAll('[data-today-filter]').forEach((button) =>
      button.addEventListener(
        'click',
        () => {
          this.mode = button.dataset.todayFilter;
          this.render();
        },
        options,
      ),
    );
    this.render();
  }

  render({ preserveOpen = false } = {}) {
    const opened = preserveOpen
      ? [...this.groups.querySelectorAll('.shop-group[open]')].map(
          (element) => element.dataset.group,
        )
      : [];
    const now = this.clock();
    const query = this.search.value.trim();
    const filters = { month: now.month, query, origin: this.origin.value, mode: this.mode };
    const products = sortProducts(
      filterProducts(this.database.rows, filters, this.preferences.favorites),
      now.month,
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
        button.setAttribute('aria-pressed', button.dataset.todayFilter === this.mode),
      );
    this.groups.innerHTML =
      TODAY_GROUPS.map((group) => this.renderGroup(group, products, filters)).join('') ||
      `<div class="empty">${escape(this.mode === 'fav' ? copy.today.emptyFavorites : copy.today.empty)}</div>`;
    for (const id of opened) {
      const group = this.groups.querySelector(`[data-group="${id}"]`);
      if (group) group.open = true;
    }
  }

  renderGroup(group, products, filters) {
    const matches = products.filter((product) =>
      group.codes.includes(product.months[filters.month]),
    );
    if (!matches.length) return '';
    const expanded = this.expandedGroups.has(group.id) || Boolean(filters.query);
    const visible = expanded ? matches : matches.slice(0, CARDS_PER_GROUP);
    const open = group.open || filters.query || filters.origin || this.mode !== 'all' || expanded;
    const text = copy.today.groups[group.id];
    const cards = visible
      .map((product) =>
        productCard(
          product,
          filters.month,
          this.database.statuses,
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
    this.mode = 'all';
    this.expandedGroups.clear();
    this.render();
  }

  destroy() {
    this.events.abort();
  }
}
