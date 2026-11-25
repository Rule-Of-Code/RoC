/**
 * #646: Test Documentation Requirements reported "Excellent test
 * documentation practices" for a project with no test file at all: a README
 * that mentions tests cleared the only check left. With no test file the law
 * judged nothing, and it says so, as the other test laws do.
 */
import { TestDocumentationRequirementsLaw } from '../../src/laws/testing/test-documentation-requirements';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const README =
  '# Project\n\nRun the test suite with npm test. Unit tests use Jest; every module has a spec next to it, and CI runs the tests on each push.\n';
const MANIFEST = JSON.stringify({
  name: 'x',
  version: '1.0.0',
  devDependencies: { jest: '29.0.0' },
});
const SPEC =
  "/** Tests the adder. */\ndescribe('add', () => {\n  it('adds two numbers', () => {\n    expect(1 + 1).toBe(2);\n  });\n});\n";

describe('#646 Test Documentation Requirements with no test file', () => {
  it('a README about tests and no test file: judged nothing, not "Excellent"', () => {
    const result = TestDocumentationRequirementsLaw.check(
      ctx(project({ 'package.json': MANIFEST, 'README.md': README }))
    );
    expect(result.judgedNothing).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.message).not.toMatch(/Excellent/);
    expect(result.violations).toEqual([
      expect.stringContaining(
        'Test Documentation Requirements: no JS/TS test file found'
      ),
    ]);
  });

  it('control: the same README and one documented spec are judged and pass', () => {
    const result = TestDocumentationRequirementsLaw.check(
      ctx(
        project({
          'package.json': MANIFEST,
          'README.md': README,
          'src/add.ts': 'export const add = (a: number, b: number) => a + b;\n',
          'src/add.spec.ts': SPEC,
        })
      )
    );
    expect(result.judgedNothing).toBeUndefined();
    expect(result.passed).toBe(true);
  });

  it('control: no README and no test file is still judged nothing', () => {
    const result = TestDocumentationRequirementsLaw.check(
      ctx(project({ 'package.json': MANIFEST }))
    );
    expect(result.judgedNothing).toBe(true);
    expect(result.passed).toBe(false);
  });
});
