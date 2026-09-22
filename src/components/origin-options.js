import copy from '../../content/ru.json' with { type: 'json' };
import { escapeHtml as escape, formatMessage } from '../shared/html.js';

/** Navigation comes from the catalog, adding an origin needs no code edit. */
export function originOptions(origins) {
  const groups = new Map();
  for (const origin of origins) {
    if (!groups.has(origin.navigationGroup)) groups.set(origin.navigationGroup, []);
    groups.get(origin.navigationGroup).push(origin);
  }
  return (
    `<option value="">${escape(copy.common.allOrigins)}</option>` +
    [...groups]
      .map(([group, entries]) => {
        const options = [...entries]
          .sort((a, b) => a.label.localeCompare(b.label, 'ru'))
          .map((origin) => {
            const label =
              origin.label === 'Россия'
                ? copy.common.unspecifiedRussia
                : origin.label.replace('Россия ·', 'Россия —');
            return `<option value="origin:${escape(origin.id)}">${escape(label)}</option>`;
          })
          .join('');
        return `<optgroup label="${escape(group)}"><option value="region:${escape(group)}">${escape(formatMessage(copy.common.allRegion, { region: group }))}</option>${options}</optgroup>`;
      })
      .join('')
  );
}
