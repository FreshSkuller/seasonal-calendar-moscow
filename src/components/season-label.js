import copy from '../../content/ru.json' with { type: 'json' };
import { seasonDirection } from '../domain/seasons.js';

export function seasonLabel(months, month, statuses) {
  const direction = seasonDirection(months, month);
  if (!direction) return statuses[months[month]][1];
  return copy.seasonDirections[direction.kind].replace('{month}', copy.months[direction.month]);
}
