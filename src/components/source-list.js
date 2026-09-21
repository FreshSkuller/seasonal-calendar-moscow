import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape, formatMessage } from '../shared/html.js';

export function sourceList(sources, ids) {
  return `<ul class="source-list">${ids
    .map((id) => {
      const source = sources[id];
      const dates = formatMessage(copy.sources.dates, {
        date: source.date,
        checked: source.checked,
      });
      return `<li>
      <span class="source-id">${escape(id)}</span>
      <a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a>
      <p>${escape(dates)}</p>
      <p>${escape(source.scope)}</p>
      <p><b>${escape(copy.sources.limits)}</b> ${escape(source.limit)}</p>
    </li>`;
    })
    .join('')}</ul>`;
}
