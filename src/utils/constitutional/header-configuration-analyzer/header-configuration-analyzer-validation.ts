import { ProjectTypeDetector } from '../../config';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { HeaderConfigurationAnalyzerConfiguration } from './header-configuration-analyzer-configuration';

/**
 * Header Configuration Analyzer Validation
 * Complete header configuration analysis workflow with comprehensive validation
 */
export class HeaderConfigurationAnalyzerValidation {
  /**
   * Helper: Check if any file from list exists in project
   * Eliminates duplicated for-loop pattern in checkHeaderTemplates and checkConstitutionalDocs
   */
  private static anyFileExistsInProject(
    projectRoot: string,
    files: readonly string[]
  ): boolean {
    return files.some(file => {
      const filePath = PathOperations.join(projectRoot, file);
      return FileUtils.exists(filePath);
    });
  }

  /**
   * Execute complete header configuration analysis workflow
   */
  static executeHeaderConfigurationAnalysisWorkflow(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    this.checkHeaderTemplates(projectRoot, violations, suggestions);
    this.checkConstitutionalDocs(projectRoot, violations, suggestions);
    this.checkPackageJsonConfiguration(projectRoot, suggestions);

    return { violations, suggestions };
  }

  /**
   * Check for header template files
   */
  static checkHeaderTemplates(
    projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const config = {
      templateFiles:
        HeaderConfigurationAnalyzerConfiguration.HEADER_TEMPLATE_FILES,
      messages:
        HeaderConfigurationAnalyzerConfiguration.HEADER_TEMPLATE_MESSAGES,
    };

    if (!this.anyFileExistsInProject(projectRoot, config.templateFiles)) {
      violations.push(config.messages.violationMessage);
      suggestions.push(config.messages.suggestionMessage);
    }
  }

  /**
   * Check for constitutional documentation files
   */
  static checkConstitutionalDocs(
    projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const config = {
      documentFiles:
        HeaderConfigurationAnalyzerConfiguration.CONSTITUTIONAL_DOCS_FILES,
      messages:
        HeaderConfigurationAnalyzerConfiguration.CONSTITUTIONAL_DOCS_MESSAGES,
    };

    if (!this.anyFileExistsInProject(projectRoot, config.documentFiles)) {
      violations.push(config.messages.violationMessage);
      suggestions.push(config.messages.suggestionMessage);
    }
  }

  /**
   * Check package.json configuration for header tools and scripts
   */
  static checkPackageJsonConfiguration(
    projectRoot: string,
    suggestions: string[]
  ): void {
    const packageJson = ProjectTypeDetector.getPackageJson(
      projectRoot
    ) as Record<string, unknown> | null;

    if (packageJson) {
      this.checkHeaderTools(packageJson, suggestions);
      this.checkHeaderScripts(packageJson, suggestions);
    }
  }

  /**
   * Check for header management tools in package.json dependencies
   */
  static checkHeaderTools(
    packageJson: Record<string, unknown>,
    suggestions: string[]
  ): void {
    const config = {
      headerTools: HeaderConfigurationAnalyzerConfiguration.HEADER_TOOLS,
      suggestionMessage:
        HeaderConfigurationAnalyzerConfiguration.HEADER_TOOLS_SUGGESTION,
    };

    const allDeps = ProjectTypeDetector.getAllDependencies(packageJson);

    const hasHeaderTool = config.headerTools.some(tool => allDeps[tool]);

    if (!hasHeaderTool) {
      suggestions.push(config.suggestionMessage);
    }
  }

  /**
   * Check for header-related scripts in package.json
   */
  static checkHeaderScripts(
    packageJson: Record<string, unknown>,
    suggestions: string[]
  ): void {
    const config = {
      scriptNames: HeaderConfigurationAnalyzerConfiguration.HEADER_SCRIPT_NAMES,
      suggestionMessage:
        HeaderConfigurationAnalyzerConfiguration.HEADER_SCRIPT_SUGGESTION,
    };

    const scripts = (packageJson.scripts ?? {}) as Record<string, string>;
    const hasHeaderScript = config.scriptNames.some(script => scripts[script]);

    if (!hasHeaderScript) {
      suggestions.push(config.suggestionMessage);
    }
  }
}
