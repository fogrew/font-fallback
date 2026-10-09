import {
  type PlatformResolution,
  type StackFace,
  type StackPreference,
  type StackResolution,
  StackResolveError,
} from './stack-model';

const validKey = (key: string) =>
  typeof key === 'string' &&
  key.length > 0 &&
  key.length <= 128 &&
  key.trim() === key &&
  [...key].every((char) => char.charCodeAt(0) >= 0x20 && char.charCodeAt(0) !== 0x7f) &&
  key.isWellFormed();

export function resolveStack(
  faces: readonly StackFace[],
  preferences: readonly StackPreference[],
): StackResolution {
  if (faces.length > 16 || preferences.length > 128) throw new StackResolveError('too-large');
  const indices = new Map<string, number>();
  const availability: Set<string>[] = [];
  for (const [index, face] of faces.entries()) {
    if (!validKey(face.id) || indices.has(face.id)) throw new StackResolveError('invalid-stack');
    if (face.availableOn.length > 128) throw new StackResolveError('too-large');
    if (
      !face.availableOn.every(validKey) ||
      new Set(face.availableOn).size !== face.availableOn.length
    )
      throw new StackResolveError('invalid-stack');
    indices.set(face.id, index);
    availability.push(new Set(face.availableOn));
  }
  const seenPlatforms = new Set<string>();
  const predecessors = new Uint16Array(faces.length);
  const platforms: PlatformResolution[] = [];
  for (const preference of preferences) {
    const preferredIndex = indices.get(preference.preferredFace);
    if (
      !validKey(preference.platform) ||
      preferredIndex === undefined ||
      seenPlatforms.has(preference.platform)
    )
      throw new StackResolveError('invalid-preference');
    seenPlatforms.add(preference.platform);
    const winnerIndex = availability.findIndex((platforms) => platforms.has(preference.platform));
    const winner = faces[winnerIndex]?.id ?? null;
    const preferredAvailable = availability[preferredIndex]?.has(preference.platform) ?? false;
    platforms.push({
      ...preference,
      winner,
      status: !preferredAvailable
        ? 'unavailable'
        : winner === preference.preferredFace
          ? 'matched'
          : 'shadowed',
    });
    if (!preferredAvailable) continue;
    for (const [index, platforms] of availability.entries()) {
      if (index !== preferredIndex && platforms.has(preference.platform))
        predecessors[index] = (predecessors[index] ?? 0) | (1 << preferredIndex);
    }
  }
  if (platforms.some(({ status }) => status === 'unavailable'))
    return { platforms, suggestion: null, blockedBy: 'unavailable' };
  if (platforms.every(({ status }) => status === 'matched'))
    return { platforms, suggestion: null, blockedBy: null };
  const suggestion = nearestOrder(faces, predecessors);
  return { platforms, suggestion, blockedBy: suggestion ? null : 'cycle' };
}

function nearestOrder(
  faces: readonly StackFace[],
  predecessors: Uint16Array,
): StackResolution['suggestion'] {
  const all = (1 << faces.length) - 1;
  const impossible = 32767;
  const costs = new Int16Array(all + 1).fill(-1);
  const counts = new Uint8Array(all + 1);
  for (let mask = 1; mask <= all; mask++) counts[mask] = (counts[mask >> 1] ?? 0) + (mask & 1);
  costs[all] = 0;
  const cost = (placed: number): number => {
    const cached = costs[placed] ?? -1;
    if (cached >= 0) return cached;
    let best = impossible;
    for (let index = 0; index < faces.length; index++) {
      const bit = 1 << index;
      const required = predecessors[index] ?? 0;
      if ((placed & bit) !== 0 || (placed & required) !== required) continue;
      const remaining = cost(placed | bit);
      if (remaining === impossible) continue;
      best = Math.min(best, remaining + (counts[placed >> (index + 1)] ?? 0));
    }
    costs[placed] = best;
    return best;
  };
  const adjacentSwaps = cost(0);
  if (adjacentSwaps === impossible) return null;
  const order: string[] = [];
  let placed = 0;
  while (placed !== all) {
    for (const [index, face] of faces.entries()) {
      const bit = 1 << index;
      const required = predecessors[index] ?? 0;
      if ((placed & bit) !== 0 || (placed & required) !== required) continue;
      if (cost(placed | bit) + (counts[placed >> (index + 1)] ?? 0) !== cost(placed)) continue;
      order.push(face.id);
      placed |= bit;
      break;
    }
  }
  return { order, adjacentSwaps };
}
