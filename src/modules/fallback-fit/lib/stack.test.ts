import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { resolveStack, type StackFace, type StackPreference } from '../index';

const faces: StackFace[] = [
  { id: 'arial', availableOn: ['windows:11', 'macos:15'] },
  { id: 'helvetica', availableOn: ['macos:15'] },
  { id: 'liberation', availableOn: ['linux:ubuntu-24'] },
];

describe('fallback stack resolution', () => {
  it('detects a cross-platform shadow and proposes the smallest correction', () => {
    expect(
      resolveStack(faces, [
        { platform: 'windows:11', preferredFace: 'arial' },
        { platform: 'macos:15', preferredFace: 'helvetica' },
        { platform: 'linux:ubuntu-24', preferredFace: 'liberation' },
      ]),
    ).toEqual({
      platforms: [
        { platform: 'windows:11', preferredFace: 'arial', winner: 'arial', status: 'matched' },
        { platform: 'macos:15', preferredFace: 'helvetica', winner: 'arial', status: 'shadowed' },
        {
          platform: 'linux:ubuntu-24',
          preferredFace: 'liberation',
          winner: 'liberation',
          status: 'matched',
        },
      ],
      suggestion: { order: ['helvetica', 'arial', 'liberation'], adjacentSwaps: 1 },
      blockedBy: null,
    });
  });

  it('leaves a matching order alone', () => {
    expect(
      resolveStack(faces, [{ platform: 'windows:11', preferredFace: 'arial' }]).suggestion,
    ).toBeNull();
  });

  it('chooses the lexicographically earliest original-index order on a minimum-cost tie', () => {
    const sample = [
      { id: '0', availableOn: ['p'] },
      { id: '1', availableOn: [] },
      { id: '2', availableOn: ['p'] },
    ];
    expect(resolveStack(sample, [{ platform: 'p', preferredFace: '2' }]).suggestion).toEqual({
      order: ['1', '2', '0'],
      adjacentSwaps: 2,
    });
  });

  it('supports the bounded maximum stack without a greedy approximation', () => {
    const sample = Array.from({ length: 16 }, (_, index) => ({
      id: String(index),
      availableOn: ['p'],
    }));
    expect(resolveStack(sample, [{ platform: 'p', preferredFace: '15' }]).suggestion).toEqual({
      order: ['15', ...sample.slice(0, 15).map(({ id }) => id)],
      adjacentSwaps: 15,
    });
  });

  it('reports an unavailable preference without hiding the actual winner', () => {
    expect(resolveStack(faces, [{ platform: 'windows:11', preferredFace: 'helvetica' }])).toEqual({
      platforms: [
        {
          platform: 'windows:11',
          preferredFace: 'helvetica',
          winner: 'arial',
          status: 'unavailable',
        },
      ],
      suggestion: null,
      blockedBy: 'unavailable',
    });
    expect(
      resolveStack(faces, [{ platform: 'unknown', preferredFace: 'arial' }]).platforms[0]?.winner,
    ).toBeNull();
  });

  it('reports incompatible platform preferences rather than fabricating a fix', () => {
    const crossAvailable = faces.map((face) => ({
      ...face,
      availableOn: ['windows:11', 'macos:15'],
    }));
    expect(
      resolveStack(crossAvailable, [
        { platform: 'windows:11', preferredFace: 'arial' },
        { platform: 'macos:15', preferredFace: 'helvetica' },
      ]).blockedBy,
    ).toBe('cycle');
  });

  it('rejects duplicate/unknown identifiers, duplicate platforms and resource excess', () => {
    expect(() => resolveStack([faces[0], faces[0]] as StackFace[], [])).toThrow('invalid-stack');
    expect(() =>
      resolveStack(faces, [{ platform: 'windows:11', preferredFace: 'absent' }]),
    ).toThrow('invalid-preference');
    const preference = { platform: 'windows:11', preferredFace: 'arial' };
    expect(() => resolveStack(faces, [preference, preference])).toThrow('invalid-preference');
    expect(() =>
      resolveStack(
        Array.from({ length: 17 }, (_, index) => ({ id: String(index), availableOn: [] })),
        [],
      ),
    ).toThrow('too-large');
    expect(() => resolveStack([{ id: '', availableOn: [] }], [])).toThrow('invalid-stack');
  });

  it('treats platform/version keys as exact opaque identifiers', () => {
    expect(
      resolveStack(faces, [{ platform: 'Windows:11', preferredFace: 'arial' }]).blockedBy,
    ).toBe('unavailable');
  });

  it('agrees with a permutation oracle on minimum swaps and deterministic ties', () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(fc.boolean(), { minLength: 3, maxLength: 3 }), {
          minLength: 5,
          maxLength: 5,
        }),
        fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 3, maxLength: 3 }),
        (availability, preferences) => {
          const sample: StackFace[] = availability.map((available, index) => ({
            id: String(index),
            availableOn: available.flatMap((present, platform) =>
              present ? [String(platform)] : [],
            ),
          }));
          const requests: StackPreference[] = preferences.map((preferred, platform) => ({
            platform: String(platform),
            preferredFace: String(preferred),
          }));
          const result = resolveStack(sample, requests);
          const permutations = permute(sample);
          const valid = permutations.filter((order) =>
            requests.every(
              ({ platform, preferredFace }) =>
                order.find((face) => face.availableOn.includes(platform))?.id === preferredFace,
            ),
          );
          valid.sort((a, b) => inversions(a) - inversions(b) || compare(a, b));
          const best = valid[0];
          if (!best) {
            expect(result.suggestion).toBeNull();
            expect(result.blockedBy).not.toBeNull();
          } else {
            const originalWorks = requests.every(
              ({ platform, preferredFace }) =>
                sample.find((face) => face.availableOn.includes(platform))?.id === preferredFace,
            );
            expect(result.blockedBy).toBeNull();
            if (originalWorks) expect(result.suggestion).toBeNull();
            else
              expect(result.suggestion).toEqual({
                order: best.map(({ id }) => id),
                adjacentSwaps: inversions(best),
              });
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

function permute<T>(items: T[]): T[][] {
  if (items.length === 0) return [[]];
  return items.flatMap((item, index) =>
    permute(items.filter((_, other) => other !== index)).map((rest) => [item, ...rest]),
  );
}

function inversions(order: StackFace[]): number {
  let total = 0;
  for (const [index, face] of order.entries()) {
    for (const later of order.slice(index + 1)) if (Number(face.id) > Number(later.id)) total++;
  }
  return total;
}

function compare(a: StackFace[], b: StackFace[]): number {
  for (const [index, face] of a.entries()) {
    const other = b[index];
    if (other && face.id !== other.id) return Number(face.id) - Number(other.id);
  }
  return 0;
}
