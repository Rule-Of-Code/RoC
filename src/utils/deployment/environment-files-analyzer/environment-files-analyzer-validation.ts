import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { EnvironmentFilesAnalyzerConfiguration } from './environment-files-analyzer-configuration';

interface EnvFileAnalysis {
  hasEnvExample: boolean;
  hasEnvInGit: boolean;
  violations: string[];
  suggestions: string[];
}

/**
 * Environment Files Analyzer Validation
 * Specialized validation utilities for environment file analysis
 */
export class EnvironmentFilesAnalyzerValidation {
  /**
   * Validate and get environment files in the project
   */
  static validateEnvironmentFiles(projectRoot: string): string[] {
    const possibleFiles =
      EnvironmentFilesAnalyzerConfiguration.POSSIBLE_ENVIRONMENT_FILES;

    return possibleFiles
      .map(envFile => PathOperations.join(projectRoot, envFile))
      .filter(filePath => FileUtils.exists(filePath));
  }

  /**
   * Validate environment consistency across different environment files
   */
  static validateEnvironmentConsistency(environmentFiles: string[]): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const patterns =
      EnvironmentFilesAnalyzerConfiguration.CONSISTENCY_VALIDATION_PATTERNS;

    // A committed `.env.example` IS the parity contract: it declares every
    // variable the app needs, and the real values are injected at deploy time.
    // Counting files and demanding two of them pushed projects to commit
    // `.env.production` — that is, to commit their secrets (a backend consumer).
    // NB: not PathOperations.getBasename — it strips the extension, so
    // `.env.example` would arrive here as `.env`.
    const hasContract = environmentFiles.some(file => {
      const name = file.split(/[\\/]/).pop() ?? '';
      return EnvironmentFilesAnalyzerConfiguration.EXAMPLE_ENVIRONMENT_FILES.includes(
        name
      );
    });

    if (
      !hasContract &&
      environmentFiles.length < patterns.minimumFilesRequired
    ) {
      violations.push(patterns.insufficientFilesMessage);
      suggestions.push(patterns.insufficientFilesSuggestion);
      return { violations, suggestions };
    }

    // Extract configuration keys from each environment file
    const fileConfigs: Record<string, string[]> = {};
    const readConfig =
      EnvironmentFilesAnalyzerConfiguration.FILE_READING_CONFIG;
    for (const file of environmentFiles) {
      try {
        const content = FileUtils.readFile(file, readConfig);
        const keys = this.extractConfigurationKeys(content);
        fileConfigs[PathOperations.getBasename(file)] = keys;
      } catch (_error) {
        // Skip unreadable files
      }
    }

    // Compare keys across files
    const validConfigs = Object.entries(fileConfigs).filter(
      ([_, value]) => value.length > 0
    );

    if (validConfigs.length > 1) {
      this.validateKeyConsistency(validConfigs, violations, suggestions);
    }

    return { violations, suggestions };
  }

  /**
   * Validate .env files setup and best practices
   */
  static validateEnvFiles(projectRoot: string): EnvFileAnalysis {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const messages =
      EnvironmentFilesAnalyzerConfiguration.ENV_ANALYSIS_MESSAGES;
    const paths =
      EnvironmentFilesAnalyzerConfiguration.getProjectFilePaths(projectRoot);

    // Check for .env.example
    const hasEnvExample = FileUtils.exists(paths.envExamplePath);

    if (!hasEnvExample) {
      violations.push(messages.noExampleFile);
      suggestions.push(messages.createExampleFile);
    }

    // Check if .env is in git (it shouldn't be)
    const hasEnvInGit = this.checkEnvInGit(paths);

    if (hasEnvInGit && FileUtils.exists(paths.envPath)) {
      violations.push(messages.envInGit);
      suggestions.push(messages.addToGitignore);
    }

    return {
      hasEnvExample,
      hasEnvInGit,
      violations,
      suggestions,
    };
  }

  /**
   * Extract configuration keys from file content
   */
  static extractConfigurationKeys(content: string): string[] {
    const keys: string[] = [];
    const patterns =
      EnvironmentFilesAnalyzerConfiguration.KEY_EXTRACTION_PATTERNS;

    // For .env files
    const envMatches = content.match(patterns.envVariablePattern);
    if (envMatches) {
      keys.push(...envMatches.map(match => match.replace('=', '')));
    }

    // For JSON files
    try {
      const jsonObj = JSON.parse(content);
      keys.push(...this.extractJsonObjectKeys(jsonObj));
    } catch {
      // Not a JSON file, continue
    }

    return keys;
  }

  /**
   * Recursively extract keys from JSON object
   */
  static extractJsonObjectKeys(obj: unknown, prefix = ''): string[] {
    const keys: string[] = [];
    const jsonPatterns =
      EnvironmentFilesAnalyzerConfiguration.JSON_VALIDATION_PATTERNS;

    const objRecord = obj as Record<string, unknown>;
    for (const key in objRecord) {
      const fullKey = prefix
        ? `${prefix}${jsonPatterns.prefixSeparator}${key}`
        : key;
      keys.push(fullKey);

      if (
        typeof objRecord[key] === 'object' &&
        objRecord[key] !== null &&
        !Array.isArray(objRecord[key])
      ) {
        keys.push(...this.extractJsonObjectKeys(objRecord[key], fullKey));
      }
    }

    return keys;
  }

  /**
   * Validate key consistency across configuration files
   */
  private static validateKeyConsistency(
    validConfigs: Array<[string, string[]]>,
    violations: string[],
    suggestions: string[]
  ): void {
    const _messages =
      EnvironmentFilesAnalyzerConfiguration.ENV_ANALYSIS_MESSAGES;
    const firstConfig = validConfigs[0];

    if (!firstConfig) return;

    const [_baseKey, baseValue] = firstConfig;
    const baseKeys = new Set(baseValue);

    for (let i = 1; i < validConfigs.length; i++) {
      const compareEntry = validConfigs[i];
      if (!compareEntry) continue;

      const [compareName, compareConfig] = compareEntry;
      const compareKeys = new Set(compareConfig);

      // Find missing keys
      const missingInCompare = Array.from(baseKeys).filter(
        key => !compareKeys.has(key)
      );
      const extraInCompare = Array.from(compareKeys).filter(
        key => !baseKeys.has(key)
      );

      if (missingInCompare.length > 0) {
        violations.push(
          EnvironmentFilesAnalyzerConfiguration.buildMessage(
            'missingKeysTemplate',
            compareName,
            missingInCompare.join(', ')
          )
        );
      }

      if (extraInCompare.length > 0) {
        suggestions.push(
          EnvironmentFilesAnalyzerConfiguration.buildMessage(
            'extraKeysTemplate',
            compareName,
            extraInCompare.join(', ')
          )
        );
      }
    }
  }

  /**
   * Check if .env file is tracked in git
   */
  private static checkEnvInGit(paths: { gitignorePath: string }): boolean {
    const analysisPatterns =
      EnvironmentFilesAnalyzerConfiguration.ENV_FILE_ANALYSIS_PATTERNS;
    const readConfig =
      EnvironmentFilesAnalyzerConfiguration.FILE_READING_CONFIG;
    let hasEnvInGit = true; // Assume worst case

    if (FileUtils.exists(paths.gitignorePath)) {
      try {
        const gitignoreContent = FileUtils.readFile(
          paths.gitignorePath,
          readConfig
        );

        const isIgnored = analysisPatterns.gitignorePatterns.some(pattern =>
          gitignoreContent.includes(pattern)
        );

        if (isIgnored) {
          hasEnvInGit = false;
        }
      } catch (_error) {
        // Can't read .gitignore
      }
    }

    return hasEnvInGit;
  }
}
