import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape } from '../shared/html.js';

/** Structured values keep units, starting event and uncertainty visible together. */
export function storageInstructions(storage) {
  if (!storage) return '';
  const labels = copy.details.storage;
  const describe = (knowledge, known) =>
    knowledge.status === 'known'
      ? known(knowledge.value)
      : `${labels[knowledge.status]}: ${knowledge.reason}`;
  const range = ({ min, max }) => (min === max ? String(min) : `${min}–${max}`);
  const rows = [
    [labels.place, describe(storage.place, (place) => labels.places[place])],
    [labels.temperature, describe(storage.temperatureC, (value) => `${range(value)} °C`)],
    [
      labels.duration,
      describe(
        storage.duration,
        (value) =>
          `${range(value)} ${labels.units[value.unit]}; ${labels.startsAt[value.startsAt]}. ${labels.meanings[value.meaning]}`,
      ),
    ],
  ];
  const conditions = storage.duration.status === 'known' ? storage.duration.value.conditions : [];
  return `<dl class="storage-instructions">${rows.map(([label, value]) => `<dt>${escape(label)}</dt><dd>${escape(value)}</dd>`).join('')}</dl>${conditions.length ? `<ul>${conditions.map((condition) => `<li>${escape(condition)}</li>`).join('')}</ul>` : ''}`;
}
