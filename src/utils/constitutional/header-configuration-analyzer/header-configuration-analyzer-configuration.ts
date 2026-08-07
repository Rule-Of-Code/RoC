import { PathOperations } from '../../path-operations';

/**
 * Header Configuration Analyzer Configuration
 * Centralized configuration for header configuration detection patterns
 */
export class HeaderConfigurationAnalyzerConfiguration {
  private static readonly Config = HeaderConfigurationAnalyzerConfiguration;

  /**
   * Header template file paths (RULE 1: 100% internal coverage)
   */
  static readonly HEADER_TEMPLATE_FILES = [
    'templates/file-header.txt',
    'config/header-template.txt',
    '.header-template',
    'docs/header-template.md',
  ] as readonly string[];

  /**
   * Header template violation and suggestion messages (RULE 1: 100% internal coverage)
   */
  static readonly HEADER_TEMPLATE_MESSAGES = {
    violationMessage: 'No header template file found',
    suggestionMessage:
      'Create a header template file (e.g., templates/file-header.txt) with standard compliance header',
  } as const;

  /**
   * Constitutional documentation files (RULE 1: 100% internal coverage)
   */
  static readonly CONSTITUTIONAL_DOCS_FILES = [
    'CONSTITUTION.md',
    'POLICIES.md',
    'CODE_OF_CONDUCT.md',
  ] as readonly string[];

  /**
   * Constitutional documentation violation and suggestion messages (RULE 1: 100% internal coverage)
   */
  static readonly CONSTITUTIONAL_DOCS_MESSAGES = {
    violationMessage: 'No constitutional documentation found',
    suggestionMessage:
      'Create CONSTITUTION.md or POLICIES.md to define compliance requirements',
  } as const;

  /**
   * Header tool names for package.json (RULE 1: 100% internal coverage)
   */
  static readonly HEADER_TOOLS = [
    'license-header',
    '@coorpacademy/license-header',
    'add-license-header',
    'copyright-header',
  ] as readonly string[];

  /**
   * Header tool suggestion message (RULE 1: 100% internal coverage)
   */
  static readonly HEADER_TOOLS_SUGGESTION =
    'Consider adding a license/header management tool (e.g., license-header)' as const;

  /**
   * Header script names for package.json (RULE 1: 100% internal coverage)
   */
  static readonly HEADER_SCRIPT_NAMES = [
    'header',
    'license',
    'copyright',
    'add-headers',
  ] as readonly string[];

  /**
   * Header script suggestion message (RULE 1: 100% internal coverage)
   */
  static readonly HEADER_SCRIPT_SUGGESTION =
    'Add npm scripts for automated header management' as const;

  /**
   * Package.json file name and fallback message (RULE 1: 100% internal coverage)
   */
  static readonly PACKAGE_JSON_CONFIG = {
    fileName: 'package.json',
    fallbackSuggestion: 'Verify package.json for header tool configuration',
  } as const;

  /**
   * Get header template file patterns (RULE 2: Caching)
   */
  static getHeaderTemplatePatterns(): {
    templateFiles: readonly string[];
    violationMessage: string;
    suggestionMessage: string;
  } {
    return {
      templateFiles: this.HEADER_TEMPLATE_FILES,
      violationMessage: this.HEADER_TEMPLATE_MESSAGES.violationMessage,
      suggestionMessage: this.HEADER_TEMPLATE_MESSAGES.suggestionMessage,
    };
  }

  /**
   * Get constitutional documentation patterns (RULE 2: Caching)
   */
  static getConstitutionalDocsPatterns(): {
    documentFiles: readonly string[];
    violationMessage: string;
    suggestionMessage: string;
  } {
    return {
      documentFiles: this.CONSTITUTIONAL_DOCS_FILES,
      violationMessage: this.CONSTITUTIONAL_DOCS_MESSAGES.violationMessage,
      suggestionMessage: this.CONSTITUTIONAL_DOCS_MESSAGES.suggestionMessage,
    };
  }

  /**
   * Get package.json header tool patterns (RULE 2: Caching)
   */
  static getPackageJsonHeaderToolsPatterns(): {
    headerTools: readonly string[];
    suggestionMessage: string;
  } {
    return {
      headerTools: this.HEADER_TOOLS,
      suggestionMessage: this.HEADER_TOOLS_SUGGESTION,
    };
  }

  /**
   * Get header script patterns for package.json (RULE 2: Caching)
   */
  static getHeaderScriptPatterns(): {
    scriptNames: readonly string[];
    suggestionMessage: string;
  } {
    return {
      scriptNames: this.HEADER_SCRIPT_NAMES,
      suggestionMessage: this.HEADER_SCRIPT_SUGGESTION,
    };
  }

  /**
   * Get package.json configuration (RULE 2: Caching)
   */
  static getPackageJsonConfig(): {
    fileName: string;
    fallbackSuggestion: string;
  } {
    return this.PACKAGE_JSON_CONFIG;
  }

  /**
   * Get file paths for project analysis (RULE 2: Caching)
   */
  static getProjectFilePaths(projectRoot: string): {
    packageJsonPath: string;
  } {
    const config = this.PACKAGE_JSON_CONFIG;
    return {
      packageJsonPath: PathOperations.join(projectRoot, config.fileName),
    };
  }
}
