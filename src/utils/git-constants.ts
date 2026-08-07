/**
 * Git and GitHub Constants
 * RULE 2: Specialized constants module for Git, GitHub, and review-related configurations
 */

// GitHub repository paths and configurations
export const GITHUB_PATHS = {
  // Pull Request Templates
  PR_TEMPLATE: '.github/pull_request_template.md',
  PR_TEMPLATE_UPPERCASE: '.github/PULL_REQUEST_TEMPLATE.md',
  PR_TEMPLATE_DEFAULT: '.github/pull_request_template/default.md',
  PR_TEMPLATE_DEFAULT_UPPERCASE: '.github/PULL_REQUEST_TEMPLATE/default.md',
  PR_TEMPLATE_DOCS: 'docs/pull_request_template.md',

  // Issue Templates
  ISSUE_TEMPLATE: '.github/issue_template.md',
  ISSUE_TEMPLATE_UPPERCASE: '.github/ISSUE_TEMPLATE.md',
  ISSUE_TEMPLATE_DIR: '.github/ISSUE_TEMPLATE',

  // Code Ownership
  CODEOWNERS: '.github/CODEOWNERS',

  // Automated Reviewers
  REVIEWERS: '.github/reviewers.yml',
  REVIEW_ASSIGNMENT: '.github/review-assignment.yml',

  // GitHub Directory
  GITHUB_DIR: '.github',
} as const;

// Review Template Sections and Keywords
export const REVIEW_TEMPLATE_SECTIONS = {
  DESCRIPTION: 'description',
  CHANGES: 'changes',
  TESTING: 'testing',
  CHECKLIST: 'checklist',
} as const;

// Constitutional compliance constants
export const CONSTITUTIONAL_PATHS = {
  RULEOFCODE_PACKAGE: 'packages/ruleofcode',
  CONSTITUTIONAL_COMPLIANCE_PATTERN:
    'FileHeaderComplianceAnalyzer/**/constitutional-compliance',
  CONSTITUTIONAL_DIR: 'constitutional-compliance',
  TOOLS_DIR: 'tools',
} as const;

// Performance constants for analysis thresholds
export const PERFORMANCE_CONSTANTS = {
  MAX_SELECTOR_LENGTH: 200,
  MAX_SELECTORS_BEFORE_COMPOSITION: 3,
  MAX_SUBSCRIPTIONS_BEFORE_ASYNC: 3,
  MAX_COGNITIVE_COMPLEXITY: 15,
} as const;
