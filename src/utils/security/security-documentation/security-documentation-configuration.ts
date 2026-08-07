/**
 * Security Documentation Configuration
 * Centralized configuration for security documentation analysis
 */

import { DOC_FILES } from '../../file-constants';
import * as SharedUtils from '../security-shared-utils';
export type { SecurityCheckResult as DocumentationCheckResult } from '../security-shared-utils';

export interface RequiredDocConfig {
  files: readonly string[];
  name: string;
  description: string;
}

// ============================================================================
// Required Documentation Files
// ============================================================================

export const REQUIRED_DOCS: readonly RequiredDocConfig[] = [
  {
    files: [DOC_FILES.SECURITY, '.github/SECURITY.md'],
    name: 'Security Policy',
    description: 'vulnerability reporting and security procedures',
  },
  {
    files: ['docs/security.md', 'docs/SECURITY.md'],
    name: 'Security Documentation',
    description: 'detailed security implementation and practices',
  },
  {
    files: ['docs/privacy.md', DOC_FILES.PRIVACY],
    name: 'Privacy Policy',
    description: 'data handling and privacy practices',
  },
] as const;

// ============================================================================
// File Paths
// ============================================================================

export const README_FILE = DOC_FILES.README;

export const GUIDELINE_FILES = [
  'docs/security-guidelines.md',
  'docs/secure-development.md',
  DOC_FILES.CONTRIBUTING,
  'docs/development.md',
] as const;

export const CODE_REVIEW_FILES = [
  'docs/code-review.md',
  'docs/security-checklist.md',
  '.github/pull_request_template.md',
] as const;

export const COMPLIANCE_FILES = [
  'docs/compliance.md',
  'docs/gdpr.md',
  'docs/hipaa.md',
  'docs/sox.md',
  DOC_FILES.COMPLIANCE,
] as const;

export const DATA_GOVERNANCE_FILES = [
  'docs/data-retention.md',
  'docs/data-deletion.md',
  'docs/data-governance.md',
] as const;

export const RISK_ASSESSMENT_FILES = [
  'docs/third-party-risk.md',
  'docs/vendor-assessment.md',
  'docs/risk-assessment.md',
] as const;

// ============================================================================
// Search Terms
// ============================================================================

export const SECURITY_TERMS = ['security', 'vulnerability'] as const;
export const SECURE_TERMS = ['security', 'secure'] as const;
export const CHECKLIST_TERMS = ['security', 'checklist'] as const;

export const SENSITIVE_DATA_INDICATORS = [
  'healthcare',
  'medical',
  'patient',
  'financial',
  'payment',
  'banking',
  'personal',
  'user data',
  'privacy',
] as const;

// ============================================================================
// Validation Messages
// ============================================================================

export const VALIDATION_MESSAGES = {
  missingDoc: (name: string) => `Missing ${name} documentation`,
  createDoc: (name: string, description: string) =>
    `Create ${name} documenting ${description}`,
  addSecuritySection: 'Add security section to README.md',
  documentGuidelines: 'Document security guidelines for developers',
  includeSecureCoding:
    'Include secure coding practices in development documentation',
  createChecklist: 'Create security checklist for code reviews',
  documentCompliance:
    'Consider documenting compliance requirements for sensitive data handling',
  documentDataPolicies: 'Document data retention and deletion policies',
  documentRiskAssessment: 'Document third-party risk assessment procedures',
} as const;

// ============================================================================
// Recommendations
// ============================================================================

export const RECOMMENDATIONS = [
  'Maintain comprehensive security documentation and policies',
  'Document vulnerability reporting and incident response procedures',
  'Create security guidelines for development team',
  'Implement security checklist for code reviews',
  'Document compliance requirements and procedures',
  'Maintain data governance and retention policies',
  'Document third-party risk assessment procedures',
  'Keep security documentation up-to-date with regular reviews',
  'Make security documentation easily accessible to team members',
  'Include security considerations in project README',
] as const;

// ============================================================================
// Documentation Templates
// ============================================================================

export const DOCUMENTATION_TEMPLATES: Record<string, readonly string[]> = {
  'SECURITY.md': [
    '# Security Policy',
    '## Reporting Security Vulnerabilities',
    '## Supported Versions',
    '## Security Update Process',
    '## Contact Information',
  ],
  'security-guidelines.md': [
    '# Security Development Guidelines',
    '## Secure Coding Practices',
    '## Authentication and Authorization',
    '## Data Protection',
    '## Third-party Dependencies',
    '## Security Testing',
  ],
  'incident-response.md': [
    '# Security Incident Response',
    '## Incident Classification',
    '## Response Team',
    '## Escalation Procedures',
    '## Communication Plan',
    '## Post-Incident Review',
  ],
} as const;

// ============================================================================
// Helper Functions - Re-exported from security-shared-utils
// ============================================================================

export const {
  createEmptyResult,
  mergeResults,
  joinPath,
  exists,
  readFile,
  hasAnyPattern,
  safeReadFile,
  fileExists,
  checkFilesExist,
  checkFilesForContent,
  readFileContent,
} = SharedUtils;

export function hasSecuritySection(content: string): boolean {
  return hasAnyPattern(content.toLowerCase(), SECURITY_TERMS);
}

export function getPackageJsonSearchText(packageJson: {
  description?: string;
  keywords?: string[];
}): string {
  const description = (packageJson.description ?? '').toLowerCase();
  const keywords = (packageJson.keywords ?? []).join(' ').toLowerCase();
  return `${description} ${keywords}`;
}
