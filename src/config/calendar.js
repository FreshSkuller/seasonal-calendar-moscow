// Display settings and status ordering; season data lives in data/products.
export const TIME_ZONE = 'Europe/Moscow';
export const CARDS_PER_GROUP = 9;
export const STATUS_RANK = { p: 0, g: 1, a: 1, h: 2, t: 3, b: 4, n: 5, u: 6 };
export const TODAY_GROUPS = [
  {
    id: 'good',
    codes: ['p', 'g'],
    open: true,
  },
  {
    id: 'annual',
    codes: ['a'],
    open: true,
  },
  {
    id: 'choose',
    codes: ['h', 't'],
    open: false,
  },
  {
    id: 'careful',
    codes: ['b'],
    open: false,
  },
  {
    id: 'off',
    codes: ['n'],
    open: false,
  },
  {
    id: 'unknown',
    codes: ['u'],
    open: false,
  },
];
