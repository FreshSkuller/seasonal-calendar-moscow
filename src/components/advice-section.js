import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape } from '../shared/html.js';
import { sourceList } from './source-list.js';
import { storageInstructions } from './storage-instructions.js';

export function adviceSection(items, sources) {
  const fresh = items.filter((item) => !item.repeated);
  const sourceIds = [...new Set(fresh.flatMap((item) => item.sourceIds))];
  return (
    fresh
      .map(
        (item) => `<section class="advice-section" data-advice="${escape(item.id)}">
    <h3>${escape(copy.details.adviceTopics[item.topic])}</h3>
    <p>${escape(item.summary)}</p>
    ${item.steps.length ? `<ol>${item.steps.map((step) => `<li>${escape(step)}</li>`).join('')}</ol>` : ''}
    ${storageInstructions(item.storage)}
  </section>`,
      )
      .join('') +
    (sourceIds.length
      ? `<details><summary>${escape(copy.details.qualitySources)}</summary>${sourceList(sources, sourceIds)}</details>`
      : '') +
    (items.some((item) => item.repeated)
      ? `<p class="fine">${escape(copy.details.repeatedAdvice)}</p>`
      : '')
  );
}
