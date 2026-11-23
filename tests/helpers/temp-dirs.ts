/**
 * Temp directories for tests, removed after the suite (#582).
 *
 * Suites made their fixtures with `fs.mkdtempSync(os.tmpdir() …)` and some
 * never removed them; one removed the PARENT of its directory, which is the OS
 * temp directory itself. After a few days a development machine held thousands
 * of `roc-*` directories. Every temp directory a test makes goes through
 * `makeTempDir`, which registers it; `removeTempDirs` removes what this module
 * registered and only that.
 *
 * Importing this module registers `afterAll(removeTempDirs)` for the suite, so
 * the directories go also when a test fails. A suite that wants a fresh tree
 * per test adds `afterEach(removeTempDirs)`.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const registered: string[] = [];

/** A new directory in the OS temp dir, named `<prefix><random>`, removed after the suite. */
export function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  registered.push(dir);
  return dir;
}

/** Register a directory made elsewhere (by a tool under test) for the same removal. */
export function registerTempDir(dir: string): string {
  registered.push(dir);
  return dir;
}

/**
 * Remove every registered directory. A directory that cannot be removed is
 * named in the error thrown after the others are removed, not skipped in
 * silence.
 */
export function removeTempDirs(): void {
  const failures: string[] = [];
  for (const dir of registered.splice(0).reverse()) {
    try {
      fs.rmSync(dir, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      });
    } catch (error) {
      failures.push(`${dir}: ${(error as Error).message}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `could not remove temp directories:\n${failures.join('\n')}`
    );
  }
}

if (typeof afterAll === 'function') afterAll(removeTempDirs);
