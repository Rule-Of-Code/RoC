import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { JestUnitTest100CoverageMandateLaw } from '../../src/checkers/testing-laws/jest-unit-test-100-coverage-mandate';
import { APITestingStandardsLaw } from '../../src/laws/testing/api-testing-standards';
import { PerformanceTestRequirementsLaw } from '../../src/laws/testing/performance-test-requirements';
import { ProfessionalComponentTestingPolicyLaw } from '../../src/laws/testing/professional-component-testing-policy';
import { TestDocumentationRequirementsLaw } from '../../src/laws/testing/test-documentation-requirements';
import { TestingLawUtilities } from '../../src/laws/testing/shared-testing-utilities';
import { FileUtils } from '../../src/utils';

/**
 * TESTING detector bugs — the worst class we have found: a law that returns
 * passed:false with an EMPTY violation list AND a green "✅ Excellent" message. It
 * failed on a SCORE THRESHOLD while some deductions lowered score without adding a
 * violation — BE's F2 class (a law that fails while listing nothing to fix) plus an
 * artifact that looks like a check. Fixed: a law fails on its VIOLATIONS.
 */
describe('TESTING detector bugs', () => {
  let root: string;
  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  const config = (
    type: 'angular' | 'node' | 'python'
  ): ReturnType<typeof FileUtils.getMinimalDefaultConfig> => {
    const c = FileUtils.getMinimalDefaultConfig();
    c.project.type = type;
    return c;
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-testbug-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('a law never fails with an empty violation list (no ✅ on a failing verdict)', () => {
    it('the shared createTestResult passes when there are zero violations, whatever the score', () => {
      const result = TestingLawUtilities.createTestResult({
        lawName: 'Example Testing Law',
        violations: [],
        suggestions: ['advisory only'],
        score: 40, // deductions with no violations must NOT fail the law
        analysisData: {},
        config: config('node'),
        messageGenerator: () => '✅ Excellent',
      });
      expect(result.passed).toBe(true);
    });

    const invariantHolds = async (
      result: { passed: boolean; violations?: string[] }
    ): Promise<void> => {
      // passed must equal "no violations" — never a failing verdict with an empty list.
      expect(result.passed).toBe((result.violations ?? []).length === 0);
    };

    it('Professional Component Testing keeps passed ≡ (no violations)', async () => {
      write('package.json', JSON.stringify({ name: 'a', dependencies: { '@angular/core': '^17' } }));
      write('angular.json', '{}');
      write('src/app/foo/foo.component.ts', 'export class FooComponent { title="x"; }');
      write(
        'src/app/foo/foo.component.spec.ts',
        `describe('FooComponent', () => {\n  it('should a', () => { const s = jest.fn(); expect(s).toBeDefined(); expect(1).toBe(1); });\n  it('should b', () => { expect(true).toBe(true); });\n});`
      );
      await invariantHolds(
        await Promise.resolve(
          ProfessionalComponentTestingPolicyLaw.check({ projectRoot: root, config: config('angular') })
        )
      );
    });

    it('API Testing Standards keeps passed ≡ (no violations)', async () => {
      write('package.json', JSON.stringify({ name: 'a', devDependencies: { jest: '^29', supertest: '^6' } }));
      write('src/tests/api.spec.ts', `describe('api', () => { it('GET', async () => { const r = await get('/x'); expect(r.status).toBe(200); expect(r.status).toBe(404); }); });`);
      await invariantHolds(
        await APITestingStandardsLaw.check({ projectRoot: root, config: config('node') })
      );
    });

    it('Performance Test Requirements keeps passed ≡ (no violations)', async () => {
      write('package.json', JSON.stringify({ name: 'a', devDependencies: { k6: '^0.1', 'web-vitals': '^3' } }));
      write('src/app.perf.spec.ts', 'test("login flow perf", () => { expect(1).toBe(1); });');
      await invariantHolds(
        await Promise.resolve(
          PerformanceTestRequirementsLaw.check({ projectRoot: root, config: config('angular') })
        )
      );
    });

    it('Test Documentation Requirements keeps passed ≡ (no violations)', async () => {
      write('TESTING.md', '# Testing\n'.padEnd(200, 'x'));
      write('src/a.spec.ts', `describe('a', () => { it('should do the thing clearly', () => { expect(1).toBe(1); }); });`);
      await invariantHolds(
        await Promise.resolve(
          TestDocumentationRequirementsLaw.check({ projectRoot: root, config: config('node') })
        )
      );
    });
  });

  describe('Jest 100% Coverage Mandate actually requires 100%', () => {
    const withThreshold = (metrics: number): void => {
      write(
        'package.json',
        JSON.stringify({
          name: 'p',
          version: '1.0.0',
          scripts: { test: 'jest' },
          devDependencies: { jest: '^29' },
          jest: {
            collectCoverage: true,
            coverageThreshold: {
              global: { lines: metrics, functions: metrics, branches: metrics, statements: metrics },
            },
          },
        })
      );
    };

    it('fails a coverageThreshold below 100 (it used to falsely pass)', () => {
      withThreshold(50);
      const result = JestUnitTest100CoverageMandateLaw.check({ projectRoot: root, config: config('node') });
      expect(
        (result.violations ?? []).some(v => /100% coverage thresholds/.test(v))
      ).toBe(true);
    });

    it('accepts a coverageThreshold of 100 on every metric', () => {
      withThreshold(100);
      const result = JestUnitTest100CoverageMandateLaw.check({ projectRoot: root, config: config('node') });
      expect(
        (result.violations ?? []).some(v => /100% coverage thresholds/.test(v))
      ).toBe(false);
    });
  });
});
