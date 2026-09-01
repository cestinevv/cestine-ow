import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_IMAGE_DIR = path.join(REPO_ROOT, 'src', 'assets', 'image');

type RowStatus = 'ok' | 'dry-run' | 'kept-larger' | 'error';

type ResultRow = {
  relPath: string;
  before: number;
  after: number;
  status: RowStatus;
  detail?: string;
};

function formatBytes(n: number): string {
  if (n === 0) return '0 B';
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(n);
  if (v < 1024) return `${sign}${v} B`;
  if (v < 1024 * 1024) return `${sign}${(v / 1024).toFixed(2)} KiB`;
  return `${sign}${(v / (1024 * 1024)).toFixed(2)} MiB`;
}

function pctSaved(before: number, after: number): string {
  if (before === 0) return 'n/a';
  const saved = before - after;
  return `${((saved / before) * 100).toFixed(2)}%`;
}

function walkImages(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkImages(full));
    } else if (/\.(png|gif)$/i.test(entry.name)) {
      results.push(full);
    }
  }
  return results.sort();
}

function parseArgs(argv: string[]) {
  const dryRun = argv.includes('--dry-run');
  const staged = argv.includes('--staged');
  const rest = argv.filter(
    (a) => a !== '--dry-run' && a !== '--staged' && a !== '--',
  );
  const paths = rest
    .filter((a) => !a.startsWith('-'))
    .map((p) => (path.isAbsolute(p) ? p : path.resolve(REPO_ROOT, p)));
  return { dryRun, staged, paths };
}

function getStagedImagePaths(): string[] {
  const r = spawnSync(
    'git',
    ['diff', '--cached', '--name-only', '--diff-filter=ACM'],
    {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    },
  );
  if (r.status !== 0) {
    console.error(r.stderr || 'git diff --cached failed');
    process.exit(1);
  }
  const lines = (r.stdout ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return lines
    .filter((line) => {
      const n = line.replaceAll('\\', '/');
      return n.startsWith('src/assets/image/') && /\.(png|gif)$/i.test(n);
    })
    .map((line) => path.join(REPO_ROOT, line))
    .filter((p) => fs.existsSync(p))
    .sort();
}

function makeTempPath(targetFile: string): string {
  const dir = path.dirname(targetFile);
  const base = path.basename(targetFile);
  return path.join(
    dir,
    `.${base}.lossless-opt-${process.pid}-${Math.random().toString(36).slice(2)}.tmp`,
  );
}

async function optimizePng(
  filePath: string,
  tmpPath: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await sharp(filePath)
      .png({ compressionLevel: 9, effort: 10 })
      .toFile(tmpPath);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message };
  }
}

function optimizeGif(
  gifsiclePath: string,
  filePath: string,
  tmpPath: string,
): { ok: true } | { ok: false; message: string } {
  const r = spawnSync(gifsiclePath, ['-O3', '-w', '-o', tmpPath, filePath], {
    encoding: 'utf-8',
  });
  if (r.status !== 0) {
    const msg =
      (r.stderr || r.stdout || `exit ${r.status}`).trim() || `exit ${r.status}`;
    return { ok: false, message: msg };
  }
  if (!fs.existsSync(tmpPath)) {
    return { ok: false, message: 'gifsicle did not write output file' };
  }
  return { ok: true };
}

async function processFile(
  filePath: string,
  dryRun: boolean,
  gifsiclePath: string,
): Promise<ResultRow> {
  const relPath = path.relative(REPO_ROOT, filePath);
  let before = 0;
  try {
    before = fs.statSync(filePath).size;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { relPath, before: 0, after: 0, status: 'error', detail: message };
  }

  const ext = path.extname(filePath).toLowerCase();
  const tmpPath = makeTempPath(filePath);

  const cleanupTmp = () => {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  };

  let outcome: { ok: true } | { ok: false; message: string };
  if (ext === '.png') {
    outcome = await optimizePng(filePath, tmpPath);
  } else if (ext === '.gif') {
    outcome = optimizeGif(gifsiclePath, filePath, tmpPath);
  } else {
    return {
      relPath,
      before,
      after: before,
      status: 'error',
      detail: 'unsupported extension',
    };
  }

  if (!outcome.ok) {
    cleanupTmp();
    return {
      relPath,
      before,
      after: before,
      status: 'error',
      detail: outcome.message,
    };
  }

  let after: number;
  try {
    after = fs.statSync(tmpPath).size;
  } catch (e) {
    cleanupTmp();
    const message = e instanceof Error ? e.message : String(e);
    return { relPath, before, after: before, status: 'error', detail: message };
  }

  if (dryRun) {
    cleanupTmp();
    return { relPath, before, after, status: 'dry-run' };
  }

  if (after > before) {
    cleanupTmp();
    return {
      relPath,
      before,
      after: before,
      status: 'kept-larger',
      detail: `optimized would be ${formatBytes(after)}`,
    };
  }

  try {
    fs.renameSync(tmpPath, filePath);
  } catch (e) {
    cleanupTmp();
    const message = e instanceof Error ? e.message : String(e);
    return { relPath, before, after: before, status: 'error', detail: message };
  }

  let finalSize = after;
  try {
    finalSize = fs.statSync(filePath).size;
  } catch {
    /* keep after */
  }

  return { relPath, before, after: finalSize, status: 'ok' };
}

function printTable(rows: ResultRow[]) {
  const headers = ['file', 'before', 'after', 'delta', 'saved%', 'status'];
  const lines = rows.map((r) => {
    const delta = r.after - r.before;
    const deltaStr = delta === 0 ? '0 B' : formatBytes(delta);
    const pct =
      r.before === 0 && r.after === 0 ? 'n/a' : pctSaved(r.before, r.after);
    let statusCell: string = r.status;
    if (r.detail) statusCell = `${r.status} (${r.detail})`;
    return [
      r.relPath,
      formatBytes(r.before),
      formatBytes(r.after),
      deltaStr,
      pct,
      statusCell,
    ].join('\t');
  });
  console.log(
    [
      '\n=== Image lossless optimize ===',
      headers.join('\t'),
      ...lines,
      '',
    ].join('\n'),
  );
}

function effectiveAfterOnDisk(r: ResultRow, dryRun: boolean): number {
  if (r.status === 'error' || r.status === 'kept-larger') return r.before;
  if (dryRun && r.status === 'dry-run') return r.after;
  return r.after;
}

function printSummary(rows: ResultRow[], dryRun: boolean) {
  const errors = rows.filter((r) => r.status === 'error').length;
  const skippedLarger = rows.filter((r) => r.status === 'kept-larger').length;
  const ok = rows.filter(
    (r) => r.status === 'ok' || r.status === 'dry-run',
  ).length;

  const sumBefore = rows.reduce((s, r) => s + r.before, 0);
  const sumAfterEffective = rows.reduce(
    (s, r) => s + effectiveAfterOnDisk(r, dryRun),
    0,
  );

  const totalDelta = sumAfterEffective - sumBefore;
  const totalSavedPct =
    sumBefore === 0 ? 'n/a' : pctSaved(sumBefore, sumAfterEffective);

  console.log('--- Summary ---');
  console.log(
    `rows: ${rows.length} | ok${dryRun ? '/dry-run' : ''}: ${ok} | kept-larger: ${skippedLarger} | errors: ${errors}`,
  );
  if (dryRun) {
    console.log(
      '(dry-run: "after" and totals use optimized size from temp file; disk unchanged)',
    );
  }
  console.log(
    `sum(before): ${formatBytes(sumBefore)} | sum(after): ${formatBytes(sumAfterEffective)}`,
  );
  console.log(
    `total delta: ${totalDelta === 0 ? '0 B' : formatBytes(totalDelta)} | total saved vs sum(before): ${totalSavedPct}`,
  );
  console.log('');
}

async function main() {
  // gifsicle npm package ships without TypeScript declarations
  // @ts-expect-error -- resolved path is the native gifsicle binary (string)
  const mod = (await import('gifsicle')) as { default: string };
  const gifsiclePath = mod.default;

  const argv = process.argv.slice(2);
  const { dryRun, staged, paths: argPaths } = parseArgs(argv);

  let files: string[];
  if (staged) {
    files = getStagedImagePaths();
  } else if (argPaths.length > 0) {
    files = argPaths.filter((p) => /\.(png|gif)$/i.test(p) && fs.existsSync(p));
  } else {
    files = walkImages(DEFAULT_IMAGE_DIR);
  }

  if (files.length === 0) {
    console.log('No images to process.');
    if (staged) console.log('(no staged PNG/GIF under src/assets/image)');
    process.exit(0);
  }

  const rows: ResultRow[] = [];
  for (const f of files) {
    rows.push(await processFile(f, dryRun, gifsiclePath));
  }

  printTable(rows);
  printSummary(rows, dryRun);

  const hasError = rows.some((r) => r.status === 'error');
  process.exit(hasError ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
