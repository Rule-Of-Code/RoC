import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { CoverageThresholdReader } from '../../utils/testing/coverage-threshold-reader';
import { QUALITY_GATES_PENALTY as PENALTY } from './deployment-penalties';
import {
  checkAuditScripts,
  checkBuildInPipeline,
  checkBuildScripts,
  checkFormattingInPipeline,
  checkFormattingScripts,
  checkLintingInPipeline,
  checkLintingScripts,
  checkPackageJsonForCoverage,
  checkSecurityInPipeline,
} from './quality-gate-sources';
// Interfaces for quality gate analysis
interface QualityGateAnalysis {
  hasLintingGates?: boolean;
  hasCoverageGates?: boolean;
  violations: string[];
  suggestions: string[];
  [key: string]: string[] | boolean | number | string | undefined;
}

/**
 * Automated Code Quality Gates Law
 *
 * Comprehensive quality gates validation that ensures:
 * - Automated linting and formatting checks
 * - Code quality analysis integration
 * - Test coverage validation gates
 * - Build verification and validation
 * - Security scanning integration
 * - Performance analysis gates
 * - Dependency vulnerability checks
 *
 * Professional implementation following automated quality gate best practices
 */
export class AutomatedCodeQualityGatesLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot } = context;

    // 1. Check for linting configuration and automation
    const lintingGates = this.analyzeLintingGates(projectRoot, context.config);
    if (!lintingGates.hasLintingGates) {
      violations.push('Missing automated linting quality gates');
      suggestions.push(
        'Configure ESLint, TSLint, or similar with CI/CD integration'
      );
      score -= PENALTY.linting;
    }

    // 2. Check for formatting gates
    const formattingGates = this.analyzeFormattingGates(
      projectRoot,
      context.config
    );
    if (!formattingGates.hasFormattingGates) {
      violations.push('Missing automated code formatting gates');
      suggestions.push(
        'Configure Prettier or similar formatting with automated checks'
      );
      score -= PENALTY.formatting;
    }

    // 3. Check for test coverage gates
    const coverageGates = this.analyzeCoverageGates(projectRoot);
    if (!coverageGates.hasCoverageGates) {
      violations.push('Missing test coverage quality gates');
      suggestions.push('Configure minimum test coverage thresholds in CI/CD');
      score -= PENALTY.coverage;
    }

    // 4. Check for build validation gates
    const buildGates = this.analyzeBuildGates(projectRoot, context.config);
    if (!buildGates.hasBuildGates) {
      violations.push('Missing build validation gates');
      suggestions.push('Ensure builds are validated in CI/CD pipeline');
      score -= PENALTY.build;
    }

    // 5. Check for security scanning gates
    const securityGates = this.analyzeSecurityGates(
      projectRoot,
      context.config
    );
    if (!securityGates.hasSecurityGates) {
      violations.push('Missing security scanning quality gates');
      suggestions.push(
        'Add DependencyVulnerabilityAnalyzer dependency vulnerability scanning and security analysis'
      );
      score -= PENALTY.security;
    }

    // 6. Check for TypeScript strict mode validation — TypeScript projects only.
    // A Python service has no tsconfig.json, and its type checker is `mypy
    // --strict`, which analyzeLintingGates already sees.
    const typeScriptGates = this.analyzeTypeScriptGates(projectRoot);
    if (
      !typeScriptGates.hasTypeScriptGates &&
      PythonSatisfaction.hasJsTsSources(projectRoot)
    ) {
      suggestions.push(
        'Enable TypeScript strict mode validation in quality gates'
      );
      score -= PENALTY.typeScriptStrict;
    }

    const finalScore = Math.max(0, score);

    return {
      // A law that fails while listing NOTHING to fix is unusable (a backend consumer,
      // F2). It used to fail on SCORE — and two of the deductions above emit only
      // SUGGESTIONS, so a project could be told "FAILED, score 90" with an empty
      // violation list and no way to know what was wrong. A law fails on its
      // VIOLATIONS; the score stays informational.
      passed: violations.length === 0,
      message: this.generateMessage(
        violations.length,
        lintingGates,
        coverageGates
      ),
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score: finalScore,
      fixable: true,
      config: context.config,
    };
  }

  private static analyzeLintingGates(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): QualityGateAnalysis {
    const lintingConfigs = [
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yml',
      '.tslint.json',
      'eslint.config.mjs',
      'eslint.config.js',
      // Python declares its linter in project config, not in an .eslintrc:
      // standalone files, or a [tool.*] section in pyproject.toml (below).
      'ruff.toml',
      '.ruff.toml',
      '.flake8',
      '.pylintrc',
      'mypy.ini',
      '.mypy.ini',
    ];

    let hasLintingConfig = false;
    let hasLintingInCICD = false;

    // Check for linting configuration files
    for (const config of lintingConfigs) {
      if (FileUtils.exists(PathOperations.join(projectRoot, config))) {
        hasLintingConfig = true;
        break;
      }
    }

    // A Python project configures ruff / mypy / flake8 inside pyproject.toml or
    // setup.cfg. Demanding an .eslintrc from a repo with `ruff ALL` and
    // `mypy strict` enforced in pre-commit and CI is demanding a foreign
    // artifact — and the only way to satisfy it is to fake one (a backend consumer).
    if (!hasLintingConfig) {
      hasLintingConfig = PythonSatisfaction.hasPythonLinter(projectRoot);
    }

    // Check for linting in CI/CD pipelines
    hasLintingInCICD = checkLintingInPipeline(projectRoot, config);

    // Check package.json scripts for linting
    const hasLintingScripts =
      checkLintingScripts(projectRoot) ||
      PythonSatisfaction.hasPythonLinterInGate(projectRoot);

    const hasLintingGates =
      hasLintingConfig && (hasLintingInCICD || hasLintingScripts);

    return {
      hasLintingGates,
      hasLintingConfig,
      hasLintingInCICD,
      hasLintingScripts,
      violations: [],
      suggestions: [],
    } as QualityGateAnalysis;
  }

  private static analyzeFormattingGates(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): QualityGateAnalysis {
    const formattingConfigs = [
      '.prettierrc',
      '.prettierrc.js',
      '.prettierrc.json',
      '.prettierrc.yml',
      'prettier.config.js',
    ];

    let hasFormattingConfig = false;
    let hasFormattingInCICD = false;

    // Check for formatting configuration files
    for (const config of formattingConfigs) {
      if (FileUtils.exists(PathOperations.join(projectRoot, config))) {
        hasFormattingConfig = true;
        break;
      }
    }

    // Check for formatting in CI/CD pipelines
    hasFormattingInCICD = checkFormattingInPipeline(projectRoot, config);

    // Check package.json scripts for formatting
    const hasFormattingScripts = checkFormattingScripts(projectRoot);

    // Python formats with black / ruff format / isort, declared in pyproject and
    // enforced in pre-commit — not with a .prettierrc and an npm script.
    const hasFormattingGates =
      (hasFormattingConfig && (hasFormattingInCICD || hasFormattingScripts)) ||
      PythonSatisfaction.hasPythonFormatter(projectRoot);

    return {
      hasFormattingGates,
      hasFormattingConfig,
      hasFormattingInCICD,
      hasFormattingScripts,
      violations: [],
      suggestions: [],
    } as QualityGateAnalysis;
  }

  private static analyzeCoverageGates(
    projectRoot: string
  ): QualityGateAnalysis {
    let hasCoverageConfig = false;
    let hasCoverageThresholds = false;

    // Jest thresholds, asked of the shared reader, which looks across the
    // workspace rather than at the project root alone.
    //
    // In an Nx workspace the ROOT jest config cannot hold a threshold: it is an
    // aggregator (`projects: await getJestProjectsAsync()`), and Jest resolves
    // coverage thresholds per project when `projects` is used. The threshold
    // lives in `apps/<name>/jest.config.ts`, which is where Jest expects it —
    // so a project gating on 100% branches was reported as having no coverage
    // gate, and the only way to satisfy the check would have been to duplicate
    // the threshold at the root, where it gates nothing.
    if (CoverageThresholdReader.workspaceBlocks(projectRoot).length > 0) {
      hasCoverageConfig = true;
      hasCoverageThresholds = true;
    }

    // Check package.json for coverage configuration
    if (!hasCoverageConfig) {
      const {
        hasCoverageConfig: configFound,
        hasCoverageThresholds: thresholdsFound,
      } = checkPackageJsonForCoverage(projectRoot);
      hasCoverageConfig = configFound;
      hasCoverageThresholds = thresholdsFound;
    }

    // pytest-cov with a `fail_under` threshold in pyproject is a coverage gate;
    // jest.config.js is not the only way to have one.
    const hasCoverageGates =
      (hasCoverageConfig && hasCoverageThresholds) ||
      PythonSatisfaction.hasCoverageConfigured(projectRoot);

    return {
      hasCoverageGates,
      hasCoverageConfig,
      hasCoverageThresholds,
      violations: [],
      suggestions: [],
    } as QualityGateAnalysis;
  }

  private static analyzeBuildGates(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): QualityGateAnalysis {
    // Check for TypeScript configuration
    const hasTSConfig = FileUtils.exists(
      PathOperations.join(projectRoot, 'tsconfig.json')
    );

    // Check for build scripts in package.json
    const hasBuildScripts = checkBuildScripts(projectRoot);

    // Check for build validation in CI/CD
    const hasBuildInCICD = checkBuildInPipeline(projectRoot, config);

    // A PEP 517 [build-system] (or a Dockerfile) is a build gate. Demanding a
    // tsconfig.json from a Python service is demanding a foreign artifact.
    const hasBuildGates =
      (hasTSConfig && hasBuildScripts && hasBuildInCICD) ||
      PythonSatisfaction.hasPythonBuildSystem(projectRoot);

    return {
      hasBuildGates,
      hasTSConfig,
      hasBuildScripts,
      hasBuildInCICD,
      violations: [],
      suggestions: [],
    } as QualityGateAnalysis;
  }

  private static analyzeSecurityGates(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): QualityGateAnalysis {
    // Check for security scanning in CI/CD
    const hasSecurityInCICD = checkSecurityInPipeline(projectRoot, config);

    // Check for audit scripts
    const hasAuditScripts = checkAuditScripts(projectRoot);

    // bandit (SAST) and pip-audit (dependencies) in the gate ARE security gates.
    const hasSecurityGates =
      hasSecurityInCICD ||
      hasAuditScripts ||
      PythonSatisfaction.hasPythonSast(projectRoot) ||
      PythonSatisfaction.hasPythonDependencyScanner(projectRoot);

    return {
      hasSecurityGates,
      hasSecurityInCICD,
      hasAuditScripts,
      violations: [],
      suggestions: [],
    } as QualityGateAnalysis;
  }

  private static analyzeTypeScriptGates(
    projectRoot: string
  ): QualityGateAnalysis {
    let hasStrictMode = false;

    const tsConfigPath = PathOperations.join(projectRoot, 'tsconfig.json');
    if (FileUtils.exists(tsConfigPath)) {
      try {
        const content = FileUtils.readFile(tsConfigPath, { encoding: 'utf8' });
        hasStrictMode = this.hasTypeScriptStrict(content);
      } catch (_error) {
        // Skip if can't read tsconfig.json
      }
    }

    return {
      hasTypeScriptGates: hasStrictMode,
      violations: [],
      suggestions: [],
    } as QualityGateAnalysis;
  }

  private static hasTypeScriptStrict(content: string): boolean {
    return /"strict"\s*:\s*true/i.test(content);
  }

  private static generateMessage(
    violationCount: number,
    lintingGates: QualityGateAnalysis,
    coverageGates: QualityGateAnalysis
  ): string {
    if (violationCount === 0) {
      return '✅ Automated Code Quality Gates: Comprehensive quality gates configured';
    }

    const missingGates = [];
    if (!lintingGates.hasLintingGates) missingGates.push('linting');
    if (!coverageGates.hasCoverageGates) missingGates.push('coverage');

    return `⚠️ Automated Code Quality Gates: Missing ${missingGates.join(
      ', '
    )} gates`;
  }
}
