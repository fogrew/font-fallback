import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { type Locale, messagesFor } from '@/common/i18n';
import { Button, CodeBlock, FitField, type FitValue, LiveRegion, Select } from '@/common/ui';
import { CssExportError } from '@/modules/export';
import { createFontParser, type FontMetrics, type FontParser } from '@/modules/font-metrics';
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
  const [values, setValues] = useState(AUTO);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => () => parser.current?.dispose(), []);

  const addFiles = async (files: File[]) => {
    if (files.length === 0) return;
    parser.current ??= createFontParser();
    setBusy(true);
    setError('');
    setAnnouncement(t.upload_reading());
    const added: LoadedFont[] = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const bytes = buffer.slice(0);
      const result = await parser.current.parse(buffer);
      if (result.ok) {
        added.push({ id: nextId.current++, fileName: file.name, metrics: result.font, bytes });
      } else {
        setError(`${file.name}: ${errors[result.error.code] ?? t.error_invalid_font()}`);
      }
    }
    if (added.length > 0) {
      setFonts((current) => [...current, ...added]);
      setSelectedId((current) => current ?? added[0]?.id);
      setAnnouncement(t.upload_added());
    }
    setBusy(false);
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

  const candidate = ranking?.ok
    ? (ranking.candidates.find((item) => item.font.id === fallbackId) ?? ranking.candidates[0])
    : undefined;

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
      output = buildCss(selected.metrics.names.family ?? 'Custom font', candidate.font, adjustment);
    } catch (failure) {
      if (!(failure instanceof CssExportError)) throw failure;
    }
  }

  return (
    <div class="ff-generator">
      <FontUpload locale={locale} busy={busy} onFiles={addFiles} />
      {error && (
        <p class="ff-error" role="alert">
          {error}
        </p>
      )}
      <LiveRegion>{announcement}</LiveRegion>
      {fonts.length > 0 && (
        <section class="ff-generator__section" aria-labelledby="ff-fonts-heading">
          <h2 id="ff-fonts-heading">{t.upload_fonts_label()}</h2>
          <Select
            label={t.upload_select_label()}
            value={String(selected?.id ?? '')}
            options={fonts.map((font) => ({
              value: String(font.id),
              label: `${font.metrics.names.fullName ?? font.fileName} (${font.fileName})`,
            }))}
            onChange={(value) => setSelectedId(Number(value))}
          />
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
          <h2 id="ff-fit-heading">{t.fit_heading()}</h2>
          <Select
            label={t.fallback_font_label()}
            value={candidate.font.id}
            options={ranking.candidates.map((item) => ({
              value: item.font.id,
              label: `${item.font.family} (${(item.adjustment.sizeAdjust * 100).toFixed(1)}%)`,
            }))}
            onChange={setFallbackId}
          />
          <p class="ff-muted">{t.fit_ranked_hint()}</p>
          {FIELDS.map(({ key, label, min, max }) => (
            <FitField
              key={key}
              locale={locale}
              label={t[label]()}
              unit={t.fit_percent_unit()}
              value={values[key]}
              autoValue={
                (key === 'sizeAdjust'
                  ? candidate.adjustment.sizeAdjust
                  : candidate.adjustment[key]) * 100
              }
              min={min}
              max={max}
              step={0.1}
              onChange={(next) => setValues((current) => ({ ...current, [key]: next }))}
            />
          ))}
          <p class="ff-muted">{t.fit_latin_note()}</p>
        </section>
      )}
      {output && selected && candidate && adjustment && (
        <>
          <section class="ff-generator__section" aria-labelledby="ff-css-heading">
            <h2 id="ff-css-heading">{t.css_heading()}</h2>
            <CodeBlock
              locale={locale}
              label={t.css_code_label()}
              code={`${output.fontFaces}\n\n${output.fontFamily}`}
            />
          </section>
          <Preview
            locale={locale}
            bytes={selected.bytes}
            fallback={candidate.font}
            adjustment={adjustment}
          />
        </>
      )}
      {ranking?.ok && !output && selected && <p role="alert">{t.css_error()}</p>}
    </div>
  );
}
