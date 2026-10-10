import { useEffect, useRef, useState } from 'preact/hooks';
import { type Locale, messagesFor } from '@/common/i18n';
import { LiveRegion } from '@/common/ui';
import type { SampleLanguage } from '../lib/samples';
import {
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

export function LayoutShiftPanel({
  locale,
  input,
}: {
  locale: Locale;
  input: PanelInput | undefined;
}) {
  const t = messagesFor(locale);
  const [results, setResults] = useState<ViewportResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'failed'>('idle');
  const [customText, setCustomText] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const customWidth = Number(customText);
  const customValid =
    customText !== '' &&
    Number.isInteger(customWidth) &&
    customWidth >= MIN_WIDTH &&
    customWidth <= MAX_WIDTH;
  const widths = customValid ? [customWidth] : [];
  const key = input
    ? JSON.stringify([
        input.fallbackFontFaces,
        input.fallbackFamilies,
        input.generic,
        input.language,
        widths,
      ])
    : '';
  const latest = useRef(input);
  latest.current = input;
  const bytes = input?.webBytes;

  useEffect(() => {
    const current = latest.current;
    if (!current || key === '') return;
    const controller = new AbortController();
    let frame = 0;
    const timer = setTimeout(() => {
      frame = requestAnimationFrame(() => {
        setStatus('running');
        const viewports = [
          ...DEFAULT_VIEWPORTS,
          ...widths.map((width) => ({ width, height: Math.min(1600, Math.round(width * 1.6)) })),
        ];
        simulateLayoutShift({ ...current, viewports, signal: controller.signal }).then(
          (next) => {
            if (controller.signal.aborted) return;
            setResults(next);
            setStatus('idle');
          },
          () => {
            if (!controller.signal.aborted) setStatus('failed');
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
          onInput={(event) => setCustomText(event.currentTarget.value)}
        />
      </div>
      {status === 'running' && <p class="ff-muted">{t.cls_running()}</p>}
      {status === 'failed' && (
        <p class="ff-error" role="alert">
          {t.cls_failed()}
        </p>
      )}
      {results.length > 0 && (
        <table class="ff-cls__table">
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
                <td>{`${item.linesBefore} → ${item.linesAfter}`}</td>
                <td>{`${Math.round(item.heightBefore)} → ${Math.round(item.heightAfter)}px`}</td>
                <td>{item.lineBreakMismatches}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <LiveRegion>{announcement}</LiveRegion>
    </section>
  );
}

export type { SampleLanguage };
