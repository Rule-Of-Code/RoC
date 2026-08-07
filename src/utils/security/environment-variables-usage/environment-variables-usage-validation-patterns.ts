/**
 * Environment Variables Usage Validation Patterns
 * Validation workflow for environment variables usage analysis
 */

import type { RuleOfCodeConfig } from '../../../types/law.types';
import { scanAndAnalyzeFiles } from '../file-scanning-helper';
import { SecretManagementAnalyzer } from '../secret-management';
import * as Config from './environment-variables-usage-configuration';

// ============================================================================
// Main Validation Entry Point
// ============================================================================

export function validateEnvironmentVariablesUsage(
  projectRoot: string,
  config: RuleOfCodeConfig
): Config.EnvUsageCheckResult {
  const results = scanAndAnalyzeFiles(
    projectRoot,
    config,
    (file, content) =>
      Config.mergeResults(
        analyzeProcessEnvUsage(content, file),
        checkEnvValidation(content),
        checkForHardcodedValues(content, file)
      ),
    () => Config.createEmptyResult(),
    Config.safeReadFile
  );

  return Config.mergeResults(...results);
}

// ============================================================================
// Process.env Usage Analysis
// ============================================================================

function analyzeProcessEnvUsage(
  content: string,
  filePath: string
): Config.EnvUsageCheckResult {
  const result = Config.createEmptyResult();

  const processEnvMatches = Config.findAllEnvMatches(content);
  if (processEnvMatches.length > 0) {
    checkEnvVarFallbacks(content, filePath, processEnvMatches, result);
    checkPortTyping(content, result);
  }

  checkDestructuringValidation(content, result);

  return result;
}

function checkEnvVarFallbacks(
  content: string,
  filePath: string,
  matches: string[],
  result: Config.EnvUsageCheckResult
): void {
  matches.forEach(match => {
    const envVar = Config.extractEnvVarName(match);
    const context = Config.getContextAround(content, match);

    if (!Config.hasFallbackValue(context)) {
      result.violations.push(
        Config.formatMessage(Config.VALIDATION_MESSAGES.noFallback, {
          filePath,
          envVar,
        })
      );
      result.suggestions.push(
        Config.formatMessage(Config.VALIDATION_MESSAGES.noFallbackSuggestion, {
          envVar,
        })
      );
    }
  });
}

function checkPortTyping(
  content: string,
  result: Config.EnvUsageCheckResult
): void {
  if (Config.needsPortParsing(content)) {
    result.suggestions.push(Config.VALIDATION_MESSAGES.portNotParsed);
  }
}

function checkDestructuringValidation(
  content: string,
  result: Config.EnvUsageCheckResult
): void {
  if (Config.hasDestructuring(content)) {
    result.suggestions.push(
      Config.VALIDATION_MESSAGES.destructuringNoValidation
    );
  }
}

// ============================================================================
// Environment Validation Checks
// ============================================================================

function checkEnvValidation(content: string): Config.EnvUsageCheckResult {
  const result = Config.createEmptyResult();

  checkValidationSchema(content, result);
  checkNodeEnvUsage(content, result);

  return result;
}

function checkValidationSchema(
  content: string,
  result: Config.EnvUsageCheckResult
): void {
  if (Config.hasProcessEnv(content) && !Config.hasValidationLibrary(content)) {
    const envUsageCount = Config.countEnvUsage(content);
    if (envUsageCount > Config.ENV_USAGE_THRESHOLD) {
      result.suggestions.push(Config.VALIDATION_MESSAGES.needsValidationSchema);
    }
  }
}

function checkNodeEnvUsage(
  content: string,
  result: Config.EnvUsageCheckResult
): void {
  if (Config.hasEnvironmentIndicators(content) && !Config.hasNodeEnv(content)) {
    result.suggestions.push(Config.VALIDATION_MESSAGES.useNodeEnv);
  }
}

// ============================================================================
// Hardcoded Values Checks
// ============================================================================

function checkForHardcodedValues(
  content: string,
  filePath: string
): Config.EnvUsageCheckResult {
  const result = Config.createEmptyResult();

  checkHardcodedUrls(content, filePath, result);
  checkHardcodedDbConnections(content, filePath, result);
  checkHardcodedSecrets(content, filePath, result);

  return result;
}

function checkHardcodedUrls(
  content: string,
  filePath: string,
  result: Config.EnvUsageCheckResult
): void {
  const nonLocalUrls = Config.filterNonLocalUrls(
    Config.findUrlMatches(content)
  );

  nonLocalUrls.forEach(url => {
    result.violations.push(
      Config.formatMessage(Config.VALIDATION_MESSAGES.hardcodedUrl, {
        filePath,
        url,
      })
    );
    result.suggestions.push(Config.VALIDATION_MESSAGES.hardcodedUrlSuggestion);
  });
}

function checkHardcodedDbConnections(
  content: string,
  filePath: string,
  result: Config.EnvUsageCheckResult
): void {
  if (Config.matchesAnyDbPattern(content)) {
    result.violations.push(
      Config.formatMessage(Config.VALIDATION_MESSAGES.hardcodedDbConnection, {
        filePath,
      })
    );
    result.suggestions.push(Config.VALIDATION_MESSAGES.hardcodedDbSuggestion);
  }
}

function checkHardcodedSecrets(
  content: string,
  filePath: string,
  result: Config.EnvUsageCheckResult
): void {
  if (Config.matchesAnySecretPattern(content)) {
    result.violations.push(
      Config.formatMessage(Config.VALIDATION_MESSAGES.hardcodedSecret, {
        filePath,
      })
    );
    result.suggestions.push(
      ...SecretManagementAnalyzer.getSecretManagementRecommendations()
    );
  }
}
