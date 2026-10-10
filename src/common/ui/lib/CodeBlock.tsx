import { useState } from 'preact/hooks';
import { type Locale, messagesFor } from '@/common/i18n';
import { Button } from './Button';
import { LiveRegion } from './LiveRegion';

export function CodeBlock({
  locale,
  code,
  label,
}: {
  locale: Locale;
  code: string;
  label: string;
}) {
  const t = messagesFor(locale);
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [pending, setPending] = useState(false);
  const copy = async () => {
    setPending(true);
    setStatus('idle');
    try {
      await navigator.clipboard.writeText(code);
      setStatus('copied');
    } catch {
      setStatus('failed');
    } finally {
      setPending(false);
    }
  };
  return (
    <div class="ff-code">
      <div class="ff-code__header">
        <span>{label}</span>
        <Button disabled={pending} onClick={copy}>
          {t.ui_copy_code()}
        </Button>
      </div>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Scrollable code needs a keyboard focus target. */}
      <section class="ff-code__body" tabIndex={0} aria-label={label}>
        <pre>
          <code>{code}</code>
        </pre>
      </section>
      {status === 'failed' && <p class="ff-error">{t.ui_copy_failed()}</p>}
      <LiveRegion>
        {status === 'copied' ? t.ui_copied() : status === 'failed' ? t.ui_copy_failed() : ''}
      </LiveRegion>
    </div>
  );
}
