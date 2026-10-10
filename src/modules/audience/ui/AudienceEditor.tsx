import { useEffect, useId, useState } from 'preact/hooks';
import { type Locale, messagesFor } from '@/common/i18n';
import { Disclosure, Select } from '@/common/ui';
import { DEFAULT_QUERY, PRESETS, presetFor } from '../lib/presets';
import { MAX_QUERY_LENGTH, type Resolution, resolveQuery } from '../lib/resolve';
import './audience.css';

const CUSTOM = 'custom';
const DEBOUNCE_MS = 250;

type State = Resolution | { loading: true } | { failed: true };

export function AudienceEditor({ locale }: { locale: Locale }) {
  const t = messagesFor(locale);
  const inputId = useId();
  const messageId = useId();
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState<string>(DEFAULT_QUERY);
  const [state, setState] = useState<State>({ loading: true });

  useEffect(() => {
    if (!opened) return;
    let current = true;
    const timer = setTimeout(() => {
      resolveQuery(query).then(
        (resolution) => current && setState(resolution),
        () => current && setState({ failed: true }),
      );
    }, DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [opened, query]);

  const invalid = 'ok' in state && !state.ok;
  const errors = {
    empty: t.audience_error_empty(),
    'too-long': t.audience_error_too_long(),
    invalid: t.audience_error_invalid(),
    'no-match': t.audience_error_no_match(),
  };

  return (
    <Disclosure summary={t.audience_heading()} onToggle={(open) => open && setOpened(true)}>
      <div class="ff-audience">
        <Select
          label={t.audience_preset_label()}
          value={presetFor(query)?.id ?? CUSTOM}
          options={[
            ...PRESETS.map((preset) => ({ value: preset.id, label: t[preset.label]() })),
            { value: CUSTOM, label: t.audience_preset_custom(), disabled: true },
          ]}
          onChange={(id) => setQuery(PRESETS.find((preset) => preset.id === id)?.query ?? query)}
        />
        <div class="ff-field">
          <label for={inputId}>{t.audience_query_label()}</label>
          <input
            id={inputId}
            class="ff-input"
            type="text"
            spellcheck={false}
            autocomplete="off"
            maxLength={MAX_QUERY_LENGTH * 2}
            value={query}
            aria-invalid={invalid}
            aria-describedby={messageId}
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
          <p class="ff-muted">{t.audience_query_hint()}</p>
        </div>
        <div id={messageId} role="status" class="ff-audience__result">
          {'loading' in state && opened && t.audience_loading()}
          {'failed' in state && t.audience_load_failed()}
          {'ok' in state && !state.ok && (
            <span class="ff-error">
              {errors[state.code]} {state.detail}
            </span>
          )}
          {'ok' in state && state.ok && (
            <>
              <strong>{t.audience_resolved({ count: state.count })}</strong>
              <span class="ff-muted">
                {t.audience_data_date({
                  date: new Intl.DateTimeFormat(locale, {
                    dateStyle: 'medium',
                    timeZone: 'UTC',
                  }).format(new Date(`${state.dataDate}T00:00:00Z`)),
                })}
              </span>
            </>
          )}
        </div>
        {'ok' in state && state.ok && (
          <ul class="ff-audience__list" aria-label={t.audience_list_label()}>
            {state.groups.map((group) => (
              <li key={group.id}>
                <span>{group.name}</span>
                <span class="ff-muted">{group.versions.join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Disclosure>
  );
}
