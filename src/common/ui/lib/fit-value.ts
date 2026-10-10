export type FitValue = { mode: 'auto' } | { mode: 'manual'; value: number };

export function pinFitValue(value: number): FitValue {
  if (!Number.isFinite(value)) throw new Error('Invalid fit value');
  return { mode: 'manual', value };
}

export interface FitBounds {
  min: number;
  max: number;
}

export function displayedFitValue(value: FitValue, autoValue: number, bounds?: FitBounds): number {
  const result = value.mode === 'auto' ? autoValue : value.value;
  if (!bounds) {
    if (!Number.isFinite(result)) throw new Error('Invalid fit value');
    return result;
  }
  return Number.isFinite(result) ? Math.min(bounds.max, Math.max(bounds.min, result)) : bounds.min;
}
