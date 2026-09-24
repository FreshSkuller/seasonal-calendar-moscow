import copy from '../../content/ru.json' with { type: 'json' };
import { formatMessage } from '../shared/html.js';

export function originSummary(product) {
  const count = product.otherOriginCount;
  if (!count) return product.origin;
  const ending = count % 100;
  const form =
    ending >= 11 && ending <= 14
      ? 'many'
      : count % 10 === 1
        ? 'one'
        : [2, 3, 4].includes(count % 10)
          ? 'few'
          : 'many';
  return `${product.origin} · ${formatMessage(copy.common.otherOrigins[form], { count })}`;
}
