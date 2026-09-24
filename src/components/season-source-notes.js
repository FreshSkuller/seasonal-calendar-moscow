import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape } from '../shared/html.js';

// General limitations live here once; source-specific qualifications remain attributed.
export function seasonSourceNotes(variants) {
  const notes = new Map();
  for (const variant of variants) {
    const { supply, confidence } = variant.season;
    const specific = [
      supply.startsWith('Уточняйте производителя и происхождение') ? '' : supply,
      /^(Историческая|Средняя: круглогодичность по одному)/.test(confidence) ? confidence : '',
    ];
    for (const text of specific.filter(Boolean)) {
      if (!notes.has(text)) notes.set(text, new Set());
      notes.get(text).add(variant.origin);
    }
  }
  return `<p>${escape(copy.details.sourceContext)}</p>${[...notes]
    .map(([text, origins]) => `<p><b>${escape([...origins].join(', '))}:</b> ${escape(text)}</p>`)
    .join('')}<p>${escape(copy.details.storageContext)}</p>`;
}
