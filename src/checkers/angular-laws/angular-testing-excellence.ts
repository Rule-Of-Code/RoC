/**
 * Angular Testing Excellence Law
 * Enforces comprehensive testing standards for Angular applications
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from './shared-imports';
import {
  AngularLawBase,
  CheckerUtils,
  FileUtils,
  PathOperations,
  ProjectTypeDetector,
} from './shared-imports';
export class AngularTestingExcellenceLaw extends AngularLawBase {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    // Only check if Angular project
    if (!this.hasAngularProject(projectRoot)) {
      return this.createResult(
        [],
        'Angular Testing Excellence',
        'ANGULAR_LAW',
        [],
        context
      );
    }

    // Check for testing framework
    this.checkTestingFramework(projectRoot, violations);

    // Check test coverage
    this.checkTestCoverage(projectRoot, context.config, violations);

    // Check specific Angular testing patterns
    this.checkTestingPatterns(projectRoot, context.config, violations, context);

    // Check for E2E tests
    this.checkE2ETests(projectRoot, context.config, violations);

    return this.createResult(
      violations,
      'Angular Testing Excellence',
      'ANGULAR_LAW',
      [
        'Configure testing framework (Jest/Jasmine)',
        'Achieve 80%+ test coverage',
        'Use TestBed for component tests',
        'Implement proper async testing',
        'Write descriptive test cases starting with "should"',
        'Add E2E tests for critical user flows',
      ],
      context
    );
  }

  private static checkTestingFramework(
    projectRoot: string,
    violations: string[]
  ): void {
    const hasTestingFramework = this.hasJestOrJasmine(projectRoot);
    if (!hasTestingFramework) {
      violations.push('No testing framework (Jest/Jasmine) configured');
    }
  }

  private static checkTestCoverage(
    projectRoot: string,
    _config: RuleOfCodeConfig,
    violations: string[]
  ): void {
    const sourceFiles = this.findAngularSourceFiles(projectRoot, _config);
    const testFiles = this.findTestFiles(projectRoot, _config);
    const minCoverage =
      (_config.thresholds?.testing?.minAngularTestCoveragePercent ?? 80) / 100;

    const testCoverageRatio =
      testFiles.length / Math.max(sourceFiles.length, 1);
    if (testCoverageRatio < minCoverage) {
      violations.push(
        `Insufficient test coverage: ${(testCoverageRatio * 100).toFixed(
          1
        )}% (minimum ${(minCoverage * 100).toFixed(0)}%)`
      );
    }
  }

  private static checkTestingPatterns(
    projectRoot: string,
    _config: RuleOfCodeConfig,
    violations: string[],
    context: LawCheckContext
  ): void {
    const testFiles = this.findTestFiles(projectRoot, _config);

    for (const testFile of testFiles) {
      this.checkIndividualTestFile(testFile, projectRoot, violations, context);
    }
  }

  private static checkIndividualTestFile(
    testFile: string,
    projectRoot: string,
    violations: string[],
    context: LawCheckContext
  ): void {
    const content = FileUtils.readFile(testFile);
    const relativePath = PathOperations.getRelative(projectRoot, testFile);

    // Check component tests
    this.checkComponentTest(content, relativePath, violations);

    // Check service tests
    this.checkServiceTest(content, relativePath, violations);

    // Check async testing patterns
    this.checkAsyncTesting(content, relativePath, violations);

    // Check test descriptions
    this.checkTestDescriptions(content, relativePath, violations, context);
  }

  private static checkComponentTest(
    content: string,
    relativePath: string,
    violations: string[]
  ): void {
    if (relativePath.includes('.component.spec.ts')) {
      if (!content.includes('TestBed')) {
        violations.push(
          `Component test missing TestBed configuration: ${relativePath}`
        );
      }

      if (!content.includes('ComponentFixture')) {
        violations.push(
          `Component test missing ComponentFixture: ${relativePath}`
        );
      }
    }
  }

  private static checkServiceTest(
    content: string,
    relativePath: string,
    violations: string[]
  ): void {
    if (relativePath.includes('.service.spec.ts')) {
      if (!content.includes('inject') && !content.includes('TestBed.inject')) {
        violations.push(
          `Service test missing proper injection: ${relativePath}`
        );
      }
    }
  }

  private static checkAsyncTesting(
    content: string,
    relativePath: string,
    violations: string[]
  ): void {
    if (content.includes('Observable') || content.includes('Promise')) {
      if (!content.includes('async') && !content.includes('fakeAsync')) {
        violations.push(
          `Async test missing proper async handling: ${relativePath}`
        );
      }
    }
  }

  private static checkTestDescriptions(
    content: string,
    relativePath: string,
    violations: string[],
    context: LawCheckContext
  ): void {
    // Check for proper test descriptions
    const describeMatches = content.match(
      /describe\s*\(\s*['"`]([^'"`]+)['"`]/g
    );
    if (describeMatches) {
      const minLength =
        context.config.thresholds?.testing?.minTestDescriptionLength ?? 10;
      describeMatches.forEach(match => {
        const description = match.match(/['"\`]([^'"\`]+)['"\`]/)?.[1];
        if (description && description.length < minLength) {
          violations.push(
            `Test description too short in ${relativePath}: "${description}"`
          );
        }
      });
    }

    // Check for it/test descriptions.
    //
    // The spec name matcher MUST be word-bounded. Without \b, `(?:it|test)\(`
    // matched the `it(` inside split(, emit(, submit(, wait(, edit( — so an e2e
    // helper doing `text.split('\n')` was read as a test named "\n", which
    // doesn't start with "should", and the law raised a phantom violation. That
    // false positive broke a live consumer's dogfood build (a downstream consumer, F-09).
    // fit/xit (focused/skipped) are kept — they are real test declarations.
    // The description runs to the MATCHING quote, not to the first quote of any
    // kind. `[^'"`]+` stopped at an inner quote, so
    // `'separates "cannot push" from "not installed yet"'` was reported as
    // `separates ` — a violation message that misquoted the very thing it was
    // complaining about.
    const itPattern =
      /\b(?:fit|xit|it|test)\s*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*)\1/g;

    let itMatch: RegExpExecArray | null;
    while ((itMatch = itPattern.exec(content)) !== null) {
      const quote = itMatch[1] ?? '';
      const description = itMatch[2] ?? '';

      // A template literal with an interpolation is not the test's name — the
      // name is computed per iteration. `` it(`${platform}: ${id} is …`) `` reads
      // at runtime as "ios: pedometer is available", which is exactly what a
      // table-driven failure needs to be legible. Demanding a literal "should"
      // prefix there forces either broken English or one static name repeated for
      // every case, destroying that. Interpolated descriptions are skipped.
      if (quote === '`' && description.includes('${')) continue;

      if (!description.startsWith('should')) {
        violations.push(
          `Test case should start with "should" in ${relativePath}: "${description}"`
        );
      }
    }
  }

  private static checkE2ETests(
    projectRoot: string,
    _config: RuleOfCodeConfig,
    violations: string[]
  ): void {
    const sourceFiles = this.findAngularSourceFiles(projectRoot, _config);
    const e2eFiles = this.findE2EFiles(projectRoot, _config);
    if (sourceFiles.length > 5 && e2eFiles.length === 0) {
      violations.push('No E2E tests found for substantial Angular application');
    }
  }

  private static hasJestOrJasmine(projectRoot: string): boolean {
    return ProjectTypeDetector.hasTestingFramework(projectRoot);
  }

  private static findAngularSourceFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const allFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().TYPESCRIPT,
      config
    );
    return allFiles.filter((file: string) => this.isAngularSourceFile(file));
  }

  private static findTestFiles(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): string[] {
    // Use glob directly to find spec/test files, bypassing the config ignore
    // patterns. Projects commonly add `**/*.spec.ts` to `ignores.global` (so the
    // quality laws don't scan tests), but the testing laws MUST still see them —
    // otherwise test coverage is reported as 0%.
    const { glob } = require('glob');
    const patterns = [
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.spec.js',
      '**/*.test.js',
    ];
    const files = new Set<string>();
    for (const pattern of patterns) {
      const matches: string[] = glob.sync(pattern, {
        cwd: projectRoot,
        absolute: true,
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/.angular/**',
          '**/.nx/**',
          '**/coverage/**',
        ],
      });
      matches.forEach((file: string) => files.add(file));
    }
    return [...files];
  }

  private static findE2EFiles(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): string[] {
    // Use glob directly (bypassing config include/ignore patterns) so E2E specs in
    // e2e/cypress/tests dirs are found even when `includes.global` scopes the rest of
    // the audit to lib source dirs. Accepts .e2e/.spec/.test/.cy naming.
    const { glob } = require('glob');
    const patterns = [
      '{e2e,cypress,tests}/**/*.e2e.{ts,js}',
      '{e2e,cypress,tests}/**/*.spec.{ts,js}',
      '{e2e,cypress,tests}/**/*.test.{ts,js}',
      '{e2e,cypress,tests}/**/*.cy.{ts,js}',
    ];
    const e2eFiles = new Set<string>();
    for (const pattern of patterns) {
      const matches: string[] = glob.sync(pattern, {
        cwd: projectRoot,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**'],
      });
      matches.forEach((file: string) => e2eFiles.add(file));
    }
    return [...e2eFiles];
  }
}
