/**
 * #43, package 9 (testing) — the testing laws whose violation line counts
 * files or names the first five ("…; and N more", "(e.g. a, b, c, …)",
 * "Coverage below 100% in: a, b, c") name every artefact in
 * `violationDetails`. The violation lines are unchanged.
 */
import fs from 'fs';
import path from 'path';

import { JestUnitTest100CoverageMandateLaw } from '../../src/checkers/testing-laws/jest-unit-test-100-coverage-mandate';
import { TestCoverageConstitutionalStandardLaw } from '../../src/checkers/testing-laws/test-coverage-constitutional-standard';
import { ProfessionalComponentTestingPolicyLaw } from '../../src/laws/testing/professional-component-testing-policy';
import { TestDataManagementLaw } from '../../src/laws/testing/test-data-management';
import { TestDocumentationRequirementsLaw } from '../../src/laws/testing/test-documentation-requirements';
import { TestIsolationEnforcementLaw } from '../../src/laws/testing/test-isolation-enforcement';
import type { ViolationDetail } from '../../src/types/law.types';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const SEVEN = [1, 2, 3, 4, 5, 6, 7];
const places = (details: ViolationDetail[] | undefined): string[] =>
  (details ?? []).map(d => `${d.file}: ${d.message}`);
const each = (make: (n: number) => string): string[] => SEVEN.map(make);

/** Seven test files that share state, call axios unmocked and say "a"; seven untested components and modules. */
const suite = (): string => {
  const files: Record<string, string> = {
    'package.json': JSON.stringify({
      name: 'app',
      version: '1.0.0',
      dependencies: { '@angular/core': '20.0.0', axios: '1.7.0' },
      devDependencies: { jest: '29.7.0', typescript: '5.9.3' },
    }),
  };
  for (const n of SEVEN) {
    files[`src/t${n}.test.ts`] =
      "import axios from 'axios';\nlet counter = 0;\nit('a', async () => { counter++; await axios.get('http://x'); });\n";
    files[`src/app/c${n}.component.ts`] =
      `import { Component } from '@angular/core';\n@Component({ selector: 'app-c${n}', template: '<p>c</p>' })\nexport class C${n}Component {}\n`;
    files[`src/lib/u${n}.ts`] = `export const u${n} = () => ${n};\n`;
  }
  return project(files);
};

describe('#43 package 9: the testing laws name every file they counted', () => {
  it('Test Data Management: every file behind each "…; and 2 more"', async () => {
    const result = await TestDataManagementLaw.check(ctx(suite()));
    expect(
      (result.violations ?? []).filter(v => /; and 2 more$/.test(v))
    ).toHaveLength(3);
    expect(places(result.violationDetails)).toEqual([
      ...each(
        n =>
          `src/t${n}.test.ts: module-scope mutable state with no beforeEach/afterEach`
      ),
      ...each(n => `src/t${n}.test.ts: shared mutable state`),
      ...each(
        n =>
          `src/t${n}.test.ts: imports an external client; no test double (axios)`
      ),
    ]);
  });

  it('Test Isolation Enforcement: every file behind each "…; and 2 more"', async () => {
    const result = await TestIsolationEnforcementLaw.check(ctx(suite()));
    expect(places(result.violationDetails)).toEqual([
      ...each(n => `src/t${n}.test.ts: shares mutable state with other tests`),
      ...each(n => `src/t${n}.test.ts: no isolation in setup/teardown`),
    ]);
  });

  it('Test Documentation Requirements: every undocumented file and every unclear description', async () => {
    const result = await TestDocumentationRequirementsLaw.check(ctx(suite()));
    expect(result.violations).toEqual(
      expect.arrayContaining(['7 test files lack proper documentation'])
    );
    expect(places(result.violationDetails)).toEqual([
      ...each(n => `src/t${n}.test.ts: lacks proper documentation`),
      ...each(n => `src/t${n}.test.ts: unclear test description "a"`),
    ]);
  });

  it('Professional Component Testing Policy: every component without a spec', async () => {
    const result = await ProfessionalComponentTestingPolicyLaw.check(
      ctx(suite())
    );
    expect(result.violations).toEqual(
      expect.arrayContaining(['7 components missing .spec.ts files'])
    );
    expect(places(result.violationDetails)).toEqual(
      each(n => `src/app/c${n}.component.ts: component without a .spec.ts file`)
    );
  });

  it('Test Coverage Constitutional Standard: every source file without a test', () => {
    const result = TestCoverageConstitutionalStandardLaw.check(ctx(suite()));
    expect(result.violations).toEqual(
      expect.arrayContaining([
        '14 source files lack corresponding test files (a test that imports a file counts)',
      ])
    );
    expect(places(result.violationDetails).sort()).toEqual(
      [
        ...each(
          n =>
            `src/app/c${n}.component.ts: source file without a corresponding test file`
        ),
        ...each(
          n => `src/lib/u${n}.ts: source file without a corresponding test file`
        ),
      ].sort()
    );
  });

  it('Jest Unit Test 100% Coverage Mandate: all four metrics below 100%, not three', () => {
    const root = project({
      'package.json': JSON.stringify({
        name: 'f',
        version: '1.0.0',
        scripts: { test: 'jest' },
        devDependencies: { jest: '^29.7.0' },
      }),
      'jest.config.js':
        'module.exports = { coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } } };\n',
      'src/a.ts': 'export const a = (x: number): number => x + 1;\n',
    });
    const metric = (pct: number) => ({
      total: 10,
      covered: pct / 10,
      skipped: 0,
      pct,
    });
    const all = {
      lines: metric(80),
      statements: metric(70),
      functions: metric(60),
      branches: metric(50),
    };
    const report = path.join(root, 'coverage', 'coverage-summary.json');
    fs.mkdirSync(path.dirname(report), { recursive: true });
    fs.writeFileSync(report, JSON.stringify({ total: all, 'src/a.ts': all }));
    const hour = 3_600_000;
    const sourceTime = new Date(Date.now() - 2 * hour);
    fs.utimesSync(path.join(root, 'src/a.ts'), sourceTime, sourceTime);
    const reportTime = new Date(sourceTime.getTime() + hour);
    fs.utimesSync(report, reportTime, reportTime);

    const result = JestUnitTest100CoverageMandateLaw.check(ctx(root));
    expect(result.violations).toEqual([
      'Coverage below 100% in: lines (80%), functions (60%), branches (50%)',
    ]);
    expect(places(result.violationDetails)).toEqual([
      'coverage/coverage-summary.json: lines (80%) — below 100%',
      'coverage/coverage-summary.json: functions (60%) — below 100%',
      'coverage/coverage-summary.json: branches (50%) — below 100%',
      'coverage/coverage-summary.json: statements (70%) — below 100%',
    ]);
  });

  it('Professional Component Testing Policy: every React component without a co-located test, not three', async () => {
    const files: Record<string, string> = {
      'package.json': JSON.stringify({
        name: 'app',
        version: '1.0.0',
        dependencies: { react: '19.3.0', 'react-dom': '19.3.0' },
        devDependencies: { jest: '29.7.0', typescript: '5.9.3' },
      }),
    };
    for (const n of [1, 2, 3, 4, 5])
      files[`src/components/Card${n}.tsx`] =
        `export function Card${n}() { return <div>card ${n}</div>; }\n`;
    const result = await ProfessionalComponentTestingPolicyLaw.check(
      ctx(project(files))
    );
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^5 React components missing a co-located \.test\.tsx \/ \.spec\.tsx \(e\.g\. .*, …\)$/
        ),
      ])
    );
    expect(places(result.violationDetails).sort()).toEqual(
      [1, 2, 3, 4, 5].map(
        n =>
          `src/components/Card${n}.tsx: React component without a co-located test`
      )
    );
  });
});
