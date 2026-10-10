export type FitValue = { mode: 'auto' } | { mode: 'manual'; value: number };

export function pinFitValue(value: number): FitValue {
  if (!Number.isFinite(value)) throw new Error('Invalid fit value');
  return { mode: 'manual', value };
}

export function displayedFitValue(value: FitValue, autoValue: number): number {
  const result = value.mode === 'auto' ? autoValue : value.value;
  if (!Number.isFinite(result)) throw new Error('Invalid fit value');
  return result;
}
