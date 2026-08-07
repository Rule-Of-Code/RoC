import { PathOperations } from '../../path-operations';

/**
 * Header Automation Analyzer Configuration
 * Centralized configuration for header automation detection patterns
 */
export class HeaderAutomationAnalyzerConfiguration {
  private static readonly Config = HeaderAutomationAnalyzerConfiguration;

  /**
   * Shared header-related keywords (RULE 1: 100% internal coverage, eliminates duplication)
   */
  static readonly HEADER_KEYWORDS = [
    'header',
    'copyright',
    'license',
  ] as readonly string[];

  /**
   * YAML file extensions (RULE 1: 100% internal coverage)
   */
  static readonly YAML_EXTENSIONS = ['.yml', '.yaml'] as readonly string[];

  /**
   * GitHub Actions workflow patterns (RULE 1: 100% internal coverage)
   */
  static readonly GITHUB_ACTIONS_PATTERNS = {
    workflowPath: PathOperations.join('.github', 'workflows'),
    fileExtensions: ['.yml', '.yaml'] as readonly string[],
    headerKeywords: ['header', 'copyright', 'license'] as readonly string[],
  } as const;

  /**
   * Husky hooks configuration (RULE 1: 100% internal coverage)
   */
  static readonly HUSKY_HOOKS_PATTERNS = {
    huskyPath: '.husky',
    headerKeywords: ['header', 'copyright', 'license'] as readonly string[],
  } as const;

  /**
   * Pre-commit configuration patterns (RULE 1: 100% internal coverage)
   */
  static readonly PRE_COMMIT_PATTERNS = {
    configFile: '.pre-commit-config.yaml',
    headerKeywords: ['header', 'license', 'copyright'] as readonly string[],
  } as const;

  /**
   * Custom header tools file paths (RULE 1: 100% internal coverage)
   */
  static readonly CUSTOM_HEADER_TOOLS_PATHS = [
    PathOperations.join('scripts', 'add-headers.js'),
    PathOperations.join('scripts', 'update-headers.sh'),
    PathOperations.join('tools', 'header-tool.js'),
    PathOperations.join('bin', 'add-headers'),
  ] as readonly string[];

  /**
   * Header automation suggestion messages (RULE 1: 100% internal coverage)
   */
  static readonly HEADER_AUTOMATION_SUGGESTIONS = {
    noAutomation: [
      'Set up automated header insertion via husky hooks, GitHub Actions, or npm scripts',
      'Consider using pre-commit hooks to ensure headers are added before commits',
    ] as readonly string[],
    preCommitHooks:
      'Consider adding pre-commit hooks for header validation' as const,
    githubActions:
      'Consider adding GitHub Actions workflow for header consistency checks' as const,
  } as const;

  /**
   * Header automation violation messages (RULE 1: 100% internal coverage)
   */
  static readonly HEADER_AUTOMATION_VIOLATIONS = {
    noAutomation: 'No automated header management found',
  } as const;

  /**
   * File reading configuration (RULE 1: 100% internal coverage)
   */
  static readonly FILE_READING_CONFIG = {
    encoding: 'utf8' as const,
    fallbackToEmpty: true,
  } as const;

  /**
   * Directory reading configuration (RULE 1: 100% internal coverage)
   */
  static readonly DIRECTORY_READING_CONFIG = {
    withFileTypes: false,
  } as const;

  /**
   * Get GitHub Actions workflow paths and patterns (RULE 2: Caching)
   */
  static getGitHubActionsPatterns(): {
    workflowPath: string;
    fileExtensions: readonly string[];
    headerKeywords: readonly string[];
  } {
    return this.GITHUB_ACTIONS_PATTERNS;
  }

  /**
   * Get Husky hooks configuration patterns (RULE 2: Caching)
   */
  static getHuskyHooksPatterns(): {
    huskyPath: string;
    headerKeywords: readonly string[];
  } {
    return this.HUSKY_HOOKS_PATTERNS;
  }

  /**
   * Get pre-commit configuration patterns (RULE 2: Caching)
   */
  static getPreCommitPatterns(): {
    configFile: string;
    headerKeywords: readonly string[];
  } {
    return this.PRE_COMMIT_PATTERNS;
  }

  /**
   * Get package.json scripts patterns for header automation (RULE 2: Caching)
   */
  static getPackageJsonScriptPatterns(): {
    headerKeywords: readonly string[];
  } {
    return {
      headerKeywords: this.HEADER_KEYWORDS,
    };
  }

  /**
   * Get custom header tools file patterns (RULE 2: Caching)
   */
  static getCustomHeaderToolsPatterns(): readonly string[] {
    return this.CUSTOM_HEADER_TOOLS_PATHS;
  }

  /**
   * Get improvement suggestion templates (RULE 2: Caching)
   */
  static getImprovementSuggestions(): {
    noAutomation: readonly string[];
    preCommitHooks: string;
    githubActions: string;
  } {
    return this.HEADER_AUTOMATION_SUGGESTIONS;
  }

  /**
   * Get violation messages configuration (RULE 2: Caching)
   */
  static getViolationMessages(): {
    noAutomation: string;
  } {
    return this.HEADER_AUTOMATION_VIOLATIONS;
  }

  /**
   * Get file reading configuration (RULE 2: Caching)
   */
  static getFileReadingConfig(): {
    encoding: 'utf8';
    fallbackToEmpty: boolean;
  } {
    return this.FILE_READING_CONFIG;
  }

  static getDirectoryReadingConfig(): {
    withFileTypes: boolean;
  } {
    return this.DIRECTORY_READING_CONFIG;
  }
}
