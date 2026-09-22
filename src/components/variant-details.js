import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape } from '../shared/html.js';
import { statusBadge } from './status-badge.js';
import { seasonChart } from './season-chart.js';
import { seasonLabel } from './season-label.js';

export function variantDetails(variant, month, { statuses, sources }) {
  const season = variant.season;
  return `<section class="variant-detail"><h3>${escape(variant.origin)} · ${escape(variant.name)}</h3>
  <div class="detail-note">${statusBadge(statuses, season.status, false, seasonLabel(season.months, month, statuses))} <strong>· ${escape(copy.months[month])}</strong><p>${escape(statuses[season.status][2])}</p></div>
  <p>${escape(season.note)}</p>
  ${variant.variety ? `<p class="fine"><b>${escape(copy.details.variety)}</b> ${escape(variant.variety)}</p>` : ''}
  ${seasonChart(season.months, statuses)}
  <p><b>${escape(copy.details.confidence)}</b> ${escape(season.confidence)}.</p>
  <p><b>${escape(copy.details.supply)}</b> ${escape(season.supply)}</p>
  <p class="fine">${escape(season.basis)}</p>
  ${!season.sourceIds.length ? `<p class="notice">${escape(copy.details.noSources)}</p>` : ''}</section>`;
}
