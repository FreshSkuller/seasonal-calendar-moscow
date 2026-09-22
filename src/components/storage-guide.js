import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape } from '../shared/html.js';

/** Sources are collected once at the end of the product card. */
export function storageGuide(guide, { compact = false } = {}) {
  if (!guide) return '';
  const labels = { ...copy.details.storageGuide, ...(compact ? copy.details.compactStorage : {}) };
  const row = (key) => {
    const field = guide[key];
    const note =
      field.basis === 'supported' || (compact && field.basis === 'general')
        ? ''
        : `<small class="storage-basis">${escape(labels.basis[field.basis])}</small>`;
    return `<div><dt>${escape(labels[key])}${note}</dt><dd>${escape(field.text)}</dd></div>`;
  };
  const general = compact
    ? Object.keys(guide)
        .filter((key) => guide[key].basis === 'general')
        .map((key) => labels[key])
    : [];
  return `<div class="storage-guide${compact ? ' storage-guide-compact' : ''}"><dl class="storage-guide-main">${(compact ? ['location', 'packaging', 'keeping', 'neighbors'] : ['location', 'packaging', 'neighbors']).map(row).join('')}</dl><details class="storage-guide-more"><summary>${escape(labels.more)}</summary><dl>${(compact ? ['moisture', 'light'] : ['moisture', 'light', 'keeping']).map(row).join('')}</dl>${general.length ? `<p class="fine">${escape(labels.general)} ${escape(general.join(', ').toLocaleLowerCase('ru'))}.</p>` : ''}</details></div>`;
}
