import { runWorkerTask, WorkerTaskError } from '@/common/lib';
import { FONT_PARSE_TIMEOUT_MS, FontParseError, type FontParseResult } from './model';
import { validateFontBuffer } from './validate';

export interface FontParser {
  parse(buffer: ArrayBuffer): Promise<FontParseResult>;
  dispose(): void;
}

export function createFontParser(): FontParser {
  let disposed = false;
  let active: AbortController | undefined;
  return {
    async parse(buffer) {
      if (disposed) return { ok: false, error: { code: 'disposed' } };
      if (active) return { ok: false, error: { code: 'busy' } };
      try {
        validateFontBuffer(buffer);
      } catch (error) {
        return {
          ok: false,
          error: { code: error instanceof FontParseError ? error.code : 'invalid-font' },
        };
      }
      active = new AbortController();
      try {
        return await runWorkerTask<ArrayBuffer, FontParseResult>(
          () => new Worker(new URL('./parse.worker.ts', import.meta.url), { type: 'module' }),
          buffer,
          { timeoutMs: FONT_PARSE_TIMEOUT_MS, transfer: [buffer], signal: active.signal },
        );
      } catch (error) {
        return {
          ok: false,
          error: {
            code:
              error instanceof WorkerTaskError && error.code === 'timeout'
                ? 'timeout'
                : disposed
                  ? 'disposed'
                  : 'worker-error',
          },
        };
      } finally {
        active = undefined;
      }
    },
    dispose() {
      disposed = true;
      active?.abort();
    },
  };
}
