import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-20T09:00:00Z'));
});

test('Состояние покупки меняет советы, сохраняет фокус и сбрасывается для другой карточки', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#today-search').fill('авокадо');
  await page.locator('.shop-card h3 button').first().click();
  await expect(page.locator('[data-shop-advice]')).toBeVisible();
  await expect(page.locator('[data-home-guide]')).not.toHaveAttribute('open', '');
  await page.locator('[data-home-guide] > summary').click();
  await expect(page.locator('[data-needs-readiness]')).toBeVisible();
  const firm = page.getByRole('radio', { name: 'Недозрелый', exact: true });
  await firm.check();
  await expect(firm).toBeFocused();
  expect(
    await page
      .locator('.purchase-option')
      .evaluateAll((items) => items.every((el) => el.scrollWidth <= el.clientWidth)),
  ).toBe(true);
  await expect(
    page.locator('[data-home-advice] [data-advice-topic="store"]').first(),
  ).toContainText('комнатной температуре');
  await page.getByRole('radio', { name: 'Спелый', exact: true }).check();
  await expect(
    page.locator('[data-home-advice] [data-advice-topic="store"]').first(),
  ).toContainText('холодильник');
  await page.getByRole('radio', { name: 'Разрезан / очищен', exact: true }).check();
  await expect(page.locator('[data-readiness]')).toBeHidden();
  await expect(page.locator('[data-home-advice] [data-advice-topic="ripen"]')).toHaveCount(0);
  await expect(
    page.locator('[data-home-advice] [data-advice-topic="store"]').first(),
  ).toContainText('4 °C или ниже');
  await expect(page.locator('[data-purchase-status]')).toHaveText(
    'Советы обновлены для выбранного состояния.',
  );
  expect(
    await page.locator('#detail-dialog').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.locator('[data-close-dialog]').click();
  await page.locator('#today-search').fill('картофель');
  await page.locator('.shop-card h3 button').first().click();
  await expect(page.locator('[data-home-guide]')).not.toHaveAttribute('open', '');
  await page.locator('[data-home-guide] > summary').click();
  await expect(page.getByRole('radio', { name: 'Целый / не нарезан', exact: true })).toBeChecked();
  await expect(page.locator('[data-readiness]')).toHaveCount(0);
  await expect(
    page.locator('[data-home-advice] [data-advice-topic="store"]').first(),
  ).toContainText('тёмном');
});

test('Поиск, карточка со спелостью, источник и мобильная ширина', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.locator('#today-search').fill('MD2');
  await expect(page.locator('.shop-card')).toHaveCount(1);
  await page.locator('.shop-card h3 button').first().click();
  await expect(page.locator('#detail-dialog')).toBeVisible();
  await expect(page.locator('#dialog-content')).toContainText('Дозреет ли дома');
  await expect(page.locator('#dialog-content')).toContainText('слаще не становится');
  await expect(page.locator('#dialog-content a').first()).toHaveAttribute('href', /^https:/);
  await page.locator('[data-close-dialog]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});

test('Избранное синхронно между экранами и сохраняется после перезагрузки', async ({ page }) => {
  await page.goto('/');
  await page.locator('#today-search').fill('MD2');
  const favorite = page.locator('.shop-card [data-favorite]').first();
  const id = await favorite.getAttribute('data-favorite');
  await favorite.click();
  await page.locator('[data-tab="calendar"]').click();
  await page.locator('#favorites').check();
  await expect(page.locator('#table-body tr')).toHaveCount(1);
  await expect(page.locator(`#table-body [data-favorite="${id}"]`)).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator(`#table-body [data-favorite="${id}"]`).click();
  await page.locator('[data-tab="today"]').click();
  await expect(page.locator(`#today-groups [data-favorite="${id}"]`)).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.locator(`#today-groups [data-favorite="${id}"]`).click();
  await page.reload();
  await page.locator('[data-today-filter="fav"]').click();
  await expect(page.locator('.shop-card')).toHaveCount(1);
});

test('Месяцы, все регионы России, сброс, тема и отсутствие пустых надписей', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-tab="calendar"]').click();
  await page.locator('#month').selectOption('0');
  await page.locator('#year-view').click();
  await expect(page.locator('#table-head th.month')).toHaveCount(12);
  await page.locator('#focus-view').click();
  await expect(page.locator('#table-head th.month')).toHaveText(['Дек', 'Янв', 'Фев']);
  await page.locator('#origin').selectOption('region:Россия');
  const origins = await page.locator('#table-body td.origin').allTextContents();
  expect(origins.length).toBeGreaterThan(0);
  expect(origins.every((origin) => origin.startsWith('Россия'))).toBe(true);
  await page.locator('#reset').click();
  await expect(page.locator('#table-body tr')).toHaveCount(91);
  await page.locator('#theme').click();
  await page.reload();
  await expect(page.locator('body')).toHaveClass('dark');
  expect(await page.locator('body').innerText()).not.toMatch(/undefined|\{\{page\./);
});

test('Памятка раскрывается и меняется при нарезке без переполнения', async ({ page }) => {
  await page.goto('/');
  await page.locator('#today-search').fill('морковь');
  await page.locator('.shop-card .why').first().click();
  await page.locator('[data-home-guide] > summary').click();
  const guide = page.locator('.storage-guide').first();
  await expect(guide).toContainText('горечь');
  const more = guide.locator('.storage-guide-more');
  await expect(more).not.toHaveAttribute('open', '');
  await more.locator(':scope > summary').click();
  await expect(more).toHaveAttribute('open', '');
  await expect(more).toContainText('Влага и воздух');
  await page.locator('input[name="purchase-form"][value="cut"]').check();
  await expect(guide).toContainText('контейнер с крышкой');
  await expect(guide).not.toContainText('горечь');
  expect(
    await page.locator('#detail-dialog').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
});

test('Готовый файл работает без сервера и интернета', async ({ page, context }) => {
  await context.setOffline(true);
  await page.goto(pathToFileURL(path.resolve('index.html')).href);
  await page.locator('#today-search').fill('ананас');
  await expect(page.locator('.shop-card')).toHaveCount(1);
  await page.locator('[data-today-filter="off"]').click();
  await expect(page.locator('.empty')).toBeVisible();
});

test('Один авокадо: все происхождения и годовые графики внутри карточки', async ({ page }) => {
  await page.goto('/');
  await page.locator('#today-search').fill('авокадо');
  await expect(page.locator('.shop-card')).toHaveCount(1);
  await page.locator('#today-origin').selectOption({ label: 'Перу' });
  await expect(page.locator('.shop-card .shop-origin')).toHaveText('Перу');
  await page.locator('.shop-card .why').click();
  await expect(page.locator('.variant-detail').first()).toContainText('Перу');
  const variants = await page.locator('.variant-detail').count();
  expect(variants).toBeGreaterThan(3);
  await expect(page.locator('.year-mini')).toHaveCount(variants);
  for (const graph of await page.locator('.year-mini').all())
    await expect(graph.locator(':scope > div')).toHaveCount(12);
  expect(
    await page.locator('#detail-dialog').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
});

test('Избранное прежней версии переносится на постоянный продукт без потери старой записи', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('seeded')) {
      localStorage.setItem('moscow-season-favorites-v2', '["r114","r115"]');
      localStorage.setItem('seeded', 'true');
    }
  });
  await page.goto('/');
  await page.locator('[data-today-filter="fav"]').click();
  await expect(page.locator('.shop-card')).toHaveCount(1);
  await expect(page.locator('.shop-card h3')).toHaveText('Авокадо');
  const id = await page.locator('.shop-card [data-favorite]').getAttribute('data-favorite');
  expect(id).toMatch(/^product-/);
  await page.reload();
  await page.locator('[data-today-filter="fav"]').click();
  await expect(page.locator('.shop-card [data-favorite]')).toHaveAttribute('data-favorite', id);
  expect(await page.evaluate(() => localStorage.getItem('moscow-season-favorites-v2'))).toBe(
    '["r114","r115"]',
  );
});

test('Поиск прощает опечатки и раскладку на обоих экранах', async ({ page }) => {
  await page.goto('/');
  for (const query of ['авдкадо', 'fdfrflj']) {
    await page.locator('#today-search').fill(query);
    await expect(page.locator('.shop-card')).toHaveCount(1);
    await expect(page.locator('.shop-card h3')).toHaveText('Авокадо');
  }
  await page.locator('[data-tab="calendar"]').click();
  await page.locator('#search').fill('fdfrflj');
  await expect(page.locator('#table-body tr')).toHaveCount(1);
  await expect(page.locator('#table-body .name')).toHaveText('Авокадо');
  await page.locator('#table-body .name').click();
  await expect(page.locator('[data-shop-advice]')).toBeVisible();
  await expect(page.locator('[data-home-guide]')).not.toHaveAttribute('open', '');
  expect(
    await page
      .locator('#dialog-content')
      .evaluate((el) => el.lastElementChild.matches('[data-product-sources]')),
  ).toBe(true);
  expect(
    await page.locator('#detail-dialog').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
});

test('Открытая карточка удерживает фон и возвращает прокрутку после закрытия', async ({ page }) => {
  await page.goto('/');
  const trigger = page.locator('.shop-card .why').first();
  await trigger.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await trigger.click();
  const dialog = page.locator('#detail-dialog');
  await expect(dialog).toBeVisible();
  const locked = await page.evaluate(() => window.scrollY);
  await page.mouse.move(2, 2);
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.scrollY)).toBe(locked);
  await page.locator('.season-reference > summary').click();
  const box = await dialog.boundingBox();
  const innerBefore = await dialog.evaluate((el) => el.scrollTop);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => dialog.evaluate((el) => el.scrollTop)).toBeGreaterThan(innerBefore);
  await dialog.evaluate((el) => (el.scrollTop = el.scrollHeight));
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.scrollY)).toBe(locked);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  await page.mouse.move(2, 2);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  await trigger.click();
  await page.locator('[data-close-dialog]').click();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe(
    'hidden',
  );
  await trigger.click();
  await page.mouse.click(2, 2);
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe(
    'hidden',
  );
});
