import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const LOCALE_TAG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const JSON_IMPORT = /^import .+ from '\.\.\/\.\.\/\.\.\/messages\/.+\.json';$/gm;
const RESERVED_WORDS = new Set(['do', 'for', 'if', 'in', 'let', 'new', 'try', 'var']);
const CATALOGS = /(export const catalogs = \{)([^}]*)(\} satisfies)/;

export function addLocale(root: string, locale: string): void {
  if (!LOCALE_TAG.test(locale)) {
    throw new Error(`"${locale}" is not a valid locale tag (expected e.g. "de" or "pt-BR")`);
  }

  const settingsPath = join(root, 'project.inlang/settings.json');
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as {
    baseLocale: string;
    locales: string[];
  };
  if (settings.locales.includes(locale)) {
    throw new Error(`Locale "${locale}" already exists`);
  }

  const messagesPath = join(root, 'messages', `${locale}.json`);
  if (existsSync(messagesPath)) {
    throw new Error(`${messagesPath} already exists`);
  }

  const catalogPath = join(root, 'src/common/i18n/catalog.ts');
  const catalog = readFileSync(catalogPath, 'utf8');
  const imports = [...catalog.matchAll(JSON_IMPORT)];
  const lastImport = imports.at(-1);
  if (!lastImport || !CATALOGS.test(catalog)) {
    throw new Error(`Unexpected structure of ${catalogPath}`);
  }

  const sanitized = locale.replaceAll('-', '_');
  const identifier = RESERVED_WORDS.has(sanitized) ? `${sanitized}_` : sanitized;
  const key = identifier === locale ? identifier : `'${locale}': ${identifier}`;
  const insertAt = (lastImport.index ?? 0) + lastImport[0].length;
  const withImport = `${catalog.slice(0, insertAt)}\nimport ${identifier} from '../../../messages/${locale}.json';${catalog.slice(insertAt)}`;
  const withEntry = withImport.replace(CATALOGS, (_, open, entries, close) => {
    return `${open}${entries.trimEnd()}, ${key} ${close}`;
  });

  const base = readFileSync(join(root, 'messages', `${settings.baseLocale}.json`), 'utf8');
  settings.locales.push(locale);

  writeFileSync(messagesPath, base);
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
  writeFileSync(catalogPath, withEntry);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const locale = process.argv[2];
  if (!locale) {
    console.error('Usage: pnpm i18n:add <locale>');
    process.exit(2);
  }
  try {
    addLocale(process.cwd(), locale);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
  console.log(
    `Added "${locale}". Next: translate messages/${locale}.json (copied from the base locale), then run pnpm lint:fix.`,
  );
}
