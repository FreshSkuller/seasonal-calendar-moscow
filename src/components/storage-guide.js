import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape } from '../shared/html.js';

/** Sources are collected once at the end of the product card. */
export function storageGuide(guide, { compact = false } = {}) {
  if (!guide) return '';
  const labels = { ...copy.details.storageGuide, ...(compact ? copy.details.compactStorage : {}) };
  const row = (key) => {
    const field = guide[key];
    return `<div><dt>${escape(labels[key])}</dt><dd>${escape(field.text)}</dd></div>`;
  };
  return `<div class="storage-guide${compact ? ' storage-guide-compact' : ''}"><dl class="storage-guide-main">${['location', 'packaging', 'keeping', 'neighbors'].map(row).join('')}</dl><section class="storage-guide-more"><h3>${escape(labels.more)}</h3><dl>${['moisture', 'light'].map(row).join('')}</dl></section></div>`;
}
