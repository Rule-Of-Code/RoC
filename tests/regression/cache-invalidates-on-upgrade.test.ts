import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { AuditCache } from '../../src/core/auditing/audit-cache';
import type { AuditResult } from '../../src/core/auditing/audit-types';

/**
 * Every release changes what a law reports — that is what a release IS here.
 *
 * The cache key was files + config + git state + mode, none of which change
 * when the tool is upgraded. So a consumer who upgraded and re-ran was served
 * the PREVIOUS version's verdict: identical output, byte for byte, from a build
 * that no longer existed.
 *
 * A reporter hit exactly this. They upgraded, re-tested, saw the same finding
 * to the character, and correctly filed it as unfixed — while the new version,
 * run against the same tree with the cache bypassed, produced the corrected
 * answer. The fix had shipped and could not be seen.
 *
 * The other direction is worse: a law TIGHTENED in a new version keeps serving
 * the old PASSED.
 */
describe('the cache does not survive a tool upgrade', () => {
  let root: string;

  const cacheFile = (): string =>
    path.join(root, '.ruleofcode-cache', 'audit-results.json');

  const someResult = (marker: string): AuditResult =>
    ({
      passed: true,
      results: new Map([[marker, { passed: true }]]),
    }) as unknown as AuditResult;

  const currentVersion = (): string =>
    (
      JSON.parse(
        fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')
      ) as { version: string }
    ).version;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-cache-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('serves a verdict computed by this version', () => {
    AuditCache.set(root, someResult('fresh'), 'files', 'config', 'full');

    expect(AuditCache.get(root, 'files', 'config', 'full')).not.toBeNull();
  });

  it('refuses a verdict computed by a different version', () => {
    AuditCache.set(root, someResult('stale'), 'files', 'config', 'full');

    // Everything else identical — only the version the entry was written under
    // differs, which is exactly the upgrade case.
    const entry = JSON.parse(fs.readFileSync(cacheFile(), 'utf8')) as {
      toolVersion: string;
    };
    expect(entry.toolVersion).toBe(currentVersion());
    entry.toolVersion = '0.0.1-previous';
    fs.writeFileSync(cacheFile(), JSON.stringify(entry));

    expect(AuditCache.get(root, 'files', 'config', 'full')).toBeNull();
  });

  it('refuses an entry written before the field existed', () => {
    AuditCache.set(root, someResult('ancient'), 'files', 'config', 'full');

    const entry = JSON.parse(fs.readFileSync(cacheFile(), 'utf8')) as Record<
      string,
      unknown
    >;
    delete entry.toolVersion;
    fs.writeFileSync(cacheFile(), JSON.stringify(entry));

    expect(AuditCache.get(root, 'files', 'config', 'full')).toBeNull();
  });

  /** The keys that already worked must keep working. */
  it.each([
    ['files changed', 'other-files', 'config', 'full'],
    ['config changed', 'files', 'other-config', 'full'],
    ['mode changed', 'files', 'config', 'pre-commit'],
  ])('still refuses when %s', (_label, filesHash, configHash, mode) => {
    AuditCache.set(root, someResult('x'), 'files', 'config', 'full');

    expect(AuditCache.get(root, filesHash, configHash, mode)).toBeNull();
  });
});
