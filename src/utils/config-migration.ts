/**
 * Configuration Helper for Hash-based Law IDs
 * Generates configuration mappings between old rule names and new hash-based IDs
 */

import { ANGULAR_LAWS } from '../data/angular-laws';
import { generateLawId } from './id-generator';

/**
 * Maps legacy rule names to new hash-based IDs for configuration compatibility
 */
export const LEGACY_RULE_NAME_TO_HASH_ID_MAP: Record<string, string> = {
  // Angular Framework Laws
  'constitutional-compliance-headers': generateLawId(
    'Constitutional Compliance Headers',
    'All TypeScript files must have proper constitutional compliance headers',
    'angular'
  ),
  'angular-onpush-strategy': generateLawId(
    'OnPush Change Detection Strategy',
    'Components must use OnPush change detection for optimal performance',
    'angular'
  ),
  'angular-standalone-components': generateLawId(
    'Standalone Components Architecture',
    'Use Angular 17+ standalone components instead of NgModules',
    'angular'
  ),
  'angular-modern-control-flow': generateLawId(
    'Modern Angular Control Flow',
    'Use Angular 17+ @if/@for/@switch control flow instead of structural directives',
    'angular'
  ),
  'angular-signal-adoption': generateLawId(
    'Angular Signal Adoption',
    'Adopt Angular Signals for reactive state management',
    'angular'
  ),
  'angular-lazy-loading': generateLawId(
    'Lazy Loading Implementation',
    'All feature modules must implement lazy loading',
    'angular'
  ),
  'angular-service-layer': generateLawId(
    'Angular Service Layer Architecture',
    'Proper service layer architecture with dependency injection',
    'angular'
  ),
  'angular-form-validation': generateLawId(
    'Angular Form Validation Standards',
    'All forms must use reactive forms with proper validation',
    'angular'
  ),
  'angular-lifecycle-management': generateLawId(
    'Angular Lifecycle Management',
    'Proper implementation of Angular lifecycle hooks',
    'angular'
  ),

  // NgRx Laws
  'ngrx-store-pattern': generateLawId(
    'NgRx Store Pattern Mandate (SACRED LAW)',
    'Mandatory use of NgRx store pattern for complex state management instead of service patterns',
    'ngrx'
  ),
  'ngrx-actions-hygiene': generateLawId(
    'NgRx Actions Hygiene Mandate (SACRED LAW)',
    'Actions must follow proper naming conventions, typing, and Load/Success/Failure patterns',
    'ngrx'
  ),
  'ngrx-effects-error-handling': generateLawId(
    'NgRx Effects Error Handling Mandate (SACRED LAW)',
    'Effects must handle errors properly, use correct RxJS operators, and never break the action stream',
    'ngrx'
  ),
};

/**
 * Reverse mapping for compatibility - hash ID to legacy rule name
 */
export const HASH_ID_TO_LEGACY_RULE_NAME_MAP: Record<string, string> =
  Object.fromEntries(
    Object.entries(LEGACY_RULE_NAME_TO_HASH_ID_MAP).map(([legacy, hash]) => [
      hash,
      legacy,
    ])
  );

/**
 * Converts legacy configuration with rule names to new hash-based configuration
 * @param legacyConfig Configuration using old rule names
 * @returns Configuration with hash-based IDs
 */
export function convertLegacyConfig(
  legacyConfig: Record<string, unknown>
): Record<string, unknown> {
  const converted: Record<string, unknown> = {};

  for (const [legacyName, value] of Object.entries(legacyConfig)) {
    const hashId = LEGACY_RULE_NAME_TO_HASH_ID_MAP[legacyName];
    if (hashId) {
      converted[hashId] = value;
    } else {
      // Keep unknown rules as-is for backward compatibility
      converted[legacyName] = value;
    }
  }

  return converted;
}

/**
 * Validates configuration against available law IDs
 * @param config Configuration to validate
 * @returns List of invalid/unknown rule IDs
 */
export function validateConfiguration(
  _config: Record<string, unknown>
): string[] {
  const availableIds = new Set([
    ...ANGULAR_LAWS.map(law => law.id),
    ...Object.values(LEGACY_RULE_NAME_TO_HASH_ID_MAP),
  ]);

  const invalidIds: string[] = [];
  for (const configId of Object.keys(_config)) {
    if (!availableIds.has(configId)) {
      invalidIds.push(configId);
    }
  }

  return invalidIds;
}
