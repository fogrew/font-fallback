import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { type Locale, messagesFor } from '@/common/i18n';
import { Button, CodeBlock, FitField, type FitValue, LiveRegion, Select } from '@/common/ui';
import { AudienceEditor, type OsShares } from '@/modules/audience';
import { CssExportError } from '@/modules/export';
import {
  createFontParser,
  type FontMetrics,
  type FontParser,
  MAX_FONT_BYTES,
} from '@/modules/font-metrics';
import type { Category, OsId } from '@/modules/os-fonts';
import { isNoCoverage, LOW_COVERAGE, sampleText } from '../lib/compute';
import { adjustmentOf, buildCss, type Overrides } from '../lib/css';
import {
  type Candidate,
  type Language,
  planStack,
  type Ranking,
  rankFor,
  systemsWithFonts,
} from '../lib/per-os';
import { FontUpload } from './FontUpload';
import { Preview } from './Preview';
import './generator.css';

interface LoadedFont {
  id: number;
  fileName: string;
  metrics: FontMetrics;
  bytes: ArrayBuffer;
}

const MAX_FONTS = 8;
const MIN_SHARE = 1;
const ALL_SYSTEMS = ['windows', 'macos', 'ios', 'android', 'linux', 'chromeos'] as const;

type Field = keyof Overrides;
type Values = Record<Field, FitValue>;

const FIELDS = [
  { key: 'sizeAdjust', label: 'fit_size_label', min: 25, max: 400 },
  { key: 'ascentOverride', label: 'fit_ascent_label', min: 0, max: 400 },
  { key: 'descentOverride', label: 'fit_descent_label', min: 0, max: 400 },
  { key: 'lineGapOverride', label: 'fit_line_gap_label', min: 0, max: 400 },
] as const;

const AUTO: Values = {
  sizeAdjust: { mode: 'auto' },
  ascentOverride: { mode: 'auto' },
  descentOverride: { mode: 'auto' },
  lineGapOverride: { mode: 'auto' },
};

export function GeneratorApp({ locale }: { locale: Locale }) {
  const t = messagesFor(locale);
  const errors: Record<string, string> = {
    'too-large': t.error_too_large(),
    'invalid-font': t.error_invalid_font(),
    'unsupported-format': t.error_unsupported_format(),
    timeout: t.error_timeout(),
    'worker-error': t.error_worker_error(),
    busy: t.error_busy(),
    disposed: t.error_disposed(),
  };
  const parser = useRef<FontParser>();
  const nextId = useRef(1);
  const [fonts, setFonts] = useState<LoadedFont[]>([]);
  const [selectedId, setSelectedId] = useState<number>();
  const [kind, setKind] = useState<Category>('sans-serif');
  const [language, setLanguage] = useState<Language>('en');
  const [shares, setShares] = useState<OsShares>();
  const [activeOs, setActiveOs] = useState<OsId>();
  const [picks, setPicks] = useState<Partial<Record<OsId, string>>>({});
  const [values, setValues] = useState<Record<string, Values>>({});
  const [order, setOrder] = useState<string[]>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => () => parser.current?.dispose(), []);

  const addFiles = async (files: File[]) => {
    if (files.length === 0 || busy) return;
    parser.current ??= createFontParser();
    setBusy(true);
    setError('');
    setAnnouncement(t.upload_reading());
    const added: LoadedFont[] = [];
    const failures: string[] = [];
    try {
      for (const file of files) {
        if (fonts.length + added.length >= MAX_FONTS) {
          failures.push(`${file.name}: ${t.error_too_many()}`);
          continue;
        }
        if (file.size > MAX_FONT_BYTES) {
          failures.push(`${file.name}: ${t.error_too_large()}`);
          continue;
        }
        try {
          const buffer = await file.arrayBuffer();
          const bytes = buffer.slice(0);
          const result = await parser.current.parse(buffer);
          if (result.ok) {
            added.push({ id: nextId.current++, fileName: file.name, metrics: result.font, bytes });
          } else {
            failures.push(`${file.name}: ${errors[result.error.code] ?? t.error_invalid_font()}`);
          }
        } catch {
          failures.push(`${file.name}: ${t.error_worker_error()}`);
        }
      }
    } finally {
      setBusy(false);
    }
    setError(failures.join(' '));
    if (added.length > 0) {
      setFonts((current) => [...current, ...added]);
      setSelectedId((current) => current ?? added[0]?.id);
      setAnnouncement(`${t.upload_added()}: ${fonts.length + added.length}`);
    } else {
      setAnnouncement('');
    }
  };

  const selected = fonts.find((font) => font.id === selectedId) ?? fonts[0];

  const systems = useMemo(() => {
    if (!shares) return [];
    return systemsWithFonts()
      .filter((os) => shares[os] >= MIN_SHARE)
      .sort((a, b) => shares[b] - shares[a]);
  }, [shares]);
  const uncovered = shares
    ? ALL_SYSTEMS.filter((os) => shares[os] >= MIN_SHARE && !systems.includes(os))
    : [];

  const rankings = useMemo(() => {
    const result: Partial<Record<OsId, Ranking>> = {};
    let noCoverage = false;
    if (selected) {
      for (const os of systems) {
        try {
          result[os] = rankFor(selected.metrics, os, language);
        } catch (thrown) {
          if (!isNoCoverage(thrown)) throw thrown;
          noCoverage = true;
        }
      }
    }
    return { result, noCoverage };
  }, [selected, systems, language]);

  const pickFor = (os: OsId): Candidate | undefined => {
    const list = (rankings.result[os]?.candidates ?? []).filter((item) => item.category === kind);
    return list.find((item) => item.id === picks[os]) ?? list[0];
  };

  const current = activeOs && systems.includes(activeOs) ? activeOs : systems[0];
  const currentPick = current ? pickFor(current) : undefined;
  const currentList = current
    ? (rankings.result[current]?.candidates ?? []).filter((item) => item.category === kind)
    : [];
  const coverage = Math.min(
    1,
    ...Object.values(rankings.result).map((ranking) => ranking?.coverage ?? 1),
  );

  const manualOf = (id: string): Partial<Overrides> => {
    const manual: Partial<Overrides> = {};
    for (const { key } of FIELDS) {
      const value = values[id]?.[key];
      if (value?.mode === 'manual') manual[key] = value.value / 100;
    }
    return manual;
  };

  const chosen = systems.flatMap((os) => {
    const pick = pickFor(os);
    return pick && shares ? [{ os, share: shares[os], faceId: pick.id, candidate: pick }] : [];
  });
  const plan = chosen.length > 0 ? planStack(chosen, order) : undefined;

  let output: ReturnType<typeof buildCss> | undefined;
  let adjustment: Overrides | undefined;
  if (selected && plan && currentPick) {
    const faces = plan.order.flatMap((id) => {
      const candidate = chosen.find((item) => item.faceId === id)?.candidate;
      return candidate
        ? [
            {
              family: candidate.family,
              localNames: candidate.localNames,
              adjustment: adjustmentOf(candidate.adjustment, manualOf(id)),
            },
          ]
        : [];
    });
    adjustment = adjustmentOf(currentPick.adjustment, manualOf(currentPick.id));
    try {
      const family = selected.metrics.names.family?.trim().slice(0, 200) || 'Custom font';
      output = buildCss(family, faces, kind);
    } catch (failure) {
      if (!(failure instanceof CssExportError)) throw failure;
    }
  }

  const systemName = (os: OsId) => t[`audience_os_${os}`]();
  const percent = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
  const familyOf = (id: string) =>
    chosen.find((item) => item.faceId === id)?.candidate.family ?? id;
  const currentValues = currentPick ? (values[currentPick.id] ?? AUTO) : AUTO;
  const shadowed = plan?.resolution.platforms.filter((item) => item.status === 'shadowed') ?? [];
  const optionLabel = (item: Candidate) =>
    `${item.family} (${(item.adjustment.sizeAdjust * 100).toFixed(1)}%)${
      item.latinOnly ? ` · ${t.fit_font_latin_only()}` : ''
    }`;

  return (
    <div class="ff-generator">
      <div class="ff-generator__settings">
        <FontUpload locale={locale} busy={busy} compact={fonts.length > 0} onFiles={addFiles} />
        {error && (
          <p class="ff-error" role="alert">
            {error}
          </p>
        )}
        <LiveRegion>{announcement}</LiveRegion>
        {fonts.length > 0 && (
          <section
            class="ff-generator__section ff-generator__section--plain"
            aria-labelledby="ff-fonts-heading"
          >
            <h2 id="ff-fonts-heading" class="ff-sr-only">
              {t.upload_fonts_label()}
            </h2>
            {fonts.length > 1 && (
              <Select
                label={t.upload_select_label()}
                value={String(selected?.id ?? '')}
                options={fonts.map((font) => ({
                  value: String(font.id),
                  label: `${font.metrics.names.fullName ?? font.fileName} (${font.fileName})`,
                }))}
                onChange={(value) => setSelectedId(Number(value))}
              />
            )}
            <ul>
              {fonts.map((font) => (
                <li key={font.id}>
                  <span>{font.fileName}</span>
                  <Button
                    onClick={() => {
                      setFonts((list) => list.filter((item) => item.id !== font.id));
                      setSelectedId((id) => (id === font.id ? undefined : id));
                    }}
                    aria-label={`${t.upload_remove()}: ${font.fileName}`}
                  >
                    {t.upload_remove()}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {selected && rankings.noCoverage && Object.keys(rankings.result).length === 0 && (
          <p role="alert">{t.fit_no_coverage()}</p>
        )}
        {selected && !shares && <p class="ff-muted">{t.plan_waiting()}</p>}
        {selected && current && (
          <section class="ff-generator__section" aria-labelledby="ff-fit-heading">
            <h2 id="ff-fit-heading" class="ff-sr-only">
              {t.fit_heading()}
            </h2>
            <div class="ff-generator__pair">
              <Select
                label={t.fit_system_label()}
                value={current}
                options={systems.map((os) => ({
                  value: os,
                  label: `${systemName(os)} (${percent(shares?.[os] ?? 0)}%)`,
                }))}
                onChange={(value) => setActiveOs(value as OsId)}
              />
              <Select
                label={t.fit_language_label()}
                value={language}
                options={[
                  { value: 'en', label: t.language_en() },
                  { value: 'ru', label: t.language_ru() },
                ]}
                onChange={(value) => setLanguage(value as Language)}
              />
              <Select
                label={t.fit_type_label()}
                value={kind}
                options={[
                  { value: 'sans-serif', label: t.type_sans() },
                  { value: 'serif', label: t.type_serif() },
                  { value: 'monospace', label: t.type_mono() },
                ]}
                onChange={(value) => {
                  setKind(value as Category);
                  setPicks({});
                  setOrder(undefined);
                }}
              />
              {currentPick && (
                <Select
                  label={t.fallback_font_label()}
                  value={currentPick.id}
                  options={currentList.map((item) => ({
                    value: item.id,
                    label: optionLabel(item),
                  }))}
                  onChange={(value) => {
                    setPicks((all) => ({ ...all, [current]: value }));
                    setOrder(undefined);
                  }}
                />
              )}
            </div>
            {currentPick ? (
              <>
                {currentPick.coverage < 0.95 && (
                  <p class="ff-muted" role="status">
                    {t.fit_font_partial({ percent: percent(currentPick.coverage * 100) })}
                  </p>
                )}
                {FIELDS.map(({ key, label, min, max }) => (
                  <FitField
                    key={`${currentPick.id}-${key}`}
                    compact
                    locale={locale}
                    label={t[label]()}
                    unit={t.fit_percent_unit()}
                    value={currentValues[key]}
                    autoValue={currentPick.adjustment[key] * 100}
                    min={min}
                    max={max}
                    step={0.1}
                    onChange={(next) =>
                      setValues((all) => ({
                        ...all,
                        [currentPick.id]: { ...(all[currentPick.id] ?? AUTO), [key]: next },
                      }))
                    }
                  />
                ))}
              </>
            ) : (
              <p class="ff-muted">{t.plan_no_kind({ system: systemName(current) })}</p>
            )}
          </section>
        )}
        <AudienceEditor locale={locale} onShares={setShares} active={fonts.length > 0} />
      </div>
      <div class="ff-generator__results">
        {output && selected && currentPick && adjustment ? (
          <>
            {coverage < LOW_COVERAGE && (
              <p class="ff-error" role="status">
                {t.fit_low_coverage()} {Math.round(coverage * 100)}%
              </p>
            )}
            <Preview
              key={selected.id}
              defaultSample={sampleText(selected.metrics, t.preview_sample_default())}
              locale={locale}
              bytes={selected.bytes}
              fallback={currentPick}
              adjustment={adjustment}
            />
            {plan && (
              <section class="ff-generator__section" aria-labelledby="ff-plan-heading">
                <h2 id="ff-plan-heading">{t.plan_heading()}</h2>
                <ul>
                  {chosen.map((item) => (
                    <li key={item.os}>
                      <span>
                        {t.plan_system_font({
                          system: systemName(item.os),
                          share: percent(item.share),
                          font: item.candidate.family,
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
                {shadowed.map((item) => (
                  <p key={item.platform} class="ff-error" role="status">
                    {t.plan_shadowed({
                      system: systemName(item.platform as OsId),
                      winner: familyOf(item.winner ?? ''),
                      font: familyOf(item.preferredFace),
                    })}
                  </p>
                ))}
                {plan.resolution.suggestion && (
                  <Button onClick={() => setOrder(plan.resolution.suggestion?.order)}>
                    {t.plan_fix()}
                  </Button>
                )}
                {plan.resolution.blockedBy === 'cycle' && (
                  <p class="ff-error" role="status">
                    {t.plan_blocked()}
                  </p>
                )}
                {uncovered.length > 0 && shares && (
                  <p class="ff-muted">
                    {t.plan_uncovered({
                      systems: uncovered.map(systemName).join(', '),
                      share: percent(uncovered.reduce((sum, os) => sum + shares[os], 0)),
                    })}
                  </p>
                )}
              </section>
            )}
            <section class="ff-generator__section" aria-labelledby="ff-css-heading">
              <h2 id="ff-css-heading">{t.css_heading()}</h2>
              <p class="ff-muted">{t.fit_latin_note()}</p>
              <CodeBlock
                locale={locale}
                label={t.css_code_label()}
                code={`${output.fontFaces}\n\n${output.fontFamily}`}
              />
            </section>
          </>
        ) : (
          <p class="ff-generator__empty">{t.results_empty()}</p>
        )}
        {plan && !output && selected && <p role="alert">{t.css_error()}</p>}
      </div>
    </div>
  );
}
