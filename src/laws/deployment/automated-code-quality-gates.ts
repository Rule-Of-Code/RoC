import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PerformanceAnalysisService } from '../../utils/performance';
import { ciConfigContent } from '../../utils/project-discovery';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
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
      score -= 20;
    }

    // 2. Check for formatting gates
    const formattingGates = this.analyzeFormattingGates(projectRoot, context.config);
    if (!formattingGates.hasFormattingGates) {
      violations.push('Missing automated code formatting gates');
      suggestions.push(
        'Configure Prettier or similar formatting with automated checks'
      );
      score -= 15;
    }

    // 3. Check for test coverage gates
    const coverageGates = this.analyzeCoverageGates(projectRoot, context.config);
    if (!coverageGates.hasCoverageGates) {
      violations.push('Missing test coverage quality gates');
      suggestions.push('Configure minimum test coverage thresholds in CI/CD');
      score -= 20;
    }

    // 4. Check for build validation gates
    const buildGates = this.analyzeBuildGates(projectRoot, context.config);
    if (!buildGates.hasBuildGates) {
      violations.push('Missing build validation gates');
      suggestions.push('Ensure builds are validated in CI/CD pipeline');
      score -= 15;
    }

    // 5. Check for security scanning gates
    const securityGates = this.analyzeSecurityGates(projectRoot, context.config);
    if (!securityGates.hasSecurityGates) {
      violations.push('Missing security scanning quality gates');
      suggestions.push(
        'Add DependencyVulnerabilityAnalyzer dependency vulnerability scanning and security analysis'
      );
      score -= 15;
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
      score -= 10;
    }

    // 7. Check for performance analysis integration
    const performanceGates =
      PerformanceAnalysisService.analyzePerformanceGates(projectRoot);
    if (performanceGates.hasPerformanceIssues) {
      suggestions.push('Consider adding performance analysis to quality gates');
      performanceGates.recommendations.forEach(rec => {
        suggestions.push(rec);
      });
      score -= 5;
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
    hasLintingInCICD = this.checkLintingInPipeline(projectRoot, config);

    // Check package.json scripts for linting
    const hasLintingScripts =
      this.checkLintingScripts(projectRoot) ||
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
    hasFormattingInCICD = this.checkFormattingInPipeline(projectRoot, config);

    // Check package.json scripts for formatting
    const hasFormattingScripts = this.checkFormattingScripts(projectRoot);

    // Python formats with black / ruff format / isort, declared in pyproject and
    // enforced in pre-commit — not with a .prettierrc and an npm script.
    const hasFormattingGates =
      (hasFormattingConfig &&
        (hasFormattingInCICD || hasFormattingScripts)) ||
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
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): QualityGateAnalysis {
    let hasCoverageConfig = false;
    let hasCoverageThresholds = false;

    // Check Jest configuration for coverage
    const jestConfigFiles = [
      'jest.config.js',
      'jest.config.ts',
      'jest.config.json',
    ];
    for (const configFile of jestConfigFiles) {
      if (this.checkJestConfigFile(projectRoot, configFile)) {
        hasCoverageConfig = true;
        hasCoverageThresholds = true;
        break;
      }
    }

    // Check package.json for coverage configuration
    if (!hasCoverageConfig) {
      const {
        hasCoverageConfig: configFound,
        hasCoverageThresholds: thresholdsFound,
      } = this.checkPackageJsonForCoverage(projectRoot);
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
    const hasBuildScripts = this.checkBuildScripts(projectRoot);

    // Check for build validation in CI/CD
    const hasBuildInCICD = this.checkBuildInPipeline(projectRoot, config);

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

  private static checkJestConfigFile(
    projectRoot: string,
    configFile: string
  ): boolean {
    const configPath = PathOperations.join(projectRoot, configFile);

    if (!FileUtils.exists(configPath)) return false;

    try {
      const content = FileUtils.readFile(configPath, { encoding: 'utf8' });
      return (
        this.hasCoverageConfiguration(content) &&
        this.hasCoverageThresholds(content)
      );
    } catch (_error) {
      return false;
    }
  }

  private static checkPackageJsonForCoverage(projectRoot: string): {
    hasCoverageConfig: boolean;
    hasCoverageThresholds: boolean;
  } {
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');

    if (!FileUtils.exists(packageJsonPath)) {
      return { hasCoverageConfig: false, hasCoverageThresholds: false };
    }

    try {
      const packageJson =
        FileSystemOperations.readJsonFile<Record<string, unknown>>(
          packageJsonPath
        );
      const jest = packageJson.jest as Record<string, unknown> | undefined;
      const hasCoverageConfig = !!jest?.collectCoverage;
      const hasCoverageThresholds = !!jest?.coverageThreshold;

      return { hasCoverageConfig, hasCoverageThresholds };
    } catch (_error) {
      return { hasCoverageConfig: false, hasCoverageThresholds: false };
    }
  }

  private static analyzeSecurityGates(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): QualityGateAnalysis {
    // Check for security scanning in CI/CD
    const hasSecurityInCICD = this.checkSecurityInPipeline(projectRoot, config);

    // Check for audit scripts
    const hasAuditScripts = this.checkAuditScripts(projectRoot);

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

  private static analyzePerformanceGates(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): QualityGateAnalysis {
    const hasPerformanceInCICD = this.checkPerformanceInPipeline(
      projectRoot,
      config
    );

    const hasBundleAnalysis = this.checkBundleAnalysis(projectRoot);

    const hasPerformanceGates = hasPerformanceInCICD || hasBundleAnalysis;

    return {
      hasPerformanceGates,
      violations: [],
      suggestions: [],
    } as QualityGateAnalysis;
  }

  private static checkLintingInPipeline(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): boolean {
    return this.checkPatternInPipelineFiles(projectRoot, [/lint/i, /eslint/i], config);
  }

  private static checkFormattingInPipeline(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): boolean {
    return this.checkPatternInPipelineFiles(projectRoot, [
      /prettier/i,
      /format/i,
    ], config);
  }

  private static checkBuildInPipeline(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): boolean {
    return this.checkPatternInPipelineFiles(projectRoot, [
      /build/i,
      /compile/i,
    ], config);
  }

  private static checkSecurityInPipeline(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): boolean {
    return this.checkPatternInPipelineFiles(projectRoot, [
      /audit/i,
      /security/i,
      /vulnerability/i,
    ], config);
  }

  private static checkPerformanceInPipeline(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): boolean {
    return this.checkPatternInPipelineFiles(projectRoot, [
      /lighthouse/i,
      /performance/i,
      /BundleSizeAnalyzer.*bundle.*size/i,
    ], config);
  }

  private static checkPatternInPipelineFiles(
    projectRoot: string,
    patterns: RegExp[],
    config?: RuleOfCodeConfig
  ): boolean {
    // The combined text of every CI config the shared discovery finds. This
    // kept its own list, naming GitHub workflow files by exact filename — so a
    // pipeline whose job lives in any other file, on any other provider, or at
    // a declared path had no build, lint or security step as far as these
    // checks could see.
    const pipelineContent = ciConfigContent(projectRoot, config);
    if (!pipelineContent) {
      return false;
    }

    return patterns.some(pattern => pattern.test(pipelineContent));
  }

  private static checkLintingScripts(projectRoot: string): boolean {
    return this.checkScriptInPackageJson(projectRoot, [/lint/i]);
  }

  private static checkFormattingScripts(projectRoot: string): boolean {
    return this.checkScriptInPackageJson(projectRoot, [/format/i, /prettier/i]);
  }

  private static checkBuildScripts(projectRoot: string): boolean {
    return this.checkScriptInPackageJson(projectRoot, [/build/i, /compile/i]);
  }

  private static checkAuditScripts(projectRoot: string): boolean {
    return this.checkScriptInPackageJson(projectRoot, [/audit/i, /security/i]);
  }

  private static checkBundleAnalysis(projectRoot: string): boolean {
    return this.checkScriptInPackageJson(projectRoot, [
      /bundle.*analyzer/i,
      /analyze/i,
    ]);
  }

  private static checkScriptInPackageJson(
    projectRoot: string,
    patterns: RegExp[]
  ): boolean {
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (FileUtils.exists(packageJsonPath)) {
      try {
        const packageJson =
          FileSystemOperations.readJsonFile<Record<string, unknown>>(
            packageJsonPath
          );
        const scriptObj = packageJson.scripts as
          | Record<string, string>
          | undefined;
        if (scriptObj) {
          // Script NAMES as well as their commands. Only the commands were
          // scanned, so the conventional `"build": "tsc"` was invisible — the
          // name says what the script is for, and the command names the tool.
          // Every toolchain whose binary is not spelled "build" (tsc, ng, vite,
          // esbuild, rollup) was judged to have no build script at all.
          const scripts = [
            ...Object.keys(scriptObj),
            ...Object.values(scriptObj),
          ].join(' ');
          return patterns.some(pattern => pattern.test(scripts));
        }
      } catch (_error) {
        // Skip if can't read package.json
      }
    }
    return false;
  }

  private static hasCoverageConfiguration(content: string): boolean {
    return /collectCoverage|coverage/i.test(content);
  }

  private static hasCoverageThresholds(content: string): boolean {
    return /coverageThreshold|threshold/i.test(content);
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
