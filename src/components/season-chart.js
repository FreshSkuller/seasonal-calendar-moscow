import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape } from '../shared/html.js';
import { statusBadge } from './status-badge.js';
import { seasonLabel } from './season-label.js';

export function seasonChart(months, statuses) {
  return `<div class="year-mini">${months
    .map((code, index) => {
      const label = escape(`${copy.months[index]}: ${seasonLabel(months, index, statuses)}`);
      return `<div title="${label}" aria-label="${label}">${escape(copy.monthsShort[index])}${statusBadge(statuses, code, true)}</div>`;
    })
    .join('')}</div>`;
}
