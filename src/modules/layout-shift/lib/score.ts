export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
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

export interface ShiftInput {
  before: Box;
  after: Box;
}

export interface ShiftScore {
  score: number;
  impactFraction: number;
  distanceFraction: number;
  shifted: number;
}

export const MIN_SHIFT_PX = 0.5;
export const MAX_ELEMENTS = 1000;

function clip(box: Box, viewport: Viewport): Box | null {
  const left = Math.max(0, box.x);
  const top = Math.max(0, box.y);
  const right = Math.min(viewport.width, box.x + box.width);
  const bottom = Math.min(viewport.height, box.y + box.height);
  return right > left && bottom > top
    ? { x: left, y: top, width: right - left, height: bottom - top }
    : null;
}

export function unionArea(boxes: readonly Box[]): number {
  if (boxes.length === 0) return 0;
  const xs = [...new Set(boxes.flatMap((box) => [box.x, box.x + box.width]))].sort((a, b) => a - b);
  let area = 0;
  for (let index = 0; index + 1 < xs.length; index++) {
    const left = xs[index] ?? 0;
    const right = xs[index + 1] ?? 0;
    const spans = boxes
      .filter((box) => box.x <= left && box.x + box.width >= right)
      .map((box) => [box.y, box.y + box.height] as const)
      .sort((a, b) => a[0] - b[0]);
    let covered = 0;
    let end = Number.NEGATIVE_INFINITY;
    for (const [from, to] of spans) {
      const start = Math.max(from, end);
      if (to > start) covered += to - start;
      end = Math.max(end, to);
    }
    area += covered * (right - left);
  }
  return area;
}

export function layoutShiftScore(items: readonly ShiftInput[], viewport: Viewport): ShiftScore {
  if (
    !(viewport.width > 0) ||
    !(viewport.height > 0) ||
    !Number.isFinite(viewport.width) ||
    !Number.isFinite(viewport.height) ||
    items.length > MAX_ELEMENTS
  ) {
    throw new RangeError('Invalid layout shift input');
  }
  const regions: Box[] = [];
  let distance = 0;
  let shifted = 0;
  for (const { before, after } of items) {
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    if (Math.abs(dx) < MIN_SHIFT_PX && Math.abs(dy) < MIN_SHIFT_PX) continue;
    const start = clip(before, viewport);
    const end = clip(after, viewport);
    if (!start && !end) continue;
    shifted += 1;
    if (start) regions.push(start);
    if (end) regions.push(end);
    distance = Math.max(distance, Math.abs(dx), Math.abs(dy));
  }
  const viewportArea = viewport.width * viewport.height;
  const impactFraction = unionArea(regions) / viewportArea;
  const distanceFraction = Math.min(distance / Math.max(viewport.width, viewport.height), 1);
  return { score: impactFraction * distanceFraction, impactFraction, distanceFraction, shifted };
}
