import { escapeHtml as escape } from '../shared/html.js';

export function statusBadge(statuses, code, compact = false) {
  const [symbol, label] = statuses[code];
  return `<span class="${compact ? 'symbol' : 'pill'} status-${escape(code)}">${escape(symbol)}${compact ? '' : ` ${escape(label)}`}</span>`;
}
