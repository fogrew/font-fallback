import { type SampleLanguage, samples } from './samples';

export type BlockTag = 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'blockquote' | 'button';

export interface BlockStyle {
  fontPx: number;
  marginTop: number;
  marginBottom: number;
  indent: number;
  padX: number;
  padY: number;
  fitContent: boolean;
}

export const BODY_PADDING = 16;

export const STYLES: Record<BlockTag, BlockStyle> = {
  h1: {
    fontPx: 32,
    marginTop: 0,
    marginBottom: 12,
    indent: 0,
    padX: 0,
    padY: 0,
    fitContent: false,
  },
  h2: {
    fontPx: 24,
    marginTop: 20,
    marginBottom: 8,
    indent: 0,
    padX: 0,
    padY: 0,
    fitContent: false,
  },
  h3: {
    fontPx: 19,
    marginTop: 16,
    marginBottom: 6,
    indent: 0,
    padX: 0,
    padY: 0,
    fitContent: false,
  },
  p: { fontPx: 16, marginTop: 0, marginBottom: 12, indent: 0, padX: 0, padY: 0, fitContent: false },
  li: {
    fontPx: 16,
    marginTop: 0,
    marginBottom: 12,
    indent: 24,
    padX: 0,
    padY: 0,
    fitContent: false,
  },
  blockquote: {
    fontPx: 16,
    marginTop: 0,
    marginBottom: 12,
    indent: 0,
    padX: 0,
    padY: 0,
    fitContent: false,
  },
  button: {
    fontPx: 16,
    marginTop: 0,
    marginBottom: 8,
    indent: 0,
    padX: 14,
    padY: 8,
    fitContent: true,
  },
};

export interface Block {
  tag: BlockTag;
  text: string;
}

export function sampleBlocks(language: SampleLanguage): Block[] {
  const sample = samples[language];
  return [
    { tag: 'h1', text: sample.title },
    { tag: 'p', text: sample.intro },
    { tag: 'h2', text: sample.heading },
    ...sample.paragraphs.map((text): Block => ({ tag: 'p', text })),
    ...sample.items.map((text): Block => ({ tag: 'li', text })),
    { tag: 'h3', text: sample.subheading },
    { tag: 'blockquote', text: sample.quote },
    ...sample.buttons.map((text): Block => ({ tag: 'button', text })),
  ];
}

export function blockCss(): string {
  const rule = (tag: BlockTag) => {
    const style = STYLES[tag];
    const padding = style.padX || style.padY ? `padding: ${style.padY}px ${style.padX}px;` : '';
    const indent = style.indent ? `margin-left: ${style.indent}px;` : '';
    const fit = style.fitContent
      ? 'display: block; inline-size: fit-content; font: inherit; border: 0;'
      : '';
    return `${tag} { font-size: ${style.fontPx}px; margin-top: ${style.marginTop}px; margin-bottom: ${style.marginBottom}px; ${indent} ${padding} ${fit} }`;
  };
  return (Object.keys(STYLES) as BlockTag[]).map(rule).join('\n');
}
