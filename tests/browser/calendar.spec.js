import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-20T09:00:00Z'));
});

async function revealCalendarFilters(page) {
  if (!(await page.locator('#calendar-more').evaluate((element) => element.open))) {
    await page.locator('#calendar-more > summary').click();
  }
}

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
  ).toContainText('тёмный шкаф');
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
  await revealCalendarFilters(page);
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
  await revealCalendarFilters(page);
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

test('Календарь показывает результаты над сгибом экрана и сохраняет доступ к фильтрам', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('[data-tab="calendar"]').click();
  await expect(page.locator('.hero')).toBeHidden();
  const phone = page.viewportSize().width <= 850;
  await expect(page.locator('#calendar-more')).toHaveJSProperty('open', !phone);
  if (phone) {
    const top = await page
      .locator('.table-wrap')
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(top).toBeLessThan(page.viewportSize().height);
  }
  await revealCalendarFilters(page);
  await page.locator('#origin').selectOption('region:Россия');
  await expect(page.locator('#calendar-filter-count')).toHaveText('1');
  const cell = await page.locator('.month .cellbtn').first().boundingBox();
  expect(cell.width).toBeGreaterThanOrEqual(44);
  expect(cell.height).toBeGreaterThanOrEqual(44);
  await page.locator('#reset').click();
  await expect(page.locator('#calendar-filter-count')).toBeHidden();
  if (phone) {
    await page.setViewportSize({ width: 320, height: 700 });
    const sort = await page.locator('#sort').boundingBox();
    expect(sort.width).toBeGreaterThan(200);
    const title = await page.locator('#month-title').boundingBox();
    const result = await page.locator('#result-count').boundingBox();
    expect(result.y).toBeGreaterThanOrEqual(title.y + title.height);
    await page.setViewportSize({ width: 1024, height: 700 });
    await expect(page.locator('#calendar-more')).toHaveJSProperty('open', true);
    await page.setViewportSize({ width: 390, height: 700 });
    await expect(page.locator('#calendar-more')).toHaveJSProperty('open', false);
  }
});

test('Сезонные группы и карточка открываются без лишней рамки', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.number-note')).toHaveCount(0);
  if (page.viewportSize().width > 540) await expect(page.locator('.hero-art')).toBeVisible();
  for (const id of ['choose', 'careful', 'off']) {
    const group = page.locator(`.shop-group[data-group="${id}"]`);
    await expect(group).toBeVisible();
    const style = await group.evaluate((element) => {
      const computed = getComputedStyle(element);
      return { background: computed.backgroundColor, radius: computed.borderRadius };
    });
    expect(style.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(style.radius).not.toBe('0px');
    await group.locator(':scope > summary').click();
    await expect(group.locator('.shop-card').first()).toBeVisible();
  }
  await page.locator('.shop-card .why').first().click();
  await expect(page.locator('#dialog-title')).toBeFocused();
  const close = page.locator('[data-close-dialog]');
  await expect(close).not.toBeFocused();
  expect(await close.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('none');
  await page.locator('[data-home-guide] > summary').click();
  expect(await close.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('none');
  await close.click();
  await expect(page.locator('#detail-dialog')).not.toBeVisible();
});

test('Пять сезонных состояний различимы и счётчики читаются в обеих темах', async ({ page }) => {
  await page.goto('/');
  const ids = ['good', 'annual', 'choose', 'careful', 'off'];
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.locator('#theme').click();
    const colors = await page.locator('.shop-group').evaluateAll((groups) => {
      const channel = (value) => {
        const normalized = value / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      const luminance = (value) => {
        const scale = value.startsWith('color(srgb ') ? 255 : 1;
        const rgb = value
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map((number) => Number(number) * scale);
        return rgb.reduce(
          (sum, component, index) => sum + channel(component) * [0.2126, 0.7152, 0.0722][index],
          0,
        );
      };
      return groups.map((group) => {
        const count = group.querySelector('.group-count');
        const foreground = luminance(getComputedStyle(count).color);
        const background = luminance(getComputedStyle(count).backgroundColor);
        return {
          id: group.dataset.group,
          wash: getComputedStyle(group).backgroundColor,
          accent: getComputedStyle(count).color,
          contrast:
            (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
        };
      });
    });
    const visible = colors.filter(({ id }) => ids.includes(id));
    expect(visible.map(({ id }) => id)).toEqual(ids);
    expect(new Set(visible.map(({ wash }) => wash)).size).toBe(ids.length);
    expect(new Set(visible.map(({ accent }) => accent)).size).toBe(ids.length);
    expect(visible.every(({ contrast }) => contrast >= 4.5)).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (page.viewportSize().width <= 540) {
    await page.setViewportSize({ width: 320, height: 700 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
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

test('Крестик остаётся доступен внизу длинной карточки', async ({ page }) => {
  await page.goto('/');
  await page.locator('.shop-card .why').first().click();
  const dialog = page.locator('#detail-dialog');
  await page.locator('.season-reference > summary').click();
  await dialog.evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect.poll(() => dialog.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  const close = page.locator('[data-close-dialog]');
  const [buttonBox, dialogBox] = await Promise.all([close.boundingBox(), dialog.boundingBox()]);
  const titleBox = await page.locator('#dialog-title').boundingBox();
  expect(buttonBox.y).toBeGreaterThanOrEqual(dialogBox.y);
  expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(dialogBox.y + dialogBox.height);
  expect(titleBox.y + titleBox.height).toBeLessThan(dialogBox.y);
  await close.click();
  await expect(dialog).not.toBeVisible();
});
