import { useEffect, useId, useState } from 'preact/hooks';
import { type Locale, messagesFor } from '@/common/i18n';
import { Button } from '@/common/ui';
import {
  computeOsShares,
  DEFAULT_DESKTOP_SPLIT,
  DESKTOP_OS_IDS,
  type DesktopOs,
  type DesktopSplit,
  emptyShares,
  isValidSplit,
  OS_IDS,
  type Os,
  type OsShares,
  splitTotal,
  type WeightedEntry,
} from '../lib/os';

type Mode = 'browsers' | 'manual';

const MANUAL_IDS = OS_IDS.filter((id) => id !== 'other');

function parseNumber(text: string): number {
  return text.trim() === '' ? 0 : Number(text);
}

export function OsPanel({
  locale,
  entries,
  onChange,
}: {
  locale: Locale;
  entries: readonly WeightedEntry[] | undefined;
  onChange?: ((shares: OsShares) => void) | undefined;
}) {
  const t = messagesFor(locale);
  const groupId = useId();
  const [mode, setMode] = useState<Mode>('browsers');
  const [splitText, setSplitText] = useState<Record<DesktopOs, string>>(() => ({
    windows: String(DEFAULT_DESKTOP_SPLIT.windows),
    macos: String(DEFAULT_DESKTOP_SPLIT.macos),
    linux: String(DEFAULT_DESKTOP_SPLIT.linux),
    chromeos: String(DEFAULT_DESKTOP_SPLIT.chromeos),
  }));
  const [manualText, setManualText] = useState<Record<string, string>>({});

  const split = Object.fromEntries(
    DESKTOP_OS_IDS.map((id) => [id, parseNumber(splitText[id])]),
  ) as DesktopSplit;
  const splitOk = isValidSplit(split);

  let shares: OsShares;
  if (mode === 'browsers') {
    shares = computeOsShares(entries ?? [], splitOk ? split : DEFAULT_DESKTOP_SPLIT);
  } else {
    shares = emptyShares();
    const weights = MANUAL_IDS.map((id) => Math.max(0, parseNumber(manualText[id] ?? '')) || 0);
    const sum = weights.reduce((acc, value) => acc + value, 0);
    if (sum > 0) {
      for (const [index, id] of MANUAL_IDS.entries())
        shares[id] = ((weights[index] ?? 0) / sum) * 100;
    }
  }
  const manualEmpty = mode === 'manual' && OS_IDS.every((id) => shares[id] === 0);

  const key = JSON.stringify(shares);
  useEffect(() => {
    onChange?.(JSON.parse(key) as OsShares);
  }, [key, onChange]);

  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const label = (id: Os) => t[`audience_os_${id}`]();

  return (
    <div class="ff-audience__os">
      <h3>{t.audience_os_heading()}</h3>
      <fieldset class="ff-audience__modes">
        <legend>{t.audience_os_mode_label()}</legend>
        {(['browsers', 'manual'] as const).map((value) => (
          <label key={value}>
            <input
              type="radio"
              name={groupId}
              checked={mode === value}
              onChange={() => setMode(value)}
            />{' '}
            {value === 'browsers' ? t.audience_os_mode_browsers() : t.audience_os_mode_manual()}
          </label>
        ))}
      </fieldset>

      {mode === 'browsers' ? (
        <fieldset class="ff-audience__split">
          <legend>{t.audience_os_split_heading()}</legend>
          {DESKTOP_OS_IDS.map((id) => (
            <label key={id}>
              <span>{label(id)}</span>
              <input
                class="ff-input"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.01}
                value={splitText[id]}
                aria-invalid={!splitOk}
                onInput={(event) => {
                  const text = event.currentTarget.value;
                  setSplitText((current) => ({ ...current, [id]: text }));
                }}
              />
            </label>
          ))}
          <p class={splitOk ? 'ff-muted' : 'ff-error'} role="status">
            {t.audience_os_split_total({ total: number.format(splitTotal(split)) })}
            {!splitOk && ` ${t.audience_os_split_invalid()}`}
          </p>
          <p class="ff-muted">{t.audience_os_split_source()}</p>
          <Button
            onClick={() =>
              setSplitText({
                windows: String(DEFAULT_DESKTOP_SPLIT.windows),
                macos: String(DEFAULT_DESKTOP_SPLIT.macos),
                linux: String(DEFAULT_DESKTOP_SPLIT.linux),
                chromeos: String(DEFAULT_DESKTOP_SPLIT.chromeos),
              })
            }
          >
            {t.audience_os_split_reset()}
          </Button>
        </fieldset>
      ) : (
        <fieldset class="ff-audience__split">
          <legend>{t.audience_os_manual_hint()}</legend>
          {MANUAL_IDS.map((id) => (
            <label key={id}>
              <span>{label(id)}</span>
              <input
                class="ff-input"
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                value={manualText[id] ?? ''}
                onInput={(event) => {
                  const text = event.currentTarget.value;
                  setManualText((current) => ({ ...current, [id]: text }));
                }}
              />
            </label>
          ))}
          {manualEmpty && (
            <p class="ff-error" role="status">
              {t.audience_os_manual_empty()}
            </p>
          )}
        </fieldset>
      )}

      <ul class="ff-audience__list" aria-label={t.audience_os_shares_label()}>
        {OS_IDS.filter((id) => shares[id] > 0).map((id) => (
          <li key={id}>
            <span>{label(id)}</span>
            <span class="ff-muted">
              {number.format(shares[id])}
              {t.fit_percent_unit()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
