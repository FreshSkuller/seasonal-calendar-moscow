import { TIME_ZONE } from '../config/calendar.js';

/** Clock is injected into views so month boundaries can be tested deterministically. */
export function moscowDate(date = new Date()) {
  return {
    month:
      Number(
        new Intl.DateTimeFormat('en', { timeZone: TIME_ZONE, month: 'numeric' }).format(date),
      ) - 1,
    label: new Intl.DateTimeFormat('ru', {
      timeZone: TIME_ZONE,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date),
  };
}
