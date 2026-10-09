import * as generated from './paraglide/messages.js';
import type { Locale } from './paraglide/runtime.js';

type Generated = Omit<typeof generated, 'm'>;
type MessageFunction = (inputs: object, options: { locale: Locale }) => string;

export type Messages = {
  [Key in keyof Generated]: (inputs?: Parameters<Generated[Key]>[0]) => string;
};

export function messagesFor(locale: Locale): Messages {
  const messages = generated as unknown as Record<string, MessageFunction>;
  return new Proxy({} as Messages, {
    get: (_, key: string) => (inputs?: object) => messages[key]?.(inputs ?? {}, { locale }),
  });
}
