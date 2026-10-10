export const PRESETS = [
  { id: 'widely', query: 'baseline widely available', label: 'audience_preset_widely' },
  { id: 'newly', query: 'baseline newly available', label: 'audience_preset_newly' },
  { id: 'baseline2023', query: 'baseline 2023', label: 'audience_preset_baseline2023' },
  { id: 'usage', query: '> 0.5%, last 2 versions', label: 'audience_preset_usage' },
  { id: 'defaults', query: 'defaults', label: 'audience_preset_defaults' },
  {
    id: 'desktop',
    query:
      'baseline widely available and not ios_saf > 0 and not android > 0 and not and_chr > 0 and not and_ff > 0 and not samsung > 0 and not op_mob > 0',
    label: 'audience_preset_desktop',
  },
  {
    id: 'mobile',
    query:
      'last 2 ios_saf versions, last 2 and_chr versions, last 2 and_ff versions, last 2 samsung versions, last 2 android versions',
    label: 'audience_preset_mobile',
  },
] as const;

export const MY_STATS_PRESET = {
  id: 'mystats',
  query: '> 0.5% in my stats',
  label: 'audience_preset_mystats',
} as const;

export const DEFAULT_QUERY = PRESETS[0].query;

export function presetFor(query: string, withStats = false) {
  const normalized = query.trim().replace(/\s+/g, ' ');
  return [...PRESETS, ...(withStats ? [MY_STATS_PRESET] : [])].find(
    (preset) => preset.query === normalized,
  );
}
