export interface StackFace {
  id: string;
  availableOn: readonly string[];
}

export interface StackPreference {
  platform: string;
  preferredFace: string;
}

export interface PlatformResolution extends StackPreference {
  winner: string | null;
  status: 'matched' | 'shadowed' | 'unavailable';
}

export interface StackResolution {
  platforms: PlatformResolution[];
  suggestion: { order: string[]; adjacentSwaps: number } | null;
  blockedBy: 'unavailable' | 'cycle' | null;
}

export class StackResolveError extends Error {
  constructor(public readonly code: 'invalid-stack' | 'invalid-preference' | 'too-large') {
    super(code);
    this.name = 'StackResolveError';
  }
}
