/**
 * Security Documentation Validation Patterns
 * Validation workflow for security documentation analysis
 */

import { ProjectTypeDetector } from '../../config/project-type-detector';
import * as Config from './security-documentation-configuration';

// ============================================================================
// Main Validation Entry Point
// ============================================================================

export function validateSecurityDocumentation(
  projectRoot: string
): Config.DocumentationCheckResult {
  return Config.mergeResults(
    checkRequiredSecurityDocs(projectRoot),
    checkSecurityGuidelines(projectRoot),
    checkComplianceDocumentation(projectRoot)
  );
}

// ============================================================================
// Required Security Docs Checks
// ============================================================================

function checkRequiredSecurityDocs(
  projectRoot: string
): Config.DocumentationCheckResult {
  const result = Config.createEmptyResult();

  // Check each required documentation
  Config.REQUIRED_DOCS.forEach(doc => {
    if (!Config.checkFilesExist(projectRoot, doc.files)) {
      result.violations.push(Config.VALIDATION_MESSAGES.missingDoc(doc.name));
      result.suggestions.push(
        Config.VALIDATION_MESSAGES.createDoc(doc.name, doc.description)
      );
    }
  });

  // Check for README security section
  checkReadmeSecuritySection(projectRoot, result);

  return result;
}

function checkReadmeSecuritySection(
  projectRoot: string,
  result: Config.DocumentationCheckResult
): void {
  const content = Config.readFileContent(projectRoot, Config.README_FILE);
  if (!content) return;

  if (!Config.hasSecuritySection(content)) {
    result.suggestions.push(Config.VALIDATION_MESSAGES.addSecuritySection);
  }
}

// ============================================================================
// Security Guidelines Checks
// ============================================================================

function checkSecurityGuidelines(
  projectRoot: string
): Config.DocumentationCheckResult {
  const result = Config.createEmptyResult();

  // Check for development security guidelines
  const hasSecurityGuidelines = Config.checkFilesForContent(
    projectRoot,
    Config.GUIDELINE_FILES,
    Config.SECURE_TERMS
  );

  if (!hasSecurityGuidelines) {
    result.suggestions.push(Config.VALIDATION_MESSAGES.documentGuidelines);
    result.suggestions.push(Config.VALIDATION_MESSAGES.includeSecureCoding);
  }

  // Check for code review security checklist
  const hasSecurityChecklist = Config.checkFilesForContent(
    projectRoot,
    Config.CODE_REVIEW_FILES,
    Config.CHECKLIST_TERMS
  );

  if (!hasSecurityChecklist) {
    result.suggestions.push(Config.VALIDATION_MESSAGES.createChecklist);
  }

  return result;
}

// ============================================================================
// Compliance Documentation Checks
// ============================================================================

function checkComplianceDocumentation(
  projectRoot: string
): Config.DocumentationCheckResult {
  const result = Config.createEmptyResult();

  // Check if project handles sensitive data
  checkSensitiveDataHandling(projectRoot, result);

  // Check for data governance documentation
  if (!Config.checkFilesExist(projectRoot, Config.DATA_GOVERNANCE_FILES)) {
    result.suggestions.push(Config.VALIDATION_MESSAGES.documentDataPolicies);
  }

  // Check for risk assessment documentation
  if (!Config.checkFilesExist(projectRoot, Config.RISK_ASSESSMENT_FILES)) {
    result.suggestions.push(Config.VALIDATION_MESSAGES.documentRiskAssessment);
  }

  return result;
}

function checkSensitiveDataHandling(
  projectRoot: string,
  result: Config.DocumentationCheckResult
): void {
  const packageJson = ProjectTypeDetector.getPackageJson(projectRoot);
  if (!packageJson) return;

  const searchText = Config.getPackageJsonSearchText(packageJson);
  const handlesSensitiveData = Config.hasAnyPattern(
    searchText,
    Config.SENSITIVE_DATA_INDICATORS
  );

  if (handlesSensitiveData) {
    result.suggestions.push(Config.VALIDATION_MESSAGES.documentCompliance);
  }
}
