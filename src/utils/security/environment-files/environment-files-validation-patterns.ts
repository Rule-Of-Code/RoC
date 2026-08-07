/**
 * Environment Files Validation Patterns
 * Validation workflow for environment files security analysis
 */

import * as Config from './environment-files-configuration';

// ============================================================================
// Main Validation Entry Point
// ============================================================================

export function validateEnvironmentFiles(
  projectRoot: string
): Config.EnvCheckResult {
  const results: Config.EnvCheckResult[] = [];

  // Check each env file
  Config.ENV_FILES.forEach(envFile => {
    if (Config.envFileExists(projectRoot, envFile)) {
      const filePath = Config.getEnvFilePath(projectRoot, envFile);
      const content = Config.safeReadFile(filePath);

      if (content) {
        results.push(
          Config.mergeResults(
            checkForSensitiveData(content, envFile),
            checkEnvFileFormatting(content, envFile)
          )
        );
      }
    }
  });

  // Check gitignore
  results.push(checkGitignore(projectRoot));

  return Config.mergeResults(...results);
}

// ============================================================================
// Gitignore Checks
// ============================================================================

function checkGitignore(projectRoot: string): Config.EnvCheckResult {
  const result = Config.createEmptyResult();
  const gitignorePath = Config.getEnvFilePath(
    projectRoot,
    Config.GITIGNORE_FILE
  );

  if (Config.envFileExists(projectRoot, Config.GITIGNORE_FILE)) {
    const content = Config.safeReadFile(gitignorePath);
    if (!Config.hasPattern(content, Config.ENV_PATTERN)) {
      result.violations.push(Config.VALIDATION_MESSAGES.gitignoreMissingEnv);
      result.suggestions.push(Config.VALIDATION_MESSAGES.gitignoreSuggestion);
    }
  } else {
    result.suggestions.push(Config.VALIDATION_MESSAGES.createGitignore);
  }

  return result;
}

// ============================================================================
// Sensitive Data Checks
// ============================================================================

function checkForSensitiveData(
  content: string,
  fileName: string
): Config.EnvCheckResult {
  const result = Config.createEmptyResult();
  const lines = Config.splitLines(content);

  lines.forEach((line, index) => {
    if (Config.isCommentOrEmpty(line)) return;

    const lineNumber = String(index + 1);
    const trimmedLine = line.trim();

    // Check for potential secrets
    if (Config.containsSensitiveData(trimmedLine)) {
      if (!Config.isPlaceholderValue(trimmedLine)) {
        result.violations.push(
          Config.formatMessage(Config.VALIDATION_MESSAGES.sensitiveData, {
            fileName,
            line: lineNumber,
          })
        );
        result.suggestions.push(
          Config.VALIDATION_MESSAGES.sensitiveDataSuggestion
        );
      }
    }

    // Check for missing values
    if (Config.hasEmptyValue(trimmedLine)) {
      result.suggestions.push(
        Config.formatMessage(Config.VALIDATION_MESSAGES.emptyValue, {
          fileName,
          line: lineNumber,
        })
      );
    }

    // Check for spaces around equals
    if (Config.hasSpacesAroundEquals(trimmedLine)) {
      result.violations.push(
        Config.formatMessage(Config.VALIDATION_MESSAGES.spacesAroundEquals, {
          fileName,
          line: lineNumber,
        })
      );
      result.suggestions.push(
        Config.VALIDATION_MESSAGES.spacesAroundEqualsSuggestion
      );
    }
  });

  return result;
}

// ============================================================================
// Formatting Checks
// ============================================================================

function checkEnvFileFormatting(
  content: string,
  fileName: string
): Config.EnvCheckResult {
  const result = Config.createEmptyResult();
  const lines = Config.splitLines(content);
  const variableNames = new Set<string>();

  lines.forEach((line, index) => {
    if (Config.isCommentOrEmpty(line)) return;

    const lineNumber = String(index + 1);
    const parsed = Config.parseEnvLine(line);

    // Check for valid format
    if (!parsed) {
      result.violations.push(
        Config.formatMessage(Config.VALIDATION_MESSAGES.invalidFormat, {
          fileName,
          line: lineNumber,
        })
      );
      result.suggestions.push(
        Config.VALIDATION_MESSAGES.invalidFormatSuggestion
      );
      return;
    }

    const { key, value } = parsed;

    // Check for duplicate variables
    if (key && variableNames.has(key)) {
      result.violations.push(
        Config.formatMessage(Config.VALIDATION_MESSAGES.duplicateVar, {
          fileName,
          line: lineNumber,
          key,
        })
      );
      result.suggestions.push(
        Config.VALIDATION_MESSAGES.duplicateVarSuggestion
      );
    }
    if (key) variableNames.add(key);

    // Check naming conventions
    if (key && !Config.isValidVarName(key)) {
      result.violations.push(
        Config.formatMessage(Config.VALIDATION_MESSAGES.invalidVarName, {
          fileName,
          line: lineNumber,
          key,
        })
      );
      result.suggestions.push(
        Config.VALIDATION_MESSAGES.invalidVarNameSuggestion
      );
    }

    // Check for quotes consistency
    if (Config.hasUnmatchedQuotes(value)) {
      result.violations.push(
        Config.formatMessage(Config.VALIDATION_MESSAGES.unmatchedQuotes, {
          fileName,
          line: lineNumber,
        })
      );
      result.suggestions.push(
        Config.VALIDATION_MESSAGES.unmatchedQuotesSuggestion
      );
    }
  });

  return result;
}
