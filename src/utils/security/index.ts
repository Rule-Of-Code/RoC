/**
 * Security Utilities Export Index
 */

// Core Security Analyzers
export {
  CryptographicLibrariesAnalyzer,
  CryptographicLibrariesConfiguration,
  CryptographicLibrariesValidationPatterns,
  type CryptoLibraryAnalysis,
  type CryptoPackageJson,
  type CryptoPatternAnalysis,
  type CryptoValidationResult,
  type PatternCheck,
} from './cryptographic-libraries';
export {
  DataStorageSecurityAnalyzer,
  DataStorageSecurityConfiguration,
  DataStorageSecurityValidationPatterns,
  type CookieSecurityAnalysis,
  type DataStorageValidationResult,
  type FileStorageAnalysis,
} from './data-storage-security';
export {
  DependencyScanningAnalyzer,
  DependencyScanningConfiguration,
  DependencyScanningValidationPatterns,
  type DependencyScanningResult,
} from './dependency-scanning';
export {
  EncryptionImplementationAnalyzer,
  EncryptionImplementationConfiguration,
  EncryptionImplementationValidationPatterns,
  type EncryptionCheckResult,
} from './encryption-implementation';
export {
  EnvironmentFilesAnalyzer,
  EnvironmentFilesConfiguration,
  EnvironmentFilesValidationPatterns,
  type EnvCheckResult,
} from './environment-files';
export {
  EnvironmentVariablesUsageAnalyzer,
  EnvironmentVariablesUsageConfiguration,
  EnvironmentVariablesUsageValidationPatterns,
  type EnvUsageCheckResult,
} from './environment-variables-usage';
export {
  SecretManagementAnalyzer,
  SecretManagementConfig,
  SecretManagementPatterns,
  type SecretCheckResult,
} from './secret-management';
export {
  SecurityDocumentationAnalyzer,
  SecurityDocumentationConfiguration,
  SecurityDocumentationValidationPatterns,
  type DocumentationCheckResult,
} from './security-documentation';
export {
  VulnerabilityManagementAnalyzer,
  VulnerabilityManagementConfig,
  VulnerabilityManagementPatterns,
} from './vulnerability-management';

// Specialized Security Utilities
export {
  AuditResultsAnalyzer,
  AuditResultsConfiguration,
  AuditResultsValidationPatterns,
} from './audit-results';
export {
  DependencyVulnerabilityAnalyzer,
  DependencyVulnerabilityConfiguration,
  DependencyVulnerabilityValidationPatterns,
  type CheckResult,
  type PackageInfo,
  type PackageJson,
  type VulnerabilityAnalysisResult,
  type VulnerabilityEntry,
  type VulnerabilitySeverity,
  type VulnerablePackageInfo,
} from './dependency-vulnerability';
export { NpmAuditSimulator } from './npm-audit-simulator';
export { SecurityPolicyChecker } from './security-policy-checker';
export * as SecuritySharedUtils from './security-shared-utils';
export {
  SecurityToolingAnalyzer,
  SecurityToolingConfiguration,
  SecurityToolingValidationPatterns,
  type ToolingAnalysisResult,
} from './security-tooling';
export {
  SupplyChainRiskAnalyzer,
  SupplyChainRiskConfiguration,
  SupplyChainRiskValidationPatterns,
  type RiskAnalysisResult,
} from './supply-chain-risk';
