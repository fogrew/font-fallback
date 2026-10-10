import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const bcd = require('@mdn/browser-compat-data');

const out = fileURLToPath(
  new URL('../../src/modules/audience/data/descriptor-support.json', import.meta.url),
);

const BROWSERS: Record<string, string> = {
  chrome: 'chrome',
  edge: 'edge',
  firefox: 'firefox',
  safari: 'safari',
  opera: 'opera',
  ie: 'ie',
  chrome_android: 'and_chr',
  firefox_android: 'and_ff',
  safari_ios: 'ios_saf',
  samsunginternet_android: 'samsung',
  webview_android: 'android',
  opera_android: 'op_mob',
};

const FEATURES: Record<string, () => { __compat: { support: Record<string, unknown> } }> = {
  'size-adjust': () => bcd.css['at-rules']['font-face']['size-adjust'],
  'ascent-override': () => bcd.css['at-rules']['font-face']['ascent-override'],
  'descent-override': () => bcd.css['at-rules']['font-face']['descent-override'],
  'line-gap-override': () => bcd.css['at-rules']['font-face']['line-gap-override'],
  'font-size-adjust': () => bcd.css.properties['font-size-adjust'],
  'unicode-range': () => bcd.css['at-rules']['font-face']['unicode-range'],
};

interface Statement {
  version_added?: string | boolean | null;
  flags?: unknown[];
  prefix?: string;
  alternative_name?: string;
  partial_implementation?: boolean;
  version_removed?: string | boolean;
}

function earliest(support: unknown): string | false | null {
  const statements = (Array.isArray(support) ? support : [support]) as Statement[];
  let best: string | false = false;
  let unknown = false;
  for (const statement of statements) {
    if (
      statement.flags ||
      statement.prefix ||
      statement.alternative_name ||
      statement.version_removed
    ) {
      continue;
    }
    const added = statement.version_added;
    if (added === true || added === null || added === undefined) {
      unknown = true;
      continue;
    }
    if (typeof added !== 'string' || !/^≤?\d+(\.\d+)*$/.test(added)) continue;
    const clean = added.replace('≤', '');
    if (best === false || compare(clean, best) < 0) best = clean;
  }
  return best === false && unknown ? null : best;
}

function compare(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

const features: Record<string, Record<string, string | false | null>> = {};
for (const [name, read] of Object.entries(FEATURES)) {
  const support = read().__compat.support;
  const row: Record<string, string | false | null> = {};
  for (const [source, target] of Object.entries(BROWSERS)) {
    row[target] = earliest(support[source]);
  }
  features[name] = row;
}

const data = { schema: 1, bcdVersion: bcd.__meta.version, features };
writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`);
console.log(`wrote ${Object.keys(features).length} features from BCD ${bcd.__meta.version}`);
