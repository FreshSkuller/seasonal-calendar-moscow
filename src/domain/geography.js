import { REGION_COUNTRIES } from '../config/geography.js';

export function regionOf(origin) {
  if (origin === 'Россия' || origin.startsWith('Россия ·')) return 'Россия';
  for (const [region, countries] of Object.entries(REGION_COUNTRIES)) {
    if (countries.includes(origin)) return region;
  }
  throw new Error(`Unknown origin: ${origin}`);
}

export function matchesOrigin(origin, selected) {
  if (!selected) return true;
  if (selected.startsWith('region:')) return regionOf(origin) === selected.slice(7);
  return selected.startsWith('country:') && origin === selected.slice(8);
}
