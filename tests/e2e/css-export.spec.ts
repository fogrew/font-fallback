import { expect, test } from '@playwright/test';
import { generateFallbackCss } from '../../src/modules/export';

const adjustment = {
  sizeAdjust: 1.071194,
  ascentOverride: 0.904365,
  descentOverride: 0.22518,
  lineGapOverride: 0,
};

test('generated font faces and family declaration retain all descriptors in browser CSSOM', async ({
  page,
}) => {
  const output = generateFallbackCss({
    targetFamily: 'Inter',
    fallbacks: [
      { family: 'Inter Fallback: Arial', localNames: ['Arial', 'ArialMT'], adjustment },
      { family: 'Inter Fallback: Helvetica', localNames: ['Helvetica'], adjustment },
    ],
    genericFamily: 'sans-serif',
  });
  const parsed = await page.evaluate(({ fontFaces, fontFamily }) => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`${fontFaces}\n.example { ${fontFamily} }`);
    return [...sheet.cssRules].map((rule) => {
      const style = (rule as CSSFontFaceRule | CSSStyleRule).style;
      return {
        isFontFace: rule instanceof CSSFontFaceRule,
        family: style.getPropertyValue('font-family'),
        src: style.getPropertyValue('src'),
        size: style.getPropertyValue('size-adjust'),
        ascent: style.getPropertyValue('ascent-override'),
        descent: style.getPropertyValue('descent-override'),
        gap: style.getPropertyValue('line-gap-override'),
        length: style.length,
      };
    });
  }, output);
  expect(parsed).toHaveLength(3);
  expect(parsed.slice(0, 2)).toEqual([
    {
      isFontFace: true,
      family: '"Inter Fallback: Arial"',
      src: 'local("Arial"), local("ArialMT")',
      size: '107.119%',
      ascent: '90.4365%',
      descent: '22.518%',
      gap: '0%',
      length: 6,
    },
    {
      isFontFace: true,
      family: '"Inter Fallback: Helvetica"',
      src: 'local("Helvetica")',
      size: '107.119%',
      ascent: '90.4365%',
      descent: '22.518%',
      gap: '0%',
      length: 6,
    },
  ]);
  expect(parsed[2]?.family).toBe(
    'Inter, "Inter Fallback: Arial", "Inter Fallback: Helvetica", sans-serif',
  );
});

test('font names cannot inject CSS rules or terminate an HTML style element', async ({ page }) => {
  const hostile =
    'A"; } @import url(https://invalid.example/); /*\\\n</style><script>window.injected = true</script>';
  const output = generateFallbackCss({
    targetFamily: hostile,
    fallbacks: [{ family: 'Safe Alias', localNames: [hostile], adjustment }],
    genericFamily: 'serif',
  });
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.setContent(
    `<style>${output.fontFaces}\n.example { ${output.fontFamily} }</style><div class="example">Test</div>`,
  );
  const result = await page.evaluate(() => ({
    scripts: document.scripts.length,
    rules: document.styleSheets[0]?.cssRules.length,
    family: getComputedStyle(document.querySelector('.example') as Element).fontFamily,
  }));
  expect(result.scripts).toBe(0);
  expect(result.rules).toBe(2);
  expect(result.family).toContain('invalid.example');
  expect(requests).toEqual([]);
});
