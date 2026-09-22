import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape } from '../shared/html.js';
import { storageInstructions } from './storage-instructions.js';
import { storageGuide } from './storage-guide.js';
import { ADVICE_TOPICS } from '../domain/advice.js';

export function adviceSection(items, sources, topics = ADVICE_TOPICS) {
  const fresh = items.filter((item) => !item.repeated);
  return (
    `<div class="advice-grid">${topics
      .map((topic) => {
        const group = fresh.filter((item) => item.topic === topic);
        if (!group.length) return '';
        return `<section class="advice-section" data-advice-topic="${topic}"><h3>${escape(copy.details.adviceTopics[topic])}</h3>${group.map((item) => `<div data-advice="${escape(item.id)}">${item.storageGuide ? storageGuide(item.storageGuide, sources) : `<p>${escape(item.summary)}</p>`}${item.steps.length ? `<ul>${item.steps.map((step) => `<li>${escape(step)}</li>`).join('')}</ul>` : ''}${storageInstructions(item.storage)}</div>`).join('')}</section>`;
      })
      .join('')}</div>` +
    (items.some((item) => item.repeated)
      ? `<p class="fine">${escape(copy.details.repeatedAdvice)}</p>`
      : '')
  );
}
