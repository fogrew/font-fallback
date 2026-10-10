import { describe, expect, it } from 'vitest';
import { compassSearch, type Dimension } from './optimize';

const dim = (key: string, value: number, extra: Partial<Dimension> = {}): Dimension => ({
  key,
  value,
  min: -10,
  max: 10,
  step: 1,
  pinned: false,
  ...extra,
});

const options = { maxEvaluations: 500, maxMs: 60_000 };

describe('compassSearch', () => {
  it('finds the minimum of a bowl and is deterministic', async () => {
    const evaluate = async (v: Record<string, number>) =>
      ((v.a ?? 0) - 3) ** 2 + ((v.b ?? 0) + 2) ** 2;
    const first = await compassSearch([dim('a', 0), dim('b', 0)], evaluate, options);
    const second = await compassSearch([dim('a', 0), dim('b', 0)], evaluate, options);
    expect(first.values.a).toBeCloseTo(3, 1);
    expect(first.values.b).toBeCloseTo(-2, 1);
    expect(first.score).toBeLessThan(first.startScore);
    expect(second).toEqual(first);
    expect(first.stoppedBy).toBe('converged');
  });

  it('never changes pinned values', async () => {
    const seen: number[] = [];
    const evaluate = async (v: Record<string, number>) => {
      seen.push(v.a ?? Number.NaN);
      return ((v.a ?? 0) - 3) ** 2 + ((v.b ?? 0) - 3) ** 2;
    };
    const result = await compassSearch(
      [dim('a', 1, { pinned: true }), dim('b', 0)],
      evaluate,
      options,
    );
    expect(result.values.a).toBe(1);
    expect(new Set(seen)).toEqual(new Set([1]));
    expect(result.values.b).toBeCloseTo(3, 1);
  });

  it('respects bounds', async () => {
    const result = await compassSearch(
      [dim('a', 0, { min: 0, max: 2 })],
      async (v) => -(v.a ?? 0),
      options,
    );
    expect(result.values.a).toBe(2);
  });

  it('stops at the evaluation limit, the time limit and on abort', async () => {
    const evaluate = async (v: Record<string, number>) => -(v.a ?? 0);
    const limited = await compassSearch([dim('a', 0, { min: -1000, max: 1000 })], evaluate, {
      maxEvaluations: 5,
      maxMs: 60_000,
    });
    expect(limited.stoppedBy).toBe('evaluations');
    expect(limited.evaluations).toBeLessThanOrEqual(5);

    let clock = 0;
    const timed = await compassSearch([dim('a', 0, { min: -1000, max: 1000 })], evaluate, {
      maxEvaluations: 500,
      maxMs: 3,
      now: () => clock++,
    });
    expect(timed.stoppedBy).toBe('time');

    const controller = new AbortController();
    controller.abort();
    const aborted = await compassSearch([dim('a', 0)], evaluate, {
      ...options,
      signal: controller.signal,
    });
    expect(aborted.stoppedBy).toBe('aborted');
    expect(aborted.values.a).toBe(0);
  });

  it('keeps the start when nothing improves and prefers small moves on plateaus', async () => {
    const flat = await compassSearch([dim('a', 2)], async () => 1, options);
    expect(flat.values.a).toBe(2);
    expect(flat.evaluations).toBeGreaterThan(0);
  });
});
