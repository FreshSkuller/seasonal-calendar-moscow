import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape } from '../shared/html.js';
import { sourceList } from './source-list.js';
import { storageInstructions } from './storage-instructions.js';
import { ADVICE_TOPICS } from '../domain/advice.js';

export function adviceSection(items, sources) {
  const fresh = items.filter((item) => !item.repeated);
  const sourceIds = [...new Set(fresh.flatMap((item) => item.sourceIds))];
  return (
    `<div class="advice-grid">${ADVICE_TOPICS.map((topic) => {
      const group = fresh.filter((item) => item.topic === topic);
      if (!group.length) return '';
      return `<section class="advice-section" data-advice-topic="${topic}"><h3>${escape(copy.details.adviceTopics[topic])}</h3>${group.map((item) => `<div data-advice="${escape(item.id)}"><p>${escape(item.summary)}</p>${item.steps.length ? `<ul>${item.steps.map((step) => `<li>${escape(step)}</li>`).join('')}</ul>` : ''}${storageInstructions(item.storage)}</div>`).join('')}</section>`;
    }).join('')}</div>` +
    (sourceIds.length
      ? `<details><summary>${escape(copy.details.qualitySources)}</summary>${sourceList(sources, sourceIds)}</details>`
      : '') +
    (items.some((item) => item.repeated)
      ? `<p class="fine">${escape(copy.details.repeatedAdvice)}</p>`
      : '')
  );
}
