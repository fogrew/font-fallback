import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { type Locale, messagesFor } from '@/common/i18n';
import { Button, CodeBlock, FitField, type FitValue, LiveRegion, Select } from '@/common/ui';
import { CssExportError } from '@/modules/export';
import type { SystemFont } from '@/modules/fallback-fit';
import {
  createFontParser,
  type FontMetrics,
  type FontParser,
  MAX_FONT_BYTES,
} from '@/modules/font-metrics';
import { isNoCoverage, rankFallbacks } from '../lib/compute';
import { adjustmentOf, buildCss, type Overrides } from '../lib/css';
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

type Field = keyof Overrides;

const FIELDS = [
  { key: 'sizeAdjust', label: 'fit_size_label', min: 25, max: 400 },
  { key: 'ascentOverride', label: 'fit_ascent_label', min: 0, max: 400 },
  { key: 'descentOverride', label: 'fit_descent_label', min: 0, max: 400 },
  { key: 'lineGapOverride', label: 'fit_line_gap_label', min: 0, max: 400 },
] as const;

const AUTO: Record<Field, FitValue> = {
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
  const [fallbackId, setFallbackId] = useState<string>();
  const [kind, setKind] = useState<SystemFont['genericFamily']>('sans-serif');
  const [values, setValues] = useState(AUTO);
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
  const ranking = useMemo(() => {
    if (!selected) return undefined;
    try {
      return { ok: true as const, ...rankFallbacks(selected.metrics) };
    } catch (failure) {
      return { ok: false as const, noCoverage: isNoCoverage(failure) };
    }
  }, [selected]);

  const ofKind = ranking?.ok
    ? ranking.candidates.filter((item) => item.font.genericFamily === kind)
    : [];
  const candidate = ofKind.find((item) => item.font.id === fallbackId) ?? ofKind[0];

  let output: ReturnType<typeof buildCss> | undefined;
  let adjustment: Overrides | undefined;
  if (selected && candidate) {
    const manual: Partial<Overrides> = {};
    for (const { key } of FIELDS) {
      const value = values[key];
      if (value.mode === 'manual') manual[key] = value.value / 100;
    }
    adjustment = adjustmentOf(candidate.adjustment, manual);
    try {
      const family = selected.metrics.names.family?.trim().slice(0, 200) || 'Custom font';
      output = buildCss(family, candidate.font, adjustment);
    } catch (failure) {
      if (!(failure instanceof CssExportError)) throw failure;
    }
  }

  return (
    <div class="ff-generator">
      <div class="ff-generator__settings">
        <FontUpload locale={locale} busy={busy} onFiles={addFiles} />
        {error && (
          <p class="ff-error" role="alert">
            {error}
          </p>
        )}
        <LiveRegion>{announcement}</LiveRegion>
        {fonts.length > 0 && (
          <section class="ff-generator__section" aria-labelledby="ff-fonts-heading">
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
                      setFonts((current) => current.filter((item) => item.id !== font.id));
                      setSelectedId((current) => (current === font.id ? undefined : current));
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
        {ranking && !ranking.ok && ranking.noCoverage && <p role="alert">{t.fit_no_coverage()}</p>}
        {ranking?.ok && candidate && adjustment && (
          <section class="ff-generator__section" aria-labelledby="ff-fit-heading">
            <h2 id="ff-fit-heading" class="ff-sr-only">
              {t.fit_heading()}
            </h2>
            <div class="ff-generator__pair">
              <Select
                label={t.fit_type_label()}
                value={kind}
                options={[
                  { value: 'sans-serif', label: t.type_sans() },
                  { value: 'serif', label: t.type_serif() },
                  { value: 'monospace', label: t.type_mono() },
                ]}
                onChange={(value) => {
                  setKind(value as SystemFont['genericFamily']);
                  setFallbackId(undefined);
                }}
              />
              <Select
                label={t.fallback_font_label()}
                value={candidate.font.id}
                options={ofKind.map((item) => ({
                  value: item.font.id,
                  label: `${item.font.family} (${(item.adjustment.sizeAdjust * 100).toFixed(1)}%)`,
                }))}
                onChange={setFallbackId}
              />
            </div>
            {FIELDS.map(({ key, label, min, max }) => (
              <FitField
                key={key}
                compact
                locale={locale}
                label={t[label]()}
                unit={t.fit_percent_unit()}
                value={values[key]}
                autoValue={candidate.adjustment[key] * 100}
                min={min}
                max={max}
                step={0.1}
                onChange={(next) => setValues((current) => ({ ...current, [key]: next }))}
              />
            ))}
          </section>
        )}
      </div>
      <div class="ff-generator__results">
        {output && selected && candidate && adjustment ? (
          <>
            <Preview
              locale={locale}
              bytes={selected.bytes}
              fallback={candidate.font}
              adjustment={adjustment}
            />
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
        {ranking?.ok && !output && selected && <p role="alert">{t.css_error()}</p>}
      </div>
    </div>
  );
}
