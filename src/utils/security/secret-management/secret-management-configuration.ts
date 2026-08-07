/**
 * Secret Management Configuration
 * Centralized configuration for secret management analysis
 */

import { ProjectTypeDetectorValidation } from '../../config/project-type-detector/project-type-detector-validation';
import { DIRECTORY_NAMES } from '../../file-constants';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { PatternMatchingUtils } from '../../pattern-matching-utils';
import { SecurityConfigFactory } from '../shared-security-config';

// ============================================================================
// Types
// ============================================================================

export interface SecretCheckResult {
  violations: string[];
  suggestions: string[];
}

// ============================================================================
// Secret Management Files
// ============================================================================

export const SECRET_MANAGEMENT_FILES = [
  'vault.json',
  'secrets.yaml',
  'secrets.yml',
  '.secrets',
  'docker-secret.yml',
  'k8s-secrets.yaml',
] as const;

export const SECRET_LIBRARIES = [
  'dotenv-vault',
  'aws-secrets-manager',
  'azure-keyvault',
  'google-secret-manager',
  'hashicorp-vault',
] as const;

// ============================================================================
// Secret Scanning Config Files
// ============================================================================

export const SECRET_SCANNING_CONFIGS = [
  '.gitleaks.toml',
  '.trufflerc',
  'detect-secrets.json',
  '.pre-commit-config.yaml',
] as const;

export const SECURITY_WORKFLOW_INDICATORS = ['secret', 'security'] as const;

// ============================================================================
// Documentation Files
// ============================================================================

export const DOCS_FILES = [
  'README.md',
  'SECURITY.md',
  'docs/security.md',
  'docs/secrets.md',
] as const;

export const ROTATION_INDICATORS = ['rotation', 'rotate'] as const;
export const EXPIRATION_INDICATORS = ['expir', 'ttl', 'refresh'] as const;

// ============================================================================
// Directory Patterns
// ============================================================================

export const GITHUB_WORKFLOWS_DIR = '.github/workflows';
export const PACKAGE_JSON = 'package.json';
export const SOURCE_DIRS = [
  DIRECTORY_NAMES.SRC,
  DIRECTORY_NAMES.LIB,
  DIRECTORY_NAMES.APP,
] as const;

// Scan configuration constants
export const SCAN_CONFIG_DEFAULTS = {
  PROJECT_NAME: 'secret-scan',
  COMPONENT_PREFIX: DIRECTORY_NAMES.APP,
  PROJECT_TYPE: 'generic',
  REPORT_FORMAT: 'console',
} as const;

// ============================================================================
// Validation Messages
// ============================================================================

export const VALIDATION_MESSAGES = {
  // Secret management suggestions
  useSecretManagement:
    'Consider using a secret management solution for production environments',
  implementRotation: 'Implement secret rotation mechanisms',

  // Secret scanning suggestions
  implementScanning: 'Implement secret scanning in your CI/CD pipeline',
  useTools: 'Use tools like gitleaks, truffleHog, or detect-secrets',
  configurePreCommit: 'Configure pre-commit hooks to prevent secret commits',

  // Rotation suggestions
  documentRotation: 'Document secret rotation procedures',
  automateRotation: 'Implement automated secret rotation where possible',
  handleExpiration:
    'Implement token/secret expiration handling in your application',
} as const;

// ============================================================================
// Recommendations
// ============================================================================

export const RECOMMENDATIONS = [
  'Use dedicated secret management services (AWS Secrets Manager, Azure Key Vault, etc.)',
  'Implement secret rotation policies and procedures',
  'Use secret scanning tools to prevent accidental commits',
  'Never store secrets in source code or configuration files',
  'Implement proper access controls for secret management systems',
  'Monitor and audit secret access and usage',
  'Use short-lived tokens and certificates where possible',
  'Encrypt secrets at rest and in transit',
] as const;

export const PATTERNS = {
  secure: [
    'Using environment variables for secrets',
    'Secret management service integration',
    'Automated secret rotation',
    'Secret scanning in CI/CD',
    'Least privilege access to secrets',
  ],
  insecure: [
    'Hardcoded secrets in source code',
    'Secrets in version control',
    'Plain text secret storage',
    'No secret rotation policies',
    'Overprivileged secret access',
  ],
} as const;

// ============================================================================
// Helper Functions (shared with EnvironmentFilesConfiguration)
// ============================================================================

import {
  createEmptyConfigResult,
  mergeConfigResults,
} from '../shared-configuration-base';

export function createEmptyResult(): SecretCheckResult {
  return createEmptyConfigResult();
}

export function mergeResults(
  ...results: SecretCheckResult[]
): SecretCheckResult {
  return mergeConfigResults(...results);
}

// Pattern matching delegated to PatternMatchingUtils
export const { hasPattern, hasAnyPattern } = PatternMatchingUtils;

// Path operations re-exported for consistent usage
export const joinPath = (projectRoot: string, file: string) =>
  PathOperations.join(projectRoot, file);
export const { exists } = FileUtils;

export function hasAnySecretManagementFile(projectRoot: string): boolean {
  return SECRET_MANAGEMENT_FILES.some(file =>
    exists(joinPath(projectRoot, file))
  );
}

export function hasAnySecretScanningConfig(projectRoot: string): boolean {
  return SECRET_SCANNING_CONFIGS.some(config =>
    exists(joinPath(projectRoot, config))
  );
}

export function safeReadFile(filePath: string): string {
  try {
    return FileUtils.readFile(filePath);
  } catch {
    return '';
  }
}

export function getPackageJsonDependencies(
  projectRoot: string
): Record<string, string> {
  try {
    return ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
  } catch {
    return {};
  }
}

export function hasAnySecretLibrary(projectRoot: string): boolean {
  const dependencies = getPackageJsonDependencies(projectRoot);
  return SECRET_LIBRARIES.some(lib => lib in dependencies);
}

export function getGithubWorkflowsPath(projectRoot: string): string {
  return joinPath(projectRoot, GITHUB_WORKFLOWS_DIR);
}

export function hasSecurityWorkflowIndicators(content: string): boolean {
  return hasAnyPattern(content, SECURITY_WORKFLOW_INDICATORS);
}

export function hasRotationIndicators(content: string): boolean {
  return hasAnyPattern(content, ROTATION_INDICATORS);
}

export function hasExpirationIndicators(content: string): boolean {
  return hasAnyPattern(content, EXPIRATION_INDICATORS);
}

export const DEFAULT_SCAN_CONFIG = FileUtils.getMinimalDefaultConfig();

// Scan config for recursive file discovery
export function createScanConfig(
  extensions: string[]
): ReturnType<typeof FileUtils.getDefaultConfig> {
  const baseConfig = SecurityConfigFactory.createDefaultConfig({
    project: {
      name: SCAN_CONFIG_DEFAULTS.PROJECT_NAME,
      componentPrefix: SCAN_CONFIG_DEFAULTS.COMPONENT_PREFIX,
      type: SCAN_CONFIG_DEFAULTS.PROJECT_TYPE as 'generic',
      root: '',
    },
    includes: { global: extensions.map(ext => `**/*${ext}`) },
    reporting: {
      format: SCAN_CONFIG_DEFAULTS.REPORT_FORMAT as 'console',
      verbose: false,
      onlyFailures: false,
      scoring: false,
    },
  });

  return {
    ...baseConfig,
    reporting: {
      ...baseConfig.reporting,
      scoring: baseConfig.reporting.scoring ?? false,
    },
    performance: {
      parallel: false,
      maxConcurrent: 1,
      cache: false,
    },
  };
}
