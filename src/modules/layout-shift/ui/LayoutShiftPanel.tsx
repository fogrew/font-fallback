import { useEffect, useRef, useState } from 'preact/hooks';
import { type Locale, messagesFor } from '@/common/i18n';
import { Button, LiveRegion } from '@/common/ui';
import { compassSearch, type Dimension } from '../lib/optimize';
import type { SampleLanguage } from '../lib/samples';
import {
  createSimulation,
  DEFAULT_VIEWPORTS,
  ratingOf,
  type SimulationInput,
  simulateLayoutShift,
  type ViewportResult,
} from '../lib/simulate';
import './layout-shift.css';

const SETTLE_MS = 700;
const DEBOUNCE_MS = 150;
const MIN_WIDTH = 280;
const MAX_WIDTH = 3840;

export type PanelInput = Omit<SimulationInput, 'viewports' | 'signal'>;

export interface OptimizerSetup {
  family: string;
  dimensions: Dimension[];
  fontFaces: (values: Record<string, number>) => string;
  applied: boolean;
  onApply: (values: Record<string, number>) => void;
  onReset: () => void;
}

type OptimizeState =
  | { state: 'idle' }
  | { state: 'running'; count: number }
  | { state: 'missing' }
  | { state: 'failed' }
  | { state: 'done'; before: number; after: number; count: number };

const viewportsFor = (widths: readonly number[]) => [
  ...DEFAULT_VIEWPORTS,
  ...widths.map((width) => ({ width, height: Math.min(1600, Math.round(width * 1.6)) })),
];

export function LayoutShiftPanel({
  locale,
  input,
  optimizer,
}: {
  locale: Locale;
  input: PanelInput | undefined;
  optimizer?: OptimizerSetup | undefined;
}) {
  const t = messagesFor(locale);
  const [results, setResults] = useState<ViewportResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'failed'>('idle');
  const [customText, setCustomText] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [optimize, setOptimize] = useState<OptimizeState>({ state: 'idle' });
  const optimizing = useRef<AbortController>();
  useEffect(() => () => optimizing.current?.abort(), []);
  const customWidth = Number(customText);
  const customValid =
    customText !== '' &&
    Number.isInteger(customWidth) &&
    customWidth >= MIN_WIDTH &&
    customWidth <= MAX_WIDTH;
  const known = DEFAULT_VIEWPORTS.some((viewport) => viewport.width === customWidth);
  const widths = customValid && !known ? [customWidth] : [];
  const key = input
    ? JSON.stringify([
        input.fallbackFontFaces,
        input.fallbackFamilies,
        input.generic,
        input.language,
        input.spacing,
        widths,
      ])
    : '';
  const latest = useRef(input);
  latest.current = input;
  const bytes = input?.webBytes;

  useEffect(() => {
    const current = latest.current;
    if (!current || key === '') {
      setResults([]);
      setStatus('idle');
      return;
    }
    const controller = new AbortController();
    let frame = 0;
    const timer = setTimeout(() => {
      frame = requestAnimationFrame(() => {
        setStatus('running');
        simulateLayoutShift({
          ...current,
          viewports: viewportsFor(widths),
          signal: controller.signal,
        }).then(
          (next) => {
            if (controller.signal.aborted) return;
            setResults(next);
            setStatus('idle');
          },
          () => {
            if (controller.signal.aborted) return;
            setResults([]);
            setStatus('failed');
          },
        );
      });
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [key, bytes]);

  const runOptimizer = async () => {
    if (!input || !optimizer) return;
    optimizing.current?.abort();
    const controller = new AbortController();
    optimizing.current = controller;
    setOptimize({ state: 'running', count: 0 });
    const start = Object.fromEntries(optimizer.dimensions.map((dim) => [dim.key, dim.value]));
    let simulation: Awaited<ReturnType<typeof createSimulation>> | undefined;
    try {
      simulation = await createSimulation({
        ...input,
        fallbackFamilies: [optimizer.family],
        fallbackFontFaces: optimizer.fontFaces(start),
        viewports: viewportsFor(widths),
        signal: controller.signal,
      });
      let missing = false;
      const active = simulation;
      const result = await compassSearch(
        optimizer.dimensions,
        async (values) => {
          const measured = await active.measure(optimizer.fontFaces(values), {
            letterEm: values.letterSpacing ?? 0,
            wordEm: values.wordSpacing ?? 0,
          });
          if (measured.missingFallbacks.length > 0) missing = true;
          return measured.results.reduce((sum, item) => sum + item.score, 0);
        },
        {
          maxEvaluations: 150,
          maxMs: 12_000,
          signal: controller.signal,
          onProgress: (count) => setOptimize({ state: 'running', count }),
        },
      );
      if (controller.signal.aborted) return;
      if (missing) {
        setOptimize({ state: 'missing' });
      } else {
        if (result.score < result.startScore - 1e-9) optimizer.onApply(result.values);
        setOptimize({
          state: 'done',
          before: result.startScore,
          after: Math.min(result.score, result.startScore),
          count: result.evaluations,
        });
      }
    } catch {
      if (!controller.signal.aborted) setOptimize({ state: 'failed' });
    } finally {
      simulation?.close();
    }
  };

  const ratingLabel = (score: number) => {
    const rating = ratingOf(score);
    if (rating === 'good') return t.cls_rating_good();
    return rating === 'needs-improvement' ? t.cls_rating_needs() : t.cls_rating_poor();
  };
  const score = (value: number) =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(
      value,
    );

  useEffect(() => {
    if (status !== 'idle' || results.length === 0) return;
    const timer = setTimeout(
      () =>
        setAnnouncement(
          results
            .map((item) =>
              t.cls_announcement({
                width: item.viewport.width,
                score: score(item.score),
                rating: ratingLabel(item.score),
              }),
            )
            .join(' '),
        ),
      SETTLE_MS,
    );
    return () => clearTimeout(timer);
  }, [results, status]);

  return (
    <section class="ff-generator__section ff-cls" aria-labelledby="ff-cls-heading">
      <h2 id="ff-cls-heading">{t.cls_heading()}</h2>
      <p class="ff-muted">{t.cls_note()}</p>
      <div class="ff-field ff-cls__custom">
        <label for="ff-cls-width">{t.cls_custom_label()}</label>
        <input
          id="ff-cls-width"
          class="ff-input"
          type="number"
          inputMode="numeric"
          min={MIN_WIDTH}
          max={MAX_WIDTH}
          value={customText}
          aria-invalid={customText !== '' && !customValid}
          aria-describedby="ff-cls-width-hint"
          onInput={(event) => setCustomText(event.currentTarget.value)}
        />
      </div>
      <p id="ff-cls-width-hint" class="ff-muted">
        {t.cls_custom_hint({ min: MIN_WIDTH, max: MAX_WIDTH })}
      </p>
      <p class="ff-muted" role="status">
        {status === 'running' && t.cls_running()}
      </p>
      {status === 'failed' && (
        <p class="ff-error" role="alert">
          {t.cls_failed()}
        </p>
      )}
      {results.length > 0 && (
        <table class="ff-cls__table">
          <caption class="ff-sr-only">{t.cls_heading()}</caption>
          <thead>
            <tr>
              <th scope="col">{t.cls_viewport()}</th>
              <th scope="col">{t.cls_score()}</th>
              <th scope="col">{t.cls_lines()}</th>
              <th scope="col">{t.cls_height()}</th>
              <th scope="col">{t.cls_mismatches()}</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item) => (
              <tr key={item.viewport.width}>
                <th scope="row">{`${item.viewport.width}px`}</th>
                <td>{`${score(item.score)} · ${ratingLabel(item.score)}`}</td>
                <td>{t.cls_change({ before: item.linesBefore, after: item.linesAfter })}</td>
                <td>
                  {t.cls_change_px({
                    before: Math.round(item.heightBefore),
                    after: Math.round(item.heightAfter),
                  })}
                </td>
                <td>{item.lineBreakMismatches}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {optimizer && (
        <div class="ff-cls__optimize">
          <div class="ff-generator__buttons">
            <Button onClick={runOptimizer} disabled={optimize.state === 'running'}>
              {t.cls_optimize()}
            </Button>
            {optimizer.applied && (
              <Button
                onClick={() => {
                  optimizer.onReset();
                  setOptimize({ state: 'idle' });
                }}
              >
                {t.cls_optimize_reset()}
              </Button>
            )}
          </div>
          <p class="ff-muted">{t.cls_optimize_note()}</p>
          <p class="ff-muted" role="status">
            {optimize.state === 'running' && t.cls_optimizing({ count: optimize.count })}
            {optimize.state === 'missing' && t.cls_optimize_missing()}
            {optimize.state === 'failed' && t.cls_failed()}
            {optimize.state === 'done' &&
              (optimize.after < optimize.before - 1e-9
                ? t.cls_optimized({
                    before: score(optimize.before),
                    after: score(optimize.after),
                    count: optimize.count,
                  })
                : t.cls_optimize_none())}
          </p>
        </div>
      )}
      <LiveRegion>{announcement}</LiveRegion>
    </section>
  );
}

export type { SampleLanguage };
