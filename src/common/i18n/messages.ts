import * as generated from './paraglide/messages.js';
import type { Locale } from './paraglide/runtime.js';

type Generated = Omit<typeof generated, 'm'>;
type MessageFunction = (inputs: object, options: { locale: Locale }) => string;
type InputsOf<Fn> = Fn extends (...args: infer Args) => unknown
  ? Args extends [infer Inputs, ...unknown[]]
    ? [inputs: Inputs]
    : [inputs?: Args[0]]
  : never;

export type Messages = {
  [Key in keyof Generated]: (...args: InputsOf<Generated[Key]>) => string;
};

export function messagesFor(locale: Locale): Messages {
  const messages = generated as unknown as Record<string, MessageFunction | undefined>;
  return new Proxy({} as Messages, {
    get: (_, key) => {
      if (typeof key !== 'string' || key === 'then') {
        return undefined;
      }
      const message = messages[key];
      if (!message) {
        throw new Error(`Unknown message key: ${key}`);
      }
      return (inputs?: object) => message(inputs ?? {}, { locale });
    },
  });
}
