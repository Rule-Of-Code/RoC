import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PerformanceBudgetComplianceLaw } from '../../src/laws/performance/performance-budget-compliance';
import { PerformanceBudgetComplianceAnalyzerService } from '../../src/laws/performance/performance-budget-compliance/services';
import { AngularBundleOptimizationAnalyzer } from '../../src/utils/angular/angular-bundle/angular-bundle-optimization-analyzer';
import { AngularBundleValidationPatterns } from '../../src/utils/angular/angular-bundle/angular-bundle-validation-patterns';
import { FileUtils } from '../../src/utils';

/**
 * #423, the part left after 8.0.0. The validators now call the real budget
 * analyzer, but two things still turned "not read" into "missing":
 * - an angular.json that does not parse was read as `{}` (fallbackToEmpty),
 *   so the build checks saw no project, and the budget analyzer swallowed
 *   the parse error and answered `configured: false`;
 * - the bare `catch` around the analyzer pushed the "missing" suggestion for
 *   any error.
 * The project was told to add budgets it may well have, and nothing said
 * that angular.json was not read.
 */
describe('an angular.json that cannot be read is reported as not read, never as missing budgets', () => {
  const MISSING = 'Add performance budgets in angular.json build configuration';
  const roots: string[] = [];
  afterAll(() =>
    roots.forEach(r => fs.rmSync(r, { recursive: true, force: true }))
  );

  const project = (angularJson: string): string => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-423-'));
    roots.push(root);
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({
        name: 'web',
        version: '1.0.0',
        dependencies: { '@angular/core': '^20.0.0' },
      })
    );
    fs.writeFileSync(path.join(root, 'angular.json'), angularJson);
    return root;
  };

  // Truncated mid-way: the budgets are there, the file does not parse.
  const BROKEN =
    '{ "projects": { "web": { "architect": { "build": { "configurations": { "production": { "budgets": [ ';

  afterEach(() => jest.restoreAllMocks());

  it('does not suggest adding budgets when angular.json does not parse, and says why', () => {
    const suggestions: string[] = [];
    const notRead: string[] = [];
    AngularBundleValidationPatterns.validatePerformanceBudgets(
      project(BROKEN),
      suggestions,
      notRead
    );

    expect(suggestions).not.toContain(MISSING);
    expect(notRead).toEqual([
      expect.stringMatching(/^angular\.json could not be read: \S/),
    ]);
  });

  it('the bundle check says once that angular.json was not read', () => {
    const { violations, suggestions } =
      AngularBundleOptimizationAnalyzer.checkBundleOptimization(
        project(BROKEN),
        FileUtils.getMinimalDefaultConfig()
      );

    expect(suggestions).not.toContain(MISSING);
    const notes = violations.filter(v => v.includes('angular.json'));
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatch(
      /^angular\.json could not be read: .+ were NOT read/
    );
  });

  it('an error inside the budget analyzer is not reported as missing budgets', () => {
    jest
      .spyOn(
        PerformanceBudgetComplianceAnalyzerService,
        'analyzeAngularBudgets'
      )
      .mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });
    const suggestions: string[] = [];
    const notRead: string[] = [];
    AngularBundleValidationPatterns.validatePerformanceBudgets(
      project('{}'),
      suggestions,
      notRead
    );

    expect(suggestions).not.toContain(MISSING);
    expect(notRead).toEqual([
      'performance budgets could not be read: EACCES: permission denied',
    ]);
  });

  it('a readable angular.json without budgets still gets the suggestion', () => {
    const suggestions: string[] = [];
    const notRead: string[] = [];
    AngularBundleValidationPatterns.validatePerformanceBudgets(
      project(
        JSON.stringify({
          projects: {
            web: {
              architect: { build: { configurations: { production: {} } } },
            },
          },
        })
      ),
      suggestions,
      notRead
    );

    expect(suggestions).toContain(MISSING);
    expect(notRead).toEqual([]);
  });

  it('Performance Budget Compliance says the budgets were not read, not "not configured"', async () => {
    const result = await PerformanceBudgetComplianceLaw.check({
      projectRoot: project(BROKEN),
      config: FileUtils.getMinimalDefaultConfig(),
    });

    expect(result.violations).not.toContain(
      'Angular CLI performance budgets not configured'
    );
    expect(result.violations).toContainEqual(
      expect.stringMatching(/^angular\.json could not be read: .+NOT read$/)
    );
  });
});
