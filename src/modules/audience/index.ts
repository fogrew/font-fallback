export type { WeightedEntry } from './lib/os';
export { DEFAULT_DESKTOP_SPLIT, type OsShares } from './lib/os';
export { PRESETS } from './lib/presets';
export { type BrowserGroup, type Resolution, resolveQuery } from './lib/resolve';
export { importStats, parseStats, type UsageStats } from './lib/stats';
export {
  descriptorSupport,
  type FeatureSupport,
  lacksVerticalOverrides,
  VERTICAL_THRESHOLD,
} from './lib/support';
export { AudienceEditor } from './ui/AudienceEditor';
export { SupportMatrix } from './ui/SupportMatrix';
