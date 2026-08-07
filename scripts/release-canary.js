#!/usr/bin/env node
/**
 * Release canary — red/green proof before every tag (maintainer doctrine).
 *
 * For each supported stack it builds a consumer-shaped fixture and asserts:
 *   GREEN: clean tree + calibrated waivers        -> exit 0
 *   RED:   one real violation (severity: error)   -> exit 1
 *   ZERO:  empty law allowlist                    -> exit 1 (fail-closed refusal)
 *   FLOOR: "Processing N laws" >= stack floor     (collapse detector)
 *
 * The green case self-calibrates: a first pass collects the laws a synthetic
 * fixture cannot satisfy (docs/CI/testing artifacts) and formally waives them
 * via laws.notApplicable — exactly what real consumers do. The red case then
 * violates a law that was passing, escalated to error via laws.severity, so
 * the canary also exercises the severity gate end-to-end through the CLI.
 *
 * Usage:
 *   node scripts/release-canary.js                 # against the built dist/
 *   node scripts/release-canary.js --tarball X.tgz # against the packed tarball
 *                                                  # (installs it like a consumer)
 *
 * Exit code: 0 only when every cell of the matrix is correct.
 */

const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const REPO = path.resolve(__dirname, '..');
const tarballArgIndex = process.argv.indexOf('--tarball');
const TARBALL =
  tarballArgIndex !== -1 ? path.resolve(process.argv[tarballArgIndex + 1]) : null;

// Floors: today's applicable-law counts with safety margin. A drop below the
// floor means the selection collapsed — a blocker, not a warning.
const STACKS = {
  python: {
    floor: 60, // 86 applicable on 2026-07-10
    files: {
      'pyproject.toml': "[project]\nname='canary'\nversion='0.1.0'\n",
      'src/ok.py': 'x = 1\n',
    },
    redFile: { 'src/big.py': Array.from({ length: 40 }, (_, i) => `v${i} = ${i}`).join('\n') + '\n' },
    redLaw: 'Module Size',
    redThresholds: { python: { maxFileLines: 10 } },
    projectType: 'python',
  },
  angular: {
    floor: 80, // frontend + typescript + universal
    files: {
      'package.json': JSON.stringify({ name: 'canary', dependencies: { '@angular/core': '^17.0.0' } }),
      'angular.json': '{}',
      // Nx-monorepo shape — the default includes whitelist scans libs/*/src/**
      'libs/bot/src/ok.ts': 'export const ok = 1;\n',
    },
    redFile: { 'libs/bot/src/risk.ts': 'export const equityFloor = 450;\n' },
    redLaw: 'No Risk Literals',
    redThresholds: undefined,
    projectType: 'angular',
  },
  node: {
    floor: 55, // typescript + universal (75 applicable on 2026-07-10)
    files: {
      'package.json': JSON.stringify({ name: 'canary-node', version: '1.0.0' }),
      'tsconfig.json': '{}',
      'src/ok.ts': 'export const ok = 1;\n',
    },
    redFile: { 'src/bad.ts': 'export const risky: any = JSON.parse("{}");\n' },
    redLaw: 'No Explicit Any / Non-Null Assertion',
    redThresholds: undefined,
    projectType: 'node',
  },
};

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFiles(dir, files) {
  for (const [name, content] of Object.entries(files)) {
    const p = path.join(dir, name);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
}

/** Resolve the CLI to test: built dist, or the packed tarball installed like a consumer. */
function resolveCli() {
  if (!TARBALL) return { cmd: process.execPath, baseArgs: [path.join(REPO, 'dist', 'cli.js')] };
  const consumer = makeTempDir('roc-canary-consumer-');
  fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ name: 'canary-consumer', private: true }));
  execSync(`npm install --no-audit --no-fund "${TARBALL}"`, { cwd: consumer, stdio: 'pipe' });
  const bin = path.join(consumer, 'node_modules', '@ruleofcode', 'core', 'dist', 'cli.js');
  return { cmd: process.execPath, baseArgs: [bin] };
}

function runAudit(cli, cwd, extraArgs = []) {
  try {
    const out = execFileSync(
      cli.cmd,
      [...cli.baseArgs, 'audit', '--config', 'ruleofcode.config.json', ...extraArgs],
      { cwd, encoding: 'utf8', stdio: 'pipe' }
    );
    return { code: 0, out };
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

function lawsProcessed(out) {
  const m = out.replace(/\[[0-9;]*m/g, '').match(/Processing (\d+) laws/);
  return m ? Number(m[1]) : null;
}

/**
 * Canonical names of failing laws, from the exported JSON report (lawTitle is
 * the registry name — the printed lawName may be a checker-local slug).
 *
 * Returns null when the audit produced no readable report — a packaged CLI that
 * cannot run is a canary FAILURE, and it must be reported as a verdict. This
 * used to throw an unhandled ENOENT: the canary blocked correctly (exit 1) but
 * printed a stack trace instead of saying what was wrong (QA).
 */
function failedLawTitles(dir) {
  try {
    const report = JSON.parse(
      fs.readFileSync(path.join(dir, 'ruleofcode-report.json'), 'utf8')
    );
    return [
      ...new Set(
        report.results
          .filter(r => r.passed === false)
          .map(r => r.lawTitle ?? r.lawName)
          .filter(Boolean)
      ),
    ];
  } catch {
    return null;
  }
}

function writeConfig(dir, stackKey, stack, extra = {}) {
  const config = {
    project: { name: `canary-${stackKey}`, type: stack.projectType },
    laws: { paretoMode: false, ...extra.laws },
    ...(extra.thresholds ? { thresholds: extra.thresholds } : {}),
  };
  fs.writeFileSync(path.join(dir, 'ruleofcode.config.json'), JSON.stringify(config, null, 2));
}

function main() {
  const cli = resolveCli();
  const rows = [];
  let ok = true;

  for (const [stackKey, stack] of Object.entries(STACKS)) {
    const dir = makeTempDir(`roc-canary-${stackKey}-`);
    writeFiles(dir, stack.files);

    // Pass 1 (calibration): find what a synthetic fixture can't satisfy.
    writeConfig(dir, stackKey, stack, {});
    const cal = runAudit(cli, dir, ['--export', 'json']);
    const floorCount = lawsProcessed(cal.out);
    const failed = failedLawTitles(dir);

    if (failed === null) {
      // The CLI under test never produced a report: it did not run at all.
      rows.push(
        `${stackKey.padEnd(8)} | ❌ the audited CLI produced no report — it did not run (exit ${cal.code}). First line: ${(cal.out.split('\n').find(Boolean) ?? '(no output)').slice(0, 90)}`
      );
      ok = false;
      fs.rmSync(dir, { recursive: true, force: true });
      continue;
    }

    const waivers = {};
    for (const name of failed) waivers[name] = 'canary fixture: not satisfiable synthetically';

    // GREEN: waived config on the clean tree must pass.
    writeConfig(dir, stackKey, stack, { laws: { notApplicable: waivers } });
    const green = runAudit(cli, dir);

    // RED: one real violation, escalated to error, must fail.
    writeFiles(dir, stack.redFile);
    writeConfig(dir, stackKey, stack, {
      laws: { notApplicable: waivers, severity: { [stack.redLaw]: 'error' } },
      thresholds: stack.redThresholds,
    });
    const red = runAudit(cli, dir);

    // ZERO: empty allowlist must refuse (fail-closed).
    writeConfig(dir, stackKey, stack, { laws: { enabled: {} } });
    const zero = runAudit(cli, dir);
    const zeroRefused = /refusing to report compliance/.test(zero.out);

    const floorOk = floorCount !== null && floorCount >= stack.floor;
    const greenOk = green.code === 0;
    const redOk = red.code === 1;
    const zeroOk = zero.code === 1 && zeroRefused;
    // Runtime errors in checkers reduce coverage silently (QA-3) — any
    // TypeError in any run is a canary failure even when exit codes look right.
    const noNoise = !/TypeError/.test(cal.out + green.out + red.out + zero.out);
    ok = ok && floorOk && greenOk && redOk && zeroOk && noNoise;

    rows.push(
      `${stackKey.padEnd(8)} | laws=${String(floorCount).padEnd(4)} floor>=${String(stack.floor).padEnd(3)} ${floorOk ? '✅' : '❌'} | green exit ${green.code} ${greenOk ? '✅' : '❌'} | red exit ${red.code} ${redOk ? '✅' : '❌'} | zero-laws exit ${zero.code}${zeroRefused ? ' (refused)' : ''} ${zeroOk ? '✅' : '❌'} | no-TypeError ${noNoise ? '✅' : '❌'}`
    );

    fs.rmSync(dir, { recursive: true, force: true });
  }

  if (TARBALL) {
    const prov = verifyProvenance(TARBALL);
    ok = ok && prov.ok;
    rows.push(
      `provenance | shipped=${prov.shipped} files | fresh=${prov.fresh} files | ghosts=${prov.ghosts.length} ${prov.ok ? '✅' : '❌'}`
    );
    if (!prov.ok) {
      prov.ghosts
        .slice(0, 10)
        .forEach(g => rows.push(`           | 👻 shipped but not in a clean build: ${g}`));
      prov.missing
        .slice(0, 10)
        .forEach(m => rows.push(`           | ❓ in a clean build but not shipped: ${m}`));
    }
  }

  console.log(`\nRelease canary — ${TARBALL ? `tarball ${path.basename(TARBALL)}` : 'built dist/'}`);
  console.log('─'.repeat(100));
  rows.forEach(r => console.log(r));
  console.log('─'.repeat(100));
  console.log(ok ? '✅ CANARY GREEN — release may proceed' : '❌ CANARY RED — DO NOT TAG');
  process.exit(ok ? 0 : 1);
}

/**
 * List the file entries of a .tgz, in Node.
 *
 * Not `tar -tzf`: GNU tar on Windows reads `D:\...` as a REMOTE HOST (the colon)
 * and cmd.exe eats the backslashes. Shelling out here would have made the check
 * fail for a reason that has nothing to do with the artifact — a false red is as
 * useless as a false green.
 */
function listTarEntries(tgz) {
  const buf = zlib.gunzipSync(fs.readFileSync(tgz));
  const entries = new Set();

  for (let offset = 0; offset + 512 <= buf.length; ) {
    const name = buf.toString('utf8', offset, offset + 100).replace(/\0.*$/, '');
    if (!name) break; // two zero blocks terminate the archive

    const size = parseInt(
      buf.toString('utf8', offset + 124, offset + 136).replace(/\0.*$/, '').trim() || '0',
      8
    );
    const type = buf.toString('utf8', offset + 156, offset + 157);

    if (type === '0' || type === '') entries.add(name); // regular files only

    offset += 512 + Math.ceil(size / 512) * 512;
  }

  return entries;
}

/**
 * The artifact we SHIP must be the code we TAGGED.
 *
 * v7.9.3 shipped 56 compiled files of a law deleted from source (216e67c): we
 * packed on top of a stale dist/. The ghosts were unreachable, so nothing broke
 * — but "the delivered artifact is the tagged code" stopped being a guarantee
 * and became a hope. QA caught it by hashing a fresh pack against the shipped
 * one; that comparison now runs before every tag.
 *
 * A green build is not evidence — the same lesson, one level up, at the package.
 */
function verifyProvenance(tarball) {
  const out = makeTempDir('roc-provenance-out-');
  const tree = makeTempDir('roc-provenance-tree-');
  fs.rmSync(tree, { recursive: true, force: true }); // git worktree wants to create it

  try {
    // Pack from a PRISTINE CHECKOUT of HEAD, in its own worktree — never in the
    // maintainer's tree. `prepack` deletes dist/, so packing in place would
    // destroy the working build and two concurrent runs would eat each other's
    // artifact mid-build (QA hit exactly that, and it cost them a false red).
    // Packing from HEAD is also the stronger claim: the artifact is the COMMITTED
    // code, not whatever happens to be lying in the tree.
    execSync(`git worktree add --detach --quiet "${tree}" HEAD`, {
      cwd: REPO,
      stdio: 'ignore',
    });
    // The build needs the toolchain; a junction costs nothing and copies nothing.
    fs.symlinkSync(
      path.join(REPO, 'node_modules'),
      path.join(tree, 'node_modules'),
      'junction'
    );

    const packed = execSync(`npm pack --pack-destination "${out}"`, {
      cwd: tree,
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .pop()
      .trim();

    const shipped = listTarEntries(tarball);
    const fresh = listTarEntries(path.join(out, packed));

    const ghosts = [...shipped].filter(f => !fresh.has(f)).sort();
    const missing = [...fresh].filter(f => !shipped.has(f)).sort();

    return {
      ok: ghosts.length === 0 && missing.length === 0,
      shipped: shipped.size,
      fresh: fresh.size,
      ghosts,
      missing,
    };
  } catch (error) {
    return {
      ok: false,
      shipped: 0,
      fresh: 0,
      ghosts: [`provenance check failed: ${error.message}`],
      missing: [],
    };
  } finally {
    try {
      execSync(`git worktree remove --force "${tree}"`, {
        cwd: REPO,
        stdio: 'ignore',
      });
    } catch {
      fs.rmSync(tree, { recursive: true, force: true });
    }
    fs.rmSync(out, { recursive: true, force: true });
  }
}

main();
