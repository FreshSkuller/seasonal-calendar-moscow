import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape } from '../shared/html.js';
import { sourceList } from './source-list.js';

/** A guide is content, not product-specific UI logic. Sources stay beside each claim. */
export function storageGuide(guide, sources) {
  if (!guide) return '';
  const labels = copy.details.storageGuide;
  const row = (key) => {
    const field = guide[key];
    const note =
      field.basis === 'supported'
        ? ''
        : `<small class="storage-basis">${escape(labels.basis[field.basis])}</small>`;
    return `<div><dt>${escape(labels[key])}${note}</dt><dd>${escape(field.text)}</dd></div>`;
  };
  const sourceIds = [...new Set(Object.values(guide).flatMap((field) => field.sourceIds))];
  return `<div class="storage-guide"><dl class="storage-guide-main">${['location', 'packaging', 'neighbors'].map(row).join('')}</dl><details class="storage-guide-more"><summary>${escape(labels.more)}</summary><dl>${['moisture', 'light', 'keeping'].map(row).join('')}</dl><details><summary>${escape(labels.sources)}</summary>${sourceList(sources, sourceIds)}</details></details></div>`;
}
