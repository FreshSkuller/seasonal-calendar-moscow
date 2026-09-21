import { canonicalId, productName } from './domain/product-groups.js';
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
  let storage;
  try {
    storage = window.localStorage;
  } catch {
    /* Private/file browser modes can deny storage. */
  }
  const preferences = new Preferences(storage);
  preferences.migrateFavorites((id) => {
    const row = database.rows.find((item) => item.id === id);
    return row ? canonicalId(row, database.rows) : id;
  });
  const dialog = new DetailsDialog(database);
  const dependencies = {
    database,
    preferences,
    clock,
    openProduct: (id, month) => dialog.open(id, month),
  };
  const calendar = new CalendarView(dependencies);
  const today = new TodayView(dependencies);
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

  document.querySelectorAll('[data-tab]').forEach((button) =>
    button.addEventListener(
      'click',
      () => {
        document
          .querySelectorAll('[data-tab]')
          .forEach((tab) => tab.setAttribute('aria-selected', tab === button));
        document.querySelectorAll('[data-panel]').forEach((panel) => {
          panel.hidden = panel.dataset.panel !== button.dataset.tab;
        });
        if (button.dataset.tab === 'today') today.render();
      },
      options,
    ),
  );

  getElement('hero-count').textContent = new Set(database.rows.map(productName)).size;
  getElement('coverage').textContent = formatMessage(copy.calendar.coverage, {
    total: database.rows.length,
    known: database.rows.filter((row) => row.months.some((status) => status !== 'u')).length,
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
