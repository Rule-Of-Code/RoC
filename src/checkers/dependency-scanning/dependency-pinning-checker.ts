import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils';
import { ProjectTypeDetectorValidation } from '../../utils/config/project-type-detector/project-type-detector-validation';
import { PathOperations } from '../../utils/path-operations';
/**
 * Dependency Pinning Checker
 * Validates that dependencies are properly pinned to specific versions
 * to ensure reproducible builds and avoid supply chain attacks
 */
export class DependencyPinningChecker {
  /**
   * Check for dependency pinning patterns
   */
  static check(context: LawCheckContext): LawResult {
    try {
      const packageJsonData = ProjectTypeDetectorValidation.getPackageJson(
        context.projectRoot
      );

      if (!packageJsonData) {
        return this.buildNotFoundResult(context);
      }

      const analysisResult = this.analyzeAllDependencies(
        context,
        packageJsonData
      );
      return this.buildResult(context, analysisResult);
    } catch (_error) {
      return this.buildErrorResult(context, _error);
    }
  }

  /**
   * Analyze all dependencies and return aggregated results
   */
  private static analyzeAllDependencies(
    context: LawCheckContext,
    packageJsonData: unknown
  ): { violations: string[]; suggestions: string[]; score: number } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    const packageJson =
      typeof packageJsonData === 'object'
        ? (packageJsonData as Record<string, unknown>)
        : {};

    // Analyze merged dependencies
    const allDeps = ProjectTypeDetectorValidation.getProjectDependencies(
      context.projectRoot
    );
    const depAnalysis = this.analyzeDependencies(
      allDeps,
      'dependencies/devDependencies'
    );
    violations.push(...depAnalysis.violations);
    suggestions.push(...depAnalysis.suggestions);
    score -= depAnalysis.scoreDeduction;

    // Check peerDependencies separately
    const peerDeps = this.extractPeerDependencies(packageJson);
    const peerDepAnalysis = this.analyzeDependencies(
      peerDeps,
      'peerDependencies'
    );
    violations.push(...peerDepAnalysis.violations);
    suggestions.push(...peerDepAnalysis.suggestions);
    score -= peerDepAnalysis.scoreDeduction;

    // Check for lock file
    if (!this.hasLockFile(context.projectRoot)) {
      violations.push(
        'No lock file found - package-lock.json, yarn.lock, or pnpm-lock.yaml required'
      );
      suggestions.push('Add a lock file to ensure reproducible builds');
      score -= 25;
    }

    return { violations, suggestions, score: Math.max(0, score) };
  }

  /**
   * Extract peer dependencies from package.json
   */
  private static extractPeerDependencies(
    packageJson: Record<string, unknown>
  ): Record<string, string> {
    return typeof packageJson.peerDependencies === 'object' &&
      packageJson.peerDependencies !== null
      ? (packageJson.peerDependencies as Record<string, string>)
      : {};
  }

  /**
   * Check if lock file exists
   */
  private static hasLockFile(projectRoot: string): boolean {
    return (
      FileUtils.exists(PathOperations.join(projectRoot, 'package-lock.json')) ||
      FileUtils.exists(PathOperations.join(projectRoot, 'yarn.lock')) ||
      FileUtils.exists(PathOperations.join(projectRoot, 'pnpm-lock.yaml'))
    );
  }

  /**
   * Build result for package.json not found
   */
  private static buildNotFoundResult(context: LawCheckContext): LawResult {
    return {
      passed: false,
      message: '🚨 Dependency Pinning: package.json not found',
      details: ['package.json not found'],
      violations: ['package.json not found'],
      suggestions: [],
      score: 0,
      fixable: false,
      config: context.config,
    };
  }

  /**
   * Build final result based on analysis
   */
  private static buildResult(
    context: LawCheckContext,
    analysis: { violations: string[]; suggestions: string[]; score: number }
  ): LawResult {
    const { violations, suggestions, score } = analysis;
    const passed = violations.length === 0;

    return {
      passed,
      message: passed
        ? '✅ Dependency Pinning: All dependencies properly pinned and locked'
        : `🚨 Dependency Pinning: ${violations.length} pinning issues found`,
      details: passed
        ? ['All dependencies use exact versions or acceptable ranges']
        : [...violations, ...suggestions],
      violations,
      suggestions,
      score,
      fixable: !passed,
      config: context.config,
    };
  }

  /**
   * Build error result
   */
  private static buildErrorResult(
    context: LawCheckContext,
    error: unknown
  ): LawResult {
    return {
      passed: false,
      message: `🚨 Dependency Pinning: Analysis failed - ${error}`,
      details: [`Error analyzing dependency pinning: ${error}`],
      violations: [`Analysis error: ${error}`],
      suggestions: ['Fix package.json syntax and try again'],
      score: 0,
      fixable: false,
      config: context.config,
    };
  }

  /**
   * Analyze dependency versions for pinning compliance
   */
  private static analyzeDependencies(
    dependencies: Record<string, string>,
    depType: string
  ): {
    violations: string[];
    suggestions: string[];
    scoreDeduction: number;
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let scoreDeduction = 0;

    for (const [_name, version] of Object.entries(dependencies)) {
      const analysis = this.analyzeVersionRange(_name, version);

      if (analysis.isViolation) {
        violations.push(`${depType}: ${_name}@${version} - ${analysis.issue}`);
        scoreDeduction += analysis.severityScore;
      }

      if (analysis.suggestion) {
        suggestions.push(`${depType}: ${_name} - ${analysis.suggestion}`);
      }
    }

    return { violations, suggestions, scoreDeduction };
  }

  /**
   * Analyze individual version range for compliance
   */
  private static analyzeVersionRange(
    name: string,
    version: string
  ): {
    isViolation: boolean;
    issue?: string;
    suggestion?: string;
    severityScore: number;
  } {
    // Allow workspace protocol for monorepos
    if (version.startsWith('workspace:')) {
      return { isViolation: false, severityScore: 0 };
    }

    // Allow file: protocol for local dependencies
    if (version.startsWith('file:')) {
      return { isViolation: false, severityScore: 0 };
    }

    // Allow git dependencies from ANY provider/protocol — git+ssh://, git+https://,
    // git://, the github:/gitlab:/bitbucket: shorthands, or raw git@ SSH — but
    // still suggest pinning to a commit-ish (#...).
    const isGitDependency =
      /^git(\+(ssh|https?|file))?:\/\//.test(version) ||
      /^(github|gitlab|bitbucket|gist):/.test(version) ||
      version.startsWith('git@');
    if (isGitDependency) {
      if (!version.includes('#')) {
        return {
          isViolation: true,
          issue: 'Git dependency not pinned to specific commit',
          suggestion:
            'Pin git dependencies to specific commits using #commit-hash',
          severityScore: 15,
        };
      }
      return { isViolation: false, severityScore: 0 };
    }

    // Caret ranges (^) are acceptable - semver compliant for minor/patch updates
    if (version.startsWith('^')) {
      return {
        isViolation: false,
        severityScore: 0,
      };
    }

    // Tilde ranges (~) are acceptable for patch updates
    if (version.startsWith('~')) {
      return {
        isViolation: false,
        severityScore: 0,
      };
    }

    // Check for wildcard versions
    if (version.includes('*') || version === 'latest') {
      return {
        isViolation: true,
        issue: 'Uses wildcard or "latest" - extremely unsafe for production',
        suggestion: 'Pin to exact version',
        severityScore: 20,
      };
    }

    // Check for range operators
    if (
      version.includes('>') ||
      version.includes('<') ||
      version.includes('||')
    ) {
      return {
        isViolation: true,
        issue: 'Uses range operators - can lead to non-reproducible builds',
        suggestion: 'Pin to exact version',
        severityScore: 10,
      };
    }

    // Exact version is ideal
    if (/^\d+\.\d+\.\d+(-[\w.-]+)?$/.test(version)) {
      return { isViolation: false, severityScore: 0 };
    }

    // Unknown version format
    return {
      isViolation: true,
      issue: 'Unknown version format',
      suggestion: 'Use standard semantic version format',
      severityScore: 5,
    };
  }
}

export const DependencyPinningCheckerLaw = DependencyPinningChecker;
