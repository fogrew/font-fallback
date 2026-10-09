import { expect, test } from '@playwright/test';
import type { runWorkerTask } from '../../src/common/lib';
import type { FontParser } from '../../src/modules/font-metrics';

declare global {
  interface Window {
    fontParser: FontParser;
    runWorkerTask: typeof runWorkerTask;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.fontParser);
});

test('bundled worker parses all formats, transfers buffers and keeps the main thread responsive', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const file of [
    'SourceSansPro-Regular.woff2',
    'SourceSansPro-Regular.woff',
    'SourceSansPro-Regular.otf',
    'FiraSans-Regular.ttf',
    'Mada-VF.ttf',
  ]) {
    const result = await page.evaluate(async (filename) => {
      const buffer = await (await fetch(`/fonts/${filename}`)).arrayBuffer();
      let ticks = 0;
      const timer = setInterval(() => ticks++, 2);
      const result = await window.fontParser.parse(buffer);
      clearInterval(timer);
      if (!result.ok) throw new Error(result.error.code);
      return {
        ticks,
        transferred: buffer.byteLength === 0,
        name: result.font.names.family,
        unitsPerEm: result.font.unitsPerEm,
        typedArrays:
          result.font.codePoints instanceof Uint32Array &&
          result.font.advances instanceof Float64Array,
        advanceA: result.font.advances[result.font.codePoints.indexOf(65)],
      };
    }, file);
    expect(result.ticks).toBeGreaterThanOrEqual(2);
    expect(result.transferred).toBe(true);
    expect(result.typedArrays).toBe(true);
    expect(result.unitsPerEm).toBe(1000);
    expect(result.advanceA).toBe(
      file.startsWith('Fira') ? 573 : file.startsWith('Mada') ? 553 : 544,
    );
  }
  expect(errors).toEqual([]);
});

test('recovers after corrupt input reaches the worker', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const corrupt = new ArrayBuffer(28);
    const view = new DataView(corrupt);
    view.setUint32(0, 0x00010000);
    view.setUint16(4, 1);
    view.setUint32(12, 0x68656164);
    view.setUint32(20, 28);
    const bad = await window.fontParser.parse(corrupt);
    const buffer = await (await fetch('/fonts/SourceSansPro-Regular.woff2')).arrayBuffer();
    const good = await window.fontParser.parse(buffer);
    return { bad, transferred: corrupt.byteLength === 0, good: good.ok };
  });
  expect(result.bad).toEqual({ ok: false, error: { code: 'invalid-font' } });
  expect(result.transferred).toBe(true);
  expect(result.good).toBe(true);
});

test('main-thread watchdog terminates an infinite loop in a real worker', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const url = URL.createObjectURL(
      new Blob(['onmessage = () => { while (true) {} };'], { type: 'text/javascript' }),
    );
    try {
      await window.runWorkerTask(() => new Worker(url), null, { timeoutMs: 100 });
      return 'unexpected-success';
    } catch (error) {
      return (error as { code: string }).code;
    } finally {
      URL.revokeObjectURL(url);
    }
  });
  expect(result).toBe('timeout');
});
