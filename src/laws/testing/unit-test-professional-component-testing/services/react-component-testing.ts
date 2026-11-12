/**
 * React components and their tests, for the Professional Component Testing law.
 *
 * A React component is a `.tsx` / `.jsx` module (tests, stories and `.d.ts`
 * excluded). Next.js route files — `page`, `layout`, `template`, `loading`,
 * `error`, `global-error`, `not-found`, `default`, `route` under an `app/`
 * directory — are not counted: they are framework entry points, usually async
 * Server Components, covered by end-to-end tests rather than a unit test.
 *
 * Its test is the sibling `X.test.tsx` / `X.spec.tsx` (any TS/JS spelling), or
 * `__tests__/X.test.tsx` next to it. A React test counts as a quality test
 * when it has at least two tests, asserts with `expect(`, and queries the DOM
 * by role (`getByRole`, `findAllByRole`, …) — the query Testing Library
 * recommends first because it is how a user and a screen reader find things.
 */

import type { LawCheckContext } from '../../../../types/law.types';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { ReactProject } from '../../../../utils/react/react-project';

const NEXT_ROUTE_FILE =
  /(?:^|\/)app\/(?:.*\/)?(?:page|layout|template|loading|error|global-error|not-found|default|route)\.[jt]sx$/;
const STORY = /\.stories\.[jt]sx$/;
const TEST_EXTENSIONS = ['spec', 'test'].flatMap(infix =>
  ['.tsx', '.ts', '.jsx', '.js'].map(ext => `.${infix}${ext}`)
);
const ROLE_QUERY = /\b(?:get|find|query)(?:All)?ByRole\s*\(/;
const TEST_CALL = /\b(?:it|test)\s*\(/g;
const MINIMUM_TESTS = 2;

export interface ReactComponentTesting {
  components: string[];
  testFiles: string[];
  missingTestFiles: string[];
  lowQualityTests: string[];
}

export class ReactComponentTestingAnalyzer {
  static analyze(context: LawCheckContext): ReactComponentTesting {
    const components = ReactProject.sourceFiles(context, ['.tsx', '.jsx']).filter(file => {
      const rel = PathOperations.getRelative(context.projectRoot, file);
      return !NEXT_ROUTE_FILE.test(rel) && !STORY.test(rel);
    });
    const testFiles: string[] = [];
    const missingTestFiles: string[] = [];
    for (const component of components) {
      const test = this.testOf(component);
      if (test) testFiles.push(test);
      else missingTestFiles.push(component);
    }
    const lowQualityTests = testFiles.filter(file => !this.isQualityTest(FileUtils.readFile(file) ?? ''));
    return { components, testFiles, missingTestFiles, lowQualityTests };
  }

  /** The co-located test of a component, or null. */
  private static testOf(component: string): string | null {
    const dir = PathOperations.getDirectory(component);
    const base = PathOperations.getFilename(component).replace(/\.[jt]sx$/, '');
    const candidates = TEST_EXTENSIONS.flatMap(ext => [
      PathOperations.join(dir, base + ext),
      PathOperations.join(dir, '__tests__', base + ext),
    ]);
    return candidates.find(file => FileUtils.exists(file)) ?? null;
  }

  static isQualityTest(content: string): boolean {
    const tests = (content.match(TEST_CALL) ?? []).length;
    return tests >= MINIMUM_TESTS && /\bexpect\s*\(/.test(content) && ROLE_QUERY.test(content);
  }
}
