export interface Dimension {
  key: string;
  value: number;
  min: number;
  max: number;
  step: number;
  pinned: boolean;
}

export interface OptimizeOptions {
  maxEvaluations: number;
  maxMs: number;
  minStepFraction?: number;
  regularization?: number;
  now?: () => number;
  signal?: AbortSignal | undefined;
  onProgress?: (evaluations: number, best: number) => void;
}

export interface OptimizeResult {
  values: Record<string, number>;
  score: number;
  startScore: number;
  evaluations: number;
  stoppedBy: 'converged' | 'evaluations' | 'time' | 'aborted';
}

const EPSILON = 1e-12;

export async function compassSearch(
  dimensions: readonly Dimension[],
  evaluate: (values: Record<string, number>) => Promise<number>,
  options: OptimizeOptions,
): Promise<OptimizeResult> {
  const now = options.now ?? (() => performance.now());
  const startedAt = now();
  const minFraction = options.minStepFraction ?? 1 / 16;
  const lambda = options.regularization ?? 1e-6;
  const start: Record<string, number> = Object.fromEntries(
    dimensions.map((dim) => [dim.key, Math.min(dim.max, Math.max(dim.min, dim.value))]),
  );
  const current = { ...start };
  const steps = Object.fromEntries(dimensions.map((dim) => [dim.key, dim.step]));
  const free = dimensions.filter((dim) => !dim.pinned && dim.max > dim.min && dim.step > 0);
  let evaluations = 0;

  const cost = async (values: Record<string, number>): Promise<number> => {
    evaluations += 1;
    const base = await evaluate({ ...values });
    let penalty = 0;
    for (const dim of free) {
      const range = dim.max - dim.min;
      penalty += (((values[dim.key] ?? 0) - (start[dim.key] ?? 0)) / range) ** 2;
    }
    return base + lambda * penalty;
  };

  const startScore = await cost(current);
  let best = startScore;
  options.onProgress?.(evaluations, best);
  let stoppedBy: OptimizeResult['stoppedBy'] = 'converged';

  const exhausted = (): OptimizeResult['stoppedBy'] | null => {
    if (options.signal?.aborted) return 'aborted';
    if (evaluations >= options.maxEvaluations) return 'evaluations';
    if (now() - startedAt >= options.maxMs) return 'time';
    return null;
  };

  search: while (free.length > 0) {
    let improved = false;
    for (const dim of free) {
      let bestCandidate: number | null = null;
      let bestCost = best;
      for (const direction of [1, -1]) {
        const stop = exhausted();
        if (stop) {
          stoppedBy = stop;
          break search;
        }
        const candidate = Math.min(
          dim.max,
          Math.max(dim.min, (current[dim.key] ?? 0) + direction * (steps[dim.key] ?? 0)),
        );
        if (Math.abs(candidate - (current[dim.key] ?? 0)) < EPSILON) continue;
        const next = await cost({ ...current, [dim.key]: candidate });
        if (next < bestCost - EPSILON) {
          bestCost = next;
          bestCandidate = candidate;
        }
      }
      if (bestCandidate !== null) {
        current[dim.key] = bestCandidate;
        best = bestCost;
        improved = true;
        options.onProgress?.(evaluations, best);
      }
    }
    if (!improved) {
      let shrunk = false;
      for (const dim of free) {
        const next = (steps[dim.key] ?? 0) / 2;
        if (next >= dim.step * minFraction) {
          steps[dim.key] = next;
          shrunk = true;
        }
      }
      if (!shrunk) break;
    }
  }

  return { values: current, score: best, startScore, evaluations, stoppedBy };
}
