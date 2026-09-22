import { escapeHtml as escape } from '../shared/html.js';

export function statusBadge(statuses, code, compact = false, description) {
  const [symbol, label] = statuses[code];
  return `<span class="${compact ? 'symbol' : 'pill'} status-${escape(code)}">${escape(symbol)}${compact ? '' : ` ${escape(description || label)}`}</span>`;
}
