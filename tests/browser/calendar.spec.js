import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-20T09:00:00Z'));
});

test('Поиск, карточка со спелостью, источник и мобильная ширина', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.locator('#today-search').fill('MD2');
  await expect(page.locator('.shop-card')).toHaveCount(3);
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
  await expect(page.locator('#table-body tr')).toHaveCount(215);
  await page.locator('#theme').click();
  await page.reload();
  await expect(page.locator('body')).toHaveClass('dark');
  expect(await page.locator('body').innerText()).not.toMatch(/undefined|\{\{page\./);
});

test('Готовый файл работает без сервера и интернета', async ({ page, context }) => {
  await context.setOffline(true);
  await page.goto(pathToFileURL(path.resolve('index.html')).href);
  await page.locator('#today-search').fill('ананас');
  await expect(page.locator('.shop-card')).toHaveCount(3);
  await page.locator('[data-today-filter="off"]').click();
  await expect(page.locator('.empty')).toBeVisible();
});
