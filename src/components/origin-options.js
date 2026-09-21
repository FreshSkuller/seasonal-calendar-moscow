import copy from '../../content/ru.json' with { type: 'json' };
import { REGION_COUNTRIES } from '../config/geography.js';
import { regionOf } from '../domain/geography.js';
import { escapeHtml as escape, formatMessage } from '../shared/html.js';

export function originOptions(products) {
  const groups = Object.entries(REGION_COUNTRIES)
    .map(([region, countries]) => {
      const origins =
        region === 'Россия'
          ? [
              ...new Set(
                products
                  .filter((product) => regionOf(product.origin) === region)
                  .map((product) => product.origin),
              ),
            ].sort((a, b) => a.localeCompare(b, 'ru'))
          : countries.filter((country) => products.some((product) => product.origin === country));
      const options = origins
        .map((origin) => {
          const label =
            origin === 'Россия'
              ? copy.common.unspecifiedRussia
              : origin.replace('Россия ·', 'Россия —');
          return `<option value="country:${escape(origin)}">${escape(label)}</option>`;
        })
        .join('');
      return `<optgroup label="${escape(region)}"><option value="region:${escape(region)}">${escape(formatMessage(copy.common.allRegion, { region }))}</option>${options}</optgroup>`;
    })
    .join('');
  return `<option value="">${escape(copy.common.allOrigins)}</option>${groups}`;
}
