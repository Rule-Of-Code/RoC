/**
 * RuleOfCode Utils Export Index
 * Clean barrel exports pattern using subdirectory indexes
 */

// Core utilities (top-level)
export { CheckerUtils } from './checker-utils';
export { ConfigFileUtils } from './config-file-utils';
export { ConfigHelper } from './config-helper';
export { DirectoryScanner } from './directory-scanner';
export { FileFilterUtils } from './file-filter-utils';
export { FileSystemOperations } from './file-system-operations';
export { FileUtils } from './file-utils';
export { GlobUtils } from './glob-utils';
export { LawResultUtils } from './law-result-utils';
export { ObservableCleanup } from './observable-cleanup';
export { PathOperations } from './path-operations';

// Logging utilities
export { logDebug, logError, logInfo, logWarn } from './logging-utils';

// ID generation utilities
export * from './id-generator';

// Configuration migration utilities
export * from './config-migration';

// Constants and interfaces
export * from './constants';
export { AnalysisResult } from './result-interfaces';

// Subdirectory barrel exports (order matters - put config and core first)
export * from './config';
export * from './constitutional';
export * from './deployment';
export * from './git';
export * from './licensing';
export * from './naming';
export * from './performance';
export * from './types';

// Angular exports - explicitly import to avoid conflicts
export * from './angular';

// Security exports - explicitly import PackageJson to avoid conflicts
export * from './security/audit-results';
export * from './security/cryptographic-libraries';
export * from './security/data-storage-security';
export {
  DependencyScanningAnalyzer,
  DependencyScanningConfiguration,
  DependencyScanningValidationPatterns,
  type DependencyScanningResult,
} from './security/dependency-scanning';
export {
  DependencyVulnerabilityAnalyzer,
  DependencyVulnerabilityConfiguration,
  DependencyVulnerabilityValidationPatterns,
  type CheckResult,
  type PackageInfo,
  type PackageJson,
  type VulnerabilityAnalysisResult,
  type VulnerablePackageInfo,
} from './security/dependency-vulnerability';
export * from './security/encryption-implementation';
export * from './security/environment-variables-usage';
export { NpmAuditSimulator } from './security/npm-audit-simulator';
export * from './security/secret-management';
export * from './security/security-documentation';
export { SecurityPolicyChecker } from './security/security-policy-checker';
export * from './security/security-shared-utils';
export * from './security/security-tooling';
export * from './security/supply-chain-risk';
export * from './security/vulnerability-management';

// Testing exports
export * from './testing';
