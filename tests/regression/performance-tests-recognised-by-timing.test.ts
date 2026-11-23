/**
 * #554 — Performance Test Requirements recognised a performance test only by
 * its file name (`*perf.test.ts`, `*performance.test.ts`, `*benchmark.ts`, …)
 * and a critical flow only by words (`login`, `checkout`, …). An e2e spec
 * that measures a flow and asserts a budget — the performance test that
 * guards a real user flow — was "No performance test files found".
 *
 * A spec whose code compares a measured duration with a budget is a
 * performance test, and an e2e spec is a user flow. The name patterns stay
 * one way in.
 */
import { PerformanceTestRequirementsLaw } from '../../src/laws/testing/performance-test-requirements';
import { UnitTestPerformanceTestingAnalyzerService } from '../../src/laws/testing/unit-test-performance-testing/services/performance-testing-analyzer.service';
import { FileUtils } from '../../src/utils/file-utils';
import { project, removeProjects } from '../checkers/toolkit-fixture';

const COLD_START_E2E = [
  "import { test, expect } from '@playwright/test';",
  'const BUDGET_MS = 1500;',
  "test('the first screen is interactive within budget', async ({ page }) => {",
  '  const start = performance.now();',
  "  await page.goto('/');",
  "  await page.getByRole('button', { name: 'Start' }).waitFor();",
  '  const ms = performance.now() - start;',
  '  expect(ms).toBeLessThan(BUDGET_MS);',
  '});',
].join('\n');

const DATE_NOW_SPEC = [
  "import { parse } from './parser';",
  "describe('parser', () => {",
  "  it('parses a large document within budget', () => {",
  '    const started = Date.now();',
  '    parse(LARGE);',
  '    expect(Date.now() - started).toBeLessThan(200);',
  '  });',
  '});',
].join('\n');

const PLAIN_SPEC = [
  "import { parse } from './parser';",
  "describe('parser', () => {",
  "  it('parses', () => { expect(parse('a')).toEqual(['a']); });",
  '});',
].join('\n');

const files = (tree: Record<string, string>): string[] => {
  const root = project({
    'package.json': JSON.stringify({ name: 'fixture', version: '1.0.0' }),
    ...tree,
  });
  return UnitTestPerformanceTestingAnalyzerService.analyzePerformanceTestFiles(
    root,
    FileUtils.getMinimalDefaultConfig()
  )
    .testFiles.map(file => file.replace(/\\/g, '/').split('/').pop() ?? '')
    .sort();
};

describe('#554 a performance test is recognised by the budget it asserts', () => {
  afterEach(removeProjects);

  it('counts an e2e spec that asserts a performance.now() budget', () => {
    expect(files({ 'e2e/cold-start.e2e.spec.ts': COLD_START_E2E })).toEqual([
      'cold-start.e2e.spec.ts',
    ]);
  });

  it('counts a unit spec that asserts a Date.now() budget', () => {
    expect(files({ 'src/parser.spec.ts': DATE_NOW_SPEC })).toEqual([
      'parser.spec.ts',
    ]);
  });

  it('takes a budgeted e2e flow for a critical-flow performance test', () => {
    const root = project({
      'package.json': JSON.stringify({ name: 'fixture', version: '1.0.0' }),
      'e2e/cold-start.e2e.spec.ts': COLD_START_E2E,
    });
    const violations =
      PerformanceTestRequirementsLaw.check({
        projectRoot: root,
        config: FileUtils.getMinimalDefaultConfig(),
      }).violations ?? [];
    expect(violations).not.toContain('No performance test files found');
    expect(violations).not.toContain(
      'Critical user flow performance tests not implemented'
    );
  });

  /** The controls: a name is still one way in; a spec that times nothing is not one. */
  it('still counts a file named *.perf.spec.ts', () => {
    expect(files({ 'src/parser.perf.spec.ts': PLAIN_SPEC })).toEqual([
      'parser.perf.spec.ts',
    ]);
  });

  it('does not count a spec that measures nothing', () => {
    expect(files({ 'src/parser.spec.ts': PLAIN_SPEC })).toEqual([]);
  });

  it('does not count a source file that reads the clock', () => {
    expect(
      files({
        'src/clock.ts':
          'export const elapsed = (start: number): number => performance.now() - start;',
      })
    ).toEqual([]);
  });
});
