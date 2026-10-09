import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findAstroImportViolations, scrubbedEnv, verifyBinary } from './lint-arch';

const roots: string[] = [];

function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'lint-arch-'));
  roots.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('scrubbedEnv', () => {
  it('keeps only allow-listed variables and the web dist path', () => {
    const env = scrubbedEnv(
      { PATH: '/bin', CLOUDFLARE_API_TOKEN: 'secret', GITHUB_TOKEN: 'secret', HOME: '/home/x' },
      '/dist',
    );
    expect(env).toEqual({ PATH: '/bin', HOME: '/home/x', FEOD_ANALYZER_WEB_DIST: '/dist' });
  });
});

describe('findAstroImportViolations', () => {
  it('accepts relative imports inside the same entity and inside app', () => {
    const root = project({
      'src/modules/a/ui/A.astro':
        "---\nimport B from './B.astro';\nimport x from '../lib/x';\n---\n",
      'src/app/pages/index.astro': "---\nimport L from '../layouts/L.astro';\n---\n",
    });
    expect(findAstroImportViolations(root)).toEqual([]);
  });

  it('flags relative imports that reach into another entity or level', () => {
    const root = project({
      'src/pages/home/ui/Home.astro':
        "---\nimport s from '../../../modules/x/internal/secret';\nimport t from '../../other/ui/T.astro';\n---\n",
      'src/app/pages/index.astro':
        "---\nconst m = import('../../modules/x/internal/secret');\n---\n",
    });
    const violations = findAstroImportViolations(root);
    expect(violations).toHaveLength(3);
    expect(violations.join('\n')).toContain('modules/x/internal/secret');
  });

  it('ignores alias and package imports', () => {
    const root = project({
      'src/modules/a/ui/A.astro':
        "---\nimport b from '@/common/i18n';\nimport p from 'astro';\n---\n",
    });
    expect(findAstroImportViolations(root)).toEqual([]);
  });
});

describe('verifyBinary', () => {
  const root = (): string => project({ 'bin/feod-analyzer': 'vetted binary' });
  const sha = 'a2f8a4b4b8d1f83d9b4c3b0e0a8b6c3c0e6f5e0d7a1b2c3d4e5f60718293a4b5';

  it('rejects an unexpected release', () => {
    const dir = root();
    expect(() =>
      verifyBinary(
        join(dir, 'bin/feod-analyzer'),
        'p',
        { version: '1.0.0', binaries: { p: sha } },
        '2.0.0',
      ),
    ).toThrow(/vet the new release/);
  });

  it('rejects a binary whose checksum differs', () => {
    const dir = root();
    expect(() =>
      verifyBinary(
        join(dir, 'bin/feod-analyzer'),
        'p',
        { version: '1.0.0', binaries: { p: sha } },
        '1.0.0',
      ),
    ).toThrow(/does not match/);
  });

  it('rejects a platform without a recorded checksum', () => {
    const dir = root();
    expect(() =>
      verifyBinary(
        join(dir, 'bin/feod-analyzer'),
        'q',
        { version: '1.0.0', binaries: {} },
        '1.0.0',
      ),
    ).toThrow(/No recorded checksum/);
  });
});
