import { type SampleLanguage, samples } from './samples';
import { type Box, layoutShiftScore, MAX_ELEMENTS, type Viewport } from './score';

export const WEB_FAMILY = 'ff-sim-web';
const MISSING_FAMILY = 'ff-sim-missing';
const MEASURED = 'h1,h2,h3,p,li,button,blockquote';
const MAX_FRAME_PX = 4096;

export const DEFAULT_VIEWPORTS: readonly Viewport[] = [
  { width: 360, height: 640 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
];

export interface SimulationInput {
  webBytes: ArrayBuffer;
  fallbackFontFaces: string;
  fallbackFamilies: readonly string[];
  generic: string;
  language: SampleLanguage;
  viewports: readonly Viewport[];
  signal?: AbortSignal;
}

export interface ViewportResult {
  viewport: Viewport;
  score: number;
  impactFraction: number;
  distanceFraction: number;
  shiftedElements: number;
  linesBefore: number;
  linesAfter: number;
  heightBefore: number;
  heightAfter: number;
  lineBreakMismatches: number;
}

interface Snapshot {
  boxes: Box[];
  lines: number[];
  height: number;
}

const quote = (name: string) => `"${name.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

export function buildStylesheet(
  input: Pick<SimulationInput, 'fallbackFontFaces' | 'fallbackFamilies' | 'generic'>,
) {
  const tail = [...input.fallbackFamilies.map(quote), input.generic].join(', ');
  return `${input.fallbackFontFaces}
html, body { margin: 0; padding: 0; }
body { padding: 16px; font-size: 16px; line-height: normal; }
h1 { font-size: 32px; margin: 0 0 12px; }
h2 { font-size: 24px; margin: 20px 0 8px; }
h3 { font-size: 19px; margin: 16px 0 6px; }
p, li, blockquote { margin: 0 0 12px; }
button { font: inherit; padding: 8px 14px; margin: 0 8px 8px 0; }
ul { margin: 0 0 12px; padding-left: 24px; }
body.sim-a, body.sim-a * { font-family: ${quote(MISSING_FAMILY)}, ${tail}; }
body.sim-b, body.sim-b * { font-family: ${quote(WEB_FAMILY)}, ${tail}; }`;
}

function lineCount(element: Element): number {
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(element);
  const tops = new Set<number>();
  for (const rect of range.getClientRects()) {
    if (rect.width > 0) tops.add(Math.round(rect.top / 4));
  }
  return tops.size;
}

function snapshot(root: Element): Snapshot {
  const elements = [...root.querySelectorAll(MEASURED)].slice(0, MAX_ELEMENTS);
  return {
    boxes: elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
    lines: elements.map(lineCount),
    height: root.ownerDocument.documentElement.scrollHeight,
  };
}

function buildSample(doc: Document, language: SampleLanguage) {
  const sample = samples[language];
  const add = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    text: string,
    parent: Element = doc.body,
  ) => {
    const element = doc.createElement(tag);
    element.textContent = text;
    parent.append(element);
    return element;
  };
  add('h1', sample.title);
  add('p', sample.intro);
  add('h2', sample.heading);
  for (const paragraph of sample.paragraphs) add('p', paragraph);
  const list = doc.createElement('ul');
  for (const item of sample.items) add('li', item, list);
  doc.body.append(list);
  add('h3', sample.subheading);
  add('blockquote', sample.quote);
  for (const label of sample.buttons) add('button', label);
}

function waitForFrame(frame: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    if (frame.contentDocument?.readyState === 'complete' && frame.contentDocument.body)
      return resolve();
    frame.addEventListener('load', () => resolve(), { once: true });
  });
}

async function nextFrame(window: Window): Promise<void> {
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

export async function simulateLayoutShift(input: SimulationInput): Promise<ViewportResult[]> {
  const results: ViewportResult[] = [];
  for (const viewport of input.viewports) {
    if (
      !(viewport.width >= 200) ||
      !(viewport.height >= 200) ||
      viewport.width > MAX_FRAME_PX ||
      viewport.height > MAX_FRAME_PX
    ) {
      throw new RangeError('Invalid viewport');
    }
    if (input.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.srcdoc = '<!doctype html><html><head><title></title></head><body></body></html>';
    frame.style.position = 'fixed';
    frame.style.left = '-10000px';
    frame.style.top = '0';
    frame.style.border = '0';
    frame.style.visibility = 'hidden';
    frame.style.width = `${viewport.width}px`;
    frame.style.height = `${viewport.height}px`;
    document.body.append(frame);
    try {
      await waitForFrame(frame);
      const view = frame.contentWindow;
      const doc = frame.contentDocument;
      if (!view || !doc) throw new Error('Simulation frame is unavailable');
      const sheet = new (
        view as unknown as { CSSStyleSheet: typeof CSSStyleSheet }
      ).CSSStyleSheet();
      sheet.replaceSync(buildStylesheet(input));
      doc.adoptedStyleSheets = [sheet];
      buildSample(doc, input.language);
      const web = new (view as unknown as { FontFace: typeof FontFace }).FontFace(
        WEB_FAMILY,
        input.webBytes.slice(0),
      );
      await web.load();
      doc.fonts.add(web);

      doc.body.className = 'sim-a';
      await Promise.all(
        input.fallbackFamilies.map((name) => doc.fonts.load(`16px ${quote(name)}`).catch(() => [])),
      );
      await doc.fonts.ready;
      await nextFrame(view);
      const before = snapshot(doc.body);

      doc.body.className = 'sim-b';
      await doc.fonts.load(`16px ${quote(WEB_FAMILY)}`);
      await doc.fonts.ready;
      await nextFrame(view);
      const after = snapshot(doc.body);

      const count = Math.min(before.boxes.length, after.boxes.length);
      const items = Array.from({ length: count }, (_, index) => ({
        before: before.boxes[index] as Box,
        after: after.boxes[index] as Box,
      }));
      const shift = layoutShiftScore(items, viewport);
      const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
      results.push({
        viewport,
        score: shift.score,
        impactFraction: shift.impactFraction,
        distanceFraction: shift.distanceFraction,
        shiftedElements: shift.shifted,
        linesBefore: sum(before.lines),
        linesAfter: sum(after.lines),
        heightBefore: before.height,
        heightAfter: after.height,
        lineBreakMismatches: before.lines.filter(
          (lines, index) => lines !== (after.lines[index] ?? lines),
        ).length,
      });
    } finally {
      frame.remove();
    }
  }
  return results;
}

export type Rating = 'good' | 'needs-improvement' | 'poor';

export function ratingOf(score: number): Rating {
  if (score <= 0.1) return 'good';
  return score <= 0.25 ? 'needs-improvement' : 'poor';
}
