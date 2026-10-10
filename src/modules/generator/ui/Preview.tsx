import { useEffect, useState } from 'preact/hooks';
import { type Locale, messagesFor } from '@/common/i18n';
import type { SystemFont } from '@/modules/fallback-fit';
import { buildCss, type Overrides } from '../lib/css';

const PREVIEW_FAMILY = 'ff-preview-web';

export function Preview({
  locale,
  bytes,
  fallback,
  adjustment,
}: {
  locale: Locale;
  bytes: ArrayBuffer;
  fallback: SystemFont;
  adjustment: Overrides;
}) {
  const t = messagesFor(locale);
  const [sample, setSample] = useState(t.preview_sample_default());
  useEffect(() => {
    const face = new FontFace(PREVIEW_FAMILY, bytes.slice(0));
    face
      .load()
      .then(() => document.fonts.add(face))
      .catch(() => undefined);
    return () => {
      document.fonts.delete(face);
    };
  }, [bytes]);
  const css = buildCss(PREVIEW_FAMILY, fallback, adjustment);
  return (
    <section class="ff-preview" aria-labelledby="ff-preview-heading">
      <h2 id="ff-preview-heading">{t.preview_heading()}</h2>
      <style>{css.fontFaces}</style>
      <div class="ff-field">
        <label for="ff-preview-sample">{t.preview_sample_label()}</label>
        <input
          id="ff-preview-sample"
          class="ff-input"
          type="text"
          value={sample}
          onInput={(event) => setSample(event.currentTarget.value)}
        />
      </div>
      <div class="ff-preview__grid">
        <figure>
          <figcaption>{t.preview_web_label()}</figcaption>
          <p class="ff-preview__text" style={{ fontFamily: `"${PREVIEW_FAMILY}", sans-serif` }}>
            {sample}
          </p>
        </figure>
        <figure>
          <figcaption>{t.preview_fallback_label()}</figcaption>
          <p
            class="ff-preview__text"
            style={{ fontFamily: `"${PREVIEW_FAMILY} Fallback", sans-serif` }}
          >
            {sample}
          </p>
        </figure>
      </div>
    </section>
  );
}
