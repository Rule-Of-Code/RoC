/**
 * Secret Management Validation Patterns
 * Validation workflow for secret management analysis
 */

import { CheckerUtils } from '../../checker-utils';
import { DirectoryScanner } from '../../directory-scanner';
import * as Config from './secret-management-configuration';

// ============================================================================
// Main Validation Entry Point
// ============================================================================

export function validateSecretManagement(
  projectRoot: string
): Config.SecretCheckResult {
  return Config.mergeResults(
    checkSecretManagementTools(projectRoot),
    checkSecretScanningSetup(projectRoot),
    checkSecretRotation(projectRoot)
  );
}

// ============================================================================
// Secret Management Tools Checks
// ============================================================================

function checkSecretManagementTools(
  projectRoot: string
): Config.SecretCheckResult {
  const result = Config.createEmptyResult();

  const hasSecretManagement =
    Config.hasAnySecretManagementFile(projectRoot) ||
    Config.hasAnySecretLibrary(projectRoot);

  if (!hasSecretManagement) {
    result.suggestions.push(Config.VALIDATION_MESSAGES.useSecretManagement);
    result.suggestions.push(Config.VALIDATION_MESSAGES.implementRotation);
  }

  return result;
}

// ============================================================================
// Secret Scanning Checks
// ============================================================================

function checkSecretScanningSetup(
  projectRoot: string
): Config.SecretCheckResult {
  const result = Config.createEmptyResult();

  const hasSecretScanning =
    Config.hasAnySecretScanningConfig(projectRoot) ||
    hasSecurityWorkflow(projectRoot);

  if (!hasSecretScanning) {
    result.suggestions.push(Config.VALIDATION_MESSAGES.implementScanning);
    result.suggestions.push(Config.VALIDATION_MESSAGES.useTools);
    result.suggestions.push(Config.VALIDATION_MESSAGES.configurePreCommit);
  }

  return result;
}

function hasSecurityWorkflow(projectRoot: string): boolean {
  const workflowsPath = Config.getGithubWorkflowsPath(projectRoot);
  if (!Config.exists(workflowsPath)) return false;

  const scanResult = DirectoryScanner.scanDirectory(
    workflowsPath,
    Config.DEFAULT_SCAN_CONFIG
  );

  return scanResult.files.some(file => {
    const content = Config.safeReadFile(Config.joinPath(workflowsPath, file));
    return Config.hasSecurityWorkflowIndicators(content);
  });
}

// ============================================================================
// Secret Rotation Checks
// ============================================================================

function checkSecretRotation(projectRoot: string): Config.SecretCheckResult {
  const result = Config.createEmptyResult();

  // Always suggest documentation and automation
  result.suggestions.push(Config.VALIDATION_MESSAGES.documentRotation);
  result.suggestions.push(Config.VALIDATION_MESSAGES.automateRotation);

  // Check for expiration handling in source files
  const files = findRelevantFiles(projectRoot);
  if (files.length > 0) {
    result.suggestions.push(Config.VALIDATION_MESSAGES.handleExpiration);
  }

  return result;
}

function findRelevantFiles(projectRoot: string): string[] {
  const extensions = CheckerUtils.getCommonExtensions().ALL_CODE;

  return Config.SOURCE_DIRS.flatMap(dir => {
    const dirPath = Config.joinPath(projectRoot, dir);
    if (!Config.exists(dirPath)) return [];
    return getFilesRecursively(dirPath, extensions);
  });
}

function getFilesRecursively(dir: string, extensions: string[]): string[] {
  try {
    const scanResult = DirectoryScanner.scanDirectory(
      dir,
      Config.createScanConfig(extensions)
    );
    return Array.isArray(scanResult) ? scanResult : scanResult.files;
  } catch {
    return [];
  }
}
