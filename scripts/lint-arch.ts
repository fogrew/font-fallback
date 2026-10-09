import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const ENV_ALLOWLIST = [
  'PATH',
  'HOME',
  'USERPROFILE',
  'SystemRoot',
  'SYSTEMROOT',
  'TEMP',
  'TMP',
  'TMPDIR',
];
const ENTITY_LEVELS = new Set(['pages', 'modules', 'common']);
const IMPORT_SPECIFIER =
  /(?:^|\n)\s*import\s+(?:[^'"\n]*?\sfrom\s+)?['"]([^'"\n]+)['"]|import\(\s*['"]([^'"\n]+)['"]\s*\)/g;

interface Checksums {
  version: string;
  binaries: Record<string, string>;
}

export function scrubbedEnv(env: NodeJS.ProcessEnv, webDist: string): NodeJS.ProcessEnv {
  const clean: NodeJS.ProcessEnv = { FEOD_ANALYZER_WEB_DIST: webDist };
  for (const name of ENV_ALLOWLIST) {
    if (env[name] !== undefined) clean[name] = env[name];
  }
  return clean;
}

function entityKey(srcRelativePath: string): string | null {
  const [level, name] = srcRelativePath.split(sep);
  if (!level || level.startsWith('..')) return null;
  return ENTITY_LEVELS.has(level) ? `${level}/${name}` : level;
}

export function findAstroImportViolations(root: string): string[] {
  const src = join(root, 'src');
  const violations: string[] = [];
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return walk(path);
      return entry.name.endsWith('.astro') ? [path] : [];
    });
  for (const file of walk(src)) {
    const fileKey = entityKey(relative(src, file));
    for (const match of readFileSync(file, 'utf8').matchAll(IMPORT_SPECIFIER)) {
      const specifier = match[1] ?? match[2];
      if (!specifier?.startsWith('.')) continue;
      const target = relative(src, resolve(dirname(file), specifier));
      if (entityKey(target) !== fileKey) {
        violations.push(
          `${relative(root, file)}: relative import "${specifier}" leaves its entity; use the public API alias`,
        );
      }
    }
  }
  return violations;
}

export function verifyBinary(
  binary: string,
  platform: string,
  checksums: Checksums,
  installed: string,
): void {
  if (installed !== checksums.version) {
    throw new Error(
      `@feod/analyzer ${installed} is installed but scripts/feod-analyzer.sha256.json covers ${checksums.version}; vet the new release and update the checksums`,
    );
  }
  const expected = checksums.binaries[platform];
  if (!expected) throw new Error(`No recorded checksum for platform ${platform}`);
  const actual = createHash('sha256').update(readFileSync(binary)).digest('hex');
  if (actual !== expected) {
    throw new Error(`feod-analyzer binary for ${platform} does not match the vetted checksum`);
  }
}

function main(): void {
  const root = process.cwd();
  const require = createRequire(import.meta.url);
  const packageJson = require.resolve('@feod/analyzer/package.json');
  const packageDir = dirname(packageJson);
  const installed = (JSON.parse(readFileSync(packageJson, 'utf8')) as { version: string }).version;
  const platform = `${process.platform}-${process.arch}`;
  const binary = join(
    packageDir,
    'bin',
    platform,
    process.platform === 'win32' ? 'feod-analyzer.exe' : 'feod-analyzer',
  );
  const checksums = JSON.parse(
    readFileSync(join(root, 'scripts/feod-analyzer.sha256.json'), 'utf8'),
  ) as Checksums;

  verifyBinary(binary, platform, checksums, installed);

  const run = spawnSync(binary, ['analyze', '.', '--fail-on', 'warning'], {
    cwd: root,
    stdio: 'inherit',
    env: scrubbedEnv(process.env, join(packageDir, 'web', 'dist')),
  });
  if (run.error) throw run.error;

  const violations = findAstroImportViolations(root);
  for (const violation of violations) console.error(violation);
  process.exit(run.status !== 0 || violations.length > 0 ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(2);
  }
}
