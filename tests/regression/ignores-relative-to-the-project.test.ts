/**
 * Ignore patterns describe paths INSIDE the project.
 *
 * Matched against an absolute path, `**​/tmp/**` and the default
 * `**​/build/**` also matched the directories ABOVE the project. Found by
 * auditing a real consumer from a checkout under `D:\tmp\`: every file under
 * apps/ and libs/ was "ignored" by the scans that pass absolute paths, and a
 * law that used to score 100 on nothing now said it judged nothing. A CI that
 * checks out under /tmp or a `build` folder hit the same silent emptiness.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { RuleOfCodeConfig } from '../../src/config/types';
import { TestDocumentationRequirementsLaw } from '../../src/laws/testing/test-documentation-requirements';
import { FileFilterUtils } from '../../src/utils/file-filter-utils';

const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

/** A project at <tmpdir>/<random>/<container>/app, so an ancestor is named `container`. */
function projectUnder(container: string): string {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-ancestor-'));
  made.push(base);
  const root = path.join(base, container, 'app');
  fs.mkdirSync(path.join(root, 'libs', 'ui'), { recursive: true });
  fs.mkdirSync(path.join(root, 'tmp'), { recursive: true });
  return root;
}

const config = (global: string[]): RuleOfCodeConfig =>
  ({ ignores: { global, tests: [], build: [], design: [] } }) as unknown as RuleOfCodeConfig;

describe('ignores are matched against the path inside the project', () => {
  afterEach(() => {
    FileFilterUtils.currentProjectRoot = undefined;
  });

  it.each([
    ['tmp', '**/tmp/**/*'],
    ['build', '**/build/**'],
  ])('a project under a `%s` directory is not ignored by %s', (container, pattern) => {
    const root = projectUnder(container);
    FileFilterUtils.currentProjectRoot = root;
    const inside = path.join(root, 'libs', 'ui', 'button.component.ts');
    expect(FileFilterUtils.shouldIgnoreFile(inside, config([pattern]))).toBe(false);
    expect(FileFilterUtils.shouldIgnoreFile(path.join(root, 'libs'), config([pattern]))).toBe(false);
  });

  it('a `tmp/` directory INSIDE the project is still ignored (the control)', () => {
    const root = projectUnder('tmp');
    FileFilterUtils.currentProjectRoot = root;
    const scratch = path.join(root, 'tmp', 'scratch.ts');
    expect(FileFilterUtils.shouldIgnoreFile(scratch, config(['**/tmp/**/*']))).toBe(true);
  });

  it('a relative path is matched as before', () => {
    expect(FileFilterUtils.shouldIgnoreFile('tmp/x.ts', config(['**/tmp/**/*']))).toBe(true);
    expect(FileFilterUtils.shouldIgnoreFile('libs/x.ts', config(['**/tmp/**/*']))).toBe(false);
  });

  it('a path outside the root is left as given', () => {
    const root = projectUnder('tmp');
    FileFilterUtils.currentProjectRoot = path.join(root, 'libs');
    // `root/tmp/scratch.ts` is outside `root/libs`: matched as given, and the
    // pattern still sees the `tmp` segment — unchanged behaviour.
    expect(FileFilterUtils.shouldIgnoreFile(path.join(root, 'tmp', 'scratch.ts'), config(['**/tmp/**/*']))).toBe(true);
  });
});

/**
 * Same real-consumer run: Test Documentation Requirements, reading every test
 * since #192, reported "158 test cases have unclear descriptions" and named
 * none of them.
 */
describe('the unclear-description finding names its tests', () => {
  it('names the file and the title', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-docs-'));
    made.push(root);
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'a.spec.ts'), "it('ok', () => { expect(1).toBe(1); });\n");
    const ctx = {
      projectRoot: root,
      config: { ignores: { global: [], tests: [], build: [], design: [] }, thresholds: {} },
    };
    const result = TestDocumentationRequirementsLaw.check(ctx as never);
    expect(result.violations).toEqual(
      expect.arrayContaining([expect.stringMatching(/unclear descriptions: src\/a\.spec\.ts: "ok"/)])
    );
  });
});
