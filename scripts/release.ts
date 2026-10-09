import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/;

export function assertVersion(version: string | undefined): string {
  if (!version || !SEMVER.test(version)) {
    throw new Error('Usage: pnpm release <semver>, for example: pnpm release 0.1.0');
  }
  return version;
}

export function assertReleaseBranch(branch: string, version: string): void {
  if (branch !== `release/v${version}`) {
    throw new Error(`Run the release on branch release/v${version}, not ${branch}`);
  }
}

export function setPackageVersion(packageJson: string, version: string): string {
  const pattern = /("version":\s*")[^"]*(")/;
  if (!pattern.test(packageJson)) throw new Error('package.json has no version field');
  return packageJson.replace(pattern, `$1${version}$2`);
}

function git(...args: string[]): string {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function main(): void {
  const version = assertVersion(process.argv[2]);
  assertReleaseBranch(git('branch', '--show-current'), version);
  if (git('status', '--porcelain') !== '') throw new Error('Working tree must be clean');

  const cliff = fileURLToPath(import.meta.resolve('git-cliff/cli'));
  const result = spawnSync(
    process.execPath,
    [cliff, '--tag', `v${version}`, '--output', 'CHANGELOG.md'],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) throw new Error('git-cliff failed');

  const packagePath = join(process.cwd(), 'package.json');
  writeFileSync(packagePath, setPackageVersion(readFileSync(packagePath, 'utf8'), version));

  console.log(`\nPrepared v${version}. Review CHANGELOG.md, then:`);
  console.log(`  git commit -am "chore(release): v${version}"`);
  console.log('Merge into main with --no-ff, then create the signed tag:');
  console.log(`  git tag -s v${version} -m "v${version}"`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
