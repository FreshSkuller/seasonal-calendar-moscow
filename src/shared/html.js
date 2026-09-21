/** Escape data before placing it in HTML text or quoted attributes. */
export function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, (character) => entities[character]);
}

export function formatMessage(message, values = {}) {
  return message.replace(/\{(\w+)\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Missing message value: ${key}`);
    return String(values[key]);
  });
}

/** Required elements fail early instead of silently disabling part of a screen. */
export function getElement(id, root = document) {
  const element = root.getElementById(id);
  if (!element) throw new Error(`Missing element: #${id}`);
  return element;
}
