import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_VIDEO_DIR = path.join(REPO_ROOT, 'src', 'assets', 'videos');

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

function walkVideos(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkVideos(full));
    } else if (/\.mp4$/i.test(entry.name)) {
      results.push(full);
    }
  }
  return results.sort();
}

function parseArgs(argv: string[]) {
  const dryRun = argv.includes('--dry-run');
  const staged = argv.includes('--staged');
  let crf = 20;
  let preset = 'slow';
  const consumed = new Set<number>();

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--crf' && argv[i + 1] !== undefined) {
      const n = Number(argv[i + 1]);
      if (!Number.isNaN(n)) crf = n;
      consumed.add(i);
      consumed.add(i + 1);
      i++;
    } else if (argv[i] === '--preset' && argv[i + 1] !== undefined) {
      preset = argv[i + 1];
      consumed.add(i);
      consumed.add(i + 1);
      i++;
    }
  }

  const paths: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (consumed.has(i)) continue;
    const a = argv[i];
    if (a === '--dry-run' || a === '--staged' || a === '--') continue;
    if (a.startsWith('-')) continue;
    paths.push(path.isAbsolute(a) ? a : path.resolve(REPO_ROOT, a));
  }

  return { dryRun, staged, paths, crf, preset };
}

function getStagedVideoPaths(): string[] {
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
      return n.startsWith('src/assets/videos/') && /\.mp4$/i.test(n);
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
    `.${base}.crf-opt-${process.pid}-${Math.random().toString(36).slice(2)}.tmp`,
  );
}

function requireFfmpegTools(): void {
  for (const bin of ['ffmpeg', 'ffprobe']) {
    const r = spawnSync(bin, ['-hide_banner', '-version'], {
      encoding: 'utf-8',
    });
    if (r.error && (r.error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(
        `${bin} not found on PATH. Install ffmpeg (e.g. macOS: brew install ffmpeg).`,
      );
      process.exit(1);
    }
    if (r.status !== 0) {
      console.error(
        `${bin} -version failed:\n${(r.stderr || r.stdout || `exit ${r.status}`).trim()}`,
      );
      process.exit(1);
    }
  }
}

function hasAudioStream(filePath: string): boolean {
  const r = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'a',
      '-show_entries',
      'stream=index',
      '-of',
      'csv=p=0',
      filePath,
    ],
    { encoding: 'utf-8' },
  );
  if (r.status !== 0) return false;
  return Boolean((r.stdout ?? '').trim());
}

function runFfmpegEncode(
  filePath: string,
  tmpPath: string,
  crf: number,
  preset: string,
  withAudio: boolean,
): { ok: true } | { ok: false; message: string } {
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    filePath,
    '-c:v',
    'libx264',
    '-crf',
    String(crf),
    '-preset',
    preset,
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-f',
    'mp4',
  ];
  if (withAudio) {
    args.push('-c:a', 'aac', '-b:a', '128k');
  } else {
    args.push('-an');
  }
  args.push(tmpPath);

  const r = spawnSync('ffmpeg', args, { encoding: 'utf-8' });
  if (r.status !== 0) {
    const msg =
      (r.stderr || r.stdout || `exit ${r.status}`).trim() || `exit ${r.status}`;
    return { ok: false, message: msg };
  }
  if (!fs.existsSync(tmpPath)) {
    return { ok: false, message: 'ffmpeg did not write output file' };
  }
  return { ok: true };
}

function processFile(
  filePath: string,
  dryRun: boolean,
  crf: number,
  preset: string,
): ResultRow {
  const relPath = path.relative(REPO_ROOT, filePath);
  let before = 0;
  try {
    before = fs.statSync(filePath).size;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { relPath, before: 0, after: 0, status: 'error', detail: message };
  }

  const tmpPath = makeTempPath(filePath);
  const cleanupTmp = () => {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  };

  const withAudio = hasAudioStream(filePath);
  const outcome = runFfmpegEncode(filePath, tmpPath, crf, preset, withAudio);

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
    ['\n=== Video CRF optimize ===', headers.join('\t'), ...lines, ''].join(
      '\n',
    ),
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

function main() {
  requireFfmpegTools();

  const argv = process.argv.slice(2);
  const { dryRun, staged, paths: argPaths, crf, preset } = parseArgs(argv);

  let files: string[];
  if (staged) {
    files = getStagedVideoPaths();
  } else if (argPaths.length > 0) {
    files = argPaths.filter((p) => /\.mp4$/i.test(p) && fs.existsSync(p));
  } else {
    files = walkVideos(DEFAULT_VIDEO_DIR);
  }

  if (files.length === 0) {
    console.log('No videos to process.');
    if (staged) console.log('(no staged MP4 under src/assets/videos)');
    process.exit(0);
  }

  console.log(`CRF=${crf} preset=${preset}${dryRun ? ' (dry-run)' : ''}`);

  const rows: ResultRow[] = [];
  for (const f of files) {
    rows.push(processFile(f, dryRun, crf, preset));
  }

  printTable(rows);
  printSummary(rows, dryRun);

  const hasError = rows.some((r) => r.status === 'error');
  process.exit(hasError ? 1 : 0);
}

main();
