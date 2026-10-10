import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const violations: string[] = [];
      (window as unknown as { __csp: string[] }).__csp = violations;
      document.addEventListener('securitypolicyviolation', (event) => {
        violations.push(
          `${event.violatedDirective}: ${event.blockedURI} ${event.sourceFile}:${event.lineNumber}`,
        );
      });
    });
    await use(page);
    const violations = await page
      .evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])
      .catch(() => []);
    expect(violations).toEqual([]);
  },
});

export { expect };
