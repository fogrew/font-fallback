import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const pnpm = 'pnpm';
const started = Date.now();
const report = { startedAt: new Date(started).toISOString(), steps: [] };

function step(name, command, args, timeoutMs = 300_000) {
  const t0 = Date.now();
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === 'win32',
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const entry = {
    name,
    ok: result.status === 0,
    code: result.status,
    signal: result.signal,
    error: result.error ? String(result.error.message) : undefined,
    ms: Date.now() - t0,
    tail: output.slice(-3500),
  };
  report.steps.push(entry);
  console.log(`[spike] ${name}: ${entry.ok ? 'ok' : 'FAILED'} in ${entry.ms} ms`);
  return entry;
}

step('system', 'sh', [
  '-c',
  'uname -a; head -3 /etc/os-release; id; nproc; free -m | head -2; df -h / | tail -1; node --version; (command -v sudo || echo no-sudo); (command -v apt-get || echo no-apt-get)',
]);
step('install-chromium', pnpm, ['exec', 'playwright', 'install', 'chromium']);
step('missing-libs', 'sh', [
  '-c',
  'for f in $(find "$HOME/.cache/ms-playwright" -type f \\( -name chrome -o -name headless_shell \\) 2>/dev/null); do echo "== $f"; ldd "$f" | grep "not found" || echo "all libs found"; done',
]);
step('launch-chromium', process.execPath, [
  '--input-type=module',
  '-e',
  "import { chromium } from '@playwright/test'; const b = await chromium.launch(); const p = await b.newPage(); await p.goto('data:text/html,<title>ok</title>'); console.log(await p.title(), b.version()); await b.close();",
]);
step(
  'install-with-deps',
  pnpm,
  ['exec', 'playwright', 'install', '--with-deps', 'chromium'],
  120_000,
);
step('e2e-worker', pnpm, [
  'exec',
  'playwright',
  'test',
  '--config',
  'tests/worker/playwright.config.ts',
]);

report.totalMs = Date.now() - started;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/spike-playwright.json', JSON.stringify(report, null, 2));
console.log(`[spike] report written, total ${report.totalMs} ms`);
