import { createCatalog } from './domain/catalog.js';
import copy from '../content/ru.json' with { type: 'json' };
import { getElement, escapeHtml as escape, formatMessage } from './shared/html.js';
import { Preferences } from './services/preferences.js';
import { moscowDate } from './services/clock.js';
import { CalendarView } from './views/calendar-view.js';
import { TodayView } from './views/today-view.js';
import { DetailsDialog } from './views/details-dialog.js';
import { sourceList } from './components/source-list.js';
import { statusBadge } from './components/status-badge.js';

/** Composition root: creates dependencies and coordinates independent screens. */
export function startApplication(database, { clock = moscowDate } = {}) {
  const catalog = createCatalog(database);
  let storage;
  try {
    storage = window.localStorage;
  } catch {
    /* Private/file browser modes can deny storage. */
  }
  const preferences = new Preferences(storage, { resolveFavoriteId: catalog.favoriteProductId });
  const dialog = new DetailsDialog(catalog);
  let calendar;
  let today;
  const dependencies = {
    catalog,
    preferences,
    clock,
    openProduct: (id, month) => dialog.open(id, month),
    onSharedFiltersChange: (source, patch) => {
      for (const view of [calendar, today])
        if (view && view !== source) view.applySharedFilters(patch);
    },
  };
  calendar = new CalendarView(dependencies);
  today = new TodayView(dependencies);
  const events = new AbortController();
  const options = { signal: events.signal };

  const applyTheme = () => {
    document.body.classList.toggle('dark', preferences.dark);
    getElement('theme').setAttribute('aria-pressed', preferences.dark);
  };
  const unsubscribe = preferences.subscribe((kind) => {
    if (kind === 'theme') applyTheme();
    else {
      calendar.render();
      today.render({ preserveOpen: true });
    }
  });
  applyTheme();
  getElement('theme').addEventListener('click', () => preferences.toggleTheme(), options);

  document.body.dataset.activePanel = 'today';
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const activateTab = (button) => {
    document.body.dataset.activePanel = button.dataset.tab;
    tabs.forEach((tab) => {
      const selected = tab === button;
      tab.setAttribute('aria-selected', selected);
      tab.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll('[data-panel]').forEach((panel) => {
      const selected = panel.dataset.panel === button.dataset.tab;
      const entering = selected && panel.hidden;
      panel.hidden = !selected;
      panel.classList.toggle('panel-enter', entering);
    });
    if (button.dataset.tab === 'today') today.render();
  };
  tabs.forEach((button) => button.addEventListener('click', () => activateTab(button), options));
  document.querySelector('.tabs').addEventListener(
    'keydown',
    (event) => {
      const current = tabs.indexOf(document.activeElement);
      if (current < 0) return;
      const next = {
        ArrowRight: (current + 1) % tabs.length,
        ArrowLeft: (current - 1 + tabs.length) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      activateTab(tabs[next]);
      tabs[next].focus();
    },
    options,
  );

  getElement('coverage').textContent = formatMessage(copy.calendar.coverage, {
    total: catalog.variants.length,
    known: catalog.variants.filter((row) => row.months.some((status) => status !== 'u')).length,
  });
  getElement('legend-items').innerHTML = Object.entries(database.statuses)
    .map(
      ([code, [, label, description]]) =>
        `<span title="${escape(description)}">${statusBadge(database.statuses, code, true)}${escape(label)}</span>`,
    )
    .join('');
  getElement('methods').innerHTML = database.method
    .map((method) => `<li>${escape(method)}</li>`)
    .join('');
  getElement('source-list').innerHTML = sourceList(database.sources, Object.keys(database.sources));
  getElement('source-count').textContent = Object.keys(database.sources).length;

  let displayedDate = clock().label;
  document.addEventListener(
    'visibilitychange',
    () => {
      if (!document.hidden) {
        displayedDate = clock().label;
        today.render();
      }
    },
    options,
  );
  const timer = setInterval(() => {
    const next = clock().label;
    if (!document.hidden && next !== displayedDate) {
      displayedDate = next;
      today.render();
    }
  }, 60_000);

  return {
    destroy() {
      clearInterval(timer);
      events.abort();
      unsubscribe();
      calendar.destroy();
      today.destroy();
      dialog.destroy();
    },
  };
}

startApplication(JSON.parse(getElement('database').textContent));
