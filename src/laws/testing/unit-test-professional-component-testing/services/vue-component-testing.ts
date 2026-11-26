/**
 * Vue components and their tests, for the Professional Component Testing law
 * (#12).
 *
 * A Vue component is a `.vue` single-file component (test files excluded by
 * the scan). Its test is the sibling `X.spec.ts` / `X.test.ts` (any TS/JS
 * spelling), or `__tests__/X.spec.ts` next to it — the layout create-vue
 * generates. A Vue test counts as a quality test when it has at least two
 * tests, asserts with `expect(`, and mounts the component through
 * @vue/test-utils (`mount`, `shallowMount`) or @testing-library/vue
 * (`render`), imported from that package.
 */

import type { LawCheckContext } from '../../../../types/law.types';
import { CodeText } from '../../../../utils/code-text';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { ReactProject } from '../../../../utils/react/react-project';

const TEST_EXTENSIONS = ['spec', 'test'].flatMap(infix =>
  ['.ts', '.js', '.tsx', '.jsx', '.mts', '.mjs'].map(ext => `.${infix}${ext}`)
);
const TEST_CALL = /\b(?:it|test)\s*\(/g;
const MINIMUM_TESTS = 2;
/** A mount through a Vue testing library, imported from that package. */
const MOUNTING_LIBRARY =
  /\bfrom\s+['"](?:@vue\/test-utils|@testing-library\/vue)['"]/;
const MOUNT_CALL = /\b(?:mount|shallowMount|render)\s*\(/;

export interface VueComponentTesting {
  components: string[];
  testFiles: string[];
  missingTestFiles: string[];
  lowQualityTests: string[];
}

export class VueComponentTestingAnalyzer {
  static analyze(context: LawCheckContext): VueComponentTesting {
    const components = ReactProject.sourceFiles(context, ['.vue']);
    const testFiles: string[] = [];
    const missingTestFiles: string[] = [];
    for (const component of components) {
      const test = this.testOf(component);
      if (test) testFiles.push(test);
      else missingTestFiles.push(component);
    }
    const lowQualityTests = [...new Set(testFiles)].filter(
      file => !this.isQualityTest(FileUtils.readFile(file) ?? '')
    );
    return { components, testFiles, missingTestFiles, lowQualityTests };
  }

  /** The co-located test of a component, or null. */
  private static testOf(component: string): string | null {
    const dir = PathOperations.getDirectory(component);
    const base = PathOperations.getFilename(component).replace(/\.vue$/, '');
    const candidates = TEST_EXTENSIONS.flatMap(ext => [
      PathOperations.join(dir, base + ext),
      PathOperations.join(dir, '__tests__', base + ext),
    ]);
    return candidates.find(file => FileUtils.exists(file)) ?? null;
  }

  static isQualityTest(content: string): boolean {
    const code = CodeText.stripComments(content);
    const tests = (code.match(TEST_CALL) ?? []).length;
    return (
      tests >= MINIMUM_TESTS &&
      /\bexpect\s*\(/.test(code) &&
      MOUNTING_LIBRARY.test(code) &&
      MOUNT_CALL.test(code)
    );
  }
}
