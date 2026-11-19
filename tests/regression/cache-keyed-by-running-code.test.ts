/**
 * #391: the audit cache is keyed by the code that computed a verdict, not
 * only by the version string.
 *
 * Two builds of one version (release candidates, a local build, npm link, an
 * install from git) shared cache entries: a candidate measured on a real
 * project returned the previous candidate's verdict, findings its own
 * detector no longer produces, under the same version number.
 *
 * The two "builds" here are code trees that differ in one law's code by a
 * single character: same file names, same sizes, same mtimes, as two
 * tarballs from `npm pack` (which fixes every mtime) would be.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { AuditCache } from '../../src/core/auditing/audit-cache';
import type { AuditResult } from '../../src/core/auditing/audit-types';

const FIXED_MTIME = new Date('1985-10-26T08:15:00Z');

function build(dir: string, lawCode: string): string {
  const files: Record<string, string> = {
    'cli.js': "require('./laws/todo');\n",
    'laws/todo.js': lawCode,
    'laws/todo.d.ts': 'export {};\n',
  };
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    fs.utimesSync(file, FIXED_MTIME, FIXED_MTIME);
  }
  return dir;
}

const verdict = (marker: string): AuditResult =>
  ({
    passed: marker === 'pass',
    results: new Map([[marker, { passed: true }]]),
  }) as unknown as AuditResult;

describe('#391 the cache is keyed by the running code', () => {
  const originalRoot = AuditCache.codeRoot;
  let base: string;
  let project: string;
  let first: string;
  let second: string;

  beforeEach(() => {
    base = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-cache-code-'));
    project = path.join(base, 'project');
    fs.mkdirSync(project);
    first = build(
      path.join(base, 'build-1'),
      'module.exports = /TODO|FIXME/;\n'
    );
    second = build(
      path.join(base, 'build-2'),
      'module.exports = /TODO|XXXXX/;\n'
    );
  });
  afterEach(() => {
    AuditCache.codeRoot = originalRoot;
    fs.rmSync(base, { recursive: true, force: true });
  });

  it('the two builds look identical to a stat-based fingerprint (the probe is honest)', () => {
    const stat = (root: string) =>
      ['cli.js', 'laws/todo.js'].map(rel => {
        const s = fs.statSync(path.join(root, rel));
        return `${rel}:${s.size}:${s.mtimeMs}`;
      });
    expect(stat(second)).toEqual(stat(first));
    expect(AuditCache.codeFingerprint(second)).not.toBe(
      AuditCache.codeFingerprint(first)
    );
  });

  it("RED before #391: a second build of the same version does not get the first build's verdict", () => {
    AuditCache.codeRoot = first;
    AuditCache.set(
      project,
      verdict('fail-202-todos'),
      'files',
      'config',
      'full'
    );

    AuditCache.codeRoot = second;
    expect(AuditCache.get(project, 'files', 'config', 'full')).toBeNull();
  });

  it('the same build twice still gets its own verdict (the cache keeps working)', () => {
    AuditCache.codeRoot = first;
    AuditCache.set(project, verdict('pass'), 'files', 'config', 'full');

    const hit = AuditCache.get(project, 'files', 'config', 'full');
    expect(hit).not.toBeNull();
    expect([...(hit?.results as Map<string, unknown>).keys()]).toEqual([
      'pass',
    ]);
  });

  it('declaration files carry no behaviour and do not change the fingerprint', () => {
    const before = AuditCache.codeFingerprint(first);
    const twin = build(
      path.join(base, 'build-1-twin'),
      'module.exports = /TODO|FIXME/;\n'
    );
    fs.writeFileSync(
      path.join(twin, 'laws/todo.d.ts'),
      'export declare const x: number;\n'
    );
    expect(AuditCache.codeFingerprint(twin)).toBe(before);
  });

  it('an entry written before the field existed is refused', () => {
    AuditCache.codeRoot = first;
    AuditCache.set(project, verdict('pass'), 'files', 'config', 'full');
    const file = path.join(project, '.ruleofcode-cache', 'audit-results.json');
    const entry = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<
      string,
      unknown
    >;
    delete entry.codeFingerprint;
    fs.writeFileSync(file, JSON.stringify(entry));

    expect(AuditCache.get(project, 'files', 'config', 'full')).toBeNull();
  });
});
