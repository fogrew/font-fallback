import { type Locale, messagesFor } from '@/common/i18n';
import type { WeightedEntry } from '../lib/os';
import {
  descriptorSupport,
  lacksVerticalOverrides,
  supportData,
  VERTICAL_THRESHOLD,
} from '../lib/support';
import './audience.css';

export function SupportMatrix({
  locale,
  entries,
}: {
  locale: Locale;
  entries: readonly WeightedEntry[] | undefined;
}) {
  const t = messagesFor(locale);
  if (!entries || entries.length === 0) {
    return <p class="ff-muted">{t.support_manual()}</p>;
  }
  const support = descriptorSupport(entries);
  const vertical = lacksVerticalOverrides(support);
  const percent = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  return (
    <div class="ff-audience__support">
      <ul class="ff-audience__list" aria-label={t.support_heading()}>
        {support.map((item) => (
          <li key={item.feature}>
            <code>{item.feature}</code>
            <span>
              {t.support_row({ percent: percent(item.supported) })}
              {item.unsupportedBrowsers.length > 0 && (
                <span class="ff-muted">
                  {' '}
                  {t.support_unsupported({ browsers: item.unsupportedBrowsers.join(', ') })}
                </span>
              )}
              {item.unknownBrowsers.length > 0 && (
                <span class="ff-muted">
                  {' '}
                  {t.support_unknown({ browsers: item.unknownBrowsers.join(', ') })}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {vertical >= VERTICAL_THRESHOLD && (
        <p class="ff-muted">{t.support_vertical_note({ percent: percent(vertical) })}</p>
      )}
      <p class="ff-muted">{t.support_source({ version: supportData.bcdVersion })}</p>
    </div>
  );
}
