/** Match stable origin IDs; country: labels remain accepted for old integrations. */
export function matchesOrigin(product, selected) {
  if (!selected) return true;
  if (selected.startsWith('region:')) return product.navigationGroup === selected.slice(7);
  if (selected.startsWith('origin:')) return product.originId === selected.slice(7);
  return selected.startsWith('country:') && product.origin === selected.slice(8);
}
