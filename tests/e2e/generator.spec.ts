import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const fonts = new URL('../fixtures/fonts/', import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  '$1',
);
const sourceSans = `${fonts}SourceSansPro-Regular.woff2`;

test('uploading a font produces ranked fallbacks, editable values and CSS', async ({ page }) => {
  await page.goto('/en/');
  await page.waitForFunction(() => document.querySelector('astro-island:not([ssr])'));
  await page.locator('input[type="file"]').setInputFiles(sourceSans);

  const fallback = page.getByLabel('Fallback font');
  await expect(fallback).toBeVisible();
  const code = page.getByRole('region', { name: 'Generated CSS' });
  await expect(code).toContainText('@font-face');
  await expect(code).toContainText('size-adjust');
  await expect(code).toContainText('"Source Sans Pro Fallback"');
  await expect(code).not.toContainText('font-family: font-family');

  const before = await code.textContent();
  await fallback.selectOption({ index: 2 });
  await expect(code).not.toHaveText(before ?? '');

  const size = page.getByRole('spinbutton', { name: /Size adjust/ });
  await size.fill('110');
  await size.press('Enter');
  await expect(code).toContainText('size-adjust: 110%');
  await expect(page.getByRole('checkbox', { name: 'Auto' }).first()).not.toBeChecked();

  await fallback.selectOption({ index: 0 });
  await expect(code).toContainText('size-adjust: 110%');
});

test('serif and monospace fallbacks are available by font type', async ({ page }) => {
  await page.goto('/en/');
  await page.waitForFunction(() => document.querySelector('astro-island:not([ssr])'));
  await page.locator('input[type="file"]').setInputFiles(sourceSans);
  await page.getByLabel('Font type').selectOption('serif');
  await expect(page.getByLabel('Fallback font')).toContainText('Times New Roman');
  await expect(page.getByRole('region', { name: 'Generated CSS' })).toContainText('serif;');
});

test('an invalid file is rejected with an announced error', async ({ page }) => {
  await page.goto('/en/');
  await page.waitForFunction(() => document.querySelector('astro-island:not([ssr])'));
  await page.locator('input[type="file"]').setInputFiles({
    name: 'broken.woff2',
    mimeType: 'font/woff2',
    buffer: Buffer.from('not a font at all, just text'),
  });
  await expect(page.getByRole('alert')).toContainText('broken.woff2');
});

for (const locale of ['en', 'ru']) {
  test(`${locale}: generator page has no detectable accessibility violations with a font loaded`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/`);
    await page.waitForFunction(() => document.querySelector('astro-island:not([ssr])'));
    await page.locator('input[type="file"]').setInputFiles(sourceSans);
    await expect(page.getByRole('heading', { level: 2 }).nth(3)).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

for (const { width, height } of [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  test(`${width}x${height}: settings and results fit the first viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/en/');
    await page.waitForFunction(() => document.querySelector('astro-island:not([ssr])'));
    await page.locator('input[type="file"]').setInputFiles(sourceSans);
    await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible();
    const sizes = await page.evaluate(() => ({
      page: [document.documentElement.scrollHeight, window.innerHeight],
      settings: document.querySelector('.ff-generator__settings')?.scrollHeight,
      settingsVisible: document.querySelector('.ff-generator__settings')?.clientHeight,
    }));
    expect(sizes.page[0]).toBeLessThanOrEqual(sizes.page[1] ?? 0);
    expect(sizes.settings).toBeLessThanOrEqual(sizes.settingsVisible ?? 0);
    const settings = await page.locator('.ff-generator__settings').boundingBox();
    const results = await page.locator('.ff-generator__results').boundingBox();
    expect(settings?.x).toBeLessThan(results?.x ?? 0);
  });
}

test('preview modes switch between side by side, overlay, web font and fallback', async ({
  page,
}) => {
  await page.goto('/en/');
  await page.waitForFunction(() => document.querySelector('astro-island:not([ssr])'));
  await page.locator('input[type="file"]').setInputFiles(sourceSans);
  const mode = page.getByLabel('View', { exact: true });
  const preview = page.getByRole('region', { name: 'Preview' });
  await expect(preview.getByRole('figure')).toHaveCount(2);

  await mode.selectOption('overlay');
  await expect(preview.getByRole('figure')).toHaveCount(1);
  await expect(preview).toContainText('outlined dotted text');
  await expect(preview.locator('[aria-hidden="true"].ff-preview__outline')).toHaveCount(1);

  await mode.selectOption('web');
  await expect(preview.getByRole('figure', { name: 'Web font' })).toHaveCount(1);
  await expect(preview.getByRole('figure', { name: 'Adjusted fallback' })).toHaveCount(0);
  await mode.selectOption('fallback');
  await expect(preview.getByRole('figure', { name: 'Adjusted fallback' })).toHaveCount(1);

  await preview.getByLabel(/Text size/).fill('48');
  await expect(preview.locator('.ff-preview__text').first()).toHaveCSS('font-size', '48px');
});

test('preview does not animate when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en/');
  await page.waitForFunction(() => document.querySelector('astro-island:not([ssr])'));
  await page.locator('input[type="file"]').setInputFiles(sourceSans);
  await expect(page.getByRole('figure').first()).toHaveCSS('transition-duration', '0s');
});

test('a tall preview keeps the CSS block reachable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/en/');
  await page.waitForFunction(() => document.querySelector('astro-island:not([ssr])'));
  await page.locator('input[type="file"]').setInputFiles(sourceSans);
  const preview = page.getByRole('region', { name: 'Preview' });
  await preview.getByLabel('Text size').fill('72');
  await preview.getByLabel('Line height').fill('2');
  await preview
    .getByLabel('Sample text')
    .fill('The quick brown fox jumps over the lazy dog '.repeat(4));
  const code = page.getByRole('region', { name: 'Generated CSS' });
  await code.scrollIntoViewIfNeeded();
  await expect(code).toBeInViewport();
  const box = await code.boundingBox();
  expect(box?.height).toBeGreaterThan(40);
});
