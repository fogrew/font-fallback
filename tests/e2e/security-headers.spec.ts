import { expect, test } from './fixtures';

test('pages carry the baseline security headers', async ({ page }) => {
  const response = await page.goto('/en/');
  const headers = response?.headers() ?? {};
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
  expect(headers['cross-origin-opener-policy']).toBe('same-origin');
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
});

test('the hashed CSP allows no unsafe sources', async ({ page }) => {
  await page.goto('/en/');
  const policy = await page
    .locator('meta[http-equiv="content-security-policy"]')
    .getAttribute('content');
  expect(policy).toContain("default-src 'self'");
  expect(policy).toMatch(/script-src[^;]*'sha256-/);
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("base-uri 'none'");
  expect(policy).not.toContain('unsafe-eval');
  expect(policy).not.toContain('unsafe-inline');
});

test('hashed build assets are cached immutably', async ({ page }) => {
  await page.goto('/en/');
  const src = await page.locator('script[src^="/_astro/"], link[href^="/_astro/"]').first();
  const url = (await src.getAttribute('src')) ?? (await src.getAttribute('href'));
  const cacheControl = await page.evaluate(
    async (assetUrl) => (await fetch(assetUrl)).headers.get('cache-control'),
    url ?? '',
  );
  expect(cacheControl).toContain('immutable');
});
