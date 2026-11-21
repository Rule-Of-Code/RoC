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

/** A secret-management result with no violations and no suggestions. */
export function createEmptyResult(): SecretCheckResult {
  return createEmptyConfigResult();
}

/** Concatenates the violations and the suggestions of all results, in argument order. */
export function mergeResults(
  ...results: SecretCheckResult[]
): SecretCheckResult {
  return mergeConfigResults(...results);
}

// Pattern matching delegated to PatternMatchingUtils
export const { hasPattern, hasAnyPattern } = PatternMatchingUtils;

// Path operations re-exported for consistent usage
/** `file` joined under `projectRoot` with PathOperations.join. */
export const joinPath = (projectRoot: string, file: string) =>
  PathOperations.join(projectRoot, file);
export const { exists } = FileUtils;

/**
 * Whether one of SECRET_MANAGEMENT_FILES (vault.json, secrets.yaml/.yml,
 * .secrets, docker-secret.yml, k8s-secrets.yaml) exists at the project root.
 */
export function hasAnySecretManagementFile(projectRoot: string): boolean {
  return SECRET_MANAGEMENT_FILES.some(file =>
    exists(joinPath(projectRoot, file))
  );
}

/**
 * Whether a secret-scanning config exists at the project root: .gitleaks.toml,
 * .trufflerc, detect-secrets.json or .pre-commit-config.yaml (the last counts
 * whatever hooks it configures).
 */
export function hasAnySecretScanningConfig(projectRoot: string): boolean {
  return SECRET_SCANNING_CONFIGS.some(config =>
    exists(joinPath(projectRoot, config))
  );
}

/** The file's UTF-8 text, or '' when it does not exist or cannot be read (never throws). */
export function safeReadFile(filePath: string): string {
  try {
    return FileUtils.readFile(filePath);
  } catch {
    return '';
  }
}

/**
 * The root package.json `dependencies` and `devDependencies` merged into one
 * name → version map (devDependencies win on a clash); {} when the file is
 * missing or cannot be parsed.
 */
export function getPackageJsonDependencies(
  projectRoot: string
): Record<string, string> {
  try {
    return ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
  } catch {
    return {};
  }
}

/**
 * Whether package.json depends (dependencies or devDependencies) on one of the
 * package names in SECRET_LIBRARIES, matched exactly — a scoped package such
 * as `@aws-sdk/client-secrets-manager` does not count.
 */
export function hasAnySecretLibrary(projectRoot: string): boolean {
  const dependencies = getPackageJsonDependencies(projectRoot);
  return SECRET_LIBRARIES.some(lib => lib in dependencies);
}

/** The path of `.github/workflows` under the project root. */
export function getGithubWorkflowsPath(projectRoot: string): string {
  return joinPath(projectRoot, GITHUB_WORKFLOWS_DIR);
}

/** Whether a workflow file's text contains `secret` or `security` (case-sensitive substring). */
export function hasSecurityWorkflowIndicators(content: string): boolean {
  return hasAnyPattern(content, SECURITY_WORKFLOW_INDICATORS);
}

/** Whether the text contains `rotation` or `rotate` (case-sensitive substring). */
export function hasRotationIndicators(content: string): boolean {
  return hasAnyPattern(content, ROTATION_INDICATORS);
}

/** Whether the text contains `expir`, `ttl` or `refresh` (case-sensitive substring). */
export function hasExpirationIndicators(content: string): boolean {
  return hasAnyPattern(content, EXPIRATION_INDICATORS);
}

export const DEFAULT_SCAN_CONFIG = FileUtils.getMinimalDefaultConfig();

// Scan config for recursive file discovery
/**
 * A standalone audit config for DirectoryScanner whose includes are one
 * recursive glob per entry of `extensions` (any file ending in it), with no
 * ignores, sequential and uncached — used to list the source files read for
 * secrets.
 */
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
