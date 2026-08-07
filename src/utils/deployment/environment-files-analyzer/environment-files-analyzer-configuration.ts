import { PathOperations } from '../../path-operations';
import { StringTemplateUtils } from '../../string-template-utils';

/**
 * Environment Files Analyzer Configuration
 * Centralized configuration for environment file analysis patterns
 */
export class EnvironmentFilesAnalyzerConfiguration {
  private static readonly Config = EnvironmentFilesAnalyzerConfiguration;

  /**
   * Possible environment files list (RULE 1: 100% internal coverage)
   */
  /**
   * The environment CONTRACT: which variables exist, with placeholder values.
   *
   * This is the file a project is supposed to commit. Real values for staging and
   * production are injected at deploy time — they are secrets, and a law that
   * demands `.env.production` in the repository is a law demanding you commit
   * your secrets (a backend consumer). We ask for the contract, never for the values.
   */
  static readonly EXAMPLE_ENVIRONMENT_FILES = [
    '.env.example',
    '.env.template',
    '.env.sample',
    '.env.dist',
    'env.example',
    '.env.defaults',
  ] as readonly string[];

  static readonly POSSIBLE_ENVIRONMENT_FILES = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.staging',
    '.env.production',
    '.env.test',
    ...EnvironmentFilesAnalyzerConfiguration.EXAMPLE_ENVIRONMENT_FILES,
    'config/development.json',
    'config/staging.json',
    'config/production.json',
    'config/test.json',
    'environments/environment.ts',
    'environments/environment.prod.ts',
    'environments/environment.staging.ts',
    'environments/environment.test.ts',
  ] as readonly string[];

  /**
   * Environment consistency validation patterns (RULE 1: 100% internal coverage)
   */
  static readonly CONSISTENCY_VALIDATION_PATTERNS = {
    insufficientFilesMessage:
      'No environment contract declared — commit .env.example (or .env.template) listing every variable with placeholder values',
    insufficientFilesSuggestion:
      'Declare the variables in .env.example with placeholders. Do NOT commit .env.production: real values are injected at deploy time, and a checked-in production env file is a secret in your repository',
    minimumFilesRequired: 2,
  } as const;

  /**
   * Environment file key extraction patterns (RULE 1: 100% internal coverage)
   */
  static readonly KEY_EXTRACTION_PATTERNS = {
    envVariablePattern: /^[A-Z_][A-Z0-9_]*=/gm,
  } as const;

  /**
   * Environment file analysis patterns (RULE 1: 100% internal coverage)
   */
  static readonly ENV_FILE_ANALYSIS_PATTERNS = {
    exampleFileName: '.env.example',
    envFileName: '.env',
    gitignoreFileName: '.gitignore',
    gitignorePatterns: ['.env', '*.env'] as readonly string[],
  } as const;

  /**
   * File reading configuration (RULE 1: 100% internal coverage)
   */
  static readonly FILE_READING_CONFIG = {
    encoding: 'utf8' as const,
  } as const;

  /**
   * JSON validation patterns (RULE 1: 100% internal coverage)
   */
  static readonly JSON_VALIDATION_PATTERNS = {
    prefixSeparator: '.',
  } as const;

  /**
   * Centralized violation and suggestion messages (RULE 1: 100% internal coverage)
   */
  static readonly ENV_ANALYSIS_MESSAGES = {
    noExampleFile: '.env.example file not found',
    envInGit: '.env file may be tracked in git',
    createExampleFile:
      'Create .env.example file with all required environment variables',
    addToGitignore: 'Add .env to .gitignore to prevent committing secrets',
    missingKeysTemplate: `{0} missing keys: {1}`,
    extraKeysTemplate: `{0} has extra keys: {1}`,
  } as const;

  /**
   * Public message builder API
   * RULE 1: Uses centralized StringTemplateUtils instead of duplicate logic
   */
  static buildMessage(templateKey: string, ...args: string[]): string {
    const messages = this.ENV_ANALYSIS_MESSAGES as unknown as Record<
      string,
      string
    >;
    const template = messages[templateKey] ?? '';
    return StringTemplateUtils.formatTemplate(template, ...args);
  }

  /**
   * Get possible environment files list
   */
  static getPossibleEnvironmentFiles(): readonly string[] {
    return this.POSSIBLE_ENVIRONMENT_FILES;
  }

  /**
   * Get environment consistency validation patterns
   */
  static getConsistencyValidationPatterns(): {
    insufficientFilesMessage: string;
    insufficientFilesSuggestion: string;
    minimumFilesRequired: number;
  } {
    return this.CONSISTENCY_VALIDATION_PATTERNS;
  }

  /**
   * Get environment file patterns for key extraction
   */
  static getKeyExtractionPatterns(): {
    envVariablePattern: RegExp;
  } {
    return this.KEY_EXTRACTION_PATTERNS;
  }

  /**
   * Get .env file analysis patterns (RULE 2: Caching)
   */
  static getEnvFileAnalysisPatterns(): {
    exampleFileName: string;
    envFileName: string;
    gitignoreFileName: string;
    gitignorePatterns: readonly string[];
  } {
    return this.ENV_FILE_ANALYSIS_PATTERNS;
  }

  /**
   * Get file reading configuration
   */
  static getFileReadingConfig(): {
    encoding: 'utf8';
  } {
    return this.FILE_READING_CONFIG;
  }

  /**
   * Get violation messages for key consistency (RULE 2: Caching)
   */
  static getKeyConsistencyMessages(): {
    missingKeysTemplate: string;
    extraKeysTemplate: string;
  } {
    return {
      missingKeysTemplate: this.ENV_ANALYSIS_MESSAGES.missingKeysTemplate,
      extraKeysTemplate: this.ENV_ANALYSIS_MESSAGES.extraKeysTemplate,
    };
  }

  /**
   * Get project file paths for analysis (RULE 2: Caching)
   */
  static getProjectFilePaths(projectRoot: string): {
    envExamplePath: string;
    envPath: string;
    gitignorePath: string;
  } {
    const patterns = this.ENV_FILE_ANALYSIS_PATTERNS;
    return {
      envExamplePath: PathOperations.join(
        projectRoot,
        patterns.exampleFileName
      ),
      envPath: PathOperations.join(projectRoot, patterns.envFileName),
      gitignorePath: PathOperations.join(
        projectRoot,
        patterns.gitignoreFileName
      ),
    };
  }

  /**
   * Get JSON object type validation patterns
   */
  static getJsonValidationPatterns(): {
    prefixSeparator: string;
  } {
    return this.JSON_VALIDATION_PATTERNS;
  }
}
