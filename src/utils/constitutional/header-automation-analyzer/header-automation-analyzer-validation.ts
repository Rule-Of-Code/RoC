import { ProjectTypeDetector } from '../../config';
import { FileSystemOperations } from '../../file-system-operations';
import { FileUtils } from '../../file-utils';
import { AutomatedReviewToolsAnalyzer } from '../../git';
import { PathOperations } from '../../path-operations';
import { HeaderAutomationAnalyzerConfiguration } from './header-automation-analyzer-configuration';

/**
 * Header Automation Analyzer Validation
 * Complete header automation analysis workflow with comprehensive validation
 */
export class HeaderAutomationAnalyzerValidation {
  /**
   * Helper: Get file names from directory (files only)
   * Eliminates duplicated .filter(isFile).map(name) pattern
   */
  private static getFileNames(dirPath: string): string[] {
    return FileSystemOperations.readDirectory(dirPath)
      .filter(entry => entry.isFile())
      .map(entry => entry.name);
  }

  /**
   * Helper: Check if content contains any header keyword
   * Eliminates duplicated headerKeywords.some(keyword => content.includes(keyword)) pattern
   */
  private static contentHasHeaderKeyword(
    content: string,
    keywords: readonly string[]
  ): boolean {
    return keywords.some(keyword => content.includes(keyword));
  }

  /**
   * Helper: Check if any file in directory contains header keywords
   * Eliminates duplicated file iteration logic in hasHeaderInFiles and hasHeaderInWorkflowFiles
   */
  private static anyFileContainsHeaderKeyword(
    dirPath: string,
    fileNames: string[],
    keywords: readonly string[],
    fileExtensionFilter?: readonly string[]
  ): boolean {
    const fileConfig =
      HeaderAutomationAnalyzerConfiguration.FILE_READING_CONFIG;

    for (const file of fileNames) {
      // Skip if extension filter provided and file doesn't match
      if (
        fileExtensionFilter &&
        !fileExtensionFilter.some(ext => file.endsWith(ext))
      ) {
        continue;
      }

      const filePath = PathOperations.join(dirPath, file);
      const content = FileUtils.readFile(filePath, fileConfig);

      if (this.contentHasHeaderKeyword(content, keywords)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Execute complete header automation analysis workflow
   */
  static executeHeaderAutomationAnalysisWorkflow(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const hasHeaderHook = this.checkHuskyHooks(projectRoot);
    const hasAutomatedHeaders = this.checkGitHubActions(projectRoot);
    const hasPreCommitHeaders = this.checkPreCommitConfig(projectRoot);
    const hasHeaderScripts = this.checkPackageJsonScripts(projectRoot);
    const hasCustomHeaderTool = this.checkCustomHeaderTools(projectRoot);

    const hasAnyAutomation =
      hasHeaderHook ||
      hasAutomatedHeaders ||
      hasPreCommitHeaders ||
      hasHeaderScripts ||
      hasCustomHeaderTool;

    if (!hasAnyAutomation) {
      const config =
        HeaderAutomationAnalyzerConfiguration.HEADER_AUTOMATION_VIOLATIONS;
      const suggestionConfig =
        HeaderAutomationAnalyzerConfiguration.HEADER_AUTOMATION_SUGGESTIONS;

      violations.push(config.noAutomation);
      suggestions.push(...suggestionConfig.noAutomation);
    } else {
      this.addImprovementSuggestions(
        suggestions,
        hasHeaderHook,
        hasPreCommitHeaders,
        hasAutomatedHeaders
      );
    }

    return { violations, suggestions };
  }

  /**
   * Check for Husky hooks with header automation
   */
  static checkHuskyHooks(projectRoot: string): boolean {
    // Use utility for existence check (RULE 2: dogfood internals)
    if (!AutomatedReviewToolsAnalyzer.detectPreCommitHooks(projectRoot)) {
      return false;
    }

    const config = HeaderAutomationAnalyzerConfiguration.HUSKY_HOOKS_PATTERNS;
    const huskyPath = PathOperations.join(projectRoot, config.huskyPath);

    if (FileUtils.exists(huskyPath)) {
      const huskyFiles = this.getFileNames(huskyPath);
      const huskyConfig =
        HeaderAutomationAnalyzerConfiguration.HUSKY_HOOKS_PATTERNS;
      return this.anyFileContainsHeaderKeyword(
        huskyPath,
        huskyFiles,
        huskyConfig.headerKeywords
      );
    }

    return false;
  }

  /**
   * Check for GitHub Actions with header automation
   */
  static checkGitHubActions(projectRoot: string): boolean {
    const config =
      HeaderAutomationAnalyzerConfiguration.GITHUB_ACTIONS_PATTERNS;
    const githubActionsPath = PathOperations.join(
      projectRoot,
      config.workflowPath
    );

    if (!FileUtils.exists(githubActionsPath)) {
      return false;
    }

    const workflowFiles = this.getFileNames(githubActionsPath);
    return this.anyFileContainsHeaderKeyword(
      githubActionsPath,
      workflowFiles,
      config.headerKeywords,
      config.fileExtensions
    );
  }

  /**
   * Check for pre-commit configuration with header automation
   */
  static checkPreCommitConfig(projectRoot: string): boolean {
    const config = HeaderAutomationAnalyzerConfiguration.PRE_COMMIT_PATTERNS;
    const preCommitConfig = PathOperations.join(projectRoot, config.configFile);

    if (FileUtils.exists(preCommitConfig)) {
      const fileConfig =
        HeaderAutomationAnalyzerConfiguration.FILE_READING_CONFIG;
      const content = FileUtils.readFile(preCommitConfig, fileConfig);

      return this.contentHasHeaderKeyword(content, config.headerKeywords);
    }

    return false;
  }

  /**
   * Check package.json scripts for header automation
   */
  static checkPackageJsonScripts(projectRoot: string): boolean {
    const scripts = ProjectTypeDetector.getPackageScripts(projectRoot);

    return this.hasHeaderInScripts(scripts);
  }

  /**
   * Check for custom header automation tools
   */
  static checkCustomHeaderTools(projectRoot: string): boolean {
    const customHeaderTools =
      HeaderAutomationAnalyzerConfiguration.CUSTOM_HEADER_TOOLS_PATHS;
    const toolPaths = customHeaderTools.map(tool =>
      PathOperations.join(projectRoot, tool)
    );

    return toolPaths.some(toolPath => FileUtils.exists(toolPath));
  }

  /**
   * Add improvement suggestions based on current automation state
   */
  static addImprovementSuggestions(
    suggestions: string[],
    hasHeaderHook: boolean,
    hasPreCommitHeaders: boolean,
    hasAutomatedHeaders: boolean
  ): void {
    const config =
      HeaderAutomationAnalyzerConfiguration.HEADER_AUTOMATION_SUGGESTIONS;

    if (!hasHeaderHook && !hasPreCommitHeaders) {
      suggestions.push(config.preCommitHooks);
    }

    if (!hasAutomatedHeaders) {
      suggestions.push(config.githubActions);
    }
  }

  /**
   * Check if package.json scripts contain header-related commands
   */
  static hasHeaderInScripts(scripts: Record<string, string> | null): boolean {
    if (!scripts) {
      return false;
    }

    const config = {
      headerKeywords: HeaderAutomationAnalyzerConfiguration.HEADER_KEYWORDS,
    };

    return Object.values(scripts).some(script =>
      this.contentHasHeaderKeyword(script, config.headerKeywords)
    );
  }
}
