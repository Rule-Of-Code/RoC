import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { TestFilesExistenceChecker } from '../../src/utils/testing/test-files-existence-checker';
import { FileUtils } from '../../src/utils';

/**
 * The scan that COUNTS tests must be allowed into the directories tests live
 * in.
 *
 * The recursive walk called the directory filter without the `includeTests`
 * flag, so it resolved the ignore set for a scan that EXCLUDES tests — which
 * adds `**​/*-e2e/**`, `**​/e2e/**`, `**​/test/**`, `**​/tests/**` and
 * `**​/cypress/**`. Entire directories of specs were therefore pruned before
 * the file validator that was meant to accept them ever ran. The file
 * validator asked with `true` and was right; nothing reached it.
 *
 * The ratio was then computed from a numerator that had never seen most of the
 * tests, and the advice attached to it — "add test files" — could not move the
 * number. A reporter re-implemented the scan by hand against the compiled
 * output to show 27 files where the audit counted one.
 */
describe('test discovery reaches the directories tests live in', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const scan = (): { sources: number; tests: string[] } => {
    const config = FileUtils.getMinimalDefaultConfig();
    const lawId = 'test-coverage-constitutional-standard';
    const internals = TestFilesExistenceChecker as unknown as {
      findSourceFiles: (r: string, c: unknown, l: string) => string[];
      findTestFiles: (r: string, c: unknown, l: string) => string[];
    };
    return {
      sources: internals.findSourceFiles(root, config, lawId).length,
      tests: internals
        .findTestFiles(root, config, lawId)
        .map(file => path.relative(root, file).replace(/\\/g, '/')),
    };
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-cov-'));
    write('package.json', '{"name":"w","version":"1.0.0"}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  /** Every directory shape the ignore set pruned, one spec in each. */
  const LAYOUTS: Array<[string, string]> = [
    ['a Playwright project beside the app', 'apps/web-e2e/src/flow.spec.ts'],
    ['a bare e2e directory', 'e2e/flow.spec.ts'],
    ['a test directory', 'test/unit.spec.ts'],
    ['a tests directory', 'tests/unit.spec.ts'],
    ['a cypress directory', 'cypress/e2e/flow.spec.ts'],
    ['a spec beside its source', 'src/app/home.spec.ts'],
  ];

  it.each(LAYOUTS)('counts a spec in %s', (_label, file) => {
    write(file, "it('works', () => {});");

    expect(scan().tests).toContain(file);
  });

  it('counts every one of them together', () => {
    for (const [, file] of LAYOUTS) write(file, "it('works', () => {});");

    expect(scan().tests).toHaveLength(LAYOUTS.length);
  });

  /**
   * The red control, and the reason the source scan keeps pruning those
   * directories: a spec is not a source file this law can ask a test of.
   * Counting specs as sources would deflate the ratio from the other side.
   */
  it('does not count a spec as a source file', () => {
    write('src/app/home.ts', 'export const home = 1;');
    for (const [, file] of LAYOUTS) write(file, "it('works', () => {});");

    expect(scan().sources).toBe(1);
  });

  it('still respects an explicit ignore', () => {
    write('src/app/home.spec.ts', "it('works', () => {});");
    write('legacy/old.spec.ts', "it('works', () => {});");

    const config = FileUtils.getMinimalDefaultConfig();
    config.ignores.global = [...config.ignores.global, '**/legacy/**'];
    const found = (
      TestFilesExistenceChecker as unknown as {
        findTestFiles: (r: string, c: unknown, l: string) => string[];
      }
    )
      .findTestFiles(root, config, 'test-coverage-constitutional-standard')
      .map(file => path.relative(root, file).replace(/\\/g, '/'));

    expect(found).toEqual(['src/app/home.spec.ts']);
  });

  /**
   * The reporter's second request: seeing which files were counted required
   * re-implementing the scan against the compiled output.
   */
  it('names the test files it counted when the ratio fails', () => {
    for (let i = 0; i < 12; i += 1) {
      write(`src/app/comp${i}.ts`, `export const c${i} = ${i};`);
    }
    write('test/one.spec.ts', "it('works', () => {});");

    const result = TestFilesExistenceChecker.checkTestFilesExistence(
      root,
      FileUtils.getMinimalDefaultConfig(),
      'test-coverage-constitutional-standard'
    );

    expect(
      result.suggestions.some(s => /Counted these test files:.*one\.spec\.ts/.test(s))
    ).toBe(true);
  });

  it('says so plainly when it found none', () => {
    for (let i = 0; i < 12; i += 1) {
      write(`src/app/comp${i}.ts`, `export const c${i} = ${i};`);
    }

    const result = TestFilesExistenceChecker.checkTestFilesExistence(
      root,
      FileUtils.getMinimalDefaultConfig(),
      'test-coverage-constitutional-standard'
    );

    expect(
      result.suggestions.some(s => /No test files were found at all/.test(s))
    ).toBe(true);
  });
});
