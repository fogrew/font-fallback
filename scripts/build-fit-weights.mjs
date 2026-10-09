import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const [capsizeFile, corpusFile] = process.argv.slice(2);
if (!capsizeFile || !corpusFile)
  throw new Error('Expected Capsize unpack weightings module and Russian GSD train corpus paths');
const capsize = readFileSync(capsizeFile, 'utf8');
if (
  createHash('sha256').update(capsize).digest('hex') !==
  '5ca69373ed87a373946ac1c8a582f1a000c52c001bd4fc3319fce96d14ff7650'
)
  throw new Error('Unexpected Capsize unpack version');
const marker = 'var weightings_default = ';
if (!capsize.includes(marker)) throw new Error('Missing Capsize weightings');
const start = capsize.indexOf(marker) + marker.length;
const end = capsize.indexOf('\n};', start) + 2;
if (end <= start) throw new Error('Incomplete Capsize weightings');
const latin = JSON.parse(capsize.slice(start, end).replace(/([:\s])\.(\d)/g, '$10.$2')).latin;
const corpus = readFileSync(corpusFile, 'utf8');
const corpusSha256 = createHash('sha256').update(corpus).digest('hex');
if (corpusSha256 !== '0ae33a4bbda12697e2eb0a32af4971bda73af5852c8521744a974a316c02bab5')
  throw new Error('Unexpected Russian corpus version');
const counts = new Map();
let sentences = 0;
for (const line of corpus.split('\n')) {
  if (!line.startsWith('# text = ')) continue;
  sentences++;
  for (const char of line.slice('# text = '.length).trimEnd()) {
    if (!/[\u0400-\u04ff\u0020-\u0040\u005b-\u0060\u007b-\u007e]/u.test(char)) continue;
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }
}
const entries = (weights) =>
  Object.entries(weights)
    .map(([char, weight]) => ({ codePoint: char.codePointAt(0), weight }))
    .sort((a, b) => a.codePoint - b.codePoint);
const output = {
  en: entries(latin),
  ru: entries(Object.fromEntries(counts)),
};
writeFileSync(
  new URL('../src/modules/fallback-fit/lib/frequencies.json', import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(JSON.stringify({ sentences, corpusSha256 }));
