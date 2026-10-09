import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addLocale } from './i18n-add.ts';

const repo = join(import.meta.dirname, '..');
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'i18n-add-'));
  cpSync(join(repo, 'project.inlang'), join(root, 'project.inlang'), { recursive: true });
  cpSync(join(repo, 'messages'), join(root, 'messages'), { recursive: true });
  cpSync(join(repo, 'src/common/i18n/catalog.ts'), join(root, 'src/common/i18n/catalog.ts'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('addLocale', () => {
  it('registers the locale in settings, messages and the catalog', () => {
    addLocale(root, 'de');

    const settings = JSON.parse(readFileSync(join(root, 'project.inlang/settings.json'), 'utf8'));
    expect(settings.locales).toContain('de');
    expect(readFileSync(join(root, 'messages/de.json'), 'utf8')).toBe(
      readFileSync(join(root, 'messages/en.json'), 'utf8'),
    );

    const catalog = readFileSync(join(root, 'src/common/i18n/catalog.ts'), 'utf8');
    expect(catalog).toContain("import de from '../../../messages/de.json';");
    expect(catalog).toMatch(/catalogs = \{[^}]*\bde\b[^}]*\} satisfies/);
  });

  it('supports region tags', () => {
    addLocale(root, 'pt-BR');
    const catalog = readFileSync(join(root, 'src/common/i18n/catalog.ts'), 'utf8');
    expect(catalog).toContain("import pt_BR from '../../../messages/pt-BR.json';");
    expect(catalog).toContain("'pt-BR': pt_BR");
  });

  it('avoids reserved words as import names', () => {
    addLocale(root, 'in');
    const catalog = readFileSync(join(root, 'src/common/i18n/catalog.ts'), 'utf8');
    expect(catalog).toContain("import in_ from '../../../messages/in.json';");
    expect(catalog).toContain("'in': in_");
  });

  it('rejects invalid tags and duplicates', () => {
    expect(() => addLocale(root, 'EN_us')).toThrow(/not a valid locale tag/);
    expect(() => addLocale(root, 'ru')).toThrow(/already exists/);
  });
});
