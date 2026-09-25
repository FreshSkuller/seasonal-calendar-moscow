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

test('Разделы переключаются с клавиатуры и сохраняют видимый фокус', async ({ page }) => {
  await page.goto('/');
  const today = page.getByRole('tab', { name: 'Сегодня' });
  const calendar = page.getByRole('tab', { name: 'По месяцам' });
  const method = page.getByRole('tab', { name: 'Справка' });
  await today.focus();
  await page.keyboard.press('ArrowRight');
  await expect(calendar).toBeFocused();
  await expect(calendar).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: 'По месяцам' })).toBeVisible();
  await expect(today).toHaveAttribute('tabindex', '-1');
  await page.keyboard.press('End');
  await expect(method).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'Справка' })).toBeVisible();
  await page.keyboard.press('Home');
  await expect(today).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'Сегодня' })).toBeVisible();
  expect(await today.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
});

test('Переходы короткие, прерываемые и отключаются при уменьшении движения', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-tab="calendar"]').click();
  await expect(page.locator('#panel-calendar')).toBeVisible();
  expect(
    await page
      .locator('#panel-calendar')
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('panel-enter');
  await page.locator('[data-tab="today"]').click();
  await expect(page.locator('#panel-today')).toBeVisible();

  const group = page.locator('#today-groups .shop-group').first();
  await group.locator('summary').click();
  await expect(group).not.toHaveAttribute('open');
  await group.locator('summary').click();
  await expect(group).toHaveAttribute('open');

  await page.locator('.shop-card .why').first().click();
  const dialog = page.locator('#detail-dialog');
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toContain('0.19s');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('[data-tab="calendar"]').click();
  expect(
    await page
      .locator('#panel-calendar')
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
  await page.locator('#table-body .name').first().click();
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe(
    '0s',
  );
  await page.locator('[data-close-dialog]').click();
  await expect(dialog).not.toBeVisible();
});

test('На главной выбор фильтра, избранное и новые карточки дают короткий отклик', async ({
  page,
}) => {
  await page.goto('/');
  const types = page.locator('#panel-today .product-type-options');
  await types.locator('button').nth(2).click();
  await expect(types.locator('button').nth(2)).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() =>
      types.evaluate(
        (element) => new DOMMatrix(getComputedStyle(element, '::before').transform).m41,
      ),
    )
    .toBeGreaterThan(20);
  const seasons = page.locator('#panel-today .today-chips');
  await seasons.locator('button').nth(1).click();
  await expect(seasons.locator('button').nth(1)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#today-reset').click();

  const favorite = page.locator('.shop-group[data-group="good"] .fav').first();
  const id = await favorite.getAttribute('data-favorite');
  await favorite.click();
  const updated = page.locator(`#today-groups [data-favorite="${id}"]`);
  await expect(updated).toHaveAttribute('aria-pressed', 'true');
  await expect(updated).toHaveClass(/favorite-confirm/);
  await expect(updated).toBeFocused();

  const group = page.locator('.shop-group[data-group="good"]');
  const shown = await group.locator('.shop-card').count();
  await group.locator('.show-more').click();
  const added = group.locator('.shop-card').nth(shown);
  await expect(added).toBeVisible();
  await expect(added).toHaveClass(/card-reveal/);
  await expect(added.locator('h3 button')).toBeFocused();
});

test('Раскрытый совет в карточке и изменение выбора учитывают уменьшение движения', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#today-search').fill('авокадо');
  await expect(page.locator('.shop-card')).toHaveCount(1);
  await page.locator('.shop-card .why').click();
  await page.locator('[data-home-guide] > summary').click();
  const content = page.locator('[data-home-guide] > .detail-disclosure-content');
  await expect(content).toBeVisible();
  expect(await content.evaluate((element) => getComputedStyle(element).animationName)).toBe(
    'content-reveal',
  );
  const cut = page.locator('input[name="purchase-form"][value="cut"]');
  await cut.check();
  const advice = page.locator('[data-home-advice]');
  await expect(advice).toHaveClass(/advice-update/);
  await expect(cut).toBeFocused();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('input[name="purchase-form"][value="whole"]').check();
  expect(await advice.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  expect(
    await page
      .locator('.purchase-option')
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0s');
});

test('Поиск показывает один крестик очистки и спокойный фокус в обеих темах', async ({ page }) => {
  await page.goto('/');
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.locator('#theme').click();
    for (const [panel, inputId, clearId] of [
      ['today', 'today-search', 'today-clear-search'],
      ['calendar', 'search', 'calendar-clear-search'],
    ]) {
      await page.locator(`[data-tab="${panel}"]`).click();
      const input = page.locator(`#${inputId}`);
      const clear = page.locator(`#${clearId}`);
      await input.fill('о');
      await expect(clear).toBeVisible();
      const focus = await input.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          outline: style.outlineStyle,
          shadow: style.boxShadow,
        };
      });
      expect(focus.outline).toBe('none');
      expect(focus.shadow).not.toBe('none');
      expect((await clear.boundingBox()).width).toBeGreaterThanOrEqual(44);
      await clear.evaluate((button) => (button.hidden = true));
      const box = await input.boundingBox();
      await input.click({ position: { x: box.width - 20, y: box.height / 2 } });
      await expect(input).toHaveValue('о');
      await clear.evaluate((button) => (button.hidden = false));
      await clear.click();
      await expect(input).toHaveValue('');
      await expect(clear).toBeHidden();
      await expect(input).toBeFocused();
    }
  }
});

test('Текст, сезонные статусы и границы полей читаются в обеих темах', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.locator('#theme').click();
    await page.locator('[data-tab="today"]').click();
    const pageContrast = await page.evaluate(() => {
      const luminance = (color) => {
        const rgb = color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number);
        const channel = (value) => {
          const normalized = value / 255;
          return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        };
        return rgb.reduce(
          (sum, value, index) => sum + channel(value) * [0.2126, 0.7152, 0.0722][index],
          0,
        );
      };
      const ratio = (a, b) => {
        const first = luminance(a);
        const second = luminance(b);
        return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
      };
      const samples = [
        ['основной текст', 'body', 'body'],
        ['подпись фильтра', '.toolbar .filter-label', '.toolbar'],
        [
          'невыбранный фильтр',
          '.toolbar .product-type-options button[aria-pressed="false"]',
          '.toolbar .product-type-options',
        ],
        [
          'выбранный фильтр',
          '.toolbar .product-type-options button[aria-pressed="true"]',
          '.toolbar .product-type-options',
          '::before',
        ],
        ['поле поиска', '.toolbar input[type="search"]'],
        ['описание продукта', '.shop-origin', '.shop-card'],
        ['подробнее', '.shop-card .why', '.shop-card'],
      ];
      const failures = samples.flatMap(([name, foreground, background = foreground, pseudo]) => {
        const fg = getComputedStyle(document.querySelector(foreground)).color;
        const bg = getComputedStyle(document.querySelector(background), pseudo).backgroundColor;
        const contrast = ratio(fg, bg);
        return contrast < 4.5 ? [{ name, contrast }] : [];
      });
      const field = getComputedStyle(document.querySelector('.toolbar input[type="search"]'));
      const borderContrast = ratio(field.borderColor, field.backgroundColor);
      if (borderContrast < 3) failures.push({ name: 'граница поля', contrast: borderContrast });
      return failures;
    });
    expect(pageContrast).toEqual([]);

    await page.locator('[data-tab="calendar"]').click();
    const statusContrast = await page.locator('.legend .symbol').evaluateAll((symbols) => {
      const luminance = (color) => {
        const rgb = color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number);
        return rgb.reduce((sum, value, index) => {
          const normalized = value / 255;
          const channel =
            normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
          return sum + channel * [0.2126, 0.7152, 0.0722][index];
        }, 0);
      };
      return symbols.map((symbol) => {
        const style = getComputedStyle(symbol);
        const fg = luminance(style.color);
        const bg = luminance(style.backgroundColor);
        return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      });
    });
    expect(Math.min(...statusContrast)).toBeGreaterThanOrEqual(4.5);
    await page.locator('[data-tab="today"]').click();
    await page.locator('.shop-card h3 button').first().click();
    const matchingStatus = await page.evaluate(() => {
      const card = getComputedStyle(document.querySelector('.shop-card .pill'));
      const detail = getComputedStyle(document.querySelector('.purchase-season .pill'));
      return card.backgroundColor === detail.backgroundColor && card.color === detail.color;
    });
    expect(matchingStatus).toBe(true);
    await page.locator('[data-close-dialog]').click();
  }
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
  await expect(page.locator('[data-shop-advice]')).toContainText('Как выбрать и купить');
  await expect(page.locator('[data-shop-advice]')).toContainText('слаще не становится');
  await expect(page.locator('[data-advice-topic="ripen"]')).toHaveCount(0);
  await expect(page.locator('#dialog-content a').first()).toHaveAttribute('href', /^https:/);
  await page.locator('[data-close-dialog]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});

test('Отдел, поиск и происхождение сохраняются при переходе к годовому календарю', async ({
  page,
}) => {
  await page.goto('/');
  const today = page.locator('[data-panel="today"]');
  const calendar = page.locator('[data-panel="calendar"]');
  await today.locator('[data-product-type="vegetable"]').click();
  await expect(page.locator('#today-count')).toHaveText('Найдено: 41');
  await page.locator('#today-search').fill('морковь');
  await today.locator('[data-product-type="fruit"]').click();
  await expect(page.locator('#today-groups .empty')).toContainText('Фрукты');
  await expect(page.locator('#today-groups .empty')).toContainText('морковь');
  await page.locator('#today-groups [data-clear-query]').click();
  await expect(page.locator('#today-count')).toHaveText('Найдено: 30');
  await today.locator('[data-product-type="berry"]').click();
  await expect(page.locator('#today-count')).toHaveText('Найдено: 37');
  await page.locator('#today-search').fill('клубника');
  await page.locator('#today-origin').selectOption('region:Россия');
  await expect(page.locator('.shop-card')).toHaveCount(1);
  await page.locator('[data-tab="calendar"]').click();
  await expect(calendar.locator('[data-product-type="berry"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('#search')).toHaveValue('клубника');
  await expect(page.locator('#origin')).toHaveValue('region:Россия');
  await expect(page.locator('#table-body tr')).toHaveCount(1);
  await page.locator('#year-view').click();
  await expect(page.locator('#table-head th.month')).toHaveCount(12);
  await page.locator('[data-tab="today"]').click();
  await expect(page.locator('#today-search')).toHaveValue('клубника');
  await expect(page.locator('#today-origin')).toHaveValue('region:Россия');
});

test('Томаты находятся как овощи и ягоды на обоих экранах', async ({ page }) => {
  await page.goto('/');
  await page.locator('#today-search').fill('томаты');
  await page.locator('[data-panel="today"] [data-product-type="berry"]').click();
  await expect(page.locator('.shop-card')).toHaveCount(1);
  await expect(page.locator('.shop-card .shop-types')).toHaveText('Овощи · Ягоды');
  await page.locator('[data-tab="calendar"]').click();
  await expect(page.locator('#table-body tr')).toHaveCount(1);
  await expect(page.locator('#table-body .row-category')).toHaveText('Овощи · Ягоды');
  await page.locator('[data-panel="calendar"] [data-product-type="fruit"]').click();
  await expect(page.locator('#table-body .filter-empty')).toBeVisible();
});

test('Основные ягоды идут перед дополнительными внутри сезонных групп и в календаре', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('[data-panel="today"] [data-product-type="berry"]').click();
  const groups = page.locator('#today-groups .shop-group');
  await expect(page.locator('#today-groups [data-group="additional"]')).toHaveCount(0);
  const bySeason = await groups.evaluateAll((items) =>
    items.map((group) => ({
      count: Number(group.querySelector('.group-count').textContent),
      types: [...group.querySelectorAll('.shop-card .shop-types')].map((type) => type.textContent),
    })),
  );
  const total = Number((await page.locator('#today-count').textContent()).match(/\d+/)[0]);
  expect(bySeason.reduce((sum, group) => sum + group.count, 0)).toBe(total);
  expect(bySeason.some((group) => group.types.some((type) => !type.startsWith('Ягоды')))).toBe(
    true,
  );
  for (const group of bySeason) {
    expect(group.types).toHaveLength(group.count);
    const firstAdditional = group.types.findIndex((type) => !type.startsWith('Ягоды'));
    if (firstAdditional >= 0) {
      expect(group.types.slice(0, firstAdditional).every((type) => type.startsWith('Ягоды'))).toBe(
        true,
      );
      expect(group.types.slice(firstAdditional).every((type) => !type.startsWith('Ягоды'))).toBe(
        true,
      );
    }
  }
  await expect(page.locator('#today-groups .shop-card').filter({ hasText: 'Томаты' })).toHaveCount(
    1,
  );
  await page.locator('[data-tab="calendar"]').click();
  const types = await page.locator('#table-body .row-category').allTextContents();
  const firstAdditional = types.findIndex((type) => !type.startsWith('Ягоды'));
  expect(firstAdditional).toBeGreaterThan(0);
  expect(types.slice(0, firstAdditional).every((type) => type.startsWith('Ягоды'))).toBe(true);
  expect(types.slice(firstAdditional).every((type) => !type.startsWith('Ягоды'))).toBe(true);
});

test('Избранное сочетается с отделом и сезонным фильтром', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-panel="today"] [data-product-type="fruit"]').click();
  const card = page.locator('.shop-group[data-group="good"] .shop-card').first();
  await expect(card).toBeVisible();
  const favoriteId = await card.locator('[data-favorite]').getAttribute('data-favorite');
  await card.locator('[data-favorite]').click();
  await page.locator('[data-today-filter="good"]').click();
  await page.locator('#today-favorites').check();
  await expect(page.locator('.shop-card')).toHaveCount(1);
  await expect(page.locator('.shop-card [data-favorite]')).toHaveAttribute(
    'data-favorite',
    favoriteId,
  );
  await page.locator('[data-tab="calendar"]').click();
  await expect(page.locator('#favorites')).toBeChecked();
  await expect(page.locator('#table-body tr')).toHaveCount(1);
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
  await page.locator('#favorites').uncheck();
  await page.locator('[data-tab="today"]').click();
  await expect(page.locator(`#today-groups [data-favorite="${id}"]`)).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.locator(`#today-groups [data-favorite="${id}"]`).click();
  await page.reload();
  await page.locator('#today-favorites').check();
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
  await expect(page.locator('#calendar-filter-count')).toBeHidden();
  await page.locator('#known-only').check();
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

test('Сезонные группы единообразны, статусы и счётчики читаются в обеих темах', async ({
  page,
}) => {
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
          accent: getComputedStyle(group.querySelector('summary'), '::before').backgroundColor,
          contrast:
            (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
        };
      });
    });
    const visible = colors.filter(({ id }) => ids.includes(id));
    expect(visible.map(({ id }) => id)).toEqual(ids);
    expect(new Set(visible.map(({ wash }) => wash)).size).toBe(1);
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

test('Условия хранения и влажности видны вместе и меняются при нарезке', async ({ page }) => {
  await page.goto('/');
  await page.locator('#today-search').fill('морковь');
  await page.locator('.shop-card .why').first().click();
  await page.locator('[data-home-guide] > summary').click();
  const guide = page.locator('.storage-guide').first();
  await expect(guide).toContainText('горечь');
  const more = guide.locator('.storage-guide-more');
  await expect(more).toBeVisible();
  await expect(more.locator('summary')).toHaveCount(0);
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
  await expect(page.locator('.shop-card .shop-origin')).toHaveText('Перу · ещё 3 происхождения');
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
  await page.locator('#today-favorites').check();
  await expect(page.locator('.shop-card')).toHaveCount(1);
  await expect(page.locator('.shop-card h3')).toHaveText('Авокадо');
  const id = await page.locator('.shop-card [data-favorite]').getAttribute('data-favorite');
  expect(id).toMatch(/^product-/);
  await page.reload();
  await page.locator('#today-favorites').check();
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
