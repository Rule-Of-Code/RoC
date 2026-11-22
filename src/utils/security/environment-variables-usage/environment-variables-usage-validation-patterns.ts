/**
 * Environment Variables Usage Validation Patterns
 * Validation workflow for environment variables usage analysis
 */

import type * as TS from 'typescript';
import type { RuleOfCodeConfig } from '../../../types/law.types';
import { PathOperations } from '../../path-operations';
import { loadTypeScript, parserUnavailable } from '../../react/tsx-source';
import { scanAndAnalyzeFiles } from '../file-scanning-helper';
import { SecretManagementAnalyzer } from '../secret-management';
import * as Config from './environment-variables-usage-configuration';
import { findEnvReads } from './environment-variables-usage-reads';
import {
  findUrlLiterals,
  stringLiteralTexts,
} from './environment-variables-usage-urls';

// ============================================================================
// Main Validation Entry Point
// ============================================================================

export function validateEnvironmentVariablesUsage(
  projectRoot: string,
  config: RuleOfCodeConfig
): Config.EnvUsageCheckResult {
  // `process.env` reads and URLs are read from the parse (#433): each read
  // judged where it stands, each URL once. Without the parser those two
  // checks read nothing — said so, never a silent pass.
  const ts = loadTypeScript(projectRoot);
  const results = scanAndAnalyzeFiles(
    projectRoot,
    config,
    (file, content) => {
      const source = ts
        ? ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true)
        : null;
      // A finding names the file as the project knows it (`src/lib/api.ts`),
      // not where this machine keeps the checkout (#537).
      const shown = PathOperations.getRelative(projectRoot, file);
      return Config.mergeResults(
        analyzeProcessEnvUsage(ts, source, content, shown),
        checkEnvValidation(content),
        checkForHardcodedValues(ts, source, content, shown)
      );
    },
    () => Config.createEmptyResult(),
    Config.safeReadFile
  );

  const merged = Config.mergeResults(...results);
  if (!ts && results.length > 0) {
    merged.violations.push(
      parserUnavailable(
        projectRoot,
        `the process.env reads and URLs of ${results.length} file(s)`
      )
    );
  }
  return merged;
}

// ============================================================================
// Process.env Usage Analysis
// ============================================================================

function analyzeProcessEnvUsage(
  ts: typeof TS | null,
  source: TS.SourceFile | null,
  content: string,
  filePath: string
): Config.EnvUsageCheckResult {
  const result = Config.createEmptyResult();

  if (ts && source) {
    const reads = findEnvReads(ts, source);
    if (reads.length > 0) {
      checkEnvVarFallbacks(filePath, reads, result);
      checkPortTyping(content, result);
    }
  }

  checkDestructuringValidation(content, result);

  return result;
}

function checkEnvVarFallbacks(
  filePath: string,
  reads: ReturnType<typeof findEnvReads>,
  result: Config.EnvUsageCheckResult
): void {
  for (const read of reads) {
    if (read.handled) continue;
    result.violations.push(
      Config.formatMessage(Config.VALIDATION_MESSAGES.noFallback, {
        filePath,
        envVar: read.name,
      })
    );
    result.suggestions.push(
      Config.formatMessage(Config.VALIDATION_MESSAGES.noFallbackSuggestion, {
        envVar: read.name,
      })
    );
  }
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
  ts: typeof TS | null,
  source: TS.SourceFile | null,
  content: string,
  filePath: string
): Config.EnvUsageCheckResult {
  const result = Config.createEmptyResult();

  if (ts && source) {
    checkHardcodedUrls(ts, source, filePath, result);
    // A connection string is a value: looked for in the strings the code
    // holds, not in a comment that names the schemes (#433).
    checkHardcodedDbConnections(
      stringLiteralTexts(ts, source).join('\n'),
      filePath,
      result
    );
  }
  checkHardcodedSecrets(content, filePath, result);

  return result;
}

function checkHardcodedUrls(
  ts: typeof TS,
  source: TS.SourceFile,
  filePath: string,
  result: Config.EnvUsageCheckResult
): void {
  for (const { url } of findUrlLiterals(ts, source)) {
    result.violations.push(
      Config.formatMessage(Config.VALIDATION_MESSAGES.hardcodedUrl, {
        filePath,
        url,
      })
    );
    result.suggestions.push(Config.VALIDATION_MESSAGES.hardcodedUrlSuggestion);
  }
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
