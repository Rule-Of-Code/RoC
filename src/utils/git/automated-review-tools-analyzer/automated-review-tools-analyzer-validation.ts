import type { RuleOfCodeConfig } from '../../../config/types';
import { ciConfigPaths as resolveCiConfigPaths } from '../../project-discovery';
import { ProjectTypeDetectorValidation } from '../../config/project-type-detector/project-type-detector-validation';
import { FileSystemOperations } from '../../file-system-operations';
import { PythonSatisfaction } from '../../python-satisfaction';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { AutomatedReviewToolsAnalyzerConfiguration } from './automated-review-tools-analyzer-configuration';

/**
 * Automated Review Tools Analyzer Validation
 * Complete automated review tools analysis workflow with comprehensive validation
 */
export class AutomatedReviewToolsAnalyzerValidation {
  /**
   * Execute complete automated review tools analysis workflow
   */
  static executeAutomatedReviewToolsAnalysisWorkflow(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const analysisResults = this.analyzeProjectTools(projectRoot);

    this.checkLintingTools(analysisResults, violations, suggestions);
    this.checkCIConfiguration(projectRoot, violations, suggestions, _config);
    this.checkPreCommitHooks(projectRoot, violations, suggestions);
    this.checkCodeQualityIntegration(projectRoot, violations, suggestions);

    return { violations, suggestions };
  }

  /**
   * Analyze project tools and dependencies
   */
  static analyzeProjectTools(projectRoot: string): {
    hasLinting: boolean;
    hasCodeQualityTools: boolean;
    packageJson: Record<string, unknown> | null;
  } {
    const allDeps =
      ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

    // `getProjectDependencies` reads package.json and nothing else, and the tool
    // list is [eslint, tslint, jshint, stylelint, prettier] — so a Python repo
    // running `ruff ALL` and `mypy strict` is invisible BY CONSTRUCTION, no
    // matter what it has configured (a backend consumer, F1). Same fix as the perf law.
    const pythonLinting =
      PythonSatisfaction.isPython(projectRoot) &&
      PythonSatisfaction.hasPythonLinter(projectRoot);
    const pythonQuality =
      pythonLinting ||
      (PythonSatisfaction.isPython(projectRoot) &&
        (PythonSatisfaction.hasPythonFormatter(projectRoot) ||
          PythonSatisfaction.hasPythonSast(projectRoot)));

    if (Object.keys(allDeps).length === 0) {
      return {
        hasLinting: pythonLinting,
        hasCodeQualityTools: pythonQuality,
        packageJson: null,
      };
    }

    // Check for linting tools
    const lintingConfig =
      AutomatedReviewToolsAnalyzerConfiguration.getLintingToolsPatterns();
    const hasLinting =
      lintingConfig.tools.some(tool => tool in allDeps) || pythonLinting;

    // Check for code quality tools
    const qualityConfig =
      AutomatedReviewToolsAnalyzerConfiguration.getCodeQualityToolsPatterns();
    const hasCodeQualityTools =
      qualityConfig.tools.some(tool => tool in allDeps) || pythonQuality;

    const packageJsonData =
      ProjectTypeDetectorValidation.getPackageJson(projectRoot);
    const packageJson =
      packageJsonData && typeof packageJsonData === 'object'
        ? (packageJsonData as Record<string, unknown>)
        : null;

    return { hasLinting, hasCodeQualityTools, packageJson };
  }

  /**
   * Check linting tools configuration
   */
  static checkLintingTools(
    analysisResults: { hasLinting: boolean; hasCodeQualityTools: boolean },
    violations: string[],
    suggestions: string[]
  ): void {
    const lintingConfig =
      AutomatedReviewToolsAnalyzerConfiguration.getLintingToolsPatterns();
    const qualityConfig =
      AutomatedReviewToolsAnalyzerConfiguration.getCodeQualityToolsPatterns();

    if (!analysisResults.hasLinting) {
      violations.push(lintingConfig.violationMessage);
      suggestions.push(lintingConfig.suggestionMessage);
    }

    if (!analysisResults.hasCodeQualityTools) {
      suggestions.push(qualityConfig.suggestionMessage);
    }
  }

  /**
   * Check CI/CD configuration
   */
  static checkCIConfiguration(
    projectRoot: string,
    violations: string[],
    suggestions: string[],
    rocConfig?: RuleOfCodeConfig
  ): void {
    const config = AutomatedReviewToolsAnalyzerConfiguration.getCICDPatterns();

    const { hasCICD, hasReviewChecks } = this.analyzeCIConfiguration(
      projectRoot,
      config.configPaths,
      rocConfig
    );

    if (!hasCICD) {
      violations.push(config.noCICDMessage);
      suggestions.push(config.cicdSuggestion);
    } else if (!hasReviewChecks) {
      violations.push(config.noReviewChecksMessage);
      suggestions.push(config.reviewChecksSuggestion);
    }
  }

  /**
   * Analyze CI configuration files
   */
  static analyzeCIConfiguration(
    projectRoot: string,
    legacyConfigPaths: string[],
    rocConfig?: RuleOfCodeConfig
  ): { hasCICD: boolean; hasReviewChecks: boolean } {
    // The shared discovery first — it knows every provider the tool knows, and
    // it honours a project's declared config path. This analyzer kept its own
    // provider list, so a repository whose CI the rest of the tool recognised
    // was still told here that it had none.
    const discovered = resolveCiConfigPaths(projectRoot, rocConfig);
    const legacy = legacyConfigPaths.map(relative =>
      PathOperations.join(projectRoot, relative)
    );

    let hasCICD = false;
    let hasReviewChecks = false;

    for (const fullPath of new Set([...discovered, ...legacy])) {
      if (!FileUtils.exists(fullPath)) {
        continue;
      }

      hasCICD = true;
      hasReviewChecks = this.checkForReviewAutomation(fullPath);
      if (hasReviewChecks) break;
    }

    return { hasCICD, hasReviewChecks };
  }

  /**
   * Check for review automation in CI config
   */
  static checkForReviewAutomation(configPath: string): boolean {
    if (FileUtils.isDirectory(configPath)) {
      return this.checkWorkflowDirectory(configPath);
    }
    return this.checkSingleConfigFile(configPath);
  }

  /**
   * Check workflow directory for review automation
   */
  static checkWorkflowDirectory(workflowDir: string): boolean {
    const workflows = FileSystemOperations.readDirectory(workflowDir);

    for (const workflow of workflows) {
      if (!workflow.isFile()) continue;

      const workflowPath = PathOperations.join(workflowDir, workflow.name);
      const content = this.readFileLowercase(workflowPath);

      if (this.hasReviewKeywords(content)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check single config file for review automation
   */
  static checkSingleConfigFile(configPath: string): boolean {
    const content = this.readFileLowercase(configPath);
    return this.hasReviewKeywords(content);
  }

  /**
   * Check if content has review-related keywords
   */
  static hasReviewKeywords(content: string): boolean {
    const keywords =
      AutomatedReviewToolsAnalyzerConfiguration.getReviewKeywords();
    return keywords.some(keyword => content.includes(keyword));
  }

  /**
   * Check for pre-commit hooks
   */
  static checkPreCommitHooks(
    projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const hasPreCommitHooks = this.detectPreCommitHooks(projectRoot);

    if (!hasPreCommitHooks) {
      const config =
        AutomatedReviewToolsAnalyzerConfiguration.getPreCommitHooksPatterns();
      suggestions.push(...config.suggestions);
    }
  }

  /**
   * Detect pre-commit hooks configuration
   * Public utility for detecting husky, pre-commit configs, and git hooks
   */
  static detectPreCommitHooks(projectRoot: string): boolean {
    const config =
      AutomatedReviewToolsAnalyzerConfiguration.getPreCommitHooksPatterns();

    // Filter out .sample files before checking
    const validHookPaths = config.hookPaths.filter(
      hookPath => !hookPath.endsWith('.sample')
    );
    return this.anyPathExists(projectRoot, validHookPaths);
  }

  /**
   * Check code quality integration tools
   */
  static checkCodeQualityIntegration(
    projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    this.checkDependencyUpdaters(projectRoot, suggestions);
    this.checkCoverageReporting(projectRoot, suggestions);
  }

  /**
   * Generic helper: Check if any path exists in project
   * Eliminates duplicated PathOperations.join + FileUtils.exists pattern
   */
  private static anyPathExists(projectRoot: string, paths: string[]): boolean {
    return paths.some(path => {
      const fullPath = PathOperations.join(projectRoot, path);
      return FileUtils.exists(fullPath);
    });
  }

  /**
   * Generic helper: Read file content as lowercase
   * Eliminates duplicated FileUtils.readFile().toLowerCase() pattern
   */
  private static readFileLowercase(filePath: string): string {
    return FileUtils.readFile(filePath).toLowerCase();
  }

  /**
   * Check for dependency update tools
   */
  static checkDependencyUpdaters(
    projectRoot: string,
    suggestions: string[]
  ): void {
    const config =
      AutomatedReviewToolsAnalyzerConfiguration.getDependencyUpdatersPatterns();

    if (!this.anyPathExists(projectRoot, config.updaterPaths)) {
      suggestions.push(config.suggestionMessage);
    }
  }

  /**
   * Check for code coverage reporting
   */
  static checkCoverageReporting(
    projectRoot: string,
    suggestions: string[]
  ): void {
    const config =
      AutomatedReviewToolsAnalyzerConfiguration.getCoverageReportingPatterns();

    if (!this.anyPathExists(projectRoot, config.coverageConfigs)) {
      suggestions.push(config.suggestionMessage);
    }
  }
}
