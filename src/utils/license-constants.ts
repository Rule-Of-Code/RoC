/**
 * License-related Constants
 * RULE 1 & RULE 2: Specialized constants module for license handling
 */

// RULE 1: Centralized license string literals to eliminate duplication
export const LICENSE_STRING_LITERALS = {
  // File names
  PACKAGE_JSON: 'package.json',

  // License type strings (centralized from multiple locations)
  APACHE_LICENSE: 'apache license',
  VERSION_2_0: 'version 2.0',
  APACHE_2_0: 'apache-2.0',
  BSD_2_CLAUSE: 'bsd-2-clause',
  BSD_3_CLAUSE: 'bsd-3-clause',
  MIT_LICENSE: 'mit license',
  MIT: 'mit',
  GNU_GPL: 'gnu general public license',
  VERSION_3: 'version 3',
  BSD_3_CLAUSE_DESC: 'bsd 3-clause',
  REDISTRIBUTION_USE: 'redistribution and use',
  ISC_LICENSE: 'isc license',
} as const;

// License file and type conventions
export const LICENSE_CONVENTIONS = {
  // Standard license file names (in priority order)
  LICENSE_FILE_NAMES: [
    'LICENSE',
    'LICENSE.txt',
    'LICENSE.md',
    'license',
    'license.txt',
    'license.md',
    'LICENCE',
    'LICENCE.txt',
    'LICENCE.md',
  ] as const,

  // License type mappings for consistency checking
  // RULE 1: Use centralized LICENSE_STRING_LITERALS to eliminate duplication
  LICENSE_TYPE_PATTERNS: {
    MIT: [LICENSE_STRING_LITERALS.MIT_LICENSE, LICENSE_STRING_LITERALS.MIT],
    APACHE_2_0: [
      LICENSE_STRING_LITERALS.APACHE_LICENSE,
      LICENSE_STRING_LITERALS.VERSION_2_0,
      LICENSE_STRING_LITERALS.APACHE_2_0,
    ],
    GPL_3_0: [
      LICENSE_STRING_LITERALS.GNU_GPL,
      LICENSE_STRING_LITERALS.VERSION_3,
    ],
    BSD_3_CLAUSE: [
      LICENSE_STRING_LITERALS.BSD_3_CLAUSE_DESC,
      LICENSE_STRING_LITERALS.REDISTRIBUTION_USE,
    ],
    ISC: [LICENSE_STRING_LITERALS.ISC_LICENSE],
  } as const,

  // Scoring configuration for license analysis
  SCORING: {
    BASE_SCORE: 100,
    NO_LICENSE_PENALTY: 30,
    UNLICENSED_PENALTY: 20,
    NO_FILE_PENALTY: 25,
    MISMATCH_PENALTY: 15,
  },
} as const;

// License validation and suggestion messages
export const LICENSE_MESSAGES = {
  // Violation messages
  VIOLATIONS: {
    NO_LICENSE_FIELD: 'No license specified in package.json',
    UNLICENSED_PROJECT: 'Project marked as UNLICENSED',
    NO_LICENSE_FILE: 'No LICENSE file found in project root',
    LICENSE_MISMATCH:
      'License mismatch: package.json ({packageLicense}) vs LICENSE file ({fileLicense})',
  },

  // Suggestion messages
  SUGGESTIONS: {
    ADD_LICENSE_FIELD: 'Add "license" field to package.json',
    ADD_OPEN_SOURCE_LICENSE:
      'Consider adding an appropriate open source license',
    CREATE_LICENSE_FILE: 'Create LICENSE file with license text',
    ENSURE_CONSISTENCY: 'Ensure package.json license matches LICENSE file',
  },
} as const;

// Dependency license analysis configuration
export const DEPENDENCY_LICENSE_CONFIG = {
  // License type constants
  // RULE 1: Use centralized LICENSE_STRING_LITERALS to eliminate duplication
  LICENSES: {
    APACHE_2_0: LICENSE_STRING_LITERALS.APACHE_2_0,
    BSD_2_CLAUSE: LICENSE_STRING_LITERALS.BSD_2_CLAUSE,
    BSD_3_CLAUSE: LICENSE_STRING_LITERALS.BSD_3_CLAUSE,
  },

  // Dependency scanning configuration
  SCANNING: {
    PERFORMANCE_LIMIT: 20,
    EXTRACTION_LIMIT: 10,
    EXAMPLE_LIMIT: 3,
  },

  // Scoring configuration
  SCORING: {
    BASE_SCORE: 100,
    MAX_PENALTY: 30,
    PENALTY_PER_PROBLEMATIC: 5,
  },

  // File paths
  PATHS: {
    NODE_MODULES_DIR: 'node_modules',
    PACKAGE_JSON_FILE: LICENSE_STRING_LITERALS.PACKAGE_JSON,
  },

  // Problematic licenses categorization
  PROBLEMATIC_LICENSES: {
    COPYLEFT: [
      'gpl-2.0',
      'gpl-3.0',
      'lgpl-2.1',
      'lgpl-3.0',
      'agpl-3.0',
      'copyleft-next',
      'eupl-1.1',
      'eupl-1.2',
    ],
    COMMERCIAL: [
      'commercial',
      'proprietary',
      'unlicense',
      'none',
      'see license in',
    ],
    RESTRICTIVE: ['cc-by-nc', 'cc-by-nc-sa', 'cc-by-nc-nd', 'artistic-2.0'],
  },
} as const;

// Dependency license compatibility rules
// RULE 1: Use centralized LICENSE_STRING_LITERALS to eliminate duplicate strings
export const DEPENDENCY_LICENSE_COMPATIBILITY = {
  MIT: {
    INCOMPATIBLE: [] as const,
    REQUIRES_NOTICE: [
      LICENSE_STRING_LITERALS.APACHE_2_0,
      LICENSE_STRING_LITERALS.BSD_2_CLAUSE,
      LICENSE_STRING_LITERALS.BSD_3_CLAUSE,
    ] as const,
  },
  APACHE_2_0: {
    INCOMPATIBLE: ['gpl-2.0'] as const,
    REQUIRES_NOTICE: [
      LICENSE_STRING_LITERALS.MIT,
      LICENSE_STRING_LITERALS.BSD_2_CLAUSE,
      LICENSE_STRING_LITERALS.BSD_3_CLAUSE,
    ] as const,
  },
  GPL_3_0: {
    INCOMPATIBLE: [
      LICENSE_STRING_LITERALS.APACHE_2_0,
      LICENSE_STRING_LITERALS.MIT,
      LICENSE_STRING_LITERALS.BSD_2_CLAUSE,
      LICENSE_STRING_LITERALS.BSD_3_CLAUSE,
    ] as const,
    REQUIRES_NOTICE: [] as const,
  },
  PROPRIETARY: {
    INCOMPATIBLE: [
      'gpl-2.0',
      'gpl-3.0',
      'agpl-3.0',
      'lgpl-2.1',
      'lgpl-3.0',
    ] as const,
    REQUIRES_NOTICE: [
      LICENSE_STRING_LITERALS.MIT,
      LICENSE_STRING_LITERALS.APACHE_2_0,
      LICENSE_STRING_LITERALS.BSD_2_CLAUSE,
      LICENSE_STRING_LITERALS.BSD_3_CLAUSE,
    ] as const,
  },
} as const;

// Dependency license messages
export const DEPENDENCY_LICENSE_MESSAGES = {
  // Violation messages
  VIOLATIONS: {
    FOUND_PROBLEMATIC_DEPENDENCIES:
      'Found {count} dependencies with potentially problematic licenses',
    INCOMPATIBLE_LICENSE:
      '{depLicense} dependency license incompatible with {projectLicense} project license',
  },

  // Suggestion messages
  SUGGESTIONS: {
    RUN_NPM_INSTALL: 'Run npm install to check dependency licenses',
    REVIEW_LICENSES: 'Review licenses for: {examples}',
    USE_LICENSE_CHECKER:
      'Use tools like license-checker to audit all dependency licenses',
    FIND_ALTERNATIVE:
      'Consider finding alternative to dependency with {license} license',
    INCLUDE_LICENSE_NOTICE: 'Include {license} license notice in distribution',
  },

  // Example formats
  FORMATS: {
    NO_LICENSE: '{depName} (no license)',
    WITH_LICENSE: '{depName} ({license})',
  },
} as const;
