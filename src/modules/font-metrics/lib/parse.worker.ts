import { FontParseError, type FontParseResult } from './model';
import { parseFontBuffer } from './parse';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<ArrayBuffer>) => void) | null;
  postMessage: (message: FontParseResult, transfer?: Transferable[]) => void;
};

scope.onmessage = ({ data }) => {
  try {
    if (!(data instanceof ArrayBuffer)) throw new FontParseError('invalid-font');
    const font = parseFontBuffer(data);
    scope.postMessage({ ok: true, font }, [font.codePoints.buffer, font.advances.buffer]);
  } catch (error) {
    scope.postMessage({
      ok: false,
      error: { code: error instanceof FontParseError ? error.code : 'invalid-font' },
    });
  }
};
